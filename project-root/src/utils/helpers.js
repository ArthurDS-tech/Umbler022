const crypto = require('crypto');
const validator = require('validator');

/**
 * Funções auxiliares e utilitários
 */

// =============================================
// FORMATAÇÃO DE DADOS
// =============================================

/**
 * Formatar número de telefone brasileiro
 */
function formatPhoneNumber(phone) {
  if (!phone) return null;
  
  // Remover todos os caracteres não numéricos
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Adicionar código do país se não tiver
  let formattedPhone = cleanPhone;
  
  if (cleanPhone.length === 11) {
    // Número com DDD (11 dígitos)
    formattedPhone = `55${cleanPhone}`;
  } else if (cleanPhone.length === 10) {
    // Número com DDD mas sem o 9 (formato antigo)
    formattedPhone = `55${cleanPhone}`;
  } else if (cleanPhone.length === 13 && cleanPhone.startsWith('55')) {
    // Já tem código do país
    formattedPhone = cleanPhone;
  }
  
  // Adicionar + no início
  return `+${formattedPhone}`;
}

/**
 * Validar e normalizar email
 */
function validateEmail(email) {
  if (!email) return false;
  return validator.isEmail(email);
}

/**
 * Normalizar email (lowercase e trim)
 */
function normalizeEmail(email) {
  if (!email) return null;
  return email.toLowerCase().trim();
}

/**
 * Formatar data para exibição
 */
function formatDate(date, format = 'pt-BR') {
  if (!date) return null;
  
  const dateObj = new Date(date);
  
  if (format === 'pt-BR') {
    return dateObj.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  return dateObj.toISOString();
}

/**
 * Truncar texto com reticências
 */
function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Capitalizar primeira letra
 */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Formatar nome próprio
 */
function formatName(name) {
  if (!name) return '';
  
  return name
    .split(' ')
    .map(word => word.length > 2 ? capitalize(word) : word.toLowerCase())
    .join(' ')
    .trim();
}

// =============================================
// VALIDAÇÕES
// =============================================

/**
 * Validar número de telefone brasileiro
 */
function isValidBrazilianPhone(phone) {
  if (!phone) return false;
  
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Verificar se tem entre 10 e 13 dígitos
  if (cleanPhone.length < 10 || cleanPhone.length > 13) {
    return false;
  }
  
  // Verificar padrões válidos
  const patterns = [
    /^55\d{2}9?\d{8}$/, // Com código do país
    /^\d{2}9?\d{8}$/    // Sem código do país
  ];
  
  return patterns.some(pattern => pattern.test(cleanPhone));
}

/**
 * Validar UUID
 */
function isValidUUID(uuid) {
  if (!uuid) return false;
  return validator.isUUID(uuid, 4);
}

/**
 * Validar URL
 */
function isValidURL(url) {
  if (!url) return false;
  return validator.isURL(url, {
    protocols: ['http', 'https'],
    require_protocol: true
  });
}

/**
 * Validar se string é JSON válido
 */
function isValidJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

// =============================================
// SEGURANÇA
// =============================================

/**
 * Gerar hash SHA256
 */
function generateHash(data, secret = '') {
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
}

/**
 * Validar assinatura de webhook
 */
function validateWebhookSignature(payload, signature, secret) {
  if (!signature || !secret) return false;
  
  const expectedSignature = generateHash(
    typeof payload === 'string' ? payload : JSON.stringify(payload),
    secret
  );
  
  const providedSignature = signature.replace('sha256=', '');
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Gerar token aleatório
 */
function generateRandomToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Sanitizar string para evitar XSS
 */
function sanitizeString(str) {
  if (!str) return '';
  
  return str
    .replace(/[<>]/g, '') // Remove < e >
    .replace(/javascript:/gi, '') // Remove javascript:
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Mascarar dados sensíveis
 */
function maskSensitiveData(data, fieldsToMask = ['password', 'token', 'secret', 'key']) {
  if (!data || typeof data !== 'object') return data;
  
  const masked = { ...data };
  
  fieldsToMask.forEach(field => {
    if (masked[field]) {
      const value = masked[field].toString();
      masked[field] = value.length > 4 ? 
        value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2) :
        '*'.repeat(value.length);
    }
  });
  
  return masked;
}

// =============================================
// MANIPULAÇÃO DE OBJETOS
// =============================================

/**
 * Remover campos nulos/undefined de objeto
 */
function removeNullFields(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const cleaned = {};
  
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    
    if (value !== null && value !== undefined) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        const nestedCleaned = removeNullFields(value);
        if (Object.keys(nestedCleaned).length > 0) {
          cleaned[key] = nestedCleaned;
        }
      } else {
        cleaned[key] = value;
      }
    }
  });
  
  return cleaned;
}

/**
 * Fazer deep merge de objetos
 */
