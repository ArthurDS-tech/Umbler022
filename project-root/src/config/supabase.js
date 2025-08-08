const { createClient } = require('@supabase/supabase-js');
const { environment } = require('./environment');
const logger = require('../utils/logger');

/**
 * Configuração e inicialização do cliente Supabase
 */

// Verificar se as credenciais do Supabase estão configuradas
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  logger.error('❌ Credenciais do Supabase não configuradas');
  logger.info('Configure as seguintes variáveis no arquivo .env:');
  logger.info('- SUPABASE_URL=https://your-project-id.supabase.co');
  logger.info('- SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here');
  
  if (environment.isProduction()) {
    process.exit(1);
  }
}

// Criar cliente Supabase
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      'User-Agent': 'umbler-webhook-backend/1.0.0'
    }
  }
}) : null;

/**
 * Teste de conexão com o Supabase
 */
async function testSupabaseConnection() {
  try {
    if (!supabase) {
      logger.warn('⚠️ Cliente Supabase não inicializado (credenciais ausentes)');
      return false;
    }

    // Testar conexão com uma query simples
    const { data, error } = await supabase
      .from('webhook_events')
      .select('count', { count: 'exact', head: true });

    if (error) {
      logger.error('❌ Erro ao conectar com Supabase:', error.message);
      return false;
    }

    logger.info('✅ Conexão com Supabase estabelecida com sucesso');
    return true;
  } catch (error) {
    logger.error('❌ Erro ao testar conexão Supabase:', error.message);
    
    // Em desenvolvimento, permitir continuar mesmo com erro de conexão
    if (environment.isDevelopment()) {
      logger.warn('⚠️ Modo desenvolvimento: Continuando sem conexão com Supabase');
      return true;
    }
    return false;
  }
}

/**
 * Inserir dados com retry automático
 */
