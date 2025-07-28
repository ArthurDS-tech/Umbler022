const conversationService = require('../services/conversationService');
const logger = require('../utils/logger');
const { validatePagination } = require('../utils/helpers');

/**
 * Controller responsável por gerenciar conversas
 */
class ConversationController {
  
  /**
   * Listar todas as conversas com paginação e filtros
   */
  async getAllConversations(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        contact_id, 
        status, 
        assigned_agent_id,
        date_from,
        date_to
      } = req.query;
      
      // Validar paginação
      const pagination = validatePagination(page, limit);
      
      // Montar filtros
      const filters = {};
      if (contact_id) filters.contact_id = contact_id;
      if (status) filters.status = status;
      if (assigned_agent_id) filters.assigned_agent_id = assigned_agent_id;
      if (date_from) filters.date_from = date_from;
      if (date_to) filters.date_to = date_to;
      
      logger.info('💬 Buscando conversas', {
        pagination,
        filters,
        userAgent: req.get('User-Agent')
      });
      
      const result = await conversationService.getAllConversations(pagination, filters);
      
      res.status(200).json({
        success: true,
        message: 'Conversas recuperadas com sucesso',
        data: result.data,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / pagination.limit),
          hasNext: pagination.page < Math.ceil(result.total / pagination.limit),
          hasPrev: pagination.page > 1
        }
      });
      
    } catch (error) {
      logger.error('❌ Erro ao buscar conversas', {
        error: error.message,
        stack: error.stack,
        query: req.query
      });
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao buscar conversas',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
      });
    }
  }
  
  /**
   * Buscar conversa por ID
   */
  async getConversationById(req, res) {
    try {
      const { id } = req.params;
      const { include_messages = false } = req.query;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID da conversa é obrigatório'
        });
      }
      
      logger.info('🔍 Buscando conversa por ID', { 
        conversationId: id,
        includeMessages: include_messages
      });
      
      const conversation = await conversationService.getConversationById(id, include_messages === 'true');
      
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversa não encontrada'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Conversa encontrada com sucesso',
        data: conversation
      });
      
    } catch (error) {
      logger.error('❌ Erro ao buscar conversa por ID', {
        error: error.message,
        stack: error.stack,
        conversationId: req.params.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao buscar conversa',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
      });
    }
  }
  
  /**
   * Buscar conversas por contato
   */
  async getConversationsByContact(req, res) {
    try {
      const { contact_id } = req.params;
      const { page = 1, limit = 20 } = req.query;
      
      if (!contact_id) {
        return res.status(400).json({
          success: false,
          message: 'ID do contato é obrigatório'
        });
      }
      
      const pagination = validatePagination(page, limit);
      
      logger.info('👤 Buscando conversas por contato', { 
        contactId: contact_id,
        pagination 
      });
      
      const result = await conversationService.getConversationsByContact(contact_id, pagination);
      
      res.status(200).json({
        success: true,
        message: 'Conversas do contato recuperadas com sucesso',
        data: result.data,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / pagination.limit),
          hasNext: pagination.page < Math.ceil(result.total / pagination.limit),
          hasPrev: pagination.page > 1
        }
      });
      
    } catch (error) {
      logger.error('❌ Erro ao buscar conversas por contato', {
        error: error.message,
        stack: error.stack,
        contactId: req.params.contact_id
      });
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao buscar conversas',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
      });
    }
  }
  
  /**
   * Criar nova conversa
   */
  async createConversation(req, res) {
    try {
      const conversationData = req.body;
      
      logger.info('➕ Criando nova conversa', { conversationData });
      
      const newConversation = await conversationService.createConversation(conversationData);
      
      res.status(201).json({
        success: true,
        message: 'Conversa criada com sucesso',
        data: newConversation
      });
      
    } catch (error) {
      logger.error('❌ Erro ao criar conversa', {
        error: error.message,
        stack: error.stack,
        conversationData: req.body
      });
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao criar conversa',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
      });
    }
  }
  
  /**
   * Atualizar conversa existente
   */
  async updateConversation(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID da conversa é obrigatório'
        });
      }
      
      logger.info('✏️ Atualizando conversa', { conversationId: id, updateData });
      
      const updatedConversation = await conversationService.updateConversation(id, updateData);
      
      if (!updatedConversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversa não encontrada'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Conversa atualizada com sucesso',
        data: updatedConversation
      });
      
    } catch (error) {
      logger.error('❌ Erro ao atualizar conversa', {
        error: error.message,
        stack: error.stack,
        conversationId: req.params.id,
        updateData: req.body
      });
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao atualizar conversa',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
      });
    }
  }
  
  /**
   * Deletar conversa
   */
  async deleteConversation(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID da conversa é obrigatório'
        });
      }
      
      logger.info('🗑️ Deletando conversa', { conversationId: id });
      
      const deleted = await conversationService.deleteConversation(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Conversa não encontrada'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Conversa deletada com sucesso'
      });
      
    } catch (error) {
      logger.error('❌ Erro ao deletar conversa', {
        error: error.message,
        stack: error.stack,
        conversationId: req.params.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao deletar conversa',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
      });
    }
  }
  
  /**
   * Fechar conversa
   */
  async closeConversation(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID da conversa é obrigatório'
        });
      }
      
      logger.info('🔒 Fechando conversa', { conversationId: id });
      
      const closedConversation = await conversationService.closeConversation(id);
      
      if (!closedConversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversa não encontrada'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Conversa fechada com sucesso',
        data: closedConversation
      });
      
    } catch (error) {
      logger.error('❌ Erro ao fechar conversa', {
        error: error.message,
        stack: error.stack,
        conversationId: req.params.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao fechar conversa',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
      });
    }
  }
  
  /**
   * Atribuir conversa a um agente
   */
  async assignConversation(req, res) {
    try {
      const { id } = req.params;
      const { agent_id } = req.body;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID da conversa é obrigatório'
        });
      }
      
      if (!agent_id) {
        return res.status(400).json({
          success: false,
          message: 'ID do agente é obrigatório'
        });
      }
      
      logger.info('👤 Atribuindo conversa a agente', { 
        conversationId: id, 
        agentId: agent_id 
      });
      
      const assignedConversation = await conversationService.assignConversation(id, agent_id);
      
      if (!assignedConversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversa não encontrada'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Conversa atribuída com sucesso',
        data: assignedConversation
      });
      
    } catch (error) {
      logger.error('❌ Erro ao atribuir conversa', {
        error: error.message,
        stack: error.stack,
        conversationId: req.params.id,
        agentId: req.body.agent_id
      });
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao atribuir conversa',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
      });
    }
  }
  
  /**
   * Obter estatísticas das conversas
   */
  async getConversationStats(req, res) {
    try {
      const { date_from, date_to, agent_id } = req.query;
      
      logger.info('📊 Buscando estatísticas das conversas', { 
        date_from, 
        date_to, 
        agent_id 
      });
      
      const stats = await conversationService.getConversationStats(date_from, date_to, agent_id);
      
      res.status(200).json({
        success: true,
        message: 'Estatísticas recuperadas com sucesso',
        data: stats
      });
      
    } catch (error) {
      logger.error('❌ Erro ao buscar estatísticas das conversas', {
        error: error.message,
        stack: error.stack
      });
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao buscar estatísticas',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
      });
    }
  }
  
  /**
   * Buscar conversas em aberto
   */
  async getOpenConversations(req, res) {
    try {
      const { page = 1, limit = 20, agent_id } = req.query;
      
      const pagination = validatePagination(page, limit);
      const filters = { status: 'open' };
      if (agent_id) filters.assigned_agent_id = agent_id;
      
      logger.info('🔓 Buscando conversas em aberto', { pagination, filters });
      
      const result = await conversationService.getAllConversations(pagination, filters);
      
      res.status(200).json({
        success: true,
        message: 'Conversas em aberto recuperadas com sucesso',
        data: result.data,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / pagination.limit),
          hasNext: pagination.page < Math.ceil(result.total / pagination.limit),
          hasPrev: pagination.page > 1
        }
      });
      
    } catch (error) {
      logger.error('❌ Erro ao buscar conversas em aberto', {
        error: error.message,
        stack: error.stack
      });
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao buscar conversas em aberto',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
      });
    }
  }
}

module.exports = new ConversationController();