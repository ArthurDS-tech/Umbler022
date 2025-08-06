const { Pool } = require('pg');
const { environment } = require('./environment');
const logger = require('../utils/logger');

// Importar configuração do Supabase
let supabaseConfig = null;
try {
  supabaseConfig = require('./supabase');
} catch (error) {
  logger.warn('⚠️ Configuração do Supabase não encontrada, usando PostgreSQL direto');
}

/**
 * Configuração e inicialização do cliente PostgreSQL (Neon) ou Supabase
 */

// Verificar se deve usar Supabase ou PostgreSQL direto
const useSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;

if (useSupabase) {
  logger.info('🔗 Usando Supabase como backend de dados');
} else {
  logger.info('🔗 Usando PostgreSQL direto como backend de dados');
}

// Configuração do pool de conexões (apenas para PostgreSQL direto)
const poolConfig = {
  connectionString: environment.database.url,
  ssl: environment.database.ssl,
  max: environment.database.maxConnections || 20,
  idleTimeoutMillis: environment.database.idleTimeout || 30000,
  connectionTimeoutMillis: environment.database.connectionTimeout || 2000,
  acquireTimeoutMillis: environment.database.acquireTimeout || 2000,
  reapIntervalMillis: environment.database.reapInterval || 1000,
  createTimeoutMillis: environment.database.createTimeout || 3000,
  destroyTimeoutMillis: environment.database.destroyTimeout || 5000,
  allowExitOnIdle: true,
  // Configurações específicas para Neon
  application_name: 'umbler-webhook-backend',
  statement_timeout: 30000, // 30 segundos
  query_timeout: 30000,
  idle_in_transaction_session_timeout: 30000
};

// Criar pool de conexões apenas se não estiver usando Supabase
const pool = !useSupabase ? new Pool(poolConfig) : null;

// Event listeners para monitoramento do pool (apenas PostgreSQL direto)
if (pool) {
  pool.on('connect', (client) => {
    logger.info('🔗 Nova conexão PostgreSQL estabelecida');
  });

  pool.on('acquire', (client) => {
    logger.debug('📥 Cliente adquirido do pool');
  });

  pool.on('release', (client) => {
    logger.debug('📤 Cliente liberado para o pool');
  });

  pool.on('error', (err, client) => {
    logger.error('❌ Erro no pool PostgreSQL:', err);
  });

  pool.on('remove', (client) => {
    logger.info('🗑️ Cliente removido do pool');
  });
}

/**
 * Teste de conexão com o banco de dados
 */
async function testConnection() {
  try {
    // Em desenvolvimento, permitir funcionamento sem banco real
    if (environment.isDevelopment() && process.env.SKIP_DB_CONNECTION === 'true') {
      logger.warn('⚠️ Modo desenvolvimento: Pulando verificação de conexão com banco');
      return true;
    }

    if (useSupabase && supabaseConfig) {
      // Usar teste de conexão do Supabase
      return await supabaseConfig.testConnection();
    } else if (pool) {
      // Usar teste de conexão PostgreSQL direto
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT NOW() as current_time, version() as version');
        logger.info('✅ Conexão com PostgreSQL estabelecida com sucesso', {
          currentTime: result.rows[0].current_time,
          version: result.rows[0].version.split(' ')[0] // Apenas a versão
        });
        return true;
      } finally {
        client.release();
      }
    } else {
      logger.error('❌ Nenhuma configuração de banco disponível');
      return false;
    }
  } catch (error) {
    logger.error('Erro ao conectar com banco de dados:', error);
    
    // Em desenvolvimento, permitir continuar mesmo com erro de conexão
    if (environment.isDevelopment()) {
      logger.warn('⚠️ Modo desenvolvimento: Continuando sem conexão com banco');
      return true;
    }
    return false;
  }
}

/**
 * Executar query personalizada
 */
async function executeQuery(query, params = []) {
  if (useSupabase && supabaseConfig) {
    // Delegar para Supabase (que pode não suportar queries diretas)
    return await supabaseConfig.executeQuery(query, params);
  } else if (pool) {
    // Usar PostgreSQL direto
    const client = await pool.connect();
    try {
      const result = await client.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Erro ao executar query:', error);
      throw error;
    } finally {
      client.release();
    }
  } else {
    throw new Error('Nenhuma configuração de banco disponível');
  }
}

/**
 * Função para inserir dados com retry automático
 */
