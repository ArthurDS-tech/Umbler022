#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

console.log('🔧 DIAGNÓSTICO E CORREÇÃO DO SUPABASE');
console.log('='.repeat(50));

/**
 * Função para criar interface readline
 */
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Função para fazer perguntas
 */
function question(rl, query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Verificar se as credenciais do Supabase estão configuradas
 */
function checkSupabaseCredentials() {
  console.log('\n🔍 VERIFICANDO CONFIGURAÇÕES...');
  
  const envPath = path.join(__dirname, '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ Arquivo .env não encontrado');
    return { hasEnv: false, hasCredentials: false };
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasSupabaseUrl = envContent.includes('SUPABASE_URL=') && !envContent.includes('SUPABASE_URL=https://your-project-id.supabase.co');
  const hasSupabaseKey = envContent.includes('SUPABASE_SERVICE_ROLE_KEY=') && !envContent.includes('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here');
  
  console.log(`✅ Arquivo .env encontrado`);
  console.log(`${hasSupabaseUrl ? '✅' : '❌'} SUPABASE_URL configurada`);
  console.log(`${hasSupabaseKey ? '✅' : '❌'} SUPABASE_SERVICE_ROLE_KEY configurada`);
  
  return { 
    hasEnv: true, 
    hasCredentials: hasSupabaseUrl && hasSupabaseKey,
    hasUrl: hasSupabaseUrl,
    hasKey: hasSupabaseKey
  };
}

/**
 * Testar conexão com Supabase
 */
async function testSupabaseConnection(url, key) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    console.log('\n🔗 TESTANDO CONEXÃO COM SUPABASE...');
    
    const supabase = createClient(url, key);
    
    // Tentar uma operação simples
    const { data, error } = await supabase
      .from('webhook_events')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      if (error.message.includes('relation "webhook_events" does not exist')) {
        console.log('⚠️ Conexão OK, mas tabelas não existem');
        return { connected: true, tablesExist: false, error: error.message };
      } else {
        console.log('❌ Erro na conexão:', error.message);
        return { connected: false, tablesExist: false, error: error.message };
      }
    }
    
    console.log('✅ Conexão com Supabase bem-sucedida');
    return { connected: true, tablesExist: true, error: null };
    
  } catch (error) {
    console.log('❌ Erro ao testar conexão:', error.message);
    return { connected: false, tablesExist: false, error: error.message };
  }
}

/**
 * Configurar credenciais interativamente
 */
async function configureCredentials() {
  const rl = createReadlineInterface();
  
  console.log('\n📝 CONFIGURAÇÃO DAS CREDENCIAIS DO SUPABASE');
  console.log('-'.repeat(50));
  console.log('Para obter suas credenciais:');
  console.log('1. Acesse https://supabase.com/dashboard');
  console.log('2. Selecione seu projeto');
  console.log('3. Vá em Settings > API');
  console.log('4. Copie a URL e as chaves');
  console.log('');
  
  const supabaseUrl = await question(rl, '🔗 Digite a URL do Supabase (ex: https://abc123.supabase.co): ');
  const supabaseKey = await question(rl, '🔑 Digite a Service Role Key: ');
  
  rl.close();
  
  return { supabaseUrl: supabaseUrl.trim(), supabaseKey: supabaseKey.trim() };
}

/**
 * Atualizar arquivo .env
 */
