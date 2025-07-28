const { supabaseAdmin, insertWithRetry, updateWithRetry } = require('../config/database');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Serviço responsável por gerenciar conversas
 */
class ConversationService {
  
  /**
   * Criar ou atualizar conversa
   */
  async createOrUpdateConversation(conversationData) {
    try {
      const formattedData = this._formatConversationData(conversationData);
      
      // Verificar se conversa já existe
      let existingConversation = null;
      
      if (formattedData.umblerConversationId) {
        existingConversation = await this.findConversationByUmblerId(formattedData.umblerConversationId);
      } else if (formattedData.contactId) {
        existingConversation = await this.findActiveConversationByContact(formattedData.contactId);
      }
      
      if (existingConversation) {
        // Atualizar conversa existente
        return await this.updateConversation(existingConversation.id, formattedData);
      } else {
        // Criar nova conversa
        return await this.createConversation(formattedData);
      }
    } catch (error) {
      logger.error('Erro ao criar/atualizar conversa:', error);
      throw error;
    }
  }
  
  /**
   * Criar nova conversa
   */
  async createConversation(conversationData) {
    try {
      const formattedData = this._formatConversationData(conversationData);
      
      logger.info('Criando nova conversa', { 
        contactId: formattedData.contactId,
        channel: formattedData.channel
      });
      
      const conversationToInsert = {
        id: uuidv4(),
        contact_id: formattedData.contactId,
        umbler_conversation_id: formattedData.umblerConversationId,
        channel: formattedData.channel || 'whatsapp',
        status: formattedData.status || 'open',
        assigned_agent_id: formattedData.assignedAgentId,
        priority: formattedData.priority || 'normal',
        metadata: formattedData.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString()
      };
      
      const result = await insertWithRetry('conversations', conversationToInsert);
      
      logger.info('✅ Conversa criada com sucesso', { 
        id: result.id,
        contactId: result.contact_id
      });
      
      return result;
    } catch (error) {
      logger.error('Erro ao criar conversa:', error);
      throw error;
    }
  }
  
  /**
   * Atualizar conversa existente
   */
  async updateConversation(conversationId, updateData) {
    try {
      const formattedData = this._formatConversationData(updateData);
      
      logger.info('Atualizando conversa', { conversationId });
      
      const updateFields = {
        updated_at: new Date().toISOString()
      };
      
      // Apenas atualizar campos fornecidos
      if (formattedData.status !== undefined) updateFields.status = formattedData.status;
      if (formattedData.assignedAgentId !== undefined) updateFields.assigned_agent_id = formattedData.assignedAgentId;
      if (formattedData.priority !== undefined) updateFields.priority = formattedData.priority;
      
      // Se status está sendo fechado, marcar data de fechamento
      if (formattedData.status === 'closed' || formattedData.status === 'resolved') {
        updateFields.closed_at = new Date().toISOString();
      }
      
      // Merge metadata
      if (formattedData.metadata) {
        const { data: existingConversation } = await supabaseAdmin
          .from('conversations')
          .select('metadata')
          .eq('id', conversationId)
          .single();
        
        updateFields.metadata = {
          ...(existingConversation?.metadata || {}),
          ...formattedData.metadata
        };
      }
      
      const result = await updateWithRetry('conversations', updateFields, { id: conversationId });
      
      logger.info('✅ Conversa atualizada com sucesso', { 
        id: result.id,
        status: result.status
      });
      
      return result;
    } catch (error) {
      logger.error('Erro ao atualizar conversa:', error);
      throw error;
    }
  }
  
  /**
   * Buscar conversa por ID da Umbler
   */
  async findConversationByUmblerId(umblerConversationId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('conversations')
        .select('*')
        .eq('umbler_conversation_id', umblerConversationId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data;
    } catch (error) {
      logger.error('Erro ao buscar conversa por ID da Umbler:', error);
      throw error;
    }
  }
  