async function insertWithRetry(table, data, maxRetries = 3) {
  if (useSupabase && supabaseConfig) {
    // Usar inserção do Supabase
    return await supabaseConfig.insertWithRetry(table, data, maxRetries);
  } else {
    // Usar inserção PostgreSQL direto (código original)
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        logger.info(`💾 Tentando inserir em "${table}" (tentativa ${attempt + 1}/${maxRetries})`, {
          table,
          dataKeys: Object.keys(data),
          attempt: attempt + 1
        });
        
        const columns = Object.keys(data);
        const values = Object.values(data);
        const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
        
        const query = `
          INSERT INTO ${table} (${columns.join(', ')})
          VALUES (${placeholders})
          RETURNING *
        `;
        
        const result = await executeQuery(query, values);
        
        if (result.length === 0) {
          throw new Error('Nenhum registro inserido');
        }
        
        logger.info(`✅ Inserção em "${table}" realizada com sucesso`, {
          table,
          insertedId: result[0].id,
          attempt: attempt + 1
        });
        
        return result[0];
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
}

/**
 * Função para atualizar dados com retry automático
 */
async function updateWithRetry(table, data, filter, maxRetries = 3) {
  if (useSupabase && supabaseConfig) {
    // Usar atualização do Supabase
    return await supabaseConfig.updateWithRetry(table, data, filter, maxRetries);
  } else {
    // Usar atualização PostgreSQL direto (código original)
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        logger.info(`🔄 Tentando atualizar em "${table}" (tentativa ${attempt + 1}/${maxRetries})`, {
          table,
          dataKeys: Object.keys(data),
          filter,
          attempt: attempt + 1
        });
        
        const setColumns = Object.keys(data);
        const setValues = Object.values(data);
        const whereColumns = Object.keys(filter);
        const whereValues = Object.values(filter);
        
        const setClause = setColumns.map((col, index) => `${col} = $${index + 1}`).join(', ');
        const whereClause = whereColumns.map((col, index) => `${col} = $${setValues.length + index + 1}`).join(' AND ');
        
        const query = `
          UPDATE ${table}
          SET ${setClause}
          WHERE ${whereClause}
          RETURNING *
        `;
        
        const result = await executeQuery(query, [...setValues, ...whereValues]);
        
        if (result.length === 0) {
          throw new Error('Nenhum registro atualizado');
        }
        
        logger.info(`✅ Atualização em "${table}" realizada com sucesso`, {
          table,
          updatedId: result[0].id,
          attempt: attempt + 1
        });
        
        return result[0];
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
}

/**
 * Função para buscar dados com cache opcional
 */
async function findWithCache(table, filter = {}, options = {}) {
  if (useSupabase && supabaseConfig) {
    // Usar busca do Supabase
    return await supabaseConfig.findWithCache(table, filter, options);
  } else {
    // Usar busca PostgreSQL direto (código original)
    try {
      const whereColumns = Object.keys(filter);
      const whereValues = Object.values(filter);
      
      let query = `SELECT ${options.select || '*'} FROM ${table}`;
      const params = [];
      
      // Aplicar filtros
      if (whereColumns.length > 0) {
        const whereClause = whereColumns.map((col, index) => {
          if (Array.isArray(filter[col])) {
            const placeholders = filter[col].map((_, i) => `$${params.length + i + 1}`).join(', ');
            params.push(...filter[col]);
            return `${col} IN (${placeholders})`;
          } else {
            params.push(filter[col]);
            return `${col} = $${params.length}`;
          }
        }).join(' AND ');
        query += ` WHERE ${whereClause}`;
      }
      
      // Aplicar ordenação
      if (options.orderBy) {
        const direction = options.orderBy.ascending !== false ? 'ASC' : 'DESC';
        query += ` ORDER BY ${options.orderBy.column} ${direction}`;
      }
      
      // Aplicar limite
      if (options.limit) {
        query += ` LIMIT ${options.limit}`;
      }
      
      // Aplicar offset para paginação
      if (options.offset) {
        query += ` OFFSET ${options.offset}`;
      }
      
      const result = await executeQuery(query, params);
      
      return { data: result, count: result.length };
    } catch (error) {
      logger.error('Erro ao buscar dados:', error);
      throw error;
    }
  }
}

/**
 * Função para executar transação
 */
async function executeTransaction(operations) {
  if (useSupabase && supabaseConfig) {
    // Usar transação do Supabase
    return await supabaseConfig.executeTransaction(operations);
  } else if (pool) {
    // Usar transação PostgreSQL direto (código original)
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
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
            const whereColumns = Object.keys(operation.filter);
            const whereValues = Object.values(operation.filter);
            const whereClause = whereColumns.map((col, index) => `${col} = $${index + 1}`).join(' AND ');
            
            const deleteQuery = `
              DELETE FROM ${operation.table}
              WHERE ${whereClause}
              RETURNING *
            `;
            
            result = await client.query(deleteQuery, whereValues);
            result = result.rows;
            break;
          default:
            throw new Error(`Tipo de operação não suportada: ${operation.type}`);
        }
        
        results.push(result);
      }
      
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Erro na transação:', error);
      throw error;
    } finally {
      client.release();
    }
  } else {
    throw new Error('Nenhuma configuração de banco disponível para transações');
  }
}

/**
 * Função para limpeza de dados antigos
 */
