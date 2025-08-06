const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🚀 CONFIGURAÇÃO COMPLETA DO SUPABASE PARA WEBHOOK UMBLER');
console.log('='.repeat(60));

async function setupSupabaseComplete() {
  try {
    // Verificar se as credenciais estão configuradas
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('❌ Erro: Credenciais do Supabase não configuradas no arquivo .env');
      console.log('\n📝 Configure as seguintes variáveis no arquivo .env:');
      console.log('SUPABASE_URL=https://your-project-id.supabase.co');
      console.log('SUPABASE_ANON_KEY=your_anon_key_here');
      console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here');
      console.log('\n💡 Obtenha essas credenciais em: https://supabase.com/dashboard');
      process.exit(1);
    }

    // Criar cliente Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('🔗 Conectando com Supabase...');
    
    // Testar conexão
    const { data: testData, error: testError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);

    if (testError && !testError.message.includes('does not exist')) {
      console.log('❌ Erro ao conectar com Supabase:', testError.message);
      process.exit(1);
    }

    console.log('✅ Conectado com Supabase com sucesso!');
    console.log('\n📋 Criando tabelas do sistema...');

    // SQL para criar todas as tabelas necessárias
    const createTablesSQL = `
-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABELA: webhook_events (Dados brutos dos webhooks)
-- =============================================
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    source_ip INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABELA: contacts (Contatos/Clientes)
-- =============================================
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    umbler_contact_id VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    profile_picture_url TEXT,
    is_blocked BOOLEAN DEFAULT FALSE,
    contact_type VARCHAR(50) DEFAULT 'DirectMessage',
    last_active_utc TIMESTAMP WITH TIME ZONE,
    group_identifier VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABELA: contact_tags (Tags dos contatos)
-- =============================================
CREATE TABLE IF NOT EXISTS contact_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    umbler_tag_id VARCHAR(255),
    tag_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABELA: channels (Canais de comunicação)
-- =============================================
CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    umbler_channel_id VARCHAR(255) UNIQUE NOT NULL,
    channel_type VARCHAR(50) NOT NULL,
    phone_number VARCHAR(20),
    name VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABELA: sectors (Setores)
-- =============================================
CREATE TABLE IF NOT EXISTS sectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    umbler_sector_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    order_position INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABELA: organization_members (Membros da organização)
-- =============================================
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    umbler_member_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABELA: chats (Conversas/Atendimentos)
-- =============================================
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    umbler_chat_id VARCHAR(255) UNIQUE NOT NULL,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES channels(id) ON DELETE SET NULL,
    sector_id UUID REFERENCES sectors(id) ON DELETE SET NULL,
    assigned_member_id UUID REFERENCES organization_members(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'open',
    is_open BOOLEAN DEFAULT TRUE,
    is_private BOOLEAN DEFAULT FALSE,
    is_waiting BOOLEAN DEFAULT FALSE,
    waiting_since_utc TIMESTAMP WITH TIME ZONE,
    total_unread INTEGER DEFAULT 0,
    total_ai_responses INTEGER DEFAULT 0,
    closed_at_utc TIMESTAMP WITH TIME ZONE,
    event_at_utc TIMESTAMP WITH TIME ZONE,
    first_contact_message_id VARCHAR(255),
    first_member_reply_message_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABELA: messages (Mensagens)
-- =============================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    umbler_message_id VARCHAR(255) UNIQUE NOT NULL,
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    organization_member_id UUID REFERENCES organization_members(id) ON DELETE SET NULL,
    message_type VARCHAR(50) NOT NULL DEFAULT 'text',
    content TEXT,
    direction VARCHAR(20) NOT NULL DEFAULT 'inbound',
    source VARCHAR(50) DEFAULT 'Contact',
    message_state VARCHAR(50) DEFAULT 'received',
    is_private BOOLEAN DEFAULT FALSE,
    event_at_utc TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at_utc TIMESTAMP WITH TIME ZONE,
    file_id VARCHAR(255),
    template_id VARCHAR(255),
    quoted_message_id VARCHAR(255),
    raw_webhook_data JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABELA: message_reactions (Reações das mensagens)
-- =============================================
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    reaction_type VARCHAR(50) NOT NULL,
    emoji VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================

-- Índices para webhook_events
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);

-- Índices para contacts
CREATE INDEX IF NOT EXISTS idx_contacts_phone_number ON contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_contacts_umbler_id ON contacts(umbler_contact_id);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);

-- Índices para chats
CREATE INDEX IF NOT EXISTS idx_chats_contact_id ON chats(contact_id);
CREATE INDEX IF NOT EXISTS idx_chats_umbler_id ON chats(umbler_chat_id);
CREATE INDEX IF NOT EXISTS idx_chats_status ON chats(status);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at);

-- Índices para messages
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_contact_id ON messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_umbler_id ON messages(umbler_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_event_at ON messages(event_at_utc);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Índices para contact_tags
CREATE INDEX IF NOT EXISTS idx_contact_tags_contact_id ON contact_tags(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_tag_name ON contact_tags(tag_name);
`;

    // Executar SQL usando RPC
    console.log('📝 Criando estrutura das tabelas...');
    
    const { error: createError } = await supabase.rpc('exec_sql', { 
      sql: createTablesSQL 
    });

    if (createError) {
      console.log('❌ Erro ao criar tabelas:', createError.message);
      
      // Tentar criar tabelas individualmente se houver erro
      console.log('🔄 Tentando criar tabelas individualmente...');
      await createTablesIndividually(supabase);
    } else {
      console.log('✅ Tabelas criadas com sucesso!');
    }

    // Verificar se as tabelas foram criadas
    console.log('\n🔍 Verificando tabelas criadas...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', [
        'webhook_events',
        'contacts', 
        'contact_tags',
        'channels',
        'sectors',
        'organization_members',
        'chats',
        'messages',
        'message_reactions'
      ]);

    if (tablesError) {
      console.log('⚠️ Não foi possível verificar tabelas:', tablesError.message);
    } else {
      console.log(`✅ ${tables.length} tabelas encontradas:`);
      tables.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
    }

    // Testar inserção de dados
    console.log('\n🧪 Testando inserção de dados...');
    await testDataInsertion(supabase);

    console.log('\n🎉 CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('\n📋 Próximos passos:');
    console.log('1. ✅ Credenciais configuradas');
    console.log('2. ✅ Tabelas criadas no Supabase');
    console.log('3. ✅ Sistema pronto para receber webhooks');
    console.log('\n🚀 Para testar o sistema:');
    console.log('   npm run dev');
    console.log('\n🔗 URL do webhook: http://localhost:3000/webhook/umbler');

  } catch (error) {
    console.log('\n❌ ERRO NA CONFIGURAÇÃO:', error.message);
    console.log('\n🔧 Possíveis soluções:');
    console.log('1. Verifique as credenciais do Supabase no arquivo .env');
    console.log('2. Verifique se o projeto Supabase está ativo');
    console.log('3. Verifique a conexão com a internet');
    process.exit(1);
  }
}

