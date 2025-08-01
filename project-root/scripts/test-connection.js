#!/usr/bin/env node

/**
 * Script para testar conexão com PostgreSQL
 */

const { Pool } = require('pg');
require('dotenv').config();

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`)
};

/**
 * Teste de conexão com PostgreSQL
 */
class ConnectionTester {
  constructor() {
    this.pool = null;
  }

  /**
   * Executar todos os testes
   */
  async runTests() {
    log.title('🔗 TESTE DE CONEXÃO POSTGRESQL');
    
    try {
      await this.testBasicConnection();
      await this.testTables();
      await this.testFunctions();
      await this.testViews();
      await this.testPerformance();
      
      log.success('🎉 Todos os testes passaram com sucesso!');
      
    } catch (error) {
      log.error('❌ Teste falhou:');
      log.error(error.message);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Testar conexão básica
   */
  async testBasicConnection() {
    log.title('🔌 TESTE DE CONEXÃO BÁSICA');

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL não encontrada no arquivo .env');
    }

    try {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });

      const client = await this.pool.connect();
      const result = await client.query('SELECT version(), current_database(), current_user');
      client.release();

      log.success('Conexão estabelecida com sucesso!');
      log.info(`Versão: ${result.rows[0].version.split(' ')[0]}`);
      log.info(`Banco: ${result.rows[0].current_database}`);
      log.info(`Usuário: ${result.rows[0].current_user}`);

    } catch (error) {
      throw new Error(`Falha na conexão: ${error.message}`);
    }
  }

  /**
   * Testar tabelas
   */
  async testTables() {
    log.title('📊 TESTE DE TABELAS');

    const expectedTables = [
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

    try {
      const result = await this.pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN (${expectedTables.map(t => `'${t}'`).join(',')})
        ORDER BY table_name
      `);

      const foundTables = result.rows.map(row => row.table_name);
      const missingTables = expectedTables.filter(table => !foundTables.includes(table));

      if (missingTables.length > 0) {
        throw new Error(`Tabelas faltando: ${missingTables.join(', ')}`);
      }

      log.success(`Todas as ${foundTables.length} tabelas encontradas!`);
      
      // Testar inserção em cada tabela
      await this.testTableInserts();

    } catch (error) {
      throw new Error(`Erro ao testar tabelas: ${error.message}`);
    }
  }

  /**
   * Testar inserções nas tabelas
   */
  async testTableInserts() {
    log.info('Testando inserções...');

    try {
      // Teste de inserção em webhook_events
      const webhookResult = await this.pool.query(`
        INSERT INTO webhook_events (event_id, event_type, event_date, payload, processed)
        VALUES ('test-connection-${Date.now()}', 'test', NOW(), '{"test": true}', false)
        RETURNING id
      `);
      log.success(`Webhook event inserido: ${webhookResult.rows[0].id}`);

      // Teste de inserção em contacts
      const contactResult = await this.pool.query(`
        INSERT INTO contacts (umbler_contact_id, phone_number, name)
        VALUES ('test-contact-${Date.now()}', '+5511999999999', 'Teste Conexão')
        RETURNING id
      `);
      log.success(`Contact inserido: ${contactResult.rows[0].id}`);

      // Teste de inserção em channels
      const channelResult = await this.pool.query(`
        INSERT INTO channels (umbler_channel_id, channel_type, phone_number, name)
        VALUES ('test-channel-${Date.now()}', 'WhatsappApi', '+5511888888888', 'Teste Canal')
        RETURNING id
      `);
      log.success(`Channel inserido: ${channelResult.rows[0].id}`);

      // Teste de inserção em sectors
      const sectorResult = await this.pool.query(`
        INSERT INTO sectors (umbler_sector_id, name, is_default)
        VALUES ('test-sector-${Date.now()}', 'Teste Setor', false)
        RETURNING id
      `);
      log.success(`Sector inserido: ${sectorResult.rows[0].id}`);

      // Limpar dados de teste
      await this.pool.query('DELETE FROM webhook_events WHERE event_id LIKE \'test-connection-%\'');
      await this.pool.query('DELETE FROM contacts WHERE umbler_contact_id LIKE \'test-contact-%\'');
      await this.pool.query('DELETE FROM channels WHERE umbler_channel_id LIKE \'test-channel-%\'');
      await this.pool.query('DELETE FROM sectors WHERE umbler_sector_id LIKE \'test-sector-%\'');

      log.success('Inserções de teste concluídas e limpas!');

    } catch (error) {
      throw new Error(`Erro ao testar inserções: ${error.message}`);
    }
  }

  /**
   * Testar funções
   */
  async testFunctions() {
    log.title('⚙️ TESTE DE FUNÇÕES');

    const expectedFunctions = [
      'calculate_response_time',
      'get_webhook_stats',
      'get_waiting_chats'
    ];

    try {
      const result = await this.pool.query(`
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_type = 'FUNCTION'
        AND routine_name IN (${expectedFunctions.map(f => `'${f}'`).join(',')})
        ORDER BY routine_name
      `);

      const foundFunctions = result.rows.map(row => row.routine_name);
      const missingFunctions = expectedFunctions.filter(func => !foundFunctions.includes(func));

      if (missingFunctions.length > 0) {
        throw new Error(`Funções faltando: ${missingFunctions.join(', ')}`);
      }

      log.success(`Todas as ${foundFunctions.length} funções encontradas!`);

      // Testar função get_webhook_stats
      const statsResult = await this.pool.query('SELECT * FROM get_webhook_stats(\'1 hour\')');
      log.success('Função get_webhook_stats executada com sucesso!');

    } catch (error) {
      throw new Error(`Erro ao testar funções: ${error.message}`);
    }
  }

  /**
   * Testar views
   */
  async testViews() {
    log.title('👁️ TESTE DE VIEWS');

    const expectedViews = [
      'chat_summary',
      'message_summary'
    ];

    try {
      const result = await this.pool.query(`
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name IN (${expectedViews.map(v => `'${v}'`).join(',')})
        ORDER BY table_name
      `);

      const foundViews = result.rows.map(row => row.table_name);
      const missingViews = expectedViews.filter(view => !foundViews.includes(view));

      if (missingViews.length > 0) {
        throw new Error(`Views faltando: ${missingViews.join(', ')}`);
      }

      log.success(`Todas as ${foundViews.length} views encontradas!`);

      // Testar consulta nas views
      const chatSummaryResult = await this.pool.query('SELECT COUNT(*) as count FROM chat_summary');
      const messageSummaryResult = await this.pool.query('SELECT COUNT(*) as count FROM message_summary');

      log.success('Views consultadas com sucesso!');
      log.info(`chat_summary: ${chatSummaryResult.rows[0].count} registros`);
      log.info(`message_summary: ${messageSummaryResult.rows[0].count} registros`);

    } catch (error) {
      throw new Error(`Erro ao testar views: ${error.message}`);
    }
  }

  /**
   * Testar performance
   */
  async testPerformance() {
    log.title('⚡ TESTE DE PERFORMANCE');

    try {
      // Teste de consulta simples
      const startTime = Date.now();
      await this.pool.query('SELECT COUNT(*) FROM webhook_events');
      const simpleQueryTime = Date.now() - startTime;

      // Teste de consulta com JOIN
      const startTime2 = Date.now();
      await this.pool.query(`
        SELECT c.name, COUNT(m.id) as message_count
        FROM contacts c
        LEFT JOIN messages m ON c.id = m.contact_id
        GROUP BY c.id, c.name
        LIMIT 10
      `);
      const joinQueryTime = Date.now() - startTime2;

      // Teste de consulta com JSONB
      const startTime3 = Date.now();
      await this.pool.query(`
        SELECT payload->>'Type' as event_type, COUNT(*)
        FROM webhook_events
        GROUP BY payload->>'Type'
      `);
      const jsonbQueryTime = Date.now() - startTime3;

      log.success('Testes de performance concluídos!');
      log.info(`Consulta simples: ${simpleQueryTime}ms`);
      log.info(`Consulta com JOIN: ${joinQueryTime}ms`);
      log.info(`Consulta JSONB: ${jsonbQueryTime}ms`);

      if (simpleQueryTime > 1000) {
        log.warning('Consulta simples está lenta (>1s)');
      }

      if (joinQueryTime > 2000) {
        log.warning('Consulta com JOIN está lenta (>2s)');
      }

      if (jsonbQueryTime > 1500) {
        log.warning('Consulta JSONB está lenta (>1.5s)');
      }

    } catch (error) {
      throw new Error(`Erro ao testar performance: ${error.message}`);
    }
  }

  /**
   * Limpeza
   */
  async cleanup() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}

/**
 * Executar testes
 */
async function main() {
  const tester = new ConnectionTester();
  await tester.runTests();
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(error => {
    log.error('Erro fatal:');
    log.error(error.message);
    process.exit(1);
  });
}

module.exports = ConnectionTester;