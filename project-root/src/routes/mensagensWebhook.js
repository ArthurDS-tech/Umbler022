const express = require('express');
const rateLimit = require('express-rate-limit');
const mensagensWebhookController = require('../controllers/mensagensWebhookController');
const { environment } = require('../config/environment');

const router = express.Router();

// =============================================
// MIDDLEWARES
// =============================================

// Rate limiting para APIs de mensagens webhook
const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: environment.rateLimit.apiMax || 200,
  message: {
    error: 'Muitas requisições, aguarde um momento',
    code: 'API_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// =============================================
// ROTAS PRINCIPAIS
// =============================================

/**
 * @route   GET /mensagens-webhook
 * @desc    Listar mensagens webhook com filtros
 * @access  Protected
 */
router.get('/', 
  apiRateLimit,
  mensagensWebhookController.listarMensagens
);

/**
 * @route   GET /mensagens-webhook/stats
 * @desc    Obter estatísticas de tempo de resposta
 * @access  Protected
 */
router.get('/stats',
  apiRateLimit,
  mensagensWebhookController.obterEstatisticas
);

// =============================================
// ROTAS DE DESENVOLVIMENTO
// =============================================

if (environment.isDevelopment()) {
  /**
   * @route   POST /mensagens-webhook/simulate
   * @desc    Simular mensagem webhook para testes
   * @access  Development only
   */
  router.post('/simulate',
    mensagensWebhookController.simularMensagem
  );
  
  /**
   * @route   GET /mensagens-webhook/debug
   * @desc    Informações de debug das mensagens webhook
   * @access  Development only
   */
  router.get('/debug',
    mensagensWebhookController.debug
  );
}

// =============================================
// MIDDLEWARE DE ERRO
// =============================================

router.use((error, req, res, next) => {
  const logger = require('../utils/logger');
  
  logger.error('Erro na rota de mensagens webhook:', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    query: req.query,
    body: req.body
  });
  
  // Não expor detalhes do erro em produção
  const errorMessage = environment.isProduction() 
    ? 'Erro interno do servidor' 
    : error.message;
  
  res.status(error.status || 500).json({
    success: false,
    error: errorMessage,
    code: error.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

