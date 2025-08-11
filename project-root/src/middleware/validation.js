const Joi = require('joi');
const logger = require('../utils/logger');

/**
 * Middleware de validação para webhooks e APIs
 */

// =============================================
// SCHEMAS DE VALIDAÇÃO
// =============================================

// Schema para payload do webhook da Umbler (Novo formato)
const umblerWebhookSchema = Joi.object({
  Type: Joi.string().required(),
  EventDate: Joi.string().isoDate().required(),
  EventId: Joi.string().required(),
  Payload: Joi.object({
    Type: Joi.string().required(),
    Content: Joi.object().required()
  }).required()
});

// Schema para payload do webhook da Umbler (Formato legado - manter compatibilidade)
const webhookPayloadSchema = Joi.object({
  event: Joi.string().optional(),
  timestamp: Joi.string().isoDate().optional(),
  webhook_id: Joi.string().optional(),
  
  // Dados da mensagem
  message: Joi.object({
    id: Joi.string().required(),
    type: Joi.string().valid('text', 'image', 'audio', 'video', 'document', 'location', 'contact', 'sticker').default('text'),
    content: Joi.string().allow('').optional(),
    text: Joi.string().allow('').optional(), // Alias para content
    direction: Joi.string().valid('inbound', 'outbound').optional(),
    timestamp: Joi.string().isoDate().optional(),
    status: Joi.string().valid('sent', 'delivered', 'read', 'failed').optional(),
    
    // Dados de mídia
    media_url: Joi.string().uri().optional(),
    media_filename: Joi.string().optional(),
    media_mime_type: Joi.string().optional(),
    media_size: Joi.number().integer().positive().optional(),
    
    // Dados específicos por tipo
    location: Joi.object({
      latitude: Joi.number(),
      longitude: Joi.number(),
      address: Joi.string().optional()
    }).optional(),
    
    contact: Joi.object({
      name: Joi.string(),
      phone: Joi.string(),
      email: Joi.string().email().optional()
    }).optional()
  }).optional(),
  
  // Dados do contato
  contact: Joi.object({
    phone: Joi.string().required(),
    name: Joi.string().allow('').optional(),
    email: Joi.string().email().allow('').optional(),
    profile_pic: Joi.string().uri().allow('').optional(),
    status: Joi.string().valid('active', 'blocked', 'archived').optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    metadata: Joi.object().optional()
  }).optional(),
  
  // Dados da conversa
  conversation: Joi.object({
    id: Joi.string().required(),
    status: Joi.string().valid('open', 'closed', 'pending', 'resolved').optional(),
    channel: Joi.string().valid('whatsapp', 'telegram', 'email', 'chat').default('whatsapp'),
    assigned_agent_id: Joi.string().uuid().allow(null).optional(),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
    created_at: Joi.string().isoDate().optional(),
    updated_at: Joi.string().isoDate().optional()
  }).optional(),
  
  // Dados do agente (se aplicável)
  agent: Joi.object({
    id: Joi.string().uuid(),
    name: Joi.string(),
    email: Joi.string().email()
  }).optional(),
  
  // Metadados adicionais
  metadata: Joi.object().optional()
}).min(1); // Pelo menos um campo deve estar presente

// Schema para criar contato
const createContactSchema = Joi.object({
  phone: Joi.string().required().messages({
    'any.required': 'Telefone é obrigatório',
    'string.empty': 'Telefone não pode estar vazio'
  }),
  name: Joi.string().min(1).max(255).optional(),
  email: Joi.string().email().optional(),
  profilePicUrl: Joi.string().uri().optional(),
  status: Joi.string().valid('active', 'blocked', 'archived').default('active'),
  tags: Joi.array().items(Joi.string()).optional(),
  metadata: Joi.object().optional()
});

// Schema para atualizar contato
const updateContactSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  email: Joi.string().email().allow('').optional(),
  profilePicUrl: Joi.string().uri().allow('').optional(),
  status: Joi.string().valid('active', 'blocked', 'archived').optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  metadata: Joi.object().optional()
}).min(1);

