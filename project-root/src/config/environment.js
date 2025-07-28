const path = require('path');
require('dotenv').config();

/**
 * Configurações centralizadas do ambiente
 * Todas as variáveis de ambiente são validadas aqui
 */

// Função para validar variáveis obrigatórias
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET'
];

// Validar variáveis obrigatórias
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Variáveis de ambiente obrigatórias não encontradas:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\n📝 Copie o arquivo .env.example para .env e configure as variáveis.');
  process.exit(1);
}

// Função auxiliar para converter string para boolean
const toBool = (str, defaultValue = false) => {
  if (str === undefined) return defaultValue;
  return str.toLowerCase() === 'true';
};

// Função auxiliar para converter string para array
const toArray = (str, separator = ',', defaultValue = []) => {
  if (!str) return defaultValue;
  return str.split(separator).map(item => item.trim()).filter(Boolean);
};

// Função auxiliar para validar número
const toNumber = (str, defaultValue, min = null, max = null) => {
  const num = parseInt(str) || defaultValue;
  if (min !== null && num < min) return min;
  if (max !== null && num > max) return max;
  return num;
};

const environment = {
  // =============================================
  // CONFIGURAÇÕES BÁSICAS
  // =============================================
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toNumber(process.env.PORT, 3000, 1000, 65535),
  host: process.env.HOST || 'localhost',
  trustProxy: toBool(process.env.TRUST_PROXY),
  forceHttps: toBool(process.env.FORCE_HTTPS),

  // =============================================
  // CONFIGURAÇÕES DO SUPABASE
  // =============================================
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    options: {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
        detectSessionInUrl: false
      }
    }
  },

  // =============================================
  // CONFIGURAÇÕES DE SEGURANÇA
  // =============================================
  security: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    webhookSecret: process.env.WEBHOOK_SECRET,
    bcryptRounds: toNumber(process.env.BCRYPT_ROUNDS, 12, 10, 15)
  },

  // =============================================
  // CONFIGURAÇÕES DE CORS
  // =============================================
  cors: {
    origin: process.env.CORS_ORIGIN ? 
      toArray(process.env.CORS_ORIGIN) : 
      ['http://localhost:3000', 'http://localhost:3001'],
    credentials: toBool(process.env.CORS_CREDENTIALS, true)
  },

  // =============================================
  // CONFIGURAÇÕES DE RATE LIMITING
  // =============================================
  rateLimit: {
    windowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000), // 15 minutos
    maxRequests: toNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
    webhookMax: toNumber(process.env.RATE_LIMIT_WEBHOOK_MAX, 1000),
    secret: process.env.RATE_LIMIT_SECRET
  },

  // =============================================
  // CONFIGURAÇÕES DE LOGGING
  // =============================================
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: toNumber(process.env.LOG_MAX_FILES, 5),
    prettyLogs: toBool(process.env.PRETTY_LOGS, true)
  },

  // =============================================
  // CONFIGURAÇÕES DO WEBHOOK
  // =============================================
  webhook: {
    baseUrl: process.env.WEBHOOK_BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
    path: process.env.WEBHOOK_PATH || '/webhook/umbler',
    timeout: toNumber(process.env.WEBHOOK_TIMEOUT, 30000),
    maxRetryAttempts: toNumber(process.env.MAX_RETRY_ATTEMPTS, 3),
    retryDelay: toNumber(process.env.RETRY_DELAY, 5000)
  },

  // =============================================
  // CONFIGURAÇÕES DE REDIS (OPCIONAL)
  // =============================================
  redis: {
    url: process.env.REDIS_URL,
    password: process.env.REDIS_PASSWORD,
    db: toNumber(process.env.REDIS_DB, 0)
  },

  // =============================================
  // CONFIGURAÇÕES DE EMAIL (OPCIONAL)
  // =============================================
  email: {
    smtp: {
      host: process.env.SMTP_HOST,
      port: toNumber(process.env.SMTP_PORT, 587),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    from: process.env.EMAIL_FROM
  },

  // =============================================
  // CONFIGURAÇÕES DE MONITORAMENTO
  // =============================================
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN
  },

  // =============================================
  // CONFIGURAÇÕES DE DESENVOLVIMENTO
  // =============================================
  development: {
    debug: toBool(process.env.DEBUG),
    mockWebhooks: toBool(process.env.MOCK_WEBHOOKS),
    logRequests: toBool(process.env.LOG_REQUESTS, true)
  },

  // =============================================
  // CONFIGURAÇÕES DE BACKUP (OPCIONAL)
  // =============================================
  backup: {
    enabled: toBool(process.env.BACKUP_ENABLED),
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // 2h da manhã todo dia
    retentionDays: toNumber(process.env.BACKUP_RETENTION_DAYS, 30)
  },

  // =============================================
  // PATHS E DIRETÓRIOS
  // =============================================
  paths: {
    root: path.resolve(__dirname, '../..'),
    src: path.resolve(__dirname, '..'),
    logs: path.resolve(__dirname, '../../logs'),
    uploads: path.resolve(__dirname, '../../uploads'),
    temp: path.resolve(__dirname, '../../temp')
  }
};

// =============================================
// VALIDAÇÕES ADICIONAIS
// =============================================

// Validar JWT Secret em produção
if (environment.nodeEnv === 'production') {
  if (!environment.security.jwtSecret || environment.security.jwtSecret.length < 32) {
    console.error('❌ JWT_SECRET deve ter pelo menos 32 caracteres em produção');
    process.exit(1);
  }

  if (!environment.webhook.baseUrl.startsWith('https://')) {
    console.warn('⚠️  WEBHOOK_BASE_URL deveria usar HTTPS em produção');
  }
}

// Validar URLs do Supabase
if (!environment.supabase.url.startsWith('https://')) {
  console.error('❌ SUPABASE_URL deve ser uma URL HTTPS válida');
  process.exit(1);
}

// =============================================
// FUNÇÕES AUXILIARES
// =============================================

/**
 * Verifica se está em ambiente de desenvolvimento
 */
environment.isDevelopment = () => environment.nodeEnv === 'development';

/**
 * Verifica se está em ambiente de produção
 */
environment.isProduction = () => environment.nodeEnv === 'production';

/**
 * Verifica se está em ambiente de teste
 */
environment.isTest = () => environment.nodeEnv === 'test';

/**
 * Retorna a URL completa do webhook
 */
environment.getWebhookUrl = () => {
  return `${environment.webhook.baseUrl}${environment.webhook.path}`;
};

/**
 * Retorna configurações sanitizadas (sem dados sensíveis) para logs
 */
environment.getSafeConfig = () => {
  const config = { ...environment };
  
  // Remover dados sensíveis
  if (config.supabase) {
    config.supabase.anonKey = '***';
    config.supabase.serviceRoleKey = '***';
  }
  
  if (config.security) {
    config.security.jwtSecret = '***';
    config.security.webhookSecret = '***';
  }
  
  if (config.redis && config.redis.password) {
    config.redis.password = '***';
  }
  
  if (config.email && config.email.smtp) {
    config.email.smtp.pass = '***';
  }

  return config;
};

// Log da configuração no startup (apenas em desenvolvimento)
if (environment.isDevelopment() && environment.development.debug) {
  console.log('🔧 Configuração carregada:', JSON.stringify(environment.getSafeConfig(), null, 2));
}

module.exports = { environment };