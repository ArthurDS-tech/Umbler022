const { supabaseAdmin, insertWithRetry, updateWithRetry } = require('../config/database');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Serviço responsável por gerenciar mensagens
 */
class MessageService {
  
  /**
   * Criar nova mensagem
   */
  async createMessage(messageData) {
    try {
      const formattedData = this._formatMessageData(messageData);
      
      logger.info('Criando nova mensagem', { 
        conversationId: formattedData.conversationId,
        direction: formattedData.direction,
        type: formattedData.messageType
      });
      
      const messageToInsert = {
        id: uuidv4(),
        conversation_id: formattedData.conversationId,
        contact_id: formattedData.contactId,
        umbler_message_id: formattedData.umblerMessageId,
        direction: formattedData.direction,
        message_type: formattedData.messageType,
        content: formattedData.content,
        media_url: formattedData.mediaUrl,
        media_filename: formattedData.mediaFilename,
        media_mime_type: formattedData.mediaMimeType,
        media_size: formattedData.mediaSize,
        status: formattedData.status || 'sent',
        metadata: formattedData.metadata || {},
        raw_webhook_data: formattedData.rawWebhookData,
        created_at: new Date().toISOString()
      };
      
      const result = await insertWithRetry('messages', messageToInsert);
      
      logger.info('✅ Mensagem criada com sucesso', { 
        id: result.id,
        conversationId: result.conversation_id
      });
      
      return result;
    } catch (error) {
      logger.error('Erro ao criar mensagem:', error);
      throw error;
    }
  }
  
  /**
   * Buscar mensagem por ID da Umbler
   */
  async findMessageByUmblerId(umblerMessageId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('messages')
        .select('*')
        .eq('umbler_message_id', umblerMessageId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data;
    } catch (error) {
      logger.error('Erro ao buscar mensagem por ID da Umbler:', error);
      throw error;
    }
  }
  
  /**
   * Atualizar status da mensagem
   */
  async updateMessageStatus({ umblerMessageId, status, deliveredAt, readAt }) {
    try {
      const updateData = {
        status,
        updated_at: new Date().toISOString()
      };
      
      if (deliveredAt) {
        updateData.delivered_at = deliveredAt;
      }
      
      if (readAt) {
        updateData.read_at = readAt;
      }
      
      const { data, error } = await supabaseAdmin
        .from('messages')
        .update(updateData)
        .eq('umbler_message_id', umblerMessageId)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      logger.info('Status da mensagem atualizado', { 
        umblerMessageId, 
        status,
        messageId: data?.id
      });
      
      return data;
    } catch (error) {
      logger.error('Erro ao atualizar status da mensagem:', error);
      throw error;
    }
  }
  
