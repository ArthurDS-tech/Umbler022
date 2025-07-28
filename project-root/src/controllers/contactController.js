const contactService = require('../services/contactService');
const logger = require('../utils/logger');
const { validatePagination } = require('../utils/helpers');

/**
 * Controller responsável por gerenciar contatos
 */
class ContactController {
  
  /**
   * Listar todos os contatos com paginação e filtros
   */
  async getAllContacts(req, res) {
    try {
      const { page = 1, limit = 20, name, phone, email, status } = req.query;
      
      // Validar paginação
      const pagination = validatePagination(page, limit);
      
      // Montar filtros
      const filters = {};
      if (name) filters.name = name;
      if (phone) filters.phone = phone;
      if (email) filters.email = email;
      if (status) filters.status = status;
      
      logger.info('📋 Buscando contatos', {
        pagination,
        filters,
        userAgent: req.get('User-Agent')
      });
      
      const result = await contactService.getAllContacts(pagination, filters);
      
      res.status(200).json({
        success: true,
        message: 'Contatos recuperados com sucesso',
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
      logger.error('❌ Erro ao buscar contatos', {
        error: error.message,
        stack: error.stack,
        query: req.query
      });
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao buscar contatos',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
      });
    }
  }
  
  /**
   * Buscar contato por ID
   */
  async getContactById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID do contato é obrigatório'
        });
      }
      
      logger.info('🔍 Buscando contato por ID', { contactId: id });
      
      const contact = await contactService.getContactById(id);
      
      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contato não encontrado'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Contato encontrado com sucesso',
        data: contact
      });
      
    } catch (error) {
      logger.error('❌ Erro ao buscar contato por ID', {
        error: error.message,
        stack: error.stack,
        contactId: req.params.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao buscar contato',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
      });
    }
  }
  
  /**
   * Buscar contato por telefone
   */
  async getContactByPhone(req, res) {
    try {
      const { phone } = req.params;
      
      if (!phone) {
        return res.status(400).json({
          success: false,
          message: 'Telefone é obrigatório'
        });
      }
      
      logger.info('📱 Buscando contato por telefone', { phone });
      
      const contact = await contactService.getContactByPhone(phone);
      
      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contato não encontrado para este telefone'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Contato encontrado com sucesso',
        data: contact
      });
      
    } catch (error) {
      logger.error('❌ Erro ao buscar contato por telefone', {
        error: error.message,
        stack: error.stack,
        phone: req.params.phone
      });
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao buscar contato',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
      });
    }
  }
  
  /**
   * Criar novo contato
   */
  async createContact(req, res) {
    try {
      const contactData = req.body;
      
      logger.info('➕ Criando novo contato', { contactData });
      
      const newContact = await contactService.createContact(contactData);
      
      res.status(201).json({
        success: true,
        message: 'Contato criado com sucesso',
        data: newContact
      });
      
    } catch (error) {
      logger.error('❌ Erro ao criar contato', {
        error: error.message,
        stack: error.stack,
        contactData: req.body
      });
      
      if (error.message.includes('já existe')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao criar contato',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
      });
    }
  }
  
  /**
   * Atualizar contato existente
   */
  async updateContact(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID do contato é obrigatório'
        });
      }
      
      logger.info('✏️ Atualizando contato', { contactId: id, updateData });
      
      const updatedContact = await contactService.updateContact(id, updateData);
      
      if (!updatedContact) {
        return res.status(404).json({
          success: false,
          message: 'Contato não encontrado'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Contato atualizado com sucesso',
        data: updatedContact
      });
      
    } catch (error) {
      logger.error('❌ Erro ao atualizar contato', {
        error: error.message,
        stack: error.stack,
        contactId: req.params.id,
        updateData: req.body
      });
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao atualizar contato',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
      });
    }
  }
  
  /**
   * Deletar contato
   */
  async deleteContact(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID do contato é obrigatório'
        });
      }
      
      logger.info('🗑️ Deletando contato', { contactId: id });
      
      const deleted = await contactService.deleteContact(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Contato não encontrado'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Contato deletado com sucesso'
      });
      
    } catch (error) {
      logger.error('❌ Erro ao deletar contato', {
        error: error.message,
        stack: error.stack,
        contactId: req.params.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao deletar contato',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
      });
    }
  }
  
  /**
   * Obter estatísticas dos contatos
   */
  async getContactStats(req, res) {
    try {
      logger.info('📊 Buscando estatísticas dos contatos');
      
      const stats = await contactService.getContactStats();
      
      res.status(200).json({
        success: true,
        message: 'Estatísticas recuperadas com sucesso',
        data: stats
      });
      
    } catch (error) {
      logger.error('❌ Erro ao buscar estatísticas dos contatos', {
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
}

module.exports = new ContactController();