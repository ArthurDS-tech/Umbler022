#!/usr/bin/env node

/**
 * Script de configuração do PostgreSQL (Neon)
 * Este script configura o banco de dados PostgreSQL para o sistema de webhook da Umbler
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Pool } = require('pg');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`)
};

// Interface para input do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

/**
 * Configuração do PostgreSQL
 */
class PostgreSQLSetup {
  constructor() {
    this.pool = null;
    this.config = {
      host: '',
      port: 5432,
      database: '',
      user: '',
      password: '',
      ssl: false
    };
  }

  /**
   * Inicializar configuração
   */
  async initialize() {
    log.title('🚀 CONFIGURAÇÃO POSTGRESQL PARA SISTEMA DE WEBHOOK UMBLER');
    log.info('Este script irá configurar o banco de dados PostgreSQL para o sistema de webhook.');
    log.info('Você pode usar Neon (gratuito) ou qualquer outro provedor PostgreSQL.\n');

    await this.getConfiguration();
    await this.testConnection();
    await this.createTables();
    await this.createIndexes();
    await this.createFunctions();
    await this.createViews();
    await this.insertSampleData();
    await this.generateEnvFile();
    
    log.success('🎉 Configuração do PostgreSQL concluída com sucesso!');
    log.info('Você pode agora iniciar o servidor com: npm run dev');
  }

  /**
   * Obter configuração do usuário
   */
  async getConfiguration() {
    log.title('📋 CONFIGURAÇÃO DO BANCO DE DADOS');

    const useNeon = await question('Deseja usar Neon (gratuito)? (y/n): ');
    
    if (useNeon.toLowerCase() === 'y' || useNeon.toLowerCase() === 'yes') {
      await this.configureNeon();
    } else {
      await this.configureCustomPostgreSQL();
    }
  }

  /**
   * Configurar Neon
   */
  async configureNeon() {
    log.info('🌐 Configurando Neon PostgreSQL...');
    log.info('1. Acesse: https://neon.tech');
    log.info('2. Crie uma conta gratuita');
    log.info('3. Crie um novo projeto');
    log.info('4. Copie a string de conexão\n');

    const connectionString = await question('Cole a string de conexão do Neon: ');
    
    if (!connectionString.includes('postgresql://')) {
      throw new Error('String de conexão inválida. Deve começar com "postgresql://"');
    }

    // Parse da string de conexão
    const url = new URL(connectionString);
    this.config = {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1),
      user: url.username,
      password: url.password,
      ssl: { rejectUnauthorized: false }
    };