function updateEnvFile(supabaseUrl, supabaseKey) {
  const envPath = path.join(__dirname, '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Atualizar SUPABASE_URL
  if (envContent.includes('SUPABASE_URL=')) {
    envContent = envContent.replace(/SUPABASE_URL=.*/, `SUPABASE_URL=${supabaseUrl}`);
  } else {
    envContent += `\nSUPABASE_URL=${supabaseUrl}`;
  }
  
  // Atualizar SUPABASE_SERVICE_ROLE_KEY
  if (envContent.includes('SUPABASE_SERVICE_ROLE_KEY=')) {
    envContent = envContent.replace(/SUPABASE_SERVICE_ROLE_KEY=.*/, `SUPABASE_SERVICE_ROLE_KEY=${supabaseKey}`);
  } else {
    envContent += `\nSUPABASE_SERVICE_ROLE_KEY=${supabaseKey}`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Arquivo .env atualizado');
}

/**
 * Criar tabelas no Supabase
 */
async function createSupabaseTables(supabaseUrl, supabaseKey) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('\n📊 CRIANDO TABELAS NO SUPABASE...');
    
    // Lista das tabelas e suas estruturas
    const tables = [
      {
        name: 'webhook_events',
        sql: `
          CREATE TABLE IF NOT EXISTS webhook_events (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            event_id VARCHAR(255) UNIQUE NOT NULL,
            event_type VARCHAR(100) NOT NULL,
            event_date TIMESTAMPTZ NOT NULL,
            payload JSONB NOT NULL,
            processed BOOLEAN DEFAULT FALSE,
            processed_at TIMESTAMPTZ,
            error_message TEXT,
            retry_count INTEGER DEFAULT 0,
            source_ip INET,
            user_agent TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      },
      {
        name: 'contacts',
        sql: `
          CREATE TABLE IF NOT EXISTS contacts (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            umbler_contact_id VARCHAR(255) UNIQUE,
            phone_number VARCHAR(20) NOT NULL,
            name VARCHAR(255),
            email VARCHAR(255),
            profile_picture_url TEXT,
            is_blocked BOOLEAN DEFAULT FALSE,
            contact_type VARCHAR(50),
            last_active_utc TIMESTAMPTZ,
            group_identifier VARCHAR(255),
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      },
      {
        name: 'chats',
        sql: `
          CREATE TABLE IF NOT EXISTS chats (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            umbler_chat_id VARCHAR(255) UNIQUE,
            contact_id UUID REFERENCES contacts(id),
            channel_id UUID,
            sector_id UUID,
            assigned_member_id UUID,
            status VARCHAR(50) DEFAULT 'open',
            is_open BOOLEAN DEFAULT TRUE,
            is_private BOOLEAN DEFAULT FALSE,
            is_waiting BOOLEAN DEFAULT FALSE,
            waiting_since_utc TIMESTAMPTZ,
            total_unread INTEGER DEFAULT 0,
            total_ai_responses INTEGER DEFAULT 0,
            closed_at_utc TIMESTAMPTZ,
            event_at_utc TIMESTAMPTZ,
            first_contact_message_id VARCHAR(255),
            first_member_reply_message_id VARCHAR(255),
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      },
      {
        name: 'messages',
        sql: `
          CREATE TABLE IF NOT EXISTS messages (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            umbler_message_id VARCHAR(255) UNIQUE,
            chat_id UUID REFERENCES chats(id),
            contact_id UUID REFERENCES contacts(id),
            organization_member_id UUID,
            message_type VARCHAR(50) DEFAULT 'text',
            content TEXT,
            direction VARCHAR(20) DEFAULT 'inbound',
            source VARCHAR(50),
            message_state VARCHAR(50),
            is_private BOOLEAN DEFAULT FALSE,
            event_at_utc TIMESTAMPTZ,
            created_at_utc TIMESTAMPTZ,
            file_id VARCHAR(255),
            template_id VARCHAR(255),
            quoted_message_id VARCHAR(255),
            raw_webhook_data JSONB,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      }
    ];
    
    // Executar cada comando SQL
    for (const table of tables) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: table.sql });
        
        if (error) {
          // Tentar método alternativo usando a REST API
          console.log(`⚠️ Tentando método alternativo para ${table.name}...`);
          
          // Para Supabase, vamos usar o método de inserção de schema
          // Este é um workaround já que o Supabase não permite SQL direto via API
          console.log(`⚠️ Tabela ${table.name}: Use o SQL Editor no Dashboard do Supabase`);
        } else {
          console.log(`✅ Tabela ${table.name} criada`);
        }
      } catch (error) {
        console.log(`⚠️ Tabela ${table.name}: ${error.message}`);
      }
    }
    
    console.log('\n📋 INSTRUÇÕES PARA CRIAR TABELAS MANUALMENTE:');
    console.log('1. Acesse o Supabase Dashboard');
    console.log('2. Vá para SQL Editor');
    console.log('3. Execute o arquivo schema.sql ou use os comandos SQL acima');
    
    return true;
  } catch (error) {
    console.log('❌ Erro ao criar tabelas:', error.message);
    return false;
  }
}

