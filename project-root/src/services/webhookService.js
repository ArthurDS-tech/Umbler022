const { executeQuery, insertWithRetry, updateWithRetry, findWithCache } = require('../config/database');
const contactService = require('./contactService');
const messageService = require('./messageService');
const conversationService = require('./conversationService');
const agentResponseTimeService = require('./agentResponseTimeService');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Serviço responsável por processar webhooks da Umbler
 */
class WebhookService {
  
  /**
   * Processar webhook recebido da Umbler
   */
  async processWebhook(payload, webhookEventId = null) {
    try {
      logger.info('🔄 Iniciando processamento do webhook', { 
        eventType: payload.Type,
        webhookEventId 
      });
      
      // Validar estrutura básica do payload
      this._validatePayload(payload);
      
      // Determinar tipo de evento e processar
      const eventType = payload.Type || this._inferEventType(payload);
      
      let result = {
        eventType,
        contactId: null,
        conversationId: null,
        messageId: null,
        processed: true
      };
      
      switch (eventType) {
        case 'Message':
          result = await this._processMessageEvent(payload);
          break;
          
        case 'Conversation':
          result = await this._processConversationEvent(payload);
          break;
          
        case 'Contact':
          result = await this._processContactEvent(payload);
          break;
          
        default:
          logger.warn('Tipo de evento não reconhecido', { eventType, payload });
          result = await this._processUnknownEvent(payload);
      }
      
      result.eventType = eventType;
      
      logger.info('✅ Webhook processado com sucesso', result);
      return result;
      
    } catch (error) {
      logger.error('❌ Erro no processamento do webhook:', error);
      throw error;
    }
  }
  
  /**
   * Processar evento de mensagem da Umbler
   */
  async _processMessageEvent(payload) {
    try {
      // Extrair dados do payload da Umbler
      const { Payload } = payload;
      if (!Payload || !Payload.Content) {
        throw new Error('Payload inválido: estrutura esperada não encontrada');
      }

      const { Contact, Channel, LastMessage, Id: conversationId, Sector, OrganizationMember } = Payload.Content;
      
      // 1. Processar/criar contato
      const contactResult = await contactService.createOrUpdateContact({
        umbler_contact_id: Contact.Id,
        phone_number: Contact.PhoneNumber,
        name: Contact.Name,
        email: null, // Umbler não fornece email
        profile_picture_url: Contact.ProfilePictureUrl,
        is_blocked: Contact.IsBlocked,
        contact_type: Contact.ContactType,
        last_active_utc: Contact.LastActiveUTC,
        group_identifier: Contact.GroupIdentifier,
        metadata: {
          source: 'umbler_webhook',
          last_webhook_update: new Date().toISOString(),
          tags: Contact.Tags || []
        }
      });
      
      // 2. Processar/criar canal
      const channelResult = await this._createOrUpdateChannel(Channel);
      
      // 3. Processar/criar setor
      const sectorResult = await this._createOrUpdateSector(Sector);
      
      // 4. Processar/criar membro da organização
      const memberResult = await this._createOrUpdateOrganizationMember(OrganizationMember);
      
      // 5. Processar/criar conversa
      const conversationResult = await conversationService.createOrUpdateConversation({
        umbler_chat_id: conversationId,
        contact_id: contactResult.id,
        channel_id: channelResult?.id,
        sector_id: sectorResult?.id,
        assigned_member_id: memberResult?.id,
        status: Payload.Content.Open ? 'open' : 'closed',
        is_open: Payload.Content.Open,
        is_private: Payload.Content.Private,
        is_waiting: Payload.Content.Waiting,
        waiting_since_utc: Payload.Content.WaitingSinceUTC,
        total_unread: Payload.Content.TotalUnread || 0,
        total_ai_responses: Payload.Content.TotalAIResponses,
        closed_at_utc: Payload.Content.ClosedAtUTC,
        event_at_utc: Payload.Content.EventAtUTC,
        first_contact_message_id: Payload.Content.FirstContactMessage?.Id,
        first_member_reply_message_id: Payload.Content.FirstMemberReplyMessage?.Id,
        metadata: {
          source: 'umbler_webhook',
          last_webhook_update: new Date().toISOString(),
          organization_id: Payload.Content.Organization?.Id
        }
      });
      
      // 6. Processar mensagem se existir
      let messageResult = null;
      if (LastMessage) {
        messageResult = await messageService.createMessage({
          umbler_message_id: LastMessage.Id,
          chat_id: conversationResult.id,
          contact_id: contactResult.id,
          organization_member_id: memberResult?.id,
          message_type: LastMessage.MessageType || 'text',
          content: LastMessage.Content,
          direction: 'inbound', // Mensagens da Umbler são sempre inbound
          source: LastMessage.Source || 'Contact',
          message_state: LastMessage.MessageState || 'received',
          is_private: LastMessage.IsPrivate || false,
          event_at_utc: LastMessage.EventAtUTC,
          created_at_utc: LastMessage.CreatedAtUTC,
          file_id: LastMessage.FileId,
          template_id: LastMessage.TemplateId,
          quoted_message_id: LastMessage.InReplyTo?.Id,
          raw_webhook_data: payload,
          metadata: {
            source: 'umbler_webhook',
            message_state: LastMessage.MessageState,
            source_type: LastMessage.Source
          }
        });
      }
      
      // 7. Processar tags do contato
      if (Contact.Tags && Contact.Tags.length > 0) {
        await this._processContactTags(contactResult.id, Contact.Tags);
      }

      // 8. Calcular tempo de resposta do atendente
      try {
        await agentResponseTimeService.processMessageForAgentResponseTime(payload);
      } catch (error) {
        logger.warn('Erro ao calcular tempo de resposta do atendente:', error);
        // Não interromper o processamento por causa disso
      }
      
      return {
        contactId: contactResult.id,
        conversationId: conversationResult.id,
        messageId: messageResult?.id,
        processed: true
      };
    } catch (error) {
      logger.error('Erro ao processar evento de mensagem:', error);
      throw error;
    }
  }
  
