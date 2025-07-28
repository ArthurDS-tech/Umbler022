const express = require('express');
const rateLimit = require('express-rate-limit');
const messageController = require('../controllers/messageController');
const { validateCreateMessage, validateUpdateMessage } = require('../middleware/validation');
const { asyncErrorHandler } = require('../middleware/errorHandler');

const router = express.Router();

// =============================================
// RATE LIMITING
// =============================================

// Rate limit geral para messages
const messagesLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // máximo 200 requests por IP por janela (mais alto que contatos)
  message: {
    error: 'Muitas requisições para mensagens. Tente novamente em 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limit para criação/edição de mensagens
const modifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 50, // máximo 50 modificações por IP por janela
  message: {
    error: 'Muitas operações de modificação em mensagens. Tente novamente em 5 minutos.',
    code: 'MODIFY_RATE_LIMIT_EXCEEDED'
  }
});

// =============================================
// ROTAS DE MENSAGENS
// =============================================

/**
 * @route GET /api/messages
 * @desc Listar todas as mensagens com paginação e filtros
 * @access Public
 * @query {number} page - Página (padrão: 1)
 * @query {number} limit - Limite por página (padrão: 50, máx: 200)
 * @query {string} conversation_id - Filtrar por ID da conversa
 * @query {string} contact_id - Filtrar por ID do contato
 * @query {string} message_type - Filtrar por tipo (text, image, audio, video, document)
 * @query {string} date_from - Data inicial (YYYY-MM-DD)
 * @query {string} date_to - Data final (YYYY-MM-DD)
 */
router.get('/',
  messagesLimiter,
  asyncErrorHandler(messageController.getAllMessages)
);

/**
 * @route GET /api/messages/stats
 * @desc Obter estatísticas das mensagens
 * @access Public
 * @query {string} date_from - Data inicial para estatísticas
 * @query {string} date_to - Data final para estatísticas
 */
router.get('/stats',
  messagesLimiter,
  asyncErrorHandler(messageController.getMessageStats)
);

/**
 * @route GET /api/messages/:id
 * @desc Buscar mensagem por ID
 * @access Public
 * @param {string} id - ID da mensagem (UUID)
 */
router.get('/:id',
  messagesLimiter,
  asyncErrorHandler(messageController.getMessageById)
);

/**
 * @route GET /api/messages/conversation/:conversation_id
 * @desc Buscar mensagens por conversa
 * @access Public
 * @param {string} conversation_id - ID da conversa (UUID)
 * @query {number} page - Página (padrão: 1)
 * @query {number} limit - Limite por página (padrão: 50)
 */
router.get('/conversation/:conversation_id',
  messagesLimiter,
  asyncErrorHandler(messageController.getMessagesByConversation)
);

/**
 * @route GET /api/messages/contact/:contact_id
 * @desc Buscar mensagens por contato
 * @access Public
 * @param {string} contact_id - ID do contato (UUID)
 * @query {number} page - Página (padrão: 1)
 * @query {number} limit - Limite por página (padrão: 50)
 */
router.get('/contact/:contact_id',
  messagesLimiter,
  asyncErrorHandler(messageController.getMessagesByContact)
);

/**
 * @route POST /api/messages
 * @desc Criar nova mensagem
 * @access Public
 * @body {object} messageData - Dados da mensagem
 * @body {string} messageData.conversation_id - ID da conversa
 * @body {string} messageData.contact_id - ID do contato
 * @body {string} messageData.content - Conteúdo da mensagem
 * @body {string} messageData.message_type - Tipo da mensagem
 * @body {string} messageData.direction - Direção (inbound/outbound)
 * @body {object} [messageData.metadata] - Metadados adicionais
 */
router.post('/',
  messagesLimiter,
  modifyLimiter,
  validateCreateMessage,
  asyncErrorHandler(messageController.createMessage)
);

/**
 * @route PUT /api/messages/:id
 * @desc Atualizar mensagem existente
 * @access Public
 * @param {string} id - ID da mensagem (UUID)
 * @body {object} updateData - Dados para atualização
 * @body {string} [updateData.content] - Conteúdo da mensagem
 * @body {boolean} [updateData.is_read] - Status de leitura
 * @body {object} [updateData.metadata] - Metadados adicionais
 */
router.put('/:id',
  messagesLimiter,
  modifyLimiter,
  validateUpdateMessage,
  asyncErrorHandler(messageController.updateMessage)
);

/**
 * @route PATCH /api/messages/:id/read
 * @desc Marcar mensagem como lida
 * @access Public
 * @param {string} id - ID da mensagem (UUID)
 */
router.patch('/:id/read',
  messagesLimiter,
  asyncErrorHandler(messageController.markAsRead)
);

/**
 * @route DELETE /api/messages/:id
 * @desc Deletar mensagem
 * @access Public
 * @param {string} id - ID da mensagem (UUID)
 */
router.delete('/:id',
  messagesLimiter,
  modifyLimiter,
  asyncErrorHandler(messageController.deleteMessage)
);

// =============================================
// MIDDLEWARE DE VALIDAÇÃO DE PARÂMETROS
// =============================================

// Validar UUID nos parâmetros
router.param('id', (req, res, next, id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(id)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'ID da mensagem deve ser um UUID válido',
        code: 'INVALID_UUID',
        status: 400
      }
    });
  }
  
  next();
});

// Validar UUID para conversation_id
router.param('conversation_id', (req, res, next, conversationId) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(conversationId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'ID da conversa deve ser um UUID válido',
        code: 'INVALID_UUID',
        status: 400
      }
    });
  }
  
  next();
});

// Validar UUID para contact_id
router.param('contact_id', (req, res, next, contactId) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(contactId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'ID do contato deve ser um UUID válido',
        code: 'INVALID_UUID',
        status: 400
      }
    });
  }
  
  next();
});

// =============================================
// MIDDLEWARE DE DOCUMENTAÇÃO
// =============================================

// Adicionar headers de documentação
router.use((req, res, next) => {
  res.set({
    'X-API-Version': '1.0.0',
    'X-API-Resource': 'messages',
    'X-Rate-Limit-Resource': 'messages'
  });
  next();
});

module.exports = router;