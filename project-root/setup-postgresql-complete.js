const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração de conexão com PostgreSQL
const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'postgres', // Conecta primeiro ao banco padrão para criar o banco específico
  user: 'postgres',
  password: 'password', // Substitua pela sua senha do PostgreSQL
};

const targetDatabase = 'umbler_webhook_db';

async function setupPostgreSQL() {
  console.log('🚀 Configurando PostgreSQL para Umbler Webhook...\n');

  // 1. Conectar ao PostgreSQL e criar banco se não existir
  const adminPool = new Pool(dbConfig);
  
  try {
    // Verificar se o banco existe
    const checkDbQuery = `SELECT 1 FROM pg_database WHERE datname = '${targetDatabase}'`;
    const dbExists = await adminPool.query(checkDbQuery);
    
    if (dbExists.rows.length === 0) {
      console.log(`📦 Criando banco de dados: ${targetDatabase}`);
      await adminPool.query(`CREATE DATABASE ${targetDatabase}`);
      console.log('✅ Banco de dados criado com sucesso!\n');
    } else {
      console.log(`✅ Banco de dados ${targetDatabase} já existe\n`);
    }
  } catch (error) {
    console.error('❌ Erro ao criar banco:', error.message);
    process.exit(1);
  } finally {
    await adminPool.end();
  }

  // 2. Conectar ao banco específico e criar tabelas
  const appPool = new Pool({
    ...dbConfig,
    database: targetDatabase
  });

  try {
    console.log('🔧 Criando estrutura de tabelas...\n');

    // 2.1. Tabela de eventos de webhook
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id SERIAL PRIMARY KEY,
        event_id VARCHAR(255) UNIQUE NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        data JSONB NOT NULL,
        processed BOOLEAN DEFAULT FALSE,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        processed_at TIMESTAMP WITH TIME ZONE
      )
    `);
    console.log('✅ Tabela webhook_events criada');

    // 2.2. Tabela de contatos
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        external_id VARCHAR(255) UNIQUE,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(255),
        tags TEXT[],
        status VARCHAR(50) DEFAULT 'active',
        metadata JSONB,
        last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela contacts criada');

    // 2.3. Tabela de conversas/chats
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS chats (
        id SERIAL PRIMARY KEY,
        external_id VARCHAR(255) UNIQUE NOT NULL,
        contact_id INTEGER REFERENCES contacts(id),
        status VARCHAR(50) DEFAULT 'open',
        last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        total_messages INTEGER DEFAULT 0,
        total_unread INTEGER DEFAULT 0,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela chats criada');

    // 2.4. Tabela de mensagens
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        external_id VARCHAR(255) UNIQUE NOT NULL,
        chat_id INTEGER REFERENCES chats(id),
        contact_id INTEGER REFERENCES contacts(id),
        content TEXT,
        message_type VARCHAR(50) NOT NULL,
        direction VARCHAR(20) NOT NULL, -- 'incoming' ou 'outgoing'
        file_url TEXT,
        file_type VARCHAR(100),
        file_size INTEGER,
        location_data JSONB,
        quoted_message_id INTEGER REFERENCES messages(id),
        metadata JSONB,
        event_at_utc TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela messages criada');

    // 2.5. Tabela de reações
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS message_reactions (
        id SERIAL PRIMARY KEY,
        message_id INTEGER REFERENCES messages(id),
        contact_id INTEGER REFERENCES contacts(id),
        emoji VARCHAR(10) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela message_reactions criada');

    // 2.6. Índices para performance
    console.log('\n🔧 Criando índices...');
    
    await appPool.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
      CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);
      CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
      CREATE INDEX IF NOT EXISTS idx_contacts_external_id ON contacts(external_id);
      CREATE INDEX IF NOT EXISTS idx_chats_contact_id ON chats(contact_id);
      CREATE INDEX IF NOT EXISTS idx_chats_external_id ON chats(external_id);
      CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
      CREATE INDEX IF NOT EXISTS idx_messages_contact_id ON messages(contact_id);
      CREATE INDEX IF NOT EXISTS idx_messages_event_at ON messages(event_at_utc);
      CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
    `);
    console.log('✅ Índices criados');

    // 2.7. Triggers para updated_at
    console.log('\n🔧 Criando triggers...');
    
    await appPool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await appPool.query(`
      CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE
      ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      
      CREATE TRIGGER update_chats_updated_at BEFORE UPDATE  
      ON chats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('✅ Triggers criados');

    // 2.8. Inserir dados de exemplo
    console.log('\n🔧 Inserindo dados de exemplo...');
    
    // Verificar se já existem dados
    const contactCount = await appPool.query('SELECT COUNT(*) FROM contacts');
    
    if (parseInt(contactCount.rows[0].count) === 0) {
      // Inserir contatos de exemplo
      await appPool.query(`
        INSERT INTO contacts (external_id, name, phone, email, tags, metadata) VALUES
        ('contact_1', 'João Silva', '+5511999999999', 'joao@email.com', 
         ARRAY['✨ REPECON FIAT', '🐨 LOJISTA'], 
         '{"source": "whatsapp", "verified": true}'::jsonb),
        ('contact_2', 'Maria Santos', '+5511888888888', 'maria@email.com', 
         ARRAY['✨ AUTOMEGA', '💗 Troca'], 
         '{"source": "whatsapp", "verified": true}'::jsonb),
        ('contact_3', 'Pedro Costa', '+5521777777777', 'pedro@email.com', 
         ARRAY['🐨 DICAS', '💛 Zero'], 
         '{"source": "whatsapp", "verified": false}'::jsonb),
        ('contact_4', 'Ana Oliveira', '+5531666666666', 'ana@email.com', 
         ARRAY['🥳 PV', '💚 seminovo'], 
         '{"source": "whatsapp", "verified": true}'::jsonb),
        ('contact_5', 'Carlos Lima', '+5541555555555', 'carlos@email.com', 
         ARRAY['🐨 PIX VISTORIA', '🤎 zero fora'], 
         '{"source": "whatsapp", "verified": true}'::jsonb)
      `);

      // Inserir chats de exemplo
      await appPool.query(`
        INSERT INTO chats (external_id, contact_id, status, total_messages, total_unread) 
        SELECT 
          'chat_' || c.id,
          c.id,
          'open',
          FLOOR(RANDOM() * 50) + 1,
          FLOOR(RANDOM() * 5)
        FROM contacts c
      `);

      // Inserir mensagens de exemplo
      await appPool.query(`
        INSERT INTO messages (external_id, chat_id, contact_id, content, message_type, direction, event_at_utc)
        SELECT 
          'msg_' || c.id || '_1',
          ch.id,
          c.id,
          CASE c.id 
            WHEN 1 THEN 'Olá! Gostaria de informações sobre o carro.'
            WHEN 2 THEN 'Estou interessada na troca do meu carro.'
            WHEN 3 THEN 'Preciso de dicas sobre financiamento.'
            WHEN 4 THEN 'Tem seminovos disponíveis?'
            WHEN 5 THEN 'Quero fazer a vistoria via PIX.'
          END,
          'text',
          'incoming',
          NOW() - INTERVAL '1 hour' * c.id
        FROM contacts c
        JOIN chats ch ON ch.contact_id = c.id
      `);

      console.log('✅ Dados de exemplo inseridos');
    } else {
      console.log('✅ Dados já existem, pulando inserção');
    }

    console.log('\n🎉 Configuração do PostgreSQL concluída com sucesso!');
    console.log('\n📊 Estatísticas:');
    
    const stats = await appPool.query(`
      SELECT 
        (SELECT COUNT(*) FROM contacts) as total_contacts,
        (SELECT COUNT(*) FROM chats) as total_chats,
        (SELECT COUNT(*) FROM messages) as total_messages,
        (SELECT COUNT(*) FROM webhook_events) as total_webhook_events
    `);
    
    console.log(`- Contatos: ${stats.rows[0].total_contacts}`);
    console.log(`- Chats: ${stats.rows[0].total_chats}`);
    console.log(`- Mensagens: ${stats.rows[0].total_messages}`);
    console.log(`- Eventos de Webhook: ${stats.rows[0].total_webhook_events}`);

  } catch (error) {
    console.error('❌ Erro ao configurar tabelas:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await appPool.end();
  }
}

// Função para testar a conexão
async function testConnection() {
  console.log('\n🔍 Testando conexão com PostgreSQL...');
  
  const pool = new Pool({
    ...dbConfig,
    database: targetDatabase
  });

  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as version');
    console.log('✅ Conexão testada com sucesso!');
    console.log(`⏰ Hora atual: ${result.rows[0].current_time}`);
    console.log(`🐘 Versão PostgreSQL: ${result.rows[0].version.split(' ')[0]}`);
    return true;
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

// Executar configuração
if (require.main === module) {
  setupPostgreSQL()
    .then(() => testConnection())
    .then(() => {
      console.log('\n✅ PostgreSQL configurado e pronto para uso!');
      console.log('\n📝 Próximos passos:');
      console.log('1. Atualize o arquivo .env com suas credenciais do PostgreSQL');
      console.log('2. Reinicie o servidor backend');
      console.log('3. Teste o webhook enviando dados');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Falha na configuração:', error);
      process.exit(1);
    });
}

module.exports = { setupPostgreSQL, testConnection };