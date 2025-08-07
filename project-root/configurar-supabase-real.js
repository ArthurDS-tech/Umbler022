#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

console.log('🔧 CONFIGURAR SUPABASE COM CREDENCIAIS REAIS');
console.log('='.repeat(50));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  try {
    console.log('\n📝 Para obter suas credenciais do Supabase:');
    console.log('1. Acesse https://supabase.com/dashboard');
    console.log('2. Faça login na sua conta');
    console.log('3. Selecione seu projeto (ou crie um novo)');
    console.log('4. Vá em Settings > API');
    console.log('5. Copie as informações abaixo:');
    console.log('');

    // Obter credenciais
    const supabaseUrl = await question('🔗 Cole a URL do projeto (ex: https://abc123.supabase.co): ');
    const supabaseKey = await question('🔑 Cole a Service Role Key (chave longa que começa com eyJ...): ');

    rl.close();

    // Validar formato
    if (!supabaseUrl.includes('supabase.co')) {
      console.log('❌ URL inválida. Deve conter "supabase.co"');
      process.exit(1);
    }

    if (supabaseKey.length < 50) {
      console.log('❌ Service Role Key muito curta. Verifique se copiou a chave completa');
      process.exit(1);
    }

    console.log('\n🔄 Atualizando arquivo .env...');

    // Atualizar .env
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');

    envContent = envContent
      .replace(/SUPABASE_URL=.*/, `SUPABASE_URL=${supabaseUrl}`)
      .replace(/SUPABASE_SERVICE_ROLE_KEY=.*/, `SUPABASE_SERVICE_ROLE_KEY=${supabaseKey}`);

    fs.writeFileSync(envPath, envContent);
    console.log('✅ Arquivo .env atualizado');

    // Testar conexão
    console.log('\n🔗 Testando conexão...');
    require('dotenv').config();

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('webhook_events')
      .select('count', { count: 'exact', head: true });

    if (error) {
      if (error.message.includes('relation "webhook_events" does not exist')) {
        console.log('⚠️ Conexão OK, mas tabelas não existem');
        console.log('\n📊 PRÓXIMO PASSO: Criar tabelas no Supabase');
        console.log('1. Acesse o Supabase Dashboard');
        console.log('2. Vá para SQL Editor');
        console.log('3. Execute este SQL:');
        console.log('');
        console.log(getCreateTablesSQL());
        console.log('');
        console.log('4. Depois execute: node testar-webhook-completo.js');
      } else {
        console.log('❌ Erro na conexão:', error.message);
        console.log('💡 Verifique se as credenciais estão corretas');
        process.exit(1);
      }
    } else {
      console.log('✅ Conexão funcionando e tabelas existem!');
      console.log('\n🎉 CONFIGURAÇÃO CONCLUÍDA!');
      console.log('Execute: node testar-webhook-completo.js');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    rl.close();
  }
}

function getCreateTablesSQL() {
  return `-- Criar tabelas necessárias
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
);`;
}

main();