// Schema para criar mensagem
const createMessageSchema = Joi.object({
  conversationId: Joi.string().uuid().required(),
  contactId: Joi.string().uuid().required(),
  direction: Joi.string().valid('inbound', 'outbound').required(),
  messageType: Joi.string().valid('text', 'image', 'audio', 'video', 'document', 'location', 'contact', 'sticker').default('text'),
  content: Joi.string().allow('').optional(),
  mediaUrl: Joi.string().uri().optional(),
  mediaFilename: Joi.string().optional(),
  mediaMimeType: Joi.string().optional(),
  mediaSize: Joi.number().integer().positive().optional(),
  metadata: Joi.object().optional()
});

// Schema para atualizar mensagem
const updateMessageSchema = Joi.object({
  content: Joi.string().allow('').optional(),
  isRead: Joi.boolean().optional(),
  metadata: Joi.object().optional()
}).min(1);

// Schema para criar conversa
const createConversationSchema = Joi.object({
  contactId: Joi.string().uuid().required(),
  status: Joi.string().valid('open', 'closed', 'pending', 'resolved').default('open'),
  channel: Joi.string().valid('whatsapp', 'telegram', 'email', 'chat').default('whatsapp'),
  assignedAgentId: Joi.string().uuid().allow(null).optional(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
  metadata: Joi.object().optional()
});

// Schema para atualizar conversa
const updateConversationSchema = Joi.object({
  status: Joi.string().valid('open', 'closed', 'pending', 'resolved').optional(),
  assignedAgentId: Joi.string().uuid().allow(null).optional(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
  metadata: Joi.object().optional()
}).min(1);

// Schema para filtros de paginação
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  orderBy: Joi.string().optional(),
  orderDirection: Joi.string().valid('asc', 'desc').default('desc')
});

// Schema para filtros de data
const dateFilterSchema = Joi.object({
  startDate: Joi.string().isoDate().optional(),
  endDate: Joi.string().isoDate().optional()
}).custom((value, helpers) => {
  if (value.startDate && value.endDate && new Date(value.startDate) > new Date(value.endDate)) {
    return helpers.error('custom.dateRange');
  }
  return value;
}, 'Data range validation').messages({
  'custom.dateRange': 'Data inicial deve ser anterior à data final'
});

// =============================================
// MIDDLEWARE FUNCTIONS
// =============================================

/**
 * Validar payload do webhook
 */
const validateWebhookPayload = (req, res, next) => {
  try {
    // Primeiro tentar validar com o novo formato da Umbler
    const { error: umblerError, value: umblerValue } = umblerWebhookSchema.validate(req.body, {
      stripUnknown: false,
      convert: true,
      allowUnknown: true
    });
    
    if (!umblerError) {
      req.validatedBody = umblerValue;
      return next();
    }
    
    // Se falhar, tentar com o formato legado
    const { error: legacyError, value: legacyValue } = webhookPayloadSchema.validate(req.body, {
      stripUnknown: true,
      convert: true,
      allowUnknown: true
    });
    
    if (!legacyError) {
      req.validatedBody = legacyValue;
      return next();
    }
    
    // Se ambos falharem, log do erro mas permitir processamento
    logger.warn('Payload do webhook não corresponde aos schemas conhecidos - processando mesmo assim', {
      umblerError: umblerError.details,
      legacyError: legacyError.details,
      bodyKeys: Object.keys(req.body || {}),
      bodyType: req.body?.Type || 'unknown'
    });
    
    // Permitir processamento mesmo com formato desconhecido
    req.validatedBody = req.body;
    next();
    
  } catch (validationError) {
    logger.error('Erro na validação do webhook:', validationError);
    // Não falhar - permitir processamento
    req.validatedBody = req.body;
    next();
  }
};

/**
 * Validar dados de criação de contato
 */
