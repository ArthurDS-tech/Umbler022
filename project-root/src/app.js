const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('express-async-errors');
require('dotenv').config();

const { environment } = require('./config/environment');
const logger = require('./utils/logger');
const { globalErrorHandler } = require('./middleware/errorHandler');
const tunnelManager = require('./utils/tunnel');

// Importar rotas
const webhookRoutes = require('./routes/webhook');
const contactRoutes = require('./routes/contacts');
const messageRoutes = require('./routes/messages');
const conversationRoutes = require('./routes/conversations');
const apiRoutes = require('./routes/api');
require('dotenv').config();


// Criar aplicação Express
const app = express();

// =============================================
// MIDDLEWARES DE SEGURANÇA
// =============================================

// Helmet para segurança HTTP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configurado
app.use(cors({
  origin: environment.cors.origin,
  credentials: environment.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compressão de responses
app.use(compression());

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: environment.rateLimit.windowMs,
  max: environment.rateLimit.maxRequests,
  message: {
    error: 'Muitas requisições de um mesmo IP, tente novamente em alguns minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Pular rate limit para webhooks da Umbler em desenvolvimento
    return environment.nodeEnv === 'development' && req.path.startsWith('/webhook');
  }
});

app.use(globalLimiter);

// Rate limiting específico para webhooks
const webhookLimiter = rateLimit({
  windowMs: environment.rateLimit.windowMs,
  max: environment.rateLimit.webhookMax,
  message: {
    error: 'Limite de webhooks excedido',
    code: 'WEBHOOK_RATE_LIMIT_EXCEEDED'
  }
});

// Trust proxy se configurado (importante para Heroku, Vercel, etc)
if (environment.trustProxy) {
  app.set('trust proxy', 1);
}

// =============================================
// MIDDLEWARES DE PARSING
// =============================================

// Parse JSON com limite de tamanho
app.use('/webhook', express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Salvar raw body para validação de webhook
    req.rawBody = buf;
  }
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// =============================================
// MIDDLEWARES DE LOGGING
// =============================================

// Log de requisições
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };
    
    if (res.statusCode >= 400) {
      logger.warn('HTTP Request Error', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });
  
  next();
});

// =============================================
// HEALTH CHECK
// =============================================

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: environment.nodeEnv,
    version: process.env.npm_package_version || '1.0.0'
  });
});

app.get('/health/detailed', async (req, res) => {
  try {
    const { testConnection } = require('./config/database');
    const dbStatus = await testConnection();
    
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: environment.nodeEnv,
      version: process.env.npm_package_version || '1.0.0',
      database: dbStatus ? 'connected' : 'disconnected',
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    });
  } catch (error) {
    logger.error('Health check detailed failed', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: 'error',
      error: error.message
    });
  }
});

// =============================================
// ROTAS PRINCIPAIS
// =============================================

// Aplicar rate limiting específico para webhooks
app.use('/webhook', webhookLimiter);

// Registrar rotas
app.use('/webhook', webhookRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api', apiRoutes);

// =============================================
// ROTA RAIZ
// =============================================

app.get('/', (req, res) => {
  res.json({
    message: 'Webhook Umbler API - Sistema funcionando',
    version: '1.0.0',
    endpoints: {
      webhook: '/webhook/umbler',
      health: '/health',
      contacts: '/api/contacts',
      messages: '/api/messages',
      conversations: '/api/conversations'
    },
    documentation: '/docs'
  });
});

// =============================================
// MIDDLEWARE DE ERRO 404
// =============================================

app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint não encontrado',
    code: 'ENDPOINT_NOT_FOUND',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });
});

// =============================================
// MIDDLEWARE DE TRATAMENTO DE ERROS
// =============================================

app.use(globalErrorHandler);

// =============================================
// TRATAMENTO DE ERROS NÃO CAPTURADOS
// =============================================

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// =============================================
// INICIALIZAÇÃO DO SERVIDOR
// =============================================

const PORT = environment.port;
const HOST = environment.host;

if (require.main === module) {
  app.listen(PORT, HOST, async () => {
    logger.info(`🚀 Servidor iniciado em http://${HOST}:${PORT}`);
    logger.info(`📝 Ambiente: ${environment.nodeEnv}`);
    logger.info(`🔗 Webhook URL: http://${HOST}:${PORT}/webhook/umbler`);
    logger.info(`❤️ Health Check: http://${HOST}:${PORT}/health`);
    
    // Iniciar túnel público em desenvolvimento
    if (environment.isDevelopment()) {
      try {
        await tunnelManager.autoStart();
        
        // Se o túnel foi iniciado, mostrar a URL pública
        if (tunnelManager.isActive()) {
          const tunnelInfo = tunnelManager.getTunnelInfo();
          logger.info(`🌐 Túnel público ativo: ${tunnelInfo.tunnelUrl}`);
          logger.info(`🔗 Webhook público: ${tunnelInfo.webhookUrl}`);
          logger.info(`💻 Frontend: ${tunnelInfo.tunnelUrl}`);
        }
      } catch (error) {
        logger.warn('⚠️ Não foi possível iniciar túnel público:', error.message);
      }
    }
  });
}

module.exports = app;