    log.success('Configuração do Neon obtida com sucesso!');
  }

  /**
   * Configurar PostgreSQL customizado
   */
  async configureCustomPostgreSQL() {
    log.info('🔧 Configurando PostgreSQL customizado...\n');

    this.config.host = await question('Host (ex: localhost): ') || 'localhost';
    this.config.port = parseInt(await question('Porta (ex: 5432): ')) || 5432;
    this.config.database = await question('Nome do banco: ') || 'umbler_webhook';
    this.config.user = await question('Usuário: ') || 'postgres';
    this.config.password = await question('Senha: ') || '';
    
    const useSSL = await question('Usar SSL? (y/n): ');
    this.config.ssl = useSSL.toLowerCase() === 'y' || useSSL.toLowerCase() === 'yes';

    log.success('Configuração customizada obtida com sucesso!');
  }

  /**
   * Testar conexão
   */
  async testConnection() {
    log.title('🔗 TESTANDO CONEXÃO');

    try {
      this.pool = new Pool(this.config);
      
      const client = await this.pool.connect();
      const result = await client.query('SELECT version()');
      client.release();

      log.success('Conexão estabelecida com sucesso!');
      log.info(`Versão do PostgreSQL: ${result.rows[0].version.split(' ')[0]}`);
      
    } catch (error) {
      log.error('Falha na conexão com o banco de dados:');
      log.error(error.message);
      throw error;
    }
  }

  /**
   * Criar tabelas
   */
  async createTables() {
    log.title('📊 CRIANDO TABELAS');

    const schemaPath = path.join(__dirname, '../schema-postgresql.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    try {
      // Dividir o schema em comandos individuais
      const commands = schema
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

      for (const command of commands) {
        if (command.trim()) {
          await this.pool.query(command);
        }
      }

      log.success('Todas as tabelas criadas com sucesso!');
      
    } catch (error) {
      log.error('Erro ao criar tabelas:');
      log.error(error.message);
      throw error;
    }
  }

  /**
   * Criar índices
   */
  async createIndexes() {
    log.title('🔍 CRIANDO ÍNDICES');

    const indexes = [
      // Índices para webhook_events
      'CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);',
      'CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);',
      'CREATE INDEX IF NOT EXISTS idx_webhook_events_event_date ON webhook_events(event_date);',
      'CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);',
      'CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);',
      'CREATE INDEX IF NOT EXISTS idx_webhook_events_payload_gin ON webhook_events USING GIN(payload);',

      // Índices para contacts
      'CREATE INDEX IF NOT EXISTS idx_contacts_umbler_id ON contacts(umbler_contact_id);',
      'CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone_number);',
      'CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts USING GIN(name gin_trgm_ops);',
      'CREATE INDEX IF NOT EXISTS idx_contacts_is_blocked ON contacts(is_blocked);',
      'CREATE INDEX IF NOT EXISTS idx_contacts_last_active ON contacts(last_active_utc);',
      'CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);',

      // Índices para chats
      'CREATE INDEX IF NOT EXISTS idx_chats_umbler_id ON chats(umbler_chat_id);',
      'CREATE INDEX IF NOT EXISTS idx_chats_contact_id ON chats(contact_id);',
      'CREATE INDEX IF NOT EXISTS idx_chats_channel_id ON chats(channel_id);',
      'CREATE INDEX IF NOT EXISTS idx_chats_sector_id ON chats(sector_id);',
      'CREATE INDEX IF NOT EXISTS idx_chats_assigned_member_id ON chats(assigned_member_id);',
      'CREATE INDEX IF NOT EXISTS idx_chats_status ON chats(status);',
      'CREATE INDEX IF NOT EXISTS idx_chats_is_waiting ON chats(is_waiting);',
      'CREATE INDEX IF NOT EXISTS idx_chats_is_open ON chats(is_open);',
      'CREATE INDEX IF NOT EXISTS idx_chats_waiting_since ON chats(waiting_since_utc);',
      'CREATE INDEX IF NOT EXISTS idx_chats_event_at ON chats(event_at_utc);',
      'CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at);',

      // Índices para messages
      'CREATE INDEX IF NOT EXISTS idx_messages_umbler_id ON messages(umbler_message_id);',
      'CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);',
      'CREATE INDEX IF NOT EXISTS idx_messages_contact_id ON messages(contact_id);',
      'CREATE INDEX IF NOT EXISTS idx_messages_org_member_id ON messages(organization_member_id);',
      'CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);',
      'CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);',
      'CREATE INDEX IF NOT EXISTS idx_messages_source ON messages(source);',
      'CREATE INDEX IF NOT EXISTS idx_messages_state ON messages(message_state);',
      'CREATE INDEX IF NOT EXISTS idx_messages_event_at ON messages(event_at_utc);',
      'CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);',
      'CREATE INDEX IF NOT EXISTS idx_messages_content_gin ON messages USING GIN(to_tsvector(\'portuguese\', content));'
    ];

    try {
      for (const index of indexes) {
        await this.pool.query(index);
      }

      log.success('Todos os índices criados com sucesso!');
      
    } catch (error) {
      log.error('Erro ao criar índices:');
      log.error(error.message);
      throw error;
    }
  }

  /**
   * Criar funções
   */
  async createFunctions() {
    log.title('⚙️ CRIANDO FUNÇÕES');

    const functions = [
      // Função para calcular tempo de resposta
      `
      CREATE OR REPLACE FUNCTION calculate_response_time(chat_uuid UUID)
      RETURNS INTERVAL AS $$
      DECLARE
          first_contact_msg TIMESTAMP WITH TIME ZONE;
          first_member_msg TIMESTAMP WITH TIME ZONE;
      BEGIN
          SELECT MIN(event_at_utc) INTO first_contact_msg
          FROM messages 
          WHERE chat_id = chat_uuid AND direction = 'inbound';
          
          SELECT MIN(event_at_utc) INTO first_member_msg
          FROM messages 
          WHERE chat_id = chat_uuid AND direction = 'outbound';
          
          IF first_contact_msg IS NULL OR first_member_msg IS NULL THEN
              RETURN NULL;
          END IF;
          
          RETURN first_member_msg - first_contact_msg;
      END;
      $$ LANGUAGE plpgsql;
      `,

      // Função para obter estatísticas de webhooks
      `
      CREATE OR REPLACE FUNCTION get_webhook_stats(period_interval INTERVAL)
      RETURNS TABLE(
          total_events BIGINT,
          processed_events BIGINT,
          failed_events BIGINT,
          events_by_type JSONB
      ) AS $$
      BEGIN
          RETURN QUERY
          WITH stats AS (
              SELECT 
                  COUNT(*) as total,
                  COUNT(*) FILTER (WHERE processed = true) as processed,
                  COUNT(*) FILTER (WHERE processed = false) as failed,
                  jsonb_object_agg(event_type, count) as by_type
              FROM (
                  SELECT 
                      event_type,
                      COUNT(*) as count
                  FROM webhook_events 
                  WHERE created_at >= NOW() - period_interval
                  GROUP BY event_type
              ) type_counts,
              webhook_events we
              WHERE we.created_at >= NOW() - period_interval
          )
          SELECT 
              stats.total,
              stats.processed,
              stats.failed,
              stats.by_type
          FROM stats;
      END;
      $$ LANGUAGE plpgsql;
      `,

      // Função para buscar chats em espera
      `
      CREATE OR REPLACE FUNCTION get_waiting_chats()
      RETURNS TABLE(
          chat_id UUID,
          contact_name VARCHAR(255),
          contact_phone VARCHAR(20),
          sector_name VARCHAR(100),
          waiting_since TIMESTAMP WITH TIME ZONE,
          last_message TEXT,
          unread_count INTEGER
      ) AS $$
      BEGIN
          RETURN QUERY
          SELECT 
              c.id,
              ct.name,
              ct.phone_number,
              s.name as sector_name,
              c.waiting_since_utc,
              m.content as last_message,
              c.total_unread
          FROM chats c
          JOIN contacts ct ON c.contact_id = ct.id
          LEFT JOIN sectors s ON c.sector_id = s.id
          LEFT JOIN messages m ON m.id = (
              SELECT id FROM messages 
              WHERE chat_id = c.id 
              ORDER BY event_at_utc DESC 
              LIMIT 1
          )
          WHERE c.is_waiting = true AND c.is_open = true
          ORDER BY c.waiting_since_utc ASC;
      END;
      $$ LANGUAGE plpgsql;
      `
    ];

    try {
      for (const func of functions) {
        await this.pool.query(func);
      }

      log.success('Todas as funções criadas com sucesso!');
      
    } catch (error) {
      log.error('Erro ao criar funções:');
      log.error(error.message);
      throw error;
    }
  }

  /**
   * Criar views
   */
  async createViews() {
    log.title('👁️ CRIANDO VIEWS');

    const views = [
      // View para chats com informações completas
      `
      CREATE OR REPLACE VIEW chat_summary AS
      SELECT 
          c.id,
          c.umbler_chat_id,
          c.status,
          c.is_waiting,
          c.is_open,
          c.waiting_since_utc,
          c.total_unread,
          c.event_at_utc,
          c.created_at,
          ct.name as contact_name,
          ct.phone_number as contact_phone,
          ct.umbler_contact_id,
          s.name as sector_name,
          s.umbler_sector_id,
          ch.name as channel_name,
          ch.channel_type,
          om.name as assigned_agent_name,
          om.umbler_member_id as assigned_agent_id,
          (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id) as total_messages,
          (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id AND m.direction = 'inbound') as inbound_messages,
          (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id AND m.direction = 'outbound') as outbound_messages
      FROM chats c
      JOIN contacts ct ON c.contact_id = ct.id
      LEFT JOIN sectors s ON c.sector_id = s.id
      LEFT JOIN channels ch ON c.channel_id = ch.id
      LEFT JOIN organization_members om ON c.assigned_member_id = om.id;
      `,

      // View para mensagens com informações do chat
      `
      CREATE OR REPLACE VIEW message_summary AS
      SELECT 
          m.id,
          m.umbler_message_id,
          m.message_type,
          m.content,
          m.direction,
          m.source,
          m.message_state,
          m.event_at_utc,
          m.created_at,
          c.umbler_chat_id,
          c.status as chat_status,
          ct.name as contact_name,
          ct.phone_number as contact_phone,
          om.name as agent_name,
          s.name as sector_name
      FROM messages m
      JOIN chats c ON m.chat_id = c.id
      JOIN contacts ct ON m.contact_id = ct.id
      LEFT JOIN organization_members om ON m.organization_member_id = om.id
      LEFT JOIN sectors s ON c.sector_id = s.id;
      `
    ];

    try {
      for (const view of views) {
        await this.pool.query(view);
      }

      log.success('Todas as views criadas com sucesso!');
      
    } catch (error) {
      log.error('Erro ao criar views:');
      log.error(error.message);
      throw error;
    }
  }

  /**
   * Inserir dados de exemplo
   */
  async insertSampleData() {
    log.title('📝 INSERINDO DADOS DE EXEMPLO');

    const insertSample = await question('Deseja inserir dados de exemplo? (y/n): ');
    
    if (insertSample.toLowerCase() !== 'y' && insertSample.toLowerCase() !== 'yes') {
      log.info('Pulando inserção de dados de exemplo.');
      return;
    }

    try {
      // Inserir setores de exemplo
      await this.pool.query(`
        INSERT INTO sectors (umbler_sector_id, name, is_default, order_position) 
        VALUES 
          ('sector-1', 'Atendimento Geral', true, 1),
          ('sector-2', 'Suporte Técnico', false, 2),
          ('sector-3', 'Vendas', false, 3)
        ON CONFLICT (umbler_sector_id) DO NOTHING;
      `);

      // Inserir canais de exemplo
      await this.pool.query(`
        INSERT INTO channels (umbler_channel_id, channel_type, phone_number, name) 
        VALUES 
          ('channel-1', 'WhatsappApi', '+554891294620', 'WhatsApp Principal'),
          ('channel-2', 'WhatsappApi', '+5547999955497', 'WhatsApp Secundário')
        ON CONFLICT (umbler_channel_id) DO NOTHING;
      `);

      // Inserir membros da organização
      await this.pool.query(`
        INSERT INTO organization_members (umbler_member_id, name, is_active) 
        VALUES 
          ('member-1', 'João Silva', true),
          ('member-2', 'Maria Santos', true),
          ('member-3', 'Pedro Costa', true)
        ON CONFLICT (umbler_member_id) DO NOTHING;
      `);

      log.success('Dados de exemplo inseridos com sucesso!');
      
    } catch (error) {
      log.error('Erro ao inserir dados de exemplo:');
      log.error(error.message);
      // Não falhar se der erro na inserção de dados de exemplo
    }
  }

  /**
   * Gerar arquivo .env
   */
  async generateEnvFile() {
    log.title('📄 GERANDO ARQUIVO .ENV');

    const envPath = path.join(__dirname, '../.env');
    const envContent = `# Configuração do PostgreSQL
DATABASE_URL=postgresql://${this.config.user}:${this.config.password}@${this.config.host}:${this.config.port}/${this.config.database}

# Configurações da aplicação
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Segurança
WEBHOOK_SECRET=seu_webhook_secret_aqui_mude_em_producao
JWT_SECRET=seu_jwt_secret_aqui_mude_em_producao

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WEBHOOK_MAX=1000

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
CORS_CREDENTIALS=false

# Túnel (ngrok)
AUTO_START_TUNNEL=false
NGROK_AUTH_TOKEN=

# Configurações do banco
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000

# Configurações de desenvolvimento
DEBUG_MODE=true
AUTO_RELOAD=true
`;

    try {
      fs.writeFileSync(envPath, envContent);
      log.success('Arquivo .env gerado com sucesso!');
      log.info(`Localização: ${envPath}`);
      
    } catch (error) {
      log.error('Erro ao gerar arquivo .env:');
      log.error(error.message);
      throw error;
    }
  }

  /**
   * Finalizar
   */
  async finalize() {
    if (this.pool) {
      await this.pool.end();
    }
    rl.close();
  }
}

/**
 * Executar setup
 */
async function main() {
  const setup = new PostgreSQLSetup();
  
  try {
    await setup.initialize();
  } catch (error) {
    log.error('Erro durante a configuração:');
    log.error(error.message);
    process.exit(1);
  } finally {
    await setup.finalize();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = PostgreSQLSetup;