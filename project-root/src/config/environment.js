const path = require('path');
require('dotenv').config();

/**
 * Configuração de ambiente da aplicação
 */
const environment = {
  // Configurações básicas
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',
  
  // Configuração do banco de dados PostgreSQL (Neon)
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/umbler_webhook',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
    acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 2000,
    reapInterval: parseInt(process.env.DB_REAP_INTERVAL) || 1000,
    createTimeout: parseInt(process.env.DB_CREATE_TIMEOUT) || 3000,
    destroyTimeout: parseInt(process.env.DB_DESTROY_TIMEOUT) || 5000
  },
  
  // Configurações de segurança
  security: {
    webhookSecret: process.env.WEBHOOK_SECRET,
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
  },
  
  // Configurações de CORS
  cors: {
    origin: process.env.CORS_ORIGIN ? 
      (process.env.CORS_ORIGIN.includes(',') ? 
        process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : 
        process.env.CORS_ORIGIN) :
      ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080', 'http://127.0.0.1:8080'],
    credentials: process.env.CORS_CREDENTIALS === 'true'
  },
  
  // Configurações de rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    webhookMax: parseInt(process.env.RATE_LIMIT_WEBHOOK_MAX) || 1000
  },
  
  // Configurações de logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || path.join(__dirname, '../../logs/app.log'),
    maxSize: process.env.LOG_MAX_SIZE || '20m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 14
  },
  
  // Configurações de túnel (ngrok)
  tunnel: {
    enabled: process.env.AUTO_START_TUNNEL === 'true',
    authToken: process.env.NGROK_AUTH_TOKEN,
    region: process.env.NGROK_REGION || 'us'
  },
  
  // Configurações de proxy
  trustProxy: process.env.TRUST_PROXY === 'true',
  
  // Configurações de upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: process.env.ALLOWED_MIME_TYPES?.split(',') || [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain'
    ]
  },
  
  // Configurações de cache
  cache: {
    enabled: process.env.CACHE_ENABLED === 'true',
    ttl: parseInt(process.env.CACHE_TTL) || 300, // 5 minutos
    maxSize: parseInt(process.env.CACHE_MAX_SIZE) || 100
  },
  
  // Configurações de monitoramento
  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    metricsPort: parseInt(process.env.METRICS_PORT) || 9090
  },
  
  // Configurações de backup
  backup: {
    enabled: process.env.BACKUP_ENABLED === 'true',
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // 2 AM diariamente
    retention: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30
  },
  
  // Configurações de limpeza
  cleanup: {
    enabled: process.env.CLEANUP_ENABLED === 'true',
    schedule: process.env.CLEANUP_SCHEDULE || '0 3 * * *', // 3 AM diariamente
    retentionDays: {
      webhookEvents: parseInt(process.env.CLEANUP_WEBHOOK_DAYS) || 30,
      messages: parseInt(process.env.CLEANUP_MESSAGES_DAYS) || 365
    }
  },
  
  // URLs e endpoints
  urls: {
    webhook: process.env.WEBHOOK_URL || '/webhook/umbler',
    api: process.env.API_BASE_URL || '/api',
    dashboard: process.env.DASHBOARD_URL || '/dashboard'
  },
  
  // Configurações de desenvolvimento
  development: {
    autoReload: process.env.AUTO_RELOAD === 'true',
    debugMode: process.env.DEBUG_MODE === 'true',
    mockData: process.env.MOCK_DATA === 'true'
  }
};

/**
 * Métodos de utilidade
 */
environment.isDevelopment = () => environment.nodeEnv === 'development';
environment.isProduction = () => environment.nodeEnv === 'production';
environment.isTest = () => environment.nodeEnv === 'test';

environment.getWebhookUrl = () => {
  const baseUrl = process.env.BASE_URL || `http://localhost:${environment.port}`;
  return `${baseUrl}${environment.urls.webhook}`;
};

environment.getApiUrl = () => {
  const baseUrl = process.env.BASE_URL || `http://localhost:${environment.port}`;
  return `${baseUrl}${environment.urls.api}`;
};

environment.getDashboardUrl = () => {
  const baseUrl = process.env.BASE_URL || `http://localhost:${environment.port}`;
  return `${baseUrl}${environment.urls.dashboard}`;
};

/**
 * Validação de configurações críticas
 */
environment.validate = () => {
  const errors = [];
  
  // Validar configurações do banco
  if (!environment.database.url) {
    errors.push('DATABASE_URL é obrigatória');
  }
  
  // Validar configurações de segurança em produção
  if (environment.isProduction()) {
    if (!environment.security.webhookSecret) {
      errors.push('WEBHOOK_SECRET é obrigatório em produção');
    }
    
    if (environment.security.jwtSecret === 'your-secret-key-change-in-production') {
      errors.push('JWT_SECRET deve ser alterado em produção');
    }
  }
  
  // Validar configurações de CORS
  if (!Array.isArray(environment.cors.origin) && typeof environment.cors.origin !== 'string') {
    errors.push('CORS_ORIGIN deve ser uma string ou array');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configurações inválidas:\n${errors.join('\n')}`);
  }
  
  return true;
};

/**
 * Configurações específicas por ambiente
 */
if (environment.isDevelopment()) {
  // Configurações de desenvolvimento
  environment.database.ssl = false;
  environment.logging.level = 'debug';
} else if (environment.isProduction()) {
  // Configurações de produção
  environment.database.ssl = { rejectUnauthorized: false };
  environment.logging.level = 'info';
  environment.cors.credentials = true;
  environment.trustProxy = true;
}

module.exports = { environment };