const messageService = require('../services/messageService');
const logger = require('../utils/logger');
const { validatePagination } = require('../utils/helpers');



const { updateMessage } = require('../controllers/messageController');
router.put('/:id', asyncErrorHandler(updateMessage));

/**
 * Controller responsável por gerenciar mensagens
 */
class MessageController {
  
  /**
   * Listar todas as mensagens com paginação e filtros
   */
  async getAllMessages(req, res) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        conversation_id, 
        contact_id, 
        message_type, 
        date_from, 
        date_to 
      } = req.query;
      
      // Validar paginação
      const pagination = validatePagination(page, limit);
      
      // Montar filtros
      const filters = {};
      if (conversation_id) filters.conversation_id = conversation_id;
      if (contact_id) filters.contact_id = contact_id;
      if (message_type) filters.message_type = message_type;
      if (date_from) filters.date_from = date_from;
      if (date_to) filters.date_to = date_to;
      
      logger.info('📨 Buscando mensagens', {
        pagination,
        filters,
        userAgent: req.get('User-Agent')
      });
      
      const result = await messageService.getAllMessages(pagination, filters);
      
      res.status(200).json({
        success: true,
        message: 'Mensagens recuperadas com sucesso',
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
      logger.error('❌ Erro ao buscar mensagens', {
        error: error.message,
        stack: error.stack,
        query: req.query
      });
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao buscar mensagens',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
      });
    }
  }
  
  /**
   * Buscar mensagem por ID
   */
  async getMessageById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID da mensagem é obrigatório'
        });
      }
      
      logger.info('🔍 Buscando mensagem por ID', { messageId: id });
      
      const message = await messageService.getMessageById(id);
      
      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Mensagem não encontrada'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Mensagem encontrada com sucesso',
        data: message
      });
      
    } catch (error) {
      logger.error('❌ Erro ao buscar mensagem por ID', {
        error: error.message,
        stack: error.stack,
        messageId: req.params.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao buscar mensagem',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
      });
    }
  }
  
  /**
   * Buscar mensagens por conversa
   */
  async getMessagesByConversation(req, res) {
    try {
      const { conversation_id } = req.params;
      const { page = 1, limit = 50 } = req.query;
      
      if (!conversation_id) {
        return res.status(400).json({
          success: false,
          message: 'ID da conversa é obrigatório'
        });
      }
      
      const pagination = validatePagination(page, limit);
      
      logger.info('💬 Buscando mensagens por conversa', { 
        conversationId: conversation_id,
        pagination 
      });
      
      const result = await messageService.getMessagesByConversation(conversation_id, pagination);
      
      res.status(200).json({
        success: true,
        message: 'Mensagens da conversa recuperadas com sucesso',
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
      logger.error('❌ Erro ao buscar mensagens por conversa', {
        error: error.message,
        stack: error.stack,
        conversationId: req.params.conversation_id
      });
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao buscar mensagens',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
      });
    }
  }
  
  /**
   * Buscar mensagens por contato
   */
  async getMessagesByContact(req, res) {
    try {
      const { contact_id } = req.params;
      const { page = 1, limit = 50 } = req.query;
      
      if (!contact_id) {
        return res.status(400).json({
          success: false,
          message: 'ID do contato é obrigatório'
        });
      }
      
      const pagination = validatePagination(page, limit);
      
      logger.info('👤 Buscando mensagens por contato', { 
        contactId: contact_id,
        pagination 
      });
      
      const result = await messageService.getMessagesByContact(contact_id, pagination);
      
      res.status(200).json({
        success: true,
        message: 'Mensagens do contato recuperadas com sucesso',
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
      logger.error('❌ Erro ao buscar mensagens por contato', {
        error: error.message,
        stack: error.stack,
        contactId: req.params.contact_id
      });
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao buscar mensagens',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
      });
    }
  }
  
  /**
   * Criar nova mensagem
   */
  async createMessage(req, res) {
    try {
      const messageData = req.body;
      
      logger.info('➕ Criando nova mensagem', { messageData });
      
      const newMessage = await messageService.createMessage(messageData);
      
      res.status(201).json({
        success: true,
        message: 'Mensagem criada com sucesso',
        data: newMessage
      });
      
    } catch (error) {
      logger.error('❌ Erro ao criar mensagem', {
        error: error.message,
        stack: error.stack,
        messageData: req.body
      });
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao criar mensagem',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
      });
    }
  }
  
  /**
   * Atualizar mensagem existente
   */
  async updateMessage(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID da mensagem é obrigatório'
        });
      }
      
      logger.info('✏️ Atualizando mensagem', { messageId: id, updateData });
      
      const updatedMessage = await messageService.updateMessage(id, updateData);
      
      if (!updatedMessage) {
        return res.status(404).json({
          success: false,
          message: 'Mensagem não encontrada'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Mensagem atualizada com sucesso',
        data: updatedMessage
      });
      
    } catch (error) {
      logger.error('❌ Erro ao atualizar mensagem', {
        error: error.message,
        stack: error.stack,
        messageId: req.params.id,
        updateData: req.body
      });
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao atualizar mensagem',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
      });
    }
  }
  
  /**
   * Deletar mensagem
   */
  async deleteMessage(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID da mensagem é obrigatório'
        });
      }
      
      logger.info('🗑️ Deletando mensagem', { messageId: id });
      
      const deleted = await messageService.deleteMessage(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Mensagem não encontrada'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Mensagem deletada com sucesso'
      });
      
    } catch (error) {
      logger.error('❌ Erro ao deletar mensagem', {
        error: error.message,
        stack: error.stack,
        messageId: req.params.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao deletar mensagem',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
      });
    }
  }
  
  /**
   * Obter estatísticas das mensagens
   */
  async getMessageStats(req, res) {
    try {
      const { date_from, date_to } = req.query;
      
      logger.info('📊 Buscando estatísticas das mensagens', { date_from, date_to });
      
      const stats = await messageService.getMessageStats(date_from, date_to);
      
      res.status(200).json({
        success: true,
        message: 'Estatísticas recuperadas com sucesso',
        data: stats
      });
      
    } catch (error) {
      logger.error('❌ Erro ao buscar estatísticas das mensagens', {
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
   * Marcar mensagem como lida
   */
  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID da mensagem é obrigatório'
        });
      }
      
      logger.info('✅ Marcando mensagem como lida', { messageId: id });
      
      const message = await messageService.markAsRead(id);
      
      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Mensagem não encontrada'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Mensagem marcada como lida',
        data: message
      });
      
    } catch (error) {
      logger.error('❌ Erro ao marcar mensagem como lida', {
        error: error.message,
        stack: error.stack,
        messageId: req.params.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
      });
    }
  }
}

module.exports = new MessageController();