const express = require('express');
const rateLimit = require('express-rate-limit');
const webhookController = require('../controllers/webhookController');
const { validateWebhookPayload } = require('../middleware/validation');
const { environment } = require('../config/environment');

const router = express.Router();

// =============================================
// MIDDLEWARES ESPECÍFICOS
// =============================================

// Rate limiting mais restritivo para webhooks
const webhookRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: environment.rateLimit.webhookMax || 100,
  message: {
    error: 'Muitos webhooks recebidos, aguarde um momento',
    code: 'WEBHOOK_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Em desenvolvimento, permitir mais requisições
    return environment.isDevelopment();
  }
});

// Middleware para log específico de webhooks
const webhookLogger = (req, res, next) => {
  const originalSend = res.send;
  const startTime = Date.now();
  
  res.send = function(data) {
    const duration = Date.now() - startTime;
    const logger = require('../utils/logger');
    
    logger.info('Webhook processado', {
      url: req.originalUrl,
      method: req.method,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      bodySize: req.body ? JSON.stringify(req.body).length : 0
    });
    
    originalSend.call(this, data);
  };
  
  next();
};

// =============================================
// ROTAS PRINCIPAIS
// =============================================

/**
 * @route   POST /webhook/umbler
 * @desc    Receber webhook da Umbler
 * @access  Public (mas validado por assinatura)
 */
router.post('/umbler', 
  webhookRateLimit,
  webhookLogger,
  validateWebhookPayload,
  webhookController.receiveUmblerWebhook
);

/**
 * @route   GET /webhook/test
 * @desc    Testar se o webhook está funcionando
 * @access  Public
 */
router.get('/test', 
  webhookController.testWebhook
);

/**
 * @route   POST /webhook/retry/:eventId
 * @desc    Reprocessar webhook que falhou
 * @access  Protected (adicionar auth se necessário)
 */
router.post('/retry/:eventId',
  // Adicionar middleware de autenticação aqui se necessário
  webhookController.retryWebhookEvent
);

/**
 * @route   GET /webhook/events
 * @desc    Listar eventos de webhook
 * @access  Protected
 */
router.get('/events',
  // Adicionar middleware de autenticação aqui se necessário
  webhookController.listWebhookEvents
);

/**
 * @route   GET /webhook/stats
 * @desc    Obter estatísticas dos webhooks
 * @access  Protected
 */
router.get('/stats',
  // Adicionar middleware de autenticação aqui se necessário
  webhookController.getWebhookStats
);

// =============================================
// ROTAS DE DESENVOLVIMENTO
// =============================================

if (environment.isDevelopment()) {
  /**
   * @route   POST /webhook/simulate
   * @desc    Simular webhook para testes (apenas desenvolvimento)
   * @access  Development only
   */
  router.post('/simulate',
    webhookController.simulateWebhook
  );
  
  /**
   * @route   GET /webhook/debug
   * @desc    Informações de debug do webhook
   * @access  Development only
   */
  router.get('/debug', (req, res) => {
    res.json({
      environment: environment.nodeEnv,
      webhookUrl: environment.getWebhookUrl(),
      rateLimit: {
        windowMs: environment.rateLimit.windowMs,
        max: environment.rateLimit.webhookMax
      },
      security: {
        hasWebhookSecret: !!environment.security.webhookSecret,
        trustProxy: environment.trustProxy
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    });
  });
}

// =============================================
// MIDDLEWARE DE ERRO ESPECÍFICO
// =============================================

router.use((error, req, res, next) => {
  const logger = require('../utils/logger');
  
  logger.error('Erro na rota de webhook:', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    headers: req.headers
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