const validateCreateContact = (req, res, next) => {
  const { error, value } = createContactSchema.validate(req.body, {
    stripUnknown: true,
    convert: true
  });
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Dados inválidos para criar contato',
      code: 'INVALID_CONTACT_DATA',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  
  req.validatedBody = value;
  next();
};

/**
 * Validar dados de atualização de contato
 */
const validateUpdateContact = (req, res, next) => {
  const { error, value } = updateContactSchema.validate(req.body, {
    stripUnknown: true,
    convert: true
  });
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Dados inválidos para atualizar contato',
      code: 'INVALID_UPDATE_DATA',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  
  req.validatedBody = value;
  next();
};

/**
 * Validar dados de criação de mensagem
 */
const validateCreateMessage = (req, res, next) => {
  const { error, value } = createMessageSchema.validate(req.body, {
    stripUnknown: true,
    convert: true
  });
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Dados inválidos para criar mensagem',
      code: 'INVALID_MESSAGE_DATA',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  
  req.validatedBody = value;
  next();
};

/**
 * Validar dados de atualização de mensagem
 */
const validateUpdateMessage = (req, res, next) => {
  const { error, value } = updateMessageSchema.validate(req.body, {
    stripUnknown: true,
    convert: true
  });
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Dados inválidos para atualizar mensagem',
      code: 'INVALID_UPDATE_MESSAGE_DATA',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  
  req.validatedBody = value;
  next();
};

/**
 * Validar dados de criação de conversa
 */
const validateCreateConversation = (req, res, next) => {
  const { error, value } = createConversationSchema.validate(req.body, {
    stripUnknown: true,
    convert: true
  });
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Dados inválidos para criar conversa',
      code: 'INVALID_CONVERSATION_DATA',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  
  req.validatedBody = value;
  next();
};

/**
 * Validar dados de atualização de conversa
 */
const validateUpdateConversation = (req, res, next) => {
  const { error, value } = updateConversationSchema.validate(req.body, {
    stripUnknown: true,
    convert: true
  });
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Dados inválidos para atualizar conversa',
      code: 'INVALID_UPDATE_CONVERSATION_DATA',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  
  req.validatedBody = value;
  next();
};

/**
 * Validar parâmetros de paginação
 */
const validatePagination = (req, res, next) => {
  const { error, value } = paginationSchema.validate(req.query, {
    stripUnknown: false,
    convert: true
  });
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Parâmetros de paginação inválidos',
      code: 'INVALID_PAGINATION',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  
  req.pagination = {
    page: value.page,
    limit: value.limit,
    orderBy: value.orderBy,
    orderDirection: value.orderDirection
  };
  
  next();
};

/**
 * Validar filtros de data
 */
const validateDateFilters = (req, res, next) => {
  const dateFields = {
    startDate: req.query.startDate,
    endDate: req.query.endDate
  };
  
  const { error, value } = dateFilterSchema.validate(dateFields, {
    stripUnknown: true,
    convert: true
  });
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Filtros de data inválidos',
      code: 'INVALID_DATE_FILTERS',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  
  req.dateFilters = value;
  next();
};

/**
 * Validar UUID em parâmetros da URL
 */
const validateUuidParam = (paramName) => {
  return (req, res, next) => {
    const value = req.params[paramName];
    
    if (!value) {
      return res.status(400).json({
        success: false,
        error: `Parâmetro ${paramName} é obrigatório`,
        code: 'MISSING_PARAMETER'
      });
    }
    
    const uuidSchema = Joi.string().uuid();
    const { error } = uuidSchema.validate(value);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: `Parâmetro ${paramName} deve ser um UUID válido`,
        code: 'INVALID_UUID'
      });
    }
    
    next();
  };
};

/**
 * Sanitizar e validar query string
 */