  /**
   * Processar evento de conversa
   */
  async _processConversationEvent(payload) {
    const { conversation, contact } = payload;
    
    // 1. Processar/criar contato se fornecido
    let contactResult = null;
    if (contact) {
      contactResult = await contactService.createOrUpdateContact({
        phone: contact.phone,
        name: contact.name,
        email: contact.email,
        profilePicUrl: contact.profile_pic
      });
    }
    
    // 2. Processar conversa
    const conversationResult = await conversationService.createOrUpdateConversation({
      contactId: contactResult?.id,
      umblerConversationId: conversation.id,
      channel: 'whatsapp',
      status: conversation.status,
      assignedAgentId: conversation.assigned_agent_id,
      priority: conversation.priority,
      metadata: {
        source: 'umbler_webhook',
        event: payload.event,
        lastWebhookUpdate: new Date().toISOString()
      }
    });
    
    return {
      contactId: contactResult?.id,
      conversationId: conversationResult.id,
      processed: true
    };
  }
  
  /**
   * Processar evento de contato
   */
  async _processContactEvent(payload) {
    const { contact } = payload;
    
    const contactResult = await contactService.createOrUpdateContact({
      phone: contact.phone,
      name: contact.name,
      email: contact.email,
      profilePicUrl: contact.profile_pic,
      status: contact.status,
      tags: contact.tags,
      metadata: {
        source: 'umbler_webhook',
        event: payload.event,
        lastWebhookUpdate: new Date().toISOString(),
        ...contact.metadata
      }
    });
    
    return {
      contactId: contactResult.id,
      processed: true
    };
  }
  
  /**
   * Processar evento desconhecido
   */
  async _processUnknownEvent(payload) {
    logger.warn('Processando evento desconhecido', { payload });
    
    // Salvar evento para análise posterior
    await this.logWebhookEvent({
      eventType: 'unknown',
      eventData: payload,
      processed: false
    });
    
    return {
      processed: false,
      reason: 'Tipo de evento não reconhecido'
    };
  }
  
