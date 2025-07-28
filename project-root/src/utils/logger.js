const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');
const { environment } = require('../config/environment');

// Criar diretório de logs se não existir
const logsDir = environment.paths.logs;
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// =============================================
// FORMATADORES CUSTOMIZADOS
// =============================================

// Formatador para desenvolvimento (mais legível)
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let logMessage = `[${timestamp}] ${level}: ${message}`;
    
    // Adicionar metadados se existirem
    if (Object.keys(meta).length > 0) {
      logMessage += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return logMessage;
  })
);

// Formatador para produção (JSON estruturado)
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// =============================================
// TRANSPORTS (DESTINOS DOS LOGS)
// =============================================

const transports = [];

// Console (desenvolvimento)
if (environment.isDevelopment() || environment.logging.prettyLogs) {
  transports.push(
    new winston.transports.Console({
      format: developmentFormat,
      level: environment.logging.level
    })
  );
} else {
  transports.push(
    new winston.transports.Console({
      format: productionFormat,
      level: environment.logging.level
    })
  );
}

// Arquivo com rotação diária
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'app-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: environment.logging.maxSize,
    maxFiles: environment.logging.maxFiles,
    format: productionFormat,
    level: 'info'
  })
);

// Arquivo separado para erros
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: environment.logging.maxSize,
    maxFiles: environment.logging.maxFiles,
    format: productionFormat,
    level: 'error'
  })
);

// Arquivo separado para webhooks
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'webhook-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: environment.logging.maxSize,
    maxFiles: environment.logging.maxFiles,
    format: productionFormat,
    level: 'info'
  })
);

// =============================================
// CONFIGURAÇÃO DO LOGGER
// =============================================

const logger = winston.createLogger({
  level: environment.logging.level,
  format: productionFormat,
  defaultMeta: {
    service: 'umbler-webhook',
    environment: environment.nodeEnv,
    version: process.env.npm_package_version || '1.0.0'
  },
  transports,
  exitOnError: false
});

// =============================================
// FUNÇÕES AUXILIARES
// =============================================

/**
 * Log específico para webhooks
 */
logger.webhook = (message, meta = {}) => {
  logger.info(message, { ...meta, type: 'webhook' });
};

/**
 * Log de performance
 */
logger.performance = (message, duration, meta = {}) => {
  logger.info(message, { ...meta, duration, type: 'performance' });
};

/**
 * Log de segurança
 */
logger.security = (message, meta = {}) => {
  logger.warn(message, { ...meta, type: 'security' });
};

/**
 * Log de auditoria
 */
logger.audit = (message, meta = {}) => {
  logger.info(message, { ...meta, type: 'audit' });
};

// =============================================
// TRATAMENTO DE ERROS DO LOGGER
// =============================================

logger.on('error', (error) => {
  console.error('Erro no sistema de logs:', error);
});

// Capturar exceções não tratadas
if (environment.isProduction()) {
  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'exceptions.log'),
    handleExceptions: true,
    format: productionFormat
  }));
  
  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'rejections.log'),
    handleRejections: true,
    format: productionFormat
  }));
}

module.exports = logger;