const sanitizeQuery = (allowedFields = []) => {
  return (req, res, next) => {
    const sanitizedQuery = {};
    
    // Apenas permitir campos especificados
    allowedFields.forEach(field => {
      if (req.query[field] !== undefined) {
        sanitizedQuery[field] = req.query[field];
      }
    });
    
    // Sempre permitir paginação
    ['page', 'limit', 'orderBy', 'orderDirection'].forEach(field => {
      if (req.query[field] !== undefined) {
        sanitizedQuery[field] = req.query[field];
      }
    });
    
    req.query = sanitizedQuery;
    next();
  };
};

/**
 * Validação customizada para telefone brasileiro
 */
const validateBrazilianPhone = (value, helpers) => {
  const phoneRegex = /^(\+55|55)?(\d{2})(\d{4,5})(\d{4})$/;
  const cleanPhone = value.replace(/\D/g, '');
  
  if (!phoneRegex.test(cleanPhone)) {
    return helpers.error('phone.invalid');
  }
  
  return value;
};

/**
 * Validação customizada para email
 */
const validateEmail = (value, helpers) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(value)) {
    return helpers.error('email.invalid');
  }
  
  return value.toLowerCase();
};

/**
 * Middleware para validar assinatura do webhook
 */
const validateWebhookSignature = (req, res, next) => {
  const signature = req.headers['x-umbler-signature'];
  const webhookSecret = process.env.WEBHOOK_SECRET;
  
  // Se não há secret configurado, pular validação
  if (!webhookSecret) {
    logger.warn('WEBHOOK_SECRET não configurado - pulando validação de assinatura');
    return next();
  }
  
  if (!signature) {
    logger.security('Webhook recebido sem assinatura', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(401).json({
      success: false,
      error: 'Assinatura do webhook é obrigatória',
      code: 'MISSING_SIGNATURE'
    });
  }
  
  try {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.rawBody || JSON.stringify(req.body))
      .digest('hex');
    
    const providedSignature = signature.replace('sha256=', '');
    
    if (!crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    )) {
      logger.security('Assinatura de webhook inválida', {
        ip: req.ip,
        providedSignature: providedSignature.substring(0, 8) + '...',
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({
        success: false,
        error: 'Assinatura do webhook inválida',
        code: 'INVALID_SIGNATURE'
      });
    }
    
    next();
  } catch (error) {
    logger.error('Erro ao validar assinatura do webhook:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno na validação da assinatura',
      code: 'SIGNATURE_VALIDATION_ERROR'
    });
  }
};

/**
 * Middleware para validar content-type
 */
const validateContentType = (expectedType = 'application/json') => {
  return (req, res, next) => {
    const contentType = req.get('Content-Type');
    
    if (!contentType || !contentType.includes(expectedType)) {
      return res.status(400).json({
        success: false,
        error: `Content-Type deve ser ${expectedType}`,
        code: 'INVALID_CONTENT_TYPE',
        received: contentType
      });
    }
    
    next();
  };
};

/**
 * Middleware para limitar tamanho do payload
 */
const validatePayloadSize = (maxSizeInMB = 10) => {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    
    if (contentLength > maxSizeInBytes) {
      return res.status(413).json({
        success: false,
        error: `Payload muito grande. Máximo permitido: ${maxSizeInMB}MB`,
        code: 'PAYLOAD_TOO_LARGE',
        received: `${Math.round(contentLength / 1024 / 1024 * 100) / 100}MB`
      });
    }
    
    next();
  };
};

/**
 * Middleware para validar se o webhook vem da origem correta
 */
const validateWebhookOrigin = (req, res, next) => {
  const allowedOrigins = [
    'umbler.com',
    'webhook.umbler.com',
    'api.umbler.com'
  ];
  
  const userAgent = req.get('User-Agent') || '';
  const forwardedFor = req.get('X-Forwarded-For');
  const realIp = req.get('X-Real-IP');
  
  // Em desenvolvimento, permitir qualquer origem
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  
  // Verificar User-Agent
  const hasValidUserAgent = allowedOrigins.some(origin => 
    userAgent.toLowerCase().includes(origin.toLowerCase())
  );
  
  if (!hasValidUserAgent) {
    logger.security('Webhook de origem suspeita', {
      userAgent,
      ip: req.ip,
      forwardedFor,
      realIp
    });
    
    // Em produção, rejeitar origens suspeitas
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Origem não autorizada',
        code: 'UNAUTHORIZED_ORIGIN'
      });
    }
  }
  
  next();
};

