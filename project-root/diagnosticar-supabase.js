#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 DIAGNÓSTICO DO SUPABASE - Por que não salva dados?');
console.log('='.repeat(60));

// 1. Verificar arquivo .env
console.log('\n1️⃣ VERIFICANDO ARQUIVO .ENV...');
const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(envPath)) {
  console.log('❌ PROBLEMA: Arquivo .env não existe');
  console.log('💡 SOLUÇÃO: Execute "cp .env.example .env"');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
console.log('✅ Arquivo .env existe');

// 2. Verificar credenciais
console.log('\n2️⃣ VERIFICANDO CREDENCIAIS...');
const hasRealUrl = envContent.includes('SUPABASE_URL=') && !envContent.includes('your-project-id.supabase.co');
const hasRealKey = envContent.includes('SUPABASE_SERVICE_ROLE_KEY=') && !envContent.includes('your_service_role_key_here');

console.log(`SUPABASE_URL: ${hasRealUrl ? '✅ Configurada' : '❌ Placeholder'}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${hasRealKey ? '✅ Configurada' : '❌ Placeholder'}`);

if (!hasRealUrl || !hasRealKey) {
  console.log('\n❌ PROBLEMA ENCONTRADO: Credenciais são valores de exemplo!');
  console.log('');
  console.log('🔧 ISSO EXPLICA POR QUE OS DADOS NÃO ESTÃO SENDO SALVOS:');
  console.log('   - Webhook chega no servidor ✅');
  console.log('   - Servidor tenta salvar no Supabase ❌');
  console.log('   - Credenciais inválidas = falha na conexão ❌');
  console.log('   - Dados não são salvos ❌');
  console.log('');
  console.log('💡 SOLUÇÕES:');
  console.log('');
  console.log('OPÇÃO 1 - Configurar Supabase Real:');
  console.log('1. Acesse https://supabase.com/dashboard');
  console.log('2. Crie/selecione seu projeto');
  console.log('3. Vá em Settings > API');
  console.log('4. Copie URL e Service Role Key');
  console.log('5. Execute: node configurar-supabase-real.js');
  console.log('');
  console.log('OPÇÃO 2 - Usar PostgreSQL Direto:');
  console.log('1. Configure DATABASE_URL no .env');
  console.log('2. Remova SUPABASE_URL do .env');
  console.log('3. Sistema usará PostgreSQL direto');
  console.log('');
  process.exit(1);
}

// 3. Testar conexão
console.log('\n3️⃣ TESTANDO CONEXÃO...');
require('dotenv').config();

async function testConnection() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data, error } = await supabase
      .from('webhook_events')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log('❌ Erro na conexão:', error.message);
      if (error.message.includes('relation "webhook_events" does not exist')) {
        console.log('⚠️ Conexão OK, mas tabelas não existem');
        console.log('💡 Execute o SQL no Dashboard do Supabase para criar tabelas');
      }
      return false;
    }
    
    console.log('✅ Conexão funcionando');
    return true;
  } catch (error) {
    console.log('❌ Erro:', error.message);
    return false;
  }
}

// Se chegou aqui, credenciais estão configuradas
testConnection().then(success => {
  if (success) {
    console.log('\n🎉 TUDO FUNCIONANDO!');
    console.log('Se os dados ainda não aparecem, verifique:');
    console.log('1. Tabelas foram criadas no Dashboard?');
    console.log('2. Webhook está chegando mesmo?');
    console.log('3. Execute: node testar-webhook-completo.js');
  } else {
    console.log('\n❌ PROBLEMA NA CONEXÃO');
    console.log('Verifique se as credenciais estão corretas');
  }
});