const { createClient } = require('@supabase/supabase-js');
const { environment } = require('./environment');
const logger = require('../utils/logger');

/**
 * Configuração e inicialização do cliente Supabase
 */

// Cliente principal com chave anônima (para operações normais)
const supabaseClient = createClient(
  environment.supabase.url,
  environment.supabase.anonKey,
  {
    ...environment.supabase.options,
    db: {
      schema: 'public'
    }
  }
);

// Cliente administrativo com service role (para operações privilegiadas)
const supabaseAdmin = createClient(
  environment.supabase.url,
  environment.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
);

/**
 * Teste de conexão com o banco de dados
 */
async function testConnection() {
  try {
    const { data, error } = await supabaseClient
      .from('contacts')
      .select('count')
      .limit(1);
    
    if (error) {
      logger.error('Erro ao testar conexão com Supabase:', error);
      return false;
    }
    
    logger.info('✅ Conexão com Supabase estabelecida com sucesso');
    return true;
  } catch (error) {
    logger.error('Erro ao conectar com Supabase:', error);
    return false;
  }
}

/**
 * Executar query personalizada
 */
async function executeQuery(query, params = []) {
  try {
    const { data, error } = await supabaseAdmin.rpc('execute_sql', {
      query,
      params
    });
    
    if (error) {
      logger.error('Erro ao executar query:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    logger.error('Erro na execução da query:', error);
    throw error;
  }
}

/**
 * Função para inserir dados com retry automático
 */
async function insertWithRetry(table, data, maxRetries = 3) {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      const { data: result, error } = await supabaseAdmin
        .from(table)
        .insert(data)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return result;
    } catch (error) {
      attempt++;
      logger.warn(`Tentativa ${attempt} de inserção falhou:`, error.message);
      
      if (attempt >= maxRetries) {
        logger.error(`Falha na inserção após ${maxRetries} tentativas:`, error);
        throw error;
      }
      
      // Aguardar antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

/**
 * Função para atualizar dados com retry automático
 */
async function updateWithRetry(table, data, filter, maxRetries = 3) {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      let query = supabaseAdmin.from(table).update(data);
      
      // Aplicar filtros
      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      const { data: result, error } = await query.select().single();
      
      if (error) {
        throw error;
      }
      
      return result;
    } catch (error) {
      attempt++;
      logger.warn(`Tentativa ${attempt} de atualização falhou:`, error.message);
      
      if (attempt >= maxRetries) {
        logger.error(`Falha na atualização após ${maxRetries} tentativas:`, error);
        throw error;
      }
      
      // Aguardar antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

/**
 * Função para buscar dados com cache opcional
 */
async function findWithCache(table, filter = {}, options = {}) {
  try {
    let query = supabaseClient.from(table).select(options.select || '*');
    
    // Aplicar filtros
    Object.entries(filter).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        query = query.in(key, value);
      } else {
        query = query.eq(key, value);
      }
    });
    
    // Aplicar ordenação
    if (options.orderBy) {
      query = query.order(options.orderBy.column, { 
        ascending: options.orderBy.ascending !== false 
      });
    }
    
    // Aplicar limite
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    // Aplicar range para paginação
    if (options.range) {
      query = query.range(options.range.from, options.range.to);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      throw error;
    }
    
    return { data, count };
  } catch (error) {
    logger.error('Erro ao buscar dados:', error);
    throw error;
  }
}

/**
 * Função para executar transação
 */
async function executeTransaction(operations) {
  // Nota: Supabase não suporta transações explícitas via client
  // Para operações críticas, use stored procedures ou RPC
  
  const results = [];
  const errors = [];
  
  for (const operation of operations) {
    try {
      let result;
      
      switch (operation.type) {
        case 'insert':
          result = await insertWithRetry(operation.table, operation.data);
          break;
        case 'update':
          result = await updateWithRetry(operation.table, operation.data, operation.filter);
          break;
        case 'delete':
          const { data, error } = await supabaseAdmin
            .from(operation.table)
            .delete()
            .match(operation.filter)
            .select();
          if (error) throw error;
          result = data;
          break;
        default:
          throw new Error(`Tipo de operação não suportada: ${operation.type}`);
      }
      
      results.push(result);
    } catch (error) {
      errors.push({ operation, error });
      logger.error('Erro na operação da transação:', error);
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Transação falhou: ${errors.length} operações com erro`);
  }
  
  return results;
}

/**
 * Função para limpeza de dados antigos
 */
async function cleanupOldData() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    // Limpar eventos de webhook antigos processados
    const { error: webhookError } = await supabaseAdmin
      .from('webhook_events')
      .delete()
      .eq('processed', true)
      .lt('created_at', thirtyDaysAgo);
    
    if (webhookError) {
      logger.error('Erro ao limpar eventos de webhook:', webhookError);
    } else {
      logger.info('Limpeza de eventos de webhook antigos concluída');
    }
    
    // Outras limpezas podem ser adicionadas aqui
    
  } catch (error) {
    logger.error('Erro na limpeza de dados antigos:', error);
  }
}

/**
 * Inicialização do banco de dados
 */
async function initializeDatabase() {
  try {
    logger.info('🔄 Inicializando conexão com o banco de dados...');
    
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Falha ao conectar com o banco de dados');
    }
    
    // Executar limpeza de dados em produção
    if (environment.isProduction()) {
      await cleanupOldData();
    }
    
    logger.info('✅ Banco de dados inicializado com sucesso');
    return true;
  } catch (error) {
    logger.error('❌ Falha na inicialização do banco de dados:', error);
    throw error;
  }
}

// Executar inicialização automaticamente
if (require.main !== module) {
  initializeDatabase().catch(error => {
    logger.error('Erro crítico na inicialização do banco:', error);
    if (environment.isProduction()) {
      process.exit(1);
    }
  });
}

module.exports = {
  supabaseClient,
  supabaseAdmin,
  testConnection,
  executeQuery,
  insertWithRetry,
  updateWithRetry,
  findWithCache,
  executeTransaction,
  cleanupOldData,
  initializeDatabase
};