/**
 * Middleware de validação composta para webhooks
 */
const validateFullWebhook = [
  validatePayloadSize(10), // 10MB max
  validateContentType('application/json'),
  validateWebhookOrigin,
  validateWebhookSignature,
  validateWebhookPayload
];

/**
 * Criar middleware de validação dinâmica baseado em schema
 */
const createValidationMiddleware = (schema, target = 'body') => {
  return (req, res, next) => {
    const dataToValidate = target === 'query' ? req.query : 
                          target === 'params' ? req.params : 
                          req.body;
    
    const { error, value } = schema.validate(dataToValidate, {
      stripUnknown: true,
      convert: true,
      allowUnknown: false
    });
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: `Dados inválidos em ${target}`,
        code: 'VALIDATION_ERROR',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }))
      });
    }
    
    // Atualizar o objeto com dados validados
    if (target === 'body') req.validatedBody = value;
    else if (target === 'query') req.validatedQuery = value;
    else if (target === 'params') req.validatedParams = value;
    
    next();
  };
};

/**
 * Middleware de validação para filtros específicos
 */
const validateFilters = (allowedFilters = {}) => {
  return (req, res, next) => {
    const filters = {};
    const errors = [];
    
    Object.keys(allowedFilters).forEach(filterName => {
      const value = req.query[filterName];
      
      if (value !== undefined) {
        const schema = allowedFilters[filterName];
        const { error, value: validatedValue } = schema.validate(value);
        
        if (error) {
          errors.push({
            field: filterName,
            message: error.details[0].message
          });
        } else {
          filters[filterName] = validatedValue;
        }
      }
    });
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Filtros inválidos',
        code: 'INVALID_FILTERS',
        details: errors
      });
    }
    
    req.filters = filters;
    next();
  };
};

// =============================================
// SCHEMAS EXTRAS PARA VALIDAÇÕES ESPECÍFICAS
// =============================================

// Schema para validar período de estatísticas
const statsSchema = Joi.object({
  period: Joi.string().valid('1h', '24h', '7d', '30d', '90d').default('24h')
});

// Schema para validar tags
const tagsSchema = Joi.object({
  tags: Joi.array().items(
    Joi.string().min(1).max(50).pattern(/^[a-zA-Z0-9\-_]+$/)
  ).min(1).max(10).required().messages({
    'array.min': 'Pelo menos uma tag é obrigatória',
    'array.max': 'Máximo de 10 tags permitidas',
    'string.pattern.base': 'Tags devem conter apenas letras, números, hífens e underscores'
  })
});

// Schema para validar ID do agente
const agentSchema = Joi.object({
  agentId: Joi.string().uuid().required()
});

// =============================================
// EXPORTS
// =============================================

module.exports = {
  // Middlewares principais
  validateWebhookPayload,
  validateCreateContact,
  validateUpdateContact,
  validateCreateMessage,
  validateUpdateMessage,
  validateCreateConversation,
  validateUpdateConversation,
  validatePagination,
  validateDateFilters,
  validateUuidParam,
  sanitizeQuery,
  
  // Middlewares de segurança
  validateWebhookSignature,
  validateContentType,
  validatePayloadSize,
  validateWebhookOrigin,
  validateFullWebhook,
  
  // Utilitários
  createValidationMiddleware,
  validateFilters,
  
  // Schemas
  webhookPayloadSchema,
  createContactSchema,
  updateContactSchema,
  createMessageSchema,
  updateMessageSchema,
  createConversationSchema,
  updateConversationSchema,
  paginationSchema,
  dateFilterSchema,
  statsSchema,
  tagsSchema,
  agentSchema,
  
  // Validadores customizados
  validateBrazilianPhone,
  validateEmail
};