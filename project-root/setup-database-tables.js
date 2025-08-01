require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function setupDatabaseTables() {
  console.log('🗄️ Configuração das Tabelas do Supabase');
  console.log('=' .repeat(50));
  
  // Verificar credenciais
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('❌ Erro: Credenciais do Supabase não configuradas.');
    console.log('Execute primeiro: node setup-supabase-credentials.js');
    return;
  }
  
  try {
    // Criar cliente com service role
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
    
    // Verificar quais tabelas já existem
    const tablesToCheck = ['contacts', 'conversations', 'messages', 'webhook_events'];
    const existingTables = [];
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
          
        if (!error) {
          existingTables.push(table);
          console.log(`✅ Tabela "${table}" já existe`);
        }
      } catch (err) {
        console.log(`❌ Tabela "${table}" não encontrada`);
      }
    }
    
    if (existingTables.length === tablesToCheck.length) {
      console.log('\n🎉 Todas as tabelas já existem! Nenhuma ação necessária.');
      
      // Verificar se há dados nas tabelas
      console.log('\n📊 Verificando dados existentes:');
      for (const table of existingTables) {
        try {
          const { count } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
          console.log(`   ${table}: ${count || 0} registros`);
        } catch (err) {
          console.log(`   ${table}: erro ao contar registros`);
        }
      }
      return;
    }
    
    console.log(`\n📝 Necessário criar ${tablesToCheck.length - existingTables.length} tabela(s)`);
    
    // Ler arquivo schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.log('❌ Arquivo schema.sql não encontrado');
      return;
    }
    
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('\n🔧 Executando schema SQL...');
    console.log('(Isso pode demorar alguns segundos)');
    
    // Dividir o SQL em comandos individuais
    const sqlCommands = schemaSql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      
      if (command.includes('CREATE TABLE') || command.includes('CREATE INDEX') || command.includes('CREATE TRIGGER')) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: command });
          
          if (error) {
            // Ignorar erros de "já existe"
            if (error.message.includes('already exists') || error.message.includes('relation') && error.message.includes('already exists')) {
              console.log(`⚠️ Comando ${i + 1}: já existe (ignorado)`);
            } else {
              console.log(`❌ Comando ${i + 1}: ${error.message}`);
              errorCount++;
            }
          } else {
            successCount++;
            console.log(`✅ Comando ${i + 1}: executado com sucesso`);
          }
        } catch (err) {
          console.log(`❌ Comando ${i + 1}: ${err.message}`);
          errorCount++;
        }
      }
    }
    
    console.log(`\n📊 Resultado da execução:`);
    console.log(`✅ Sucessos: ${successCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    
    // Verificar novamente as tabelas
    console.log('\n🔍 Verificando tabelas criadas...');
    
    const finalExistingTables = [];
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
          
        if (!error) {
          finalExistingTables.push(table);
          console.log(`✅ Tabela "${table}" disponível`);
        }
      } catch (err) {
        console.log(`❌ Tabela "${table}" ainda não disponível`);
      }
    }
    
    if (finalExistingTables.length === tablesToCheck.length) {
      console.log('\n🎉 Todas as tabelas foram criadas com sucesso!');
      console.log('\n🔄 Próximos passos:');
      console.log('1. Execute: node test-supabase-connection.js');
      console.log('2. Execute: node test-webhook-insertion.js');
      console.log('3. Inicie o servidor: npm run dev');
    } else {
      console.log('\n⚠️ Algumas tabelas ainda não foram criadas.');
      console.log('Você pode tentar executar o schema.sql manualmente no Supabase Dashboard.');
      console.log('Acesse: Supabase Dashboard > SQL Editor > Cole o conteúdo do schema.sql');
    }
    
  } catch (error) {
    console.log('\n❌ Erro durante a configuração:', error.message);
    
    if (error.message.includes('Invalid API key')) {
      console.log('\n💡 Dica: Verifique as credenciais do Supabase no arquivo .env');
    }
    
    if (error.message.includes('fetch failed')) {
      console.log('\n💡 Dica: Verifique se a URL do Supabase está correta');
    }
  }
}

// Função alternativa usando SQL direto
async function createTablesDirectly() {
  console.log('\n🔧 Tentando método alternativo...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  // Comandos SQL básicos para criar as tabelas principais
  const basicTables = [
    `
    CREATE TABLE IF NOT EXISTS contacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phone VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(255),
      email VARCHAR(255),
      profile_pic_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      last_interaction TIMESTAMP WITH TIME ZONE,
      status VARCHAR(20) DEFAULT 'active',
      tags TEXT[],
      metadata JSONB DEFAULT '{}'::jsonb
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      umbler_conversation_id VARCHAR(255) UNIQUE,
      channel VARCHAR(50) DEFAULT 'whatsapp',
      status VARCHAR(20) DEFAULT 'open',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      metadata JSONB DEFAULT '{}'::jsonb
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      umbler_message_id VARCHAR(255) UNIQUE,
      direction VARCHAR(10) NOT NULL,
      message_type VARCHAR(20) DEFAULT 'text',
      content TEXT,
      status VARCHAR(20) DEFAULT 'sent',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      metadata JSONB DEFAULT '{}'::jsonb
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS webhook_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type VARCHAR(50) NOT NULL,
      event_data JSONB NOT NULL,
      processed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      processed_at TIMESTAMP WITH TIME ZONE,
      source_ip VARCHAR(45),
      user_agent TEXT,
      error_message TEXT
    );
    `
  ];
  
  for (let i = 0; i < basicTables.length; i++) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: basicTables[i] });
      if (error && !error.message.includes('already exists')) {
        console.log(`❌ Erro ao criar tabela ${i + 1}:`, error.message);
      } else {
        console.log(`✅ Tabela ${i + 1} criada/verificada`);
      }
    } catch (err) {
      console.log(`❌ Erro ao criar tabela ${i + 1}:`, err.message);
    }
  }
}

// Executar configuração
setupDatabaseTables();