async function cleanupOldData() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    // Limpar eventos de webhook antigos processados
    const deleteWebhookQuery = `
      DELETE FROM webhook_events 
      WHERE processed = true AND created_at < $1
    `;
    
    const webhookResult = await executeQuery(deleteWebhookQuery, [thirtyDaysAgo]);
    logger.info(`Limpeza de eventos de webhook antigos concluída: ${webhookResult.length} registros removidos`);
    
    // Limpar mensagens antigas (opcional - manter histórico)
    if (environment.isProduction()) {
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
      const deleteMessagesQuery = `
        DELETE FROM messages 
        WHERE event_at_utc < $1 AND message_type = 'text'
      `;
      
      const messagesResult = await executeQuery(deleteMessagesQuery, [oneYearAgo]);
      logger.info(`Limpeza de mensagens antigas concluída: ${messagesResult.length} registros removidos`);
    }
    
  } catch (error) {
    logger.error('Erro na limpeza de dados antigos:', error);
  }
}

/**
 * Função para backup dos dados
 */
async function backupDatabase() {
  try {
    logger.info('🔄 Iniciando backup do banco de dados...');
    
    // Backup das tabelas principais
    const tables = [
      'webhook_events',
      'contacts', 
      'contact_tags',
      'channels',
      'sectors',
      'organization_members',
      'chats',
      'messages',
      'message_reactions',
      'chat_assignments',
      'performance_metrics'
    ];
    
    const backupData = {};
    
    for (const table of tables) {
      const result = await executeQuery(`SELECT * FROM ${table} ORDER BY created_at DESC LIMIT 1000`);
      backupData[table] = result;
      logger.info(`✅ Backup da tabela ${table}: ${result.length} registros`);
    }
    
    return backupData;
  } catch (error) {
    logger.error('Erro no backup do banco:', error);
    throw error;
  }
}

/**
 * Função para health check do banco
 */
async function healthCheck() {
  try {
    if (useSupabase && supabaseConfig) {
      // Usar health check do Supabase
      return await supabaseConfig.healthCheck();
    } else if (pool) {
      // Usar health check PostgreSQL direto
      const client = await pool.connect();
      try {
        // Verificar conexão
        await client.query('SELECT 1');
        
        // Verificar estatísticas do pool
        const poolStats = {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount,
          waitingCount: pool.waitingCount
        };
        
        // Verificar tabelas principais
        const tablesCheck = await client.query(`
          SELECT 
            schemaname,
            tablename,
            n_tup_ins as inserts,
            n_tup_upd as updates,
            n_tup_del as deletes
          FROM pg_stat_user_tables 
          WHERE tablename IN ('webhook_events', 'contacts', 'chats', 'messages')
          ORDER BY tablename
        `);
        
        return {
          status: 'healthy',
          pool: poolStats,
          tables: tablesCheck.rows,
          timestamp: new Date().toISOString()
        };
      } finally {
        client.release();
      }
    } else {
      logger.error('❌ Nenhuma configuração de banco disponível para health check');
      return {
        status: 'unhealthy',
        error: 'Nenhuma configuração de banco disponível',
        timestamp: new Date().toISOString()
      };
    }
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
 * Inicialização do banco de dados
 */
async function initializeDatabase() {
  try {
    if (useSupabase && supabaseConfig) {
      logger.info('🔄 Inicializando conexão com Supabase...');
      return await supabaseConfig.initializeSupabase();
    } else {
      logger.info('🔄 Inicializando conexão com o banco de dados PostgreSQL...');
      
      const isConnected = await testConnection();
      if (!isConnected) {
        throw new Error('Falha ao conectar com o banco de dados PostgreSQL');
      }
      
      // Verificar se as tabelas existem (apenas para PostgreSQL direto)
      if (pool) {
        try {
          const tablesCheck = await executeQuery(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('webhook_events', 'contacts', 'chats', 'messages')
          `);
          
          if (tablesCheck.length < 4) {
            logger.warn('⚠️ Algumas tabelas não foram encontradas. Execute o setup do banco.');
          }
        } catch (error) {
          logger.warn('⚠️ Não foi possível verificar tabelas:', error.message);
        }
      }
      
      // Executar limpeza de dados em produção
      if (environment.isProduction()) {
        await cleanupOldData();
      }
      
      logger.info('✅ Banco de dados PostgreSQL inicializado com sucesso');
      return true;
    }
  } catch (error) {
    logger.error('❌ Falha na inicialização do banco de dados:', error);
    throw error;
  }
}

/**
 * Fechar pool de conexões
 */
async function closePool() {
  if (pool) {
    try {
      await pool.end();
      logger.info('🔌 Pool de conexões PostgreSQL fechado');
    } catch (error) {
      logger.error('Erro ao fechar pool:', error);
    }
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

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('SIGINT received, fechando pool de conexões...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, fechando pool de conexões...');
  await closePool();
  process.exit(0);
});

module.exports = {
  pool,
  testConnection,
  executeQuery,
  insertWithRetry,
  updateWithRetry,
  findWithCache,
  executeTransaction,
  cleanupOldData,
  backupDatabase,
  healthCheck,
  initializeDatabase,
  closePool
};