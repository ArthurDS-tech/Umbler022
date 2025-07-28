const express = require('express');
const rateLimit = require('express-rate-limit');
const conversationController = require('../controllers/conversationController');
const { validateCreateConversation, validateUpdateConversation } = require('../middleware/validation');
const { asyncErrorHandler } = require('../middleware/errorHandler');

const router = express.Router();

// =============================================
// RATE LIMITING
// =============================================

// Rate limit geral para conversations
const conversationsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 150, // máximo 150 requests por IP por janela
  message: {
    error: 'Muitas requisições para conversas. Tente novamente em 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limit para criação/edição de conversas
const modifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 30, // máximo 30 modificações por IP por janela
  message: {
    error: 'Muitas operações de modificação em conversas. Tente novamente em 5 minutos.',
    code: 'MODIFY_RATE_LIMIT_EXCEEDED'
  }
});

// =============================================
// ROTAS DE CONVERSAS
// =============================================

/**
 * @route GET /api/conversations
 * @desc Listar todas as conversas com paginação e filtros
 * @access Public
 * @query {number} page - Página (padrão: 1)
 * @query {number} limit - Limite por página (padrão: 20, máx: 100)
 * @query {string} contact_id - Filtrar por ID do contato
 * @query {string} status - Filtrar por status (open, closed, pending)
 * @query {string} assigned_agent_id - Filtrar por agente atribuído
 * @query {string} date_from - Data inicial (YYYY-MM-DD)
 * @query {string} date_to - Data final (YYYY-MM-DD)
 */
router.get('/',
  conversationsLimiter,
  asyncErrorHandler(conversationController.getAllConversations)
);

/**
 * @route GET /api/conversations/open
 * @desc Buscar conversas em aberto
 * @access Public
 * @query {number} page - Página (padrão: 1)
 * @query {number} limit - Limite por página (padrão: 20)
 * @query {string} agent_id - Filtrar por agente específico
 */
router.get('/open',
  conversationsLimiter,
  asyncErrorHandler(conversationController.getOpenConversations)
);

/**
 * @route GET /api/conversations/stats
 * @desc Obter estatísticas das conversas
 * @access Public
 * @query {string} date_from - Data inicial para estatísticas
 * @query {string} date_to - Data final para estatísticas
 * @query {string} agent_id - Filtrar por agente específico
 */
router.get('/stats',
  conversationsLimiter,
  asyncErrorHandler(conversationController.getConversationStats)
);

/**
 * @route GET /api/conversations/:id
 * @desc Buscar conversa por ID
 * @access Public
 * @param {string} id - ID da conversa (UUID)
 * @query {boolean} include_messages - Incluir mensagens da conversa (padrão: false)
 */
router.get('/:id',
  conversationsLimiter,
  asyncErrorHandler(conversationController.getConversationById)
);

/**
 * @route GET /api/conversations/contact/:contact_id
 * @desc Buscar conversas por contato
 * @access Public
 * @param {string} contact_id - ID do contato (UUID)
 * @query {number} page - Página (padrão: 1)
 * @query {number} limit - Limite por página (padrão: 20)
 */
router.get('/contact/:contact_id',
  conversationsLimiter,
  asyncErrorHandler(conversationController.getConversationsByContact)
);

/**
 * @route POST /api/conversations
 * @desc Criar nova conversa
 * @access Public
 * @body {object} conversationData - Dados da conversa
 * @body {string} conversationData.contact_id - ID do contato
 * @body {string} [conversationData.status] - Status inicial (padrão: open)
 * @body {string} [conversationData.assigned_agent_id] - ID do agente atribuído
 * @body {object} [conversationData.metadata] - Metadados adicionais
 */
router.post('/',
  conversationsLimiter,
  modifyLimiter,
  validateCreateConversation,
  asyncErrorHandler(conversationController.createConversation)
);

/**
 * @route PUT /api/conversations/:id
 * @desc Atualizar conversa existente
 * @access Public
 * @param {string} id - ID da conversa (UUID)
 * @body {object} updateData - Dados para atualização
 * @body {string} [updateData.status] - Status da conversa
 * @body {string} [updateData.assigned_agent_id] - ID do agente atribuído
 * @body {object} [updateData.metadata] - Metadados adicionais
 */
router.put('/:id',
  conversationsLimiter,
  modifyLimiter,
  validateUpdateConversation,
  asyncErrorHandler(conversationController.updateConversation)
);

/**
 * @route PATCH /api/conversations/:id/close
 * @desc Fechar conversa
 * @access Public
 * @param {string} id - ID da conversa (UUID)
 */
router.patch('/:id/close',
  conversationsLimiter,
  asyncErrorHandler(conversationController.closeConversation)
);

/**
 * @route PATCH /api/conversations/:id/assign
 * @desc Atribuir conversa a um agente
 * @access Public
 * @param {string} id - ID da conversa (UUID)
 * @body {object} assignData - Dados da atribuição
 * @body {string} assignData.agent_id - ID do agente
 */
router.patch('/:id/assign',
  conversationsLimiter,
  modifyLimiter,
  asyncErrorHandler(conversationController.assignConversation)
);

/**
 * @route DELETE /api/conversations/:id
 * @desc Deletar conversa
 * @access Public
 * @param {string} id - ID da conversa (UUID)
 */
router.delete('/:id',
  conversationsLimiter,
  modifyLimiter,
  asyncErrorHandler(conversationController.deleteConversation)
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

// Validar dados de atribuição
router.use('/:id/assign', (req, res, next) => {
  const { agent_id } = req.body;
  
  if (!agent_id) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'ID do agente é obrigatório para atribuição',
        code: 'MISSING_AGENT_ID',
        status: 400
      }
    });
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(agent_id)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'ID do agente deve ser um UUID válido',
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
    'X-API-Resource': 'conversations',
    'X-Rate-Limit-Resource': 'conversations'
  });
  next();
});

module.exports = router;