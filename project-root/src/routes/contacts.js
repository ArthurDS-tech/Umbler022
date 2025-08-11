const express = require('express');
const rateLimit = require('express-rate-limit');
const contactController = require('../controllers/contactController');
const { validateCreateContact, validateUpdateContact } = require('../middleware/validation');
const { asyncErrorHandler } = require('../middleware/errorHandler');

const router = express.Router();

// =============================================
// RATE LIMITING
// =============================================

// Rate limit geral para contacts
const contactsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP por janela
  message: {
    error: 'Muitas requisições para contatos. Tente novamente em 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limit mais restritivo para criação/edição
const modifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20, // máximo 20 modificações por IP por janela
  message: {
    error: 'Muitas operações de modificação. Tente novamente em 5 minutos.',
    code: 'MODIFY_RATE_LIMIT_EXCEEDED'
  }
});

// =============================================
// ROTAS DE CONTATOS
// =============================================

/**
 * @route GET /api/contacts
 * @desc Listar todos os contatos com paginação e filtros
 * @access Public
 * @query {number} page - Página (padrão: 1)
 * @query {number} limit - Limite por página (padrão: 20, máx: 100)
 * @query {string} name - Filtrar por nome
 * @query {string} phone - Filtrar por telefone
 * @query {string} email - Filtrar por email
 * @query {string} status - Filtrar por status (active, inactive, blocked)
 */
router.get('/', 
  contactsLimiter,
  asyncErrorHandler(contactController.getAllContacts)
);

/**
 * @route GET /api/contacts/stats
 * @desc Obter estatísticas dos contatos
 * @access Public
 */
router.get('/stats',
  contactsLimiter,
  asyncErrorHandler(contactController.getContactStats)
);

/**
 * @route GET /api/contacts/:id
 * @desc Buscar contato por ID
 * @access Public
 * @param {string} id - ID do contato (UUID)
 */
router.get('/:id',
  contactsLimiter,
  asyncErrorHandler(contactController.getContactById)
);

/**
 * @route GET /api/contacts/phone/:phone
 * @desc Buscar contato por telefone
 * @access Public
 * @param {string} phone - Número de telefone
 */
router.get('/phone/:phone',
  contactsLimiter,
  asyncErrorHandler(contactController.getContactByPhone)
);

/**
 * @route POST /api/contacts
 * @desc Criar novo contato
 * @access Public
 * @body {object} contactData - Dados do contato
 * @body {string} contactData.name - Nome do contato
 * @body {string} contactData.phone - Telefone do contato
 * @body {string} [contactData.email] - Email do contato
 * @body {object} [contactData.metadata] - Metadados adicionais
 */
router.post('/',
  contactsLimiter,
  modifyLimiter,
  validateCreateContact,
  asyncErrorHandler(contactController.createContact)
);

/**
 * @route PUT /api/contacts/:id
 * @desc Atualizar contato existente
 * @access Public
 * @param {string} id - ID do contato (UUID)
 * @body {object} updateData - Dados para atualização
 * @body {string} [updateData.name] - Nome do contato
 * @body {string} [updateData.email] - Email do contato
 * @body {string} [updateData.status] - Status do contato
 * @body {object} [updateData.metadata] - Metadados adicionais
 */
router.put('/:id',
  contactsLimiter,
  modifyLimiter,
  validateUpdateContact,
  asyncErrorHandler(contactController.updateContact)
);

/**
 * @route DELETE /api/contacts/:id
 * @desc Deletar contato
 * @access Public
 * @param {string} id - ID do contato (UUID)
 */
router.delete('/:id',
  contactsLimiter,
  modifyLimiter,
  asyncErrorHandler(contactController.deleteContact)
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
        message: 'ID do contato deve ser um UUID válido',
        code: 'INVALID_UUID',
        status: 400
      }
    });
  }
  
  next();
});

// Validar telefone nos parâmetros
router.param('phone', (req, res, next, phone) => {
  const phoneRegex = /^(\+55|55)?(\d{2})(\d{4,5})(\d{4})$/;
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (!phoneRegex.test(cleanPhone)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Formato de telefone inválido. Use o formato brasileiro: +5511999999999',
        code: 'INVALID_PHONE_FORMAT',
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
    'X-API-Resource': 'contacts',
    'X-Rate-Limit-Resource': 'contacts'
  });
  next();
});

module.exports = router;