  /**
   * Criar ou atualizar canal
   */
  async _createOrUpdateChannel(channelData) {
    if (!channelData) return null;
    
    try {
      const existingChannel = await findWithCache('channels', { umbler_channel_id: channelData.Id });
      
      if (existingChannel.data.length > 0) {
        // Atualizar canal existente
        return await updateWithRetry('channels', {
          name: channelData.Name,
          channel_type: channelData.ChannelType,
          phone_number: channelData.PhoneNumber,
          updated_at: new Date().toISOString()
        }, { umbler_channel_id: channelData.Id });
      } else {
        // Criar novo canal
        return await insertWithRetry('channels', {
          umbler_channel_id: channelData.Id,
          channel_type: channelData.ChannelType,
          phone_number: channelData.PhoneNumber,
          name: channelData.Name,
          metadata: {
            source: 'umbler_webhook',
            created_at: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      logger.error('Erro ao processar canal:', error);
      return null;
    }
  }
  
  /**
   * Criar ou atualizar setor
   */
  async _createOrUpdateSector(sectorData) {
    if (!sectorData) return null;
    
    try {
      const existingSector = await findWithCache('sectors', { umbler_sector_id: sectorData.Id });
      
      if (existingSector.data.length > 0) {
        // Atualizar setor existente
        return await updateWithRetry('sectors', {
          name: sectorData.Name,
          is_default: sectorData.Default,
          order_position: sectorData.Order,
          updated_at: new Date().toISOString()
        }, { umbler_sector_id: sectorData.Id });
      } else {
        // Criar novo setor
        return await insertWithRetry('sectors', {
          umbler_sector_id: sectorData.Id,
          name: sectorData.Name,
          is_default: sectorData.Default,
          order_position: sectorData.Order,
          metadata: {
            source: 'umbler_webhook',
            created_at: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      logger.error('Erro ao processar setor:', error);
      return null;
    }
  }
  
  /**
   * Criar ou atualizar membro da organização
   */
  async _createOrUpdateOrganizationMember(memberData) {
    if (!memberData) return null;
    
    try {
      const existingMember = await findWithCache('organization_members', { umbler_member_id: memberData.Id });
      
      if (existingMember.data.length > 0) {
        // Atualizar membro existente
        return await updateWithRetry('organization_members', {
          is_active: true,
          updated_at: new Date().toISOString()
        }, { umbler_member_id: memberData.Id });
      } else {
        // Criar novo membro
        return await insertWithRetry('organization_members', {
          umbler_member_id: memberData.Id,
          name: 'Agente Umbler', // Nome padrão
          is_active: true,
          metadata: {
            source: 'umbler_webhook',
            created_at: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      logger.error('Erro ao processar membro da organização:', error);
      return null;
    }
  }
  
  /**
   * Processar tags do contato
   */
  async _processContactTags(contactId, tags) {
    try {
      for (const tag of tags) {
        await insertWithRetry('contact_tags', {
          contact_id: contactId,
          umbler_tag_id: tag.Id,
          tag_name: tag.Name
        });
      }
    } catch (error) {
      logger.error('Erro ao processar tags do contato:', error);
    }
  }
  
  /**
   * Registrar evento de webhook para auditoria
   */
  async logWebhookEvent(eventData) {
    try {
      const result = await insertWithRetry('webhook_events', {
        event_id: eventData.eventData.EventId || uuidv4(),
        event_type: eventData.eventType,
        event_date: eventData.eventData.EventDate || new Date().toISOString(),
        payload: eventData.eventData,
        processed: eventData.processed || false,
        source_ip: eventData.sourceIp,
        user_agent: eventData.userAgent
      });
      
      return result.id;
    } catch (error) {
      logger.error('Falha ao salvar evento de webhook:', error);
      // Não propagar erro para não interromper o processamento
      return null;
    }
  }
  
  /**
   * Marcar evento como processado
   */
  async markEventAsProcessed(eventId) {
    if (!eventId) return;
    
    try {
      await updateWithRetry('webhook_events', {
        processed: true,
        processed_at: new Date().toISOString()
      }, { id: eventId });
    } catch (error) {
      logger.error('Erro ao marcar evento como processado:', error);
    }
  }
  
  /**
   * Marcar evento com erro
   */
  async markEventAsError(eventId, errorMessage) {
    if (!eventId) return;
    
    try {
      await updateWithRetry('webhook_events', {
        processed: false,
        error_message: errorMessage,
        retry_count: 'retry_count + 1',
        processed_at: new Date().toISOString()
      }, { id: eventId });
    } catch (error) {
      logger.error('Erro ao marcar evento com erro:', error);
    }
  }
  
  /**
   * Reprocessar evento que falhou
   */
  async retryWebhookEvent(eventId) {
    try {
      // Buscar evento
      const result = await findWithCache('webhook_events', { id: eventId });
      
      if (result.data.length === 0) {
        logger.warn('Evento não encontrado para retry:', { eventId });
        return null;
      }
      
      const event = result.data[0];
      
      if (event.processed) {
        logger.warn('Evento já foi processado:', { eventId });
        return null;
      }
      
      if (event.retry_count >= 3) {
        logger.warn('Máximo de tentativas excedido:', { eventId });
        return null;
      }
      
      // Tentar processar novamente
      const processResult = await this.processWebhook(event.payload, eventId);
      
      // Marcar como processado se sucesso
      if (processResult.processed) {
        await this.markEventAsProcessed(eventId);
      }
      
      return processResult;
      
    } catch (error) {
      await this.markEventAsError(eventId, error.message);
      throw error;
    }
  }
  
  /**
   * Obter eventos de webhook com filtros
   */
  async getWebhookEvents({ page = 1, limit = 50, filters = {} }) {
    try {
      let whereConditions = [];
      let params = [];
      let paramIndex = 1;
      
      // Aplicar filtros
      if (filters.eventType) {
        whereConditions.push(`event_type = $${paramIndex++}`);
        params.push(filters.eventType);
      }
      
      if (filters.processed !== undefined) {
        whereConditions.push(`processed = $${paramIndex++}`);
        params.push(filters.processed);
      }
      
      if (filters.startDate) {
        whereConditions.push(`created_at >= $${paramIndex++}`);
        params.push(filters.startDate);
      }
      
      if (filters.endDate) {
        whereConditions.push(`created_at <= $${paramIndex++}`);
        params.push(filters.endDate);
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM webhook_events
        ${whereClause}
      `;
      
      const countResult = await executeQuery(countQuery, params);
      const total = parseInt(countResult[0].total);
      
      // Query para buscar dados com paginação
      const offset = (page - 1) * limit;
      const dataQuery = `
        SELECT *
        FROM webhook_events
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      
      const dataResult = await executeQuery(dataQuery, [...params, limit, offset]);
      
      return {
        events: dataResult,
        total: total
      };
      
    } catch (error) {
      logger.error('Erro ao obter eventos de webhook:', error);
      throw error;
    }
  }
  
  /**
   * Obter estatísticas dos webhooks
   */
  async getWebhookStats(period = '24h') {
    try {
      const periodMap = {
        '1h': '1 hour',
        '24h': '24 hours',
        '7d': '7 days',
        '30d': '30 days'
      };
      
      const intervalString = periodMap[period] || '24 hours';
      
      const query = `
        SELECT 
          COUNT(*) as total_events,
          COUNT(*) FILTER (WHERE processed = true) as processed_events,
          COUNT(*) FILTER (WHERE processed = false) as failed_events,
          jsonb_object_agg(event_type, count) as events_by_type
        FROM (
          SELECT 
            event_type,
            COUNT(*) as count
          FROM webhook_events 
          WHERE created_at >= NOW() - INTERVAL '${intervalString}'
          GROUP BY event_type
        ) type_counts,
        webhook_events we
        WHERE we.created_at >= NOW() - INTERVAL '${intervalString}'
      `;
      
      const result = await executeQuery(query);
      
      if (result.length === 0) {
        return {
          total_events: 0,
          processed_events: 0,
          failed_events: 0,
          events_by_type: {}
        };
      }
      
      return result[0];
      
    } catch (error) {
      logger.error('Erro ao obter estatísticas:', error);
      return await this._calculateWebhookStatsManually(period);
    }
  }
  
  /**
   * Calcular estatísticas manualmente
   */
  async _calculateWebhookStatsManually(period) {
    const hours = { '1h': 1, '24h': 24, '7d': 168, '30d': 720 }[period] || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const query = `
      SELECT event_type, processed, created_at
      FROM webhook_events
      WHERE created_at >= $1
    `;
    
    const data = await executeQuery(query, [since]);
    
    const stats = {
      total_events: data.length,
      processed_events: data.filter(e => e.processed).length,
      failed_events: data.filter(e => !e.processed).length,
      events_by_type: {}
    };
    
    // Contar por tipo
    data.forEach(event => {
      stats.events_by_type[event.event_type] = (stats.events_by_type[event.event_type] || 0) + 1;
    });
    
    return stats;
  }
  
  /**
   * Validar estrutura do payload
   */
  _validatePayload(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload inválido: deve ser um objeto');
    }
    
    // Validações específicas para payload da Umbler
    if (!payload.Type) {
      throw new Error('Payload inválido: campo Type é obrigatório');
    }
    
    if (!payload.EventDate) {
      throw new Error('Payload inválido: campo EventDate é obrigatório');
    }
    
    if (!payload.Payload) {
      throw new Error('Payload inválido: campo Payload é obrigatório');
    }
    
    return true;
  }
  
  /**
   * Inferir tipo de evento baseado na estrutura do payload
   */
  _inferEventType(payload) {
    // Para payload da Umbler
    if (payload.Type === 'Message') return 'Message';
    if (payload.Type === 'Conversation') return 'Conversation';
    if (payload.Type === 'Contact') return 'Contact';
    
    // Fallback para outros formatos
    if (payload.message && payload.contact) {
      return 'Message';
    }
    
    if (payload.conversation) {
      return 'Conversation';
    }
    
    if (payload.contact) {
      return 'Contact';
    }
    
    return 'unknown';
  }
}

module.exports = new WebhookService();