  /**
   * Buscar conversa ativa por contato
   */
  async findActiveConversationByContact(contactId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('conversations')
        .select('*')
        .eq('contact_id', contactId)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data;
    } catch (error) {
      logger.error('Erro ao buscar conversa ativa por contato:', error);
      throw error;
    }
  }
  
  /**
   * Listar conversas com filtros
   */
  async listConversations({ page = 1, limit = 50, filters = {}, orderBy = 'updated_at' }) {
    try {
      let query = supabaseAdmin
        .from('conversations')
        .select(`
          *,
          contacts (
            id,
            name,
            phone,
            email
          ),
          agents (
            id,
            name,
            email
          )
        `, { count: 'exact' });
      
      // Aplicar filtros
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }
      
      if (filters.channel) {
        query = query.eq('channel', filters.channel);
      }
      
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }
      
      if (filters.assignedAgentId) {
        query = query.eq('assigned_agent_id', filters.assignedAgentId);
      }
      
      if (filters.contactId) {
        query = query.eq('contact_id', filters.contactId);
      }
      
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      
      // Filtro para conversas não atribuídas
      if (filters.unassigned) {
        query = query.is('assigned_agent_id', null);
      }
      
      // Ordenação
      const orderDirection = filters.orderDirection === 'asc' ? { ascending: true } : { ascending: false };
      query = query.order(orderBy, orderDirection);
      
      // Paginação
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) {
        throw error;
      }
      
      return {
        conversations: data,
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit)
      };
    } catch (error) {
      logger.error('Erro ao listar conversas:', error);
      throw error;
    }
  }
  
  /**
   * Atribuir conversa a um agente
   */
  async assignConversation(conversationId, agentId) {
    try {
      const result = await updateWithRetry('conversations', 
        { 
          assigned_agent_id: agentId,
          updated_at: new Date().toISOString()
        }, 
        { id: conversationId }
      );
      
      logger.info('Conversa atribuída ao agente', { conversationId, agentId });
      return result;
    } catch (error) {
      logger.error('Erro ao atribuir conversa:', error);
      throw error;
    }
  }
  
  /**
   * Remover atribuição da conversa
   */
  async unassignConversation(conversationId) {
    try {
      const result = await updateWithRetry('conversations', 
        { 
          assigned_agent_id: null,
          updated_at: new Date().toISOString()
        }, 
        { id: conversationId }
      );
      
      logger.info('Atribuição da conversa removida', { conversationId });
      return result;
    } catch (error) {
      logger.error('Erro ao remover atribuição da conversa:', error);
      throw error;
    }
  }
  
  /**
   * Fechar conversa
   */
  async closeConversation(conversationId, reason = null) {
    try {
      const updateData = {
        status: 'closed',
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Adicionar razão aos metadados se fornecida
      if (reason) {
        const conversation = await this.findConversationById(conversationId);
        updateData.metadata = {
          ...(conversation?.metadata || {}),
          closedReason: reason,
          closedAt: new Date().toISOString()
        };
      }
      
      const result = await updateWithRetry('conversations', updateData, { id: conversationId });
      
      logger.info('Conversa fechada', { conversationId, reason });
      return result;
    } catch (error) {
      logger.error('Erro ao fechar conversa:', error);
      throw error;
    }
  }
  
  /**
   * Reabrir conversa
   */
  async reopenConversation(conversationId) {
    try {
      const conversation = await this.findConversationById(conversationId);
      if (!conversation) {
        throw new Error('Conversa não encontrada');
      }
      
      const metadata = { ...(conversation.metadata || {}) };
      metadata.reopenedAt = new Date().toISOString();
      
      const result = await updateWithRetry('conversations', 
        { 
          status: 'open',
          closed_at: null,
          metadata,
          updated_at: new Date().toISOString()
        }, 
        { id: conversationId }
      );
      
      logger.info('Conversa reaberta', { conversationId });
      return result;
    } catch (error) {
      logger.error('Erro ao reabrir conversa:', error);
      throw error;
    }
  }
  
  /**
   * Alterar prioridade da conversa
   */
  async changeConversationPriority(conversationId, priority) {
    try {
      const validPriorities = ['low', 'normal', 'high', 'urgent'];
      if (!validPriorities.includes(priority)) {
        throw new Error(`Prioridade inválida. Deve ser: ${validPriorities.join(', ')}`);
      }
      
      const result = await updateWithRetry('conversations', 
        { 
          priority,
          updated_at: new Date().toISOString()
        }, 
        { id: conversationId }
      );
      
      logger.info('Prioridade da conversa alterada', { conversationId, priority });
      return result;
    } catch (error) {
      logger.error('Erro ao alterar prioridade da conversa:', error);
      throw error;
    }
  }
  
  /**
   * Buscar conversa por ID
   */
  async findConversationById(conversationId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('conversations')
        .select(`
          *,
          contacts (
            id,
            name,
            phone,
            email
          ),
          agents (
            id,
            name,
            email
          )
        `)
        .eq('id', conversationId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data;
    } catch (error) {
      logger.error('Erro ao buscar conversa por ID:', error);
      throw error;
    }
  }
  
  /**
   * Obter estatísticas de conversas
   */
  async getConversationStats(period = '24h') {
    try {
      const hours = { '1h': 1, '24h': 24, '7d': 168, '30d': 720 }[period] || 24;
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      // Buscar conversas do período
      const { data: conversations, error } = await supabaseAdmin
        .from('conversations')
        .select('status, priority, channel, assigned_agent_id, created_at, closed_at')
        .gte('created_at', since);
      
      if (error) {
        throw error;
      }
      
      // Calcular estatísticas
      const stats = {
        total: conversations.length,
        open: conversations.filter(c => c.status === 'open').length,
        closed: conversations.filter(c => c.status === 'closed').length,
        pending: conversations.filter(c => c.status === 'pending').length,
        resolved: conversations.filter(c => c.status === 'resolved').length,
        unassigned: conversations.filter(c => !c.assigned_agent_id).length,
        byPriority: {},
        byChannel: {},
        averageResolutionTime: 0
      };
      
      // Agrupar por prioridade e canal
      conversations.forEach(conversation => {
        stats.byPriority[conversation.priority] = (stats.byPriority[conversation.priority] || 0) + 1;
        stats.byChannel[conversation.channel] = (stats.byChannel[conversation.channel] || 0) + 1;
      });
      
      // Calcular tempo médio de resolução
      const closedConversations = conversations.filter(c => c.closed_at);
      if (closedConversations.length > 0) {
        const totalResolutionTime = closedConversations.reduce((total, conversation) => {
          const created = new Date(conversation.created_at);
          const closed = new Date(conversation.closed_at);
          return total + (closed - created);
        }, 0);
        
        stats.averageResolutionTime = Math.round(totalResolutionTime / closedConversations.length / 1000 / 60); // em minutos
      }
      
      return {
        period,
        stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Erro ao obter estatísticas de conversas:', error);
      throw error;
    }
  }
  
  /**
   * Buscar conversas em espera (sem resposta)
   */
  async getPendingConversations(hoursWithoutResponse = 2) {
    try {
      const cutoffTime = new Date(Date.now() - hoursWithoutResponse * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabaseAdmin
        .from('conversations')
        .select(`
          *,
          contacts (
            id,
            name,
            phone
          ),
          messages!inner (
            id,
            direction,
            created_at
          )
        `)
        .eq('status', 'open')
        .eq('messages.direction', 'inbound')
        .lt('messages.created_at', cutoffTime)
        .order('last_message_at', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      logger.error('Erro ao buscar conversas em espera:', error);
      throw error;
    }
  }
  
  /**
   * Arquivar conversas antigas
   */
  async archiveOldConversations(daysOld = 30) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabaseAdmin
        .from('conversations')
        .update({ 
          status: 'archived',
          updated_at: new Date().toISOString()
        })
        .eq('status', 'closed')
        .lt('closed_at', cutoffDate)
        .select('id');
      
      if (error) {
        throw error;
      }
      
      logger.info('Conversas antigas arquivadas', { 
        count: data?.length || 0,
        daysOld,
        cutoffDate
      });
      
      return data?.length || 0;
    } catch (error) {
      logger.error('Erro ao arquivar conversas antigas:', error);
      throw error;
    }
  }
  
  /**
   * Formatar e validar dados da conversa
   */
  _formatConversationData(conversationData) {
    const formatted = {};
    
    // ID do contato (obrigatório para novas conversas)
    if (conversationData.contactId) {
      formatted.contactId = conversationData.contactId;
    }
    
    // ID da conversa na Umbler
    if (conversationData.umblerConversationId) {
      formatted.umblerConversationId = conversationData.umblerConversationId;
    }
    
    // Canal
    if (conversationData.channel) {
      const validChannels = ['whatsapp', 'telegram', 'email', 'chat'];
      if (!validChannels.includes(conversationData.channel)) {
        throw new Error(`Canal inválido. Deve ser: ${validChannels.join(', ')}`);
      }
      formatted.channel = conversationData.channel;
    }
    
    // Status
    if (conversationData.status) {
      const validStatuses = ['open', 'closed', 'pending', 'resolved', 'archived'];
      if (!validStatuses.includes(conversationData.status)) {
        throw new Error(`Status inválido. Deve ser: ${validStatuses.join(', ')}`);
      }
      formatted.status = conversationData.status;
    }
    
    // Prioridade
    if (conversationData.priority) {
      const validPriorities = ['low', 'normal', 'high', 'urgent'];
      if (!validPriorities.includes(conversationData.priority)) {
        throw new Error(`Prioridade inválida. Deve ser: ${validPriorities.join(', ')}`);
      }
      formatted.priority = conversationData.priority;
    }
    
    // ID do agente atribuído
    if (conversationData.assignedAgentId) {
      formatted.assignedAgentId = conversationData.assignedAgentId;
    }
    
    // Metadata
    if (conversationData.metadata) {
      if (typeof conversationData.metadata !== 'object') {
        throw new Error('Metadata deve ser um objeto');
      }
      formatted.metadata = conversationData.metadata;
    }
    
    return formatted;
  }
}

module.exports = new ConversationService();