function deepMerge(target, source) {
  if (!source || typeof source !== 'object') return target;
  if (!target || typeof target !== 'object') return source;
  
  const result = { ...target };
  
  Object.keys(source).forEach(key => {
    if (typeof source[key] === 'object' && !Array.isArray(source[key]) && source[key] !== null) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  });
  
  return result;
}

/**
 * Converter objeto para query string
 */
function objectToQueryString(obj) {
  if (!obj || typeof obj !== 'object') return '';
  
  const params = new URLSearchParams();
  
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    
    if (value !== null && value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach(item => params.append(key, item));
      } else {
        params.append(key, value.toString());
      }
    }
  });
  
  return params.toString();
}

/**
 * Extrair campos específicos de objeto
 */
function pickFields(obj, fields) {
  if (!obj || typeof obj !== 'object' || !Array.isArray(fields)) return {};
  
  const picked = {};
  
  fields.forEach(field => {
    if (obj.hasOwnProperty(field)) {
      picked[field] = obj[field];
    }
  });
  
  return picked;
}

/**
 * Omitir campos específicos de objeto
 */
function omitFields(obj, fields) {
  if (!obj || typeof obj !== 'object' || !Array.isArray(fields)) return obj;
  
  const omitted = { ...obj };
  
  fields.forEach(field => {
    delete omitted[field];
  });
  
  return omitted;
}

// =============================================
// UTILITÁRIOS DE ARRAY
// =============================================

/**
 * Agrupar array por propriedade
 */
function groupBy(array, key) {
  if (!Array.isArray(array)) return {};
  
  return array.reduce((groups, item) => {
    const group = item[key];
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {});
}

/**
 * Remover duplicatas de array
 */
function uniqueArray(array, key = null) {
  if (!Array.isArray(array)) return [];
  
  if (key) {
    const seen = new Set();
    return array.filter(item => {
      const keyValue = item[key];
      if (seen.has(keyValue)) return false;
      seen.add(keyValue);
      return true;
    });
  }
  
  return [...new Set(array)];
}

/**
 * Dividir array em chunks
 */
function chunkArray(array, size) {
  if (!Array.isArray(array) || size <= 0) return [];
  
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  
  return chunks;
}

// =============================================
// UTILITÁRIOS DE TEMPO
// =============================================

/**
 * Calcular diferença entre datas em minutos
 */
function getMinutesDifference(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  return Math.abs(d2 - d1) / (1000 * 60);
}

/**
 * Formatar duração em formato legível
 */
function formatDuration(milliseconds) {
  if (!milliseconds || milliseconds < 0) return '0s';
  
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Verificar se data está dentro de um período
 */
function isDateInRange(date, startDate, endDate) {
  const checkDate = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return checkDate >= start && checkDate <= end;
}

/**
 * Obter início e fim do dia
 */
function getDayRange(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

// =============================================
// UTILITÁRIOS DE ERRO
// =============================================

/**
 * Criar objeto de erro padronizado
 */
function createError(message, code, status = 500, details = null) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  
  if (details) {
    error.details = details;
  }
  
  return error;
}

/**
 * Extrair informações úteis de erro
 */
function extractErrorInfo(error) {
  return {
    message: error.message,
    code: error.code || 'UNKNOWN_ERROR',
    status: error.status || 500,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    details: error.details || null
  };
}

// =============================================
// UTILITÁRIOS DE PERFORMANCE
// =============================================

/**
 * Criar timer para medir performance
 */
function createTimer() {
  const start = process.hrtime.bigint();
  
  return {
    end: () => {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000; // Convert to milliseconds
      return Math.round(duration * 100) / 100; // Round to 2 decimal places
    }
  };
}

/**
 * Debounce function
 */
function debounce(func, wait) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
function throttle(func, limit) {
  let inThrottle;
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// =============================================
// EXPORTS
// =============================================

module.exports = {
  // Formatação
  formatPhoneNumber,
  validateEmail,
  normalizeEmail,
  formatDate,
  truncateText,
  capitalize,
  formatName,
  
  // Validações
  isValidBrazilianPhone,
  isValidUUID,
  isValidURL,
  isValidJSON,
  
  // Segurança
  generateHash,
  validateWebhookSignature,
  generateRandomToken,
  sanitizeString,
  maskSensitiveData,
  
  // Manipulação de objetos
  removeNullFields,
  deepMerge,
  objectToQueryString,
  pickFields,
  omitFields,
  
  // Utilitários de array
  groupBy,
  uniqueArray,
  chunkArray,
  
  // Utilitários de tempo
  getMinutesDifference,
  formatDuration,
  isDateInRange,
  getDayRange,
  
  // Utilitários de erro
  createError,
  extractErrorInfo,
  
  // Performance
  createTimer,
  debounce,
  throttle
};