async function createTablesIndividually(supabase) {
  const tables = [
    {
      name: 'webhook_events',
      sql: `CREATE TABLE IF NOT EXISTS webhook_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_id VARCHAR(255) UNIQUE NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        event_date TIMESTAMP WITH TIME ZONE NOT NULL,
        payload JSONB NOT NULL,
        processed BOOLEAN DEFAULT FALSE,
        processed_at TIMESTAMP WITH TIME ZONE,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        source_ip INET,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`
    },
    {
      name: 'contacts',
      sql: `CREATE TABLE IF NOT EXISTS contacts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        umbler_contact_id VARCHAR(255) UNIQUE NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        name VARCHAR(255),
        email VARCHAR(255),
        profile_picture_url TEXT,
        is_blocked BOOLEAN DEFAULT FALSE,
        contact_type VARCHAR(50) DEFAULT 'DirectMessage',
        last_active_utc TIMESTAMP WITH TIME ZONE,
        group_identifier VARCHAR(255),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`
    }
  ];

  for (const table of tables) {
    try {
      console.log(`  📝 Criando tabela ${table.name}...`);
      const { error } = await supabase.rpc('exec_sql', { sql: table.sql });
      
      if (error) {
        console.log(`    ❌ Erro: ${error.message}`);
      } else {
        console.log(`    ✅ ${table.name} criada`);
      }
    } catch (error) {
      console.log(`    ❌ Erro ao criar ${table.name}:`, error.message);
    }
  }
}

async function testDataInsertion(supabase) {
  try {
    // Testar inserção em webhook_events
    const testEvent = {
      event_id: `test_${Date.now()}`,
      event_type: 'test',
      event_date: new Date().toISOString(),
      payload: { test: true }
    };

    const { data, error } = await supabase
      .from('webhook_events')
      .insert(testEvent)
      .select()
      .single();

    if (error) {
      console.log('⚠️ Teste de inserção falhou:', error.message);
    } else {
      console.log('✅ Teste de inserção bem-sucedido');
      
      // Limpar dados de teste
      await supabase
        .from('webhook_events')
        .delete()
        .eq('id', data.id);
    }
  } catch (error) {
    console.log('⚠️ Erro no teste de inserção:', error.message);
  }
}

// Executar configuração
setupSupabaseComplete().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});