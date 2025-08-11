const logger = require('../utils/logger');

/**
 * Middleware de tratamento de erros global
 */

/**
 * Middleware para capturar erros assíncronos não tratados
 */
const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware de tratamento de erros 404 - Rota não encontrada
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Rota não encontrada: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  error.code = 'ROUTE_NOT_FOUND';
  
  logger.warn('⚠️ Rota não encontrada', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  next(error);
};

/**
 * Middleware global de tratamento de erros
 */
const globalErrorHandler = (error, req, res, next) => {
  // Log do erro
  const errorId = require('crypto').randomUUID();
  
  logger.error('❌ Erro capturado pelo middleware global', {
    errorId,
    message: error.message,
    stack: error.stack,
    status: error.status || 500,
    code: error.code || 'INTERNAL_ERROR',
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    params: req.params,
    query: req.query
  });
  
  // Determinar status code
  let statusCode = error.status || error.statusCode || 500;
  
  // Tratar erros específicos
  if (error.name === 'ValidationError') {
    statusCode = 400;
  } else if (error.name === 'UnauthorizedError' || error.message.includes('unauthorized')) {
    statusCode = 401;
  } else if (error.name === 'ForbiddenError' || error.message.includes('forbidden')) {
    statusCode = 403;
  } else if (error.name === 'NotFoundError' || error.message.includes('not found')) {
    statusCode = 404;
  } else if (error.name === 'ConflictError' || error.message.includes('conflict')) {
    statusCode = 409;
  } else if (error.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
  } else if (error.type === 'entity.too.large') {
    statusCode = 413;
  }
  
  // Estrutura de resposta de erro
  const errorResponse = {
    success: false,
    error: {
      id: errorId,
      message: getErrorMessage(error, statusCode),
      code: error.code || getErrorCode(statusCode),
      status: statusCode,
      timestamp: new Date().toISOString()
    }
  };
  
  // Adicionar detalhes em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = error.stack;
    errorResponse.error.originalMessage = error.message;
  }
  
  // Adicionar detalhes de validação se existirem
  if (error.details) {
    errorResponse.error.validation = error.details;
  }
  
  // Headers de segurança
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  });
  
  // Resposta JSON
  res.status(statusCode).json(errorResponse);
};

/**
 * Obter mensagem de erro amigável
 */
function getErrorMessage(error, statusCode) {
  // Mensagens específicas para códigos de status
  const statusMessages = {
    400: 'Dados inválidos fornecidos',
    401: 'Não autorizado - Token inválido ou expirado',
    403: 'Acesso negado - Permissões insuficientes',
    404: 'Recurso não encontrado',
    405: 'Método não permitido',
    409: 'Conflito - Recurso já existe',
    413: 'Arquivo muito grande',
    422: 'Dados não processáveis',
    429: 'Muitas requisições - Tente novamente mais tarde',
    500: 'Erro interno do servidor',
    502: 'Servidor indisponível',
    503: 'Serviço temporariamente indisponível'
  };
  
  // Retornar mensagem específica se disponível
  if (error.message && !error.message.includes('Error:')) {
    return error.message;
  }
  
  // Retornar mensagem padrão para o status code
  return statusMessages[statusCode] || 'Erro desconhecido';
}

/**
 * Obter código de erro
 */
function getErrorCode(statusCode) {
  const statusCodes = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    405: 'METHOD_NOT_ALLOWED',
    409: 'CONFLICT',
    413: 'PAYLOAD_TOO_LARGE',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_SERVER_ERROR',
    502: 'BAD_GATEWAY',
    503: 'SERVICE_UNAVAILABLE'
  };
  
  return statusCodes[statusCode] || 'UNKNOWN_ERROR';
}

/**
 * Middleware para tratar erros de JSON malformado
 */
const jsonErrorHandler = (error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    logger.warn('⚠️ JSON malformado recebido', {
      error: error.message,
      body: error.body,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(400).json({
      success: false,
      error: {
        message: 'JSON malformado',
        code: 'INVALID_JSON',
        status: 400,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  next(error);
};

/**
 * Middleware para tratar erros de timeout
 */
const timeoutHandler = (req, res, next) => {
  // Timeout de 30 segundos
  const timeout = setTimeout(() => {
    const error = new Error('Timeout da requisição');
    error.status = 408;
    error.code = 'REQUEST_TIMEOUT';
    
    logger.error('⏰ Timeout da requisição', {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        error: {
          message: 'Timeout da requisição - Operação demorou muito para ser concluída',
          code: 'REQUEST_TIMEOUT',
          status: 408,
          timestamp: new Date().toISOString()
        }
      });
    }
  }, 30000);
  
  // Limpar timeout quando a resposta for enviada
  res.on('finish', () => {
    clearTimeout(timeout);
  });
  
  res.on('close', () => {
    clearTimeout(timeout);
  });
  
  next();
};

/**
 * Manipular processos não capturados
 */
const setupProcessHandlers = () => {
  // Capturar exceções não tratadas
  process.on('uncaughtException', (error) => {
    logger.error('💀 Exceção não capturada - Encerrando processo', {
      error: error.message,
      stack: error.stack
    });
    
    process.exit(1);
  });
  
  // Capturar promises rejeitadas não tratadas
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('💀 Promise rejeitada não tratada', {
      reason: reason,
      promise: promise
    });
    
    // Não encerrar o processo para promises rejeitadas
    // process.exit(1);
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('🛑 SIGTERM recebido - Encerrando servidor graciosamente');
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    logger.info('🛑 SIGINT recebido - Encerrando servidor graciosamente');
    process.exit(0);
  });
};

module.exports = {
  asyncErrorHandler,
  notFoundHandler,
  globalErrorHandler,
  jsonErrorHandler,
  timeoutHandler,
  setupProcessHandlers
};