  /**
   * Listar mensagens de uma conversa
   */
  async getConversationMessages(conversationId, { page = 1, limit = 50, orderBy = 'created_at' }) {
    try {
      let query = supabaseAdmin
        .from('messages')
        .select('*', { count: 'exact' })
        .eq('conversation_id', conversationId);
      
      // Ordenação (mais recentes primeiro por padrão)
      query = query.order(orderBy, { ascending: false });
      
      // Paginação
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) {
        throw error;
      }
      
      return {
        messages: data,
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit)
      };
    } catch (error) {
      logger.error('Erro ao listar mensagens da conversa:', error);
      throw error;
    }
  }
  
  /**
   * Buscar mensagens por contato
   */
  async getContactMessages(contactId, { page = 1, limit = 50, startDate, endDate }) {
    try {
      let query = supabaseAdmin
        .from('messages')
        .select(`
          *,
          conversations!inner (
            id,
            status
          )
        `, { count: 'exact' })
        .eq('contact_id', contactId);
      
      // Filtros de data
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      
      if (endDate) {
        query = query.lte('created_at', endDate);
      }
      
      // Ordenação e paginação
      query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);
      
      const { data, error, count } = await query;
      
      if (error) {
        throw error;
      }
      
      return {
        messages: data,
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit)
      };
    } catch (error) {
      logger.error('Erro ao buscar mensagens do contato:', error);
      throw error;
    }
  }
  
  /**
   * Buscar mensagens não lidas
   */
  async getUnreadMessages(conversationId = null) {
    try {
      let query = supabaseAdmin
        .from('messages')
        .select(`
          *,
          contacts (
            id,
            name,
            phone
          ),
          conversations (
            id,
            status
          )
        `)
        .eq('direction', 'inbound')
        .is('read_at', null);
      
      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      logger.error('Erro ao buscar mensagens não lidas:', error);
      throw error;
    }
  }
  
  /**
   * Marcar mensagens como lidas
   */
  async markMessagesAsRead(messageIds) {
    try {
      if (!Array.isArray(messageIds) || messageIds.length === 0) {
        throw new Error('IDs das mensagens devem ser um array não vazio');
      }
      
      const { data, error } = await supabaseAdmin
        .from('messages')
        .update({
          read_at: new Date().toISOString(),
          status: 'read'
        })
        .in('id', messageIds)
        .select();
      
      if (error) {
        throw error;
      }
      
      logger.info('Mensagens marcadas como lidas', { 
        messageIds,
        count: data.length
      });
      
      return data;
    } catch (error) {
      logger.error('Erro ao marcar mensagens como lidas:', error);
      throw error;
    }
  }
  
  /**
   * Buscar mensagens por tipo
   */
  async getMessagesByType(messageType, { page = 1, limit = 50, startDate, endDate }) {
    try {
      let query = supabaseAdmin
        .from('messages')
        .select(`
          *,
          contacts (
            id,
            name,
            phone
          ),
          conversations (
            id,
            status
          )
        `, { count: 'exact' })
        .eq('message_type', messageType);
      
      // Filtros de data
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      
      if (endDate) {
        query = query.lte('created_at', endDate);
      }
      
      // Ordenação e paginação
      query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);
      
      const { data, error, count } = await query;
      
      if (error) {
        throw error;
      }
      
      return {
        messages: data,
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit)
      };
    } catch (error) {
      logger.error('Erro ao buscar mensagens por tipo:', error);
      throw error;
    }
  }
  
  /**
   * Obter estatísticas de mensagens
   */
  async getMessageStats(period = '24h') {
    try {
      const hours = { '1h': 1, '24h': 24, '7d': 168, '30d': 720 }[period] || 24;
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      // Buscar mensagens do período
      const { data: messages, error } = await supabaseAdmin
        .from('messages')
        .select('direction, message_type, status, created_at')
        .gte('created_at', since);
      
      if (error) {
        throw error;
      }
      
      // Calcular estatísticas
      const stats = {
        total: messages.length,
        inbound: messages.filter(m => m.direction === 'inbound').length,
        outbound: messages.filter(m => m.direction === 'outbound').length,
        unread: messages.filter(m => m.direction === 'inbound' && m.status !== 'read').length,
        byType: {},
        byStatus: {},
        byHour: {}
      };
      
      // Agrupar por tipo
      messages.forEach(message => {
        stats.byType[message.message_type] = (stats.byType[message.message_type] || 0) + 1;
        stats.byStatus[message.status] = (stats.byStatus[message.status] || 0) + 1;
        
        // Agrupar por hora
        const hour = new Date(message.created_at).getHours();
        stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
      });
      
      return {
        period,
        stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Erro ao obter estatísticas de mensagens:', error);
      throw error;
    }
  }
  
  /**
   * Deletar mensagens antigas
   */
  async deleteOldMessages(daysOld = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabaseAdmin
        .from('messages')
        .delete()
        .lt('created_at', cutoffDate)
        .select('id');
      
      if (error) {
        throw error;
      }
      
      logger.info('Mensagens antigas deletadas', { 
        count: data?.length || 0,
        daysOld,
        cutoffDate
      });
      
      return data?.length || 0;
    } catch (error) {
      logger.error('Erro ao deletar mensagens antigas:', error);
      throw error;
    }
  }
  
  /**
   * Buscar mensagens com mídia
   */
  async getMessagesWithMedia({ page = 1, limit = 50, mediaType = null }) {
    try {
      let query = supabaseAdmin
        .from('messages')
        .select(`
          *,
          contacts (
            id,
            name,
            phone
          )
        `, { count: 'exact' })
        .not('media_url', 'is', null);
      
      if (mediaType) {
        query = query.ilike('media_mime_type', `${mediaType}/%`);
      }
      
      query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);
      
      const { data, error, count } = await query;
      
      if (error) {
        throw error;
      }
      
      return {
        messages: data,
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit)
      };
    } catch (error) {
      logger.error('Erro ao buscar mensagens com mídia:', error);
      throw error;
    }
  }
  
  /**
   * Formatar e validar dados da mensagem
   */
  _formatMessageData(messageData) {
    const formatted = {};
    
    // Campos obrigatórios
    if (!messageData.conversationId) {
      throw new Error('ID da conversa é obrigatório');
    }
    formatted.conversationId = messageData.conversationId;
    
    if (!messageData.contactId) {
      throw new Error('ID do contato é obrigatório');
    }
    formatted.contactId = messageData.contactId;
    
    if (!messageData.direction) {
      throw new Error('Direção da mensagem é obrigatória');
    }
    
    const validDirections = ['inbound', 'outbound'];
    if (!validDirections.includes(messageData.direction)) {
      throw new Error(`Direção inválida. Deve ser: ${validDirections.join(', ')}`);
    }
    formatted.direction = messageData.direction;
    
    // Campos opcionais
    formatted.umblerMessageId = messageData.umblerMessageId;
    formatted.messageType = messageData.messageType || 'text';
    formatted.content = messageData.content;
    formatted.mediaUrl = messageData.mediaUrl;
    formatted.mediaFilename = messageData.mediaFilename;
    formatted.mediaMimeType = messageData.mediaMimeType;
    formatted.mediaSize = messageData.mediaSize;
    formatted.status = messageData.status;
    formatted.metadata = messageData.metadata;
    formatted.rawWebhookData = messageData.rawWebhookData;
    
    return formatted;
  }
}

module.exports = new MessageService();