/**
 * Função principal
 */
async function main() {
  try {
    // 1. Verificar credenciais
    const credentialsCheck = checkSupabaseCredentials();
    
    if (!credentialsCheck.hasEnv) {
      console.log('\n❌ PROBLEMA: Arquivo .env não encontrado');
      console.log('💡 SOLUÇÃO: Execute primeiro "cp .env.example .env"');
      process.exit(1);
    }
    
    let supabaseUrl, supabaseKey;
    
    if (!credentialsCheck.hasCredentials) {
      console.log('\n❌ PROBLEMA: Credenciais do Supabase não configuradas');
      console.log('💡 SOLUÇÃO: Vamos configurar agora...');
      
      const credentials = await configureCredentials();
      supabaseUrl = credentials.supabaseUrl;
      supabaseKey = credentials.supabaseKey;
      
      // Validar formato das credenciais
      if (!supabaseUrl.includes('supabase.co')) {
        console.log('❌ URL do Supabase inválida. Deve conter "supabase.co"');
        process.exit(1);
      }
      
      if (supabaseKey.length < 50) {
        console.log('❌ Service Role Key parece inválida (muito curta)');
        process.exit(1);
      }
      
      updateEnvFile(supabaseUrl, supabaseKey);
    } else {
      // Ler credenciais do arquivo .env
      require('dotenv').config();
      supabaseUrl = process.env.SUPABASE_URL;
      supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    }
    
    // 2. Testar conexão
    const connectionTest = await testSupabaseConnection(supabaseUrl, supabaseKey);
    
    if (!connectionTest.connected) {
      console.log('\n❌ PROBLEMA: Não foi possível conectar com o Supabase');
      console.log('💡 Verifique se as credenciais estão corretas');
      console.log('💡 Erro:', connectionTest.error);
      process.exit(1);
    }
    
    // 3. Criar tabelas se necessário
    if (!connectionTest.tablesExist) {
      console.log('\n⚠️ PROBLEMA: Tabelas não existem no Supabase');
      await createSupabaseTables(supabaseUrl, supabaseKey);
    }
    
    // 4. Teste final
    console.log('\n🧪 TESTE FINAL...');
    const finalTest = await testSupabaseConnection(supabaseUrl, supabaseKey);
    
    if (finalTest.connected) {
      console.log('\n🎉 SUCESSO! Configuração do Supabase concluída');
      console.log('✅ Conexão funcionando');
      console.log('✅ Arquivo .env configurado');
      
      if (finalTest.tablesExist) {
        console.log('✅ Tabelas existem');
      } else {
        console.log('⚠️ Tabelas precisam ser criadas manualmente no Dashboard');
      }
      
      console.log('\n🚀 Próximos passos:');
      console.log('1. Execute: npm run dev');
      console.log('2. Teste o webhook: http://localhost:3000/webhook/test');
      console.log('3. Envie um webhook de teste para verificar se os dados são salvos');
    } else {
      console.log('\n❌ Ainda há problemas de conexão');
      console.log('💡 Verifique as credenciais e tente novamente');
    }
    
  } catch (error) {
    console.error('\n❌ ERRO FATAL:', error.message);
    process.exit(1);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { checkSupabaseCredentials, testSupabaseConnection };