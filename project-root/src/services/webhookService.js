const { supabaseAdmin } = require('../config/database');
const contactService = require('./contactService');
const messageService = require('./messageService');
const conversationService = require('./conversationService');
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
        eventType: payload.event,
        webhookEventId 
      });
      
      // Validar estrutura básica do payload
      this._validatePayload(payload);
      
      // Determinar tipo de evento e processar
      const eventType = payload.event || this._inferEventType(payload);
      
      let result = {
        eventType,
        contactId: null,
        conversationId: null,
        messageId: null,
        processed: true
      };
      
      switch (eventType) {
        case 'message.received':
        case 'message.sent':
          result = await this._processMessageEvent(payload);
          break;
          
        case 'conversation.created':
        case 'conversation.updated':
        case 'conversation.closed':
          result = await this._processConversationEvent(payload);
          break;
          
        case 'contact.created':
        case 'contact.updated':
          result = await this._processContactEvent(payload);
          break;
          
        case 'message.status':
          result = await this._processMessageStatusEvent(payload);
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
   * Processar evento de mensagem
   */
  async _processMessageEvent(payload) {
    const { message, contact, conversation } = payload;
    
    // 1. Processar/criar contato
    const contactResult = await contactService.createOrUpdateContact({
      phone: contact.phone,
      name: contact.name,
      email: contact.email,
      profilePicUrl: contact.profile_pic,
      metadata: {
        source: 'umbler_webhook',
        lastWebhookUpdate: new Date().toISOString()
      }
    });
    
    // 2. Processar/criar conversa
    const conversationResult = await conversationService.createOrUpdateConversation({
      contactId: contactResult.id,
      umblerConversationId: conversation?.id,
      channel: 'whatsapp',
      status: conversation?.status || 'open',
      metadata: {
        source: 'umbler_webhook',
        lastWebhookUpdate: new Date().toISOString()
      }
    });
    
    // 3. Processar mensagem
    const messageResult = await messageService.createMessage({
      conversationId: conversationResult.id,
      contactId: contactResult.id,
      umblerMessageId: message.id,
      direction: message.direction || (payload.event === 'message.received' ? 'inbound' : 'outbound'),
      messageType: message.type || 'text',
      content: message.content || message.text,
      mediaUrl: message.media_url,
      mediaFilename: message.media_filename,
      mediaMimeType: message.media_mime_type,
      mediaSize: message.media_size,
      status: 'received',
      rawWebhookData: payload,
      metadata: {
        source: 'umbler_webhook',
        timestamp: message.timestamp
      }
    });
    
    return {
      contactId: contactResult.id,
      conversationId: conversationResult.id,
      messageId: messageResult.id,
      processed: true
    };
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
   * Processar evento de status de mensagem
   */
  async _processMessageStatusEvent(payload) {
    const { message } = payload;
    
    const messageResult = await messageService.updateMessageStatus({
      umblerMessageId: message.id,
      status: message.status,
      deliveredAt: message.delivered_at,
      readAt: message.read_at
    });
    
    return {
      messageId: messageResult?.id,
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
   * Registrar evento de webhook para auditoria
   */
  async logWebhookEvent(eventData) {
    try {
      const { data, error } = await supabaseAdmin
        .from('webhook_events')
        .insert({
          id: uuidv4(),
          event_type: eventData.eventType,
          event_data: eventData.eventData,
          processed: eventData.processed || false,
          source_ip: eventData.sourceIp,
          user_agent: eventData.userAgent,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        logger.error('Erro ao registrar evento de webhook:', error);
        throw error;
      }
      
      return data.id;
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
      await supabaseAdmin
        .from('webhook_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString()
        })
        .eq('id', eventId);
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
      await supabaseAdmin
        .from('webhook_events')
        .update({
          processed: false,
          error_message: errorMessage,
          retry_count: supabaseAdmin.raw('retry_count + 1'),
          processed_at: new Date().toISOString()
        })
        .eq('id', eventId);
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
      const { data: event, error } = await supabaseAdmin
        .from('webhook_events')
        .select('*')
        .eq('id', eventId)
        .single();
      
      if (error || !event) {
        logger.warn('Evento não encontrado para retry:', { eventId });
        return null;
      }
      
      if (event.processed) {
        logger.warn('Evento já foi processado:', { eventId });
        return null;
      }
      
      if (event.retry_count >= 3) {
        logger.warn('Máximo de tentativas excedido:', { eventId });
        return null;
      }
      
      // Tentar processar novamente
      const result = await this.processWebhook(event.event_data, eventId);
      
      // Marcar como processado se sucesso
      if (result.processed) {
        await this.markEventAsProcessed(eventId);
      }
      
      return result;
      
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
      let query = supabaseAdmin
        .from('webhook_events')
        .select('*', { count: 'exact' });
      
      // Aplicar filtros
      if (filters.eventType) {
        query = query.eq('event_type', filters.eventType);
      }
      
      if (filters.processed !== undefined) {
        query = query.eq('processed', filters.processed);
      }
      
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      
      // Paginação
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      query = query
        .range(from, to)
        .order('created_at', { ascending: false });
      
      const { data, error, count } = await query;
      
      if (error) {
        throw error;
      }
      
      return {
        events: data,
        total: count
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
      
      const { data, error } = await supabaseAdmin.rpc('get_webhook_stats', {
        period_interval: intervalString
      });
      
      if (error) {
        // Se a função não existir, calcular manualmente
        return await this._calculateWebhookStatsManually(period);
      }
      
      return data;
      
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
    
    const { data, error } = await supabaseAdmin
      .from('webhook_events')
      .select('event_type, processed, created_at')
      .gte('created_at', since);
    
    if (error) throw error;
    
    const stats = {
      total: data.length,
      processed: data.filter(e => e.processed).length,
      failed: data.filter(e => !e.processed).length,
      byType: {}
    };
    
    // Contar por tipo
    data.forEach(event => {
      stats.byType[event.event_type] = (stats.byType[event.event_type] || 0) + 1;
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
    
    // Validações específicas podem ser adicionadas aqui
    return true;
  }
  
  /**
   * Inferir tipo de evento baseado na estrutura do payload
   */
  _inferEventType(payload) {
    if (payload.message && payload.contact) {
      return 'message.received';
    }
    
    if (payload.conversation) {
      return 'conversation.updated';
    }
    
    if (payload.contact) {
      return 'contact.updated';
    }
    
    return 'unknown';
  }
}

module.exports = new WebhookService();