async function insertWithRetry(table, data, maxRetries = 3) {
  if (!supabase) {
    throw new Error('Cliente Supabase não inicializado');
  }

  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      logger.info(`💾 Tentando inserir em "${table}" (tentativa ${attempt + 1}/${maxRetries})`, {
        table,
        dataKeys: Object.keys(data),
        attempt: attempt + 1
      });
      
      const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select()
        .single();

      if (error) {
        throw error;
      }
      
      logger.info(`✅ Inserção em "${table}" realizada com sucesso`, {
        table,
        insertedId: result.id,
        attempt: attempt + 1
      });
      
      return result;
    } catch (error) {
      attempt++;
      logger.warn(`⚠️ Tentativa ${attempt} de inserção em "${table}" falhou:`, {
        error: error.message,
        attempt,
        maxRetries,
        willRetry: attempt < maxRetries
      });
      
      if (attempt >= maxRetries) {
        logger.error(`❌ Falha definitiva na inserção em "${table}" após ${maxRetries} tentativas:`, {
          error: error.message,
          data: data
        });
        throw error;
      }
      
      // Aguardar antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

/**
 * Atualizar dados com retry automático
 */
async function updateWithRetry(table, data, filter, maxRetries = 3) {
  if (!supabase) {
    throw new Error('Cliente Supabase não inicializado');
  }

  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      logger.info(`🔄 Tentando atualizar em "${table}" (tentativa ${attempt + 1}/${maxRetries})`, {
        table,
        dataKeys: Object.keys(data),
        filter,
        attempt: attempt + 1
      });
      
      let query = supabase.from(table).update(data);
      
      // Aplicar filtros
      Object.keys(filter).forEach(key => {
        query = query.eq(key, filter[key]);
      });
      
      const { data: result, error } = await query.select().single();

      if (error) {
        throw error;
      }
      
      if (!result) {
        throw new Error('Nenhum registro atualizado');
      }
      
      logger.info(`✅ Atualização em "${table}" realizada com sucesso`, {
        table,
        updatedId: result.id,
        attempt: attempt + 1
      });
      
      return result;
    } catch (error) {
      attempt++;
      logger.warn(`⚠️ Tentativa ${attempt} de atualização em "${table}" falhou:`, {
        error: error.message,
        attempt,
        maxRetries,
        willRetry: attempt < maxRetries
      });
      
      if (attempt >= maxRetries) {
        logger.error(`❌ Falha definitiva na atualização em "${table}" após ${maxRetries} tentativas:`, {
          error: error.message,
          data: data,
          filter: filter
        });
        throw error;
      }
      
      // Aguardar antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

/**
 * Buscar dados com filtros
 */
async function findWithCache(table, filter = {}, options = {}) {
  if (!supabase) {
    throw new Error('Cliente Supabase não inicializado');
  }

  try {
    let query = supabase.from(table);
    
    // Aplicar seleção
    if (options.select) {
      query = query.select(options.select);
    } else {
      query = query.select('*');
    }
    
    // Aplicar filtros
    Object.keys(filter).forEach(key => {
      if (Array.isArray(filter[key])) {
        query = query.in(key, filter[key]);
      } else {
        query = query.eq(key, filter[key]);
      }
    });
    
    // Aplicar ordenação
    if (options.orderBy) {
      const ascending = options.orderBy.ascending !== false;
      query = query.order(options.orderBy.column, { ascending });
    }
    
    // Aplicar limite
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    // Aplicar range para paginação
    if (options.offset) {
      const from = options.offset;
      const to = options.limit ? options.offset + options.limit - 1 : undefined;
      query = query.range(from, to);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      throw error;
    }
    
    return { 
      data: data || [], 
      count: data ? data.length : 0 
    };
  } catch (error) {
    logger.error('Erro ao buscar dados:', error);
    throw error;
  }
}

/**
 * Executar query personalizada usando RPC
 */
async function executeQuery(query, params = []) {
  if (!supabase) {
    throw new Error('Cliente Supabase não inicializado');
  }

  try {
    // Para queries personalizadas, usar RPC se necessário
    // Por enquanto, lançar erro pois Supabase não executa SQL direto
    logger.warn('executeQuery não é suportado diretamente no Supabase. Use funções específicas.');
    throw new Error('Use funções específicas do Supabase ao invés de executeQuery');
  } catch (error) {
    logger.error('Erro ao executar query:', error);
    throw error;
  }
}

/**
 * Executar transação (simulada com múltiplas operações)
 */
async function executeTransaction(operations) {
  if (!supabase) {
    throw new Error('Cliente Supabase não inicializado');
  }

  try {
    logger.info('🔄 Executando transação com múltiplas operações');
    
    const results = [];
    
    for (const operation of operations) {
      let result;
      
      switch (operation.type) {
        case 'insert':
          result = await insertWithRetry(operation.table, operation.data);
          break;
        case 'update':
          result = await updateWithRetry(operation.table, operation.data, operation.filter);
          break;
        case 'delete':
          let deleteQuery = supabase.from(operation.table);
          
          Object.keys(operation.filter).forEach(key => {
            deleteQuery = deleteQuery.eq(key, operation.filter[key]);
          });
          
          const { data: deleteResult, error } = await deleteQuery.delete().select();
          
          if (error) {
            throw error;
          }
          
          result = deleteResult;
          break;
        default:
          throw new Error(`Tipo de operação não suportada: ${operation.type}`);
      }
      
      results.push(result);
    }
    
    logger.info('✅ Transação executada com sucesso');
    return results;
  } catch (error) {
    logger.error('❌ Erro na transação:', error);
    throw error;
  }
}

/**
 * Health check do Supabase
 */
async function healthCheck() {
  try {
    if (!supabase) {
      return {
        status: 'unhealthy',
        error: 'Cliente Supabase não inicializado',
        timestamp: new Date().toISOString()
      };
    }

    // Verificar conexão
    const { data, error } = await supabase
      .from('webhook_events')
      .select('count', { count: 'exact', head: true });

    if (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }

    return {
      status: 'healthy',
      supabase: {
        url: supabaseUrl,
        connected: true
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Health check falhou:', error);
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Inicialização do Supabase
 */
async function initializeSupabase() {
  try {
    logger.info('🔄 Inicializando conexão com Supabase...');
    
    const isConnected = await testSupabaseConnection();
    if (!isConnected && environment.isProduction()) {
      throw new Error('Falha ao conectar com Supabase');
    }
    
    logger.info('✅ Supabase inicializado com sucesso');
    return true;
  } catch (error) {
    logger.error('❌ Falha na inicialização do Supabase:', error);
    throw error;
  }
}

// Executar inicialização automaticamente
if (require.main !== module) {
  initializeSupabase().catch(error => {
    logger.error('Erro crítico na inicialização do Supabase:', error);
    if (environment.isProduction()) {
      process.exit(1);
    }
  });
}

module.exports = {
  supabase,
  testConnection: testSupabaseConnection,
  executeQuery,
  insertWithRetry,
  updateWithRetry,
  findWithCache,
  executeTransaction,
  healthCheck,
  initializeSupabase
};

// Fallback para quando Supabase não estiver configurado
if (!supabaseUrl || !supabaseKey) {
  logger.warn('⚠️ Supabase não configurado, usando PostgreSQL direto');
  module.exports = {
    supabase: null,
    testConnection: async () => {
      logger.warn('⚠️ Teste de conexão Supabase não disponível');
      return false;
    },
    executeQuery: async () => {
      throw new Error('Supabase não configurado');
    },
    insertWithRetry: async () => {
      throw new Error('Supabase não configurado');
    },
    updateWithRetry: async () => {
      throw new Error('Supabase não configurado');
    },
    findWithCache: async () => {
      throw new Error('Supabase não configurado');
    },
    executeTransaction: async () => {
      throw new Error('Supabase não configurado');
    },
    healthCheck: async () => {
      return {
        status: 'unhealthy',
        error: 'Supabase não configurado',
        timestamp: new Date().toISOString()
      };
    },
    initializeSupabase: async () => {
      logger.warn('⚠️ Supabase não configurado');
      return false;
    }
  };
}