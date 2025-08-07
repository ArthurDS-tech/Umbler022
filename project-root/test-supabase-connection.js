#!/usr/bin/env node

/**
 * Script para testar a conexão com o Supabase
 * 
 * Uso:
 * node test-supabase-connection.js
 */

require('dotenv').config();

async function testSupabaseConnection() {
  console.log('🧪 ===== TESTE DE CONEXÃO COM SUPABASE =====\n');
  
  // 1. Verificar variáveis de ambiente
  console.log('1️⃣ Verificando variáveis de ambiente...');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Presente' : '❌ Ausente');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Presente' : '❌ Ausente');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Variáveis do Supabase não configuradas!');
    return;
  }
  
  // 2. Testar conexão
  console.log('\n2️⃣ Testando conexão com Supabase...');
  try {
    const { testConnection } = require('./src/config/database');
    const isConnected = await testConnection();
    
    if (isConnected) {
      console.log('✅ Conexão com Supabase estabelecida com sucesso!');
    } else {
      console.log('❌ Falha na conexão com Supabase');
      return;
    }
  } catch (error) {
    console.error('❌ Erro ao testar conexão:', error.message);
    return;
  }
  
  // 3. Testar inserção
  console.log('\n3️⃣ Testando inserção de dados...');
  try {
    const { insertWithRetry } = require('./src/config/database');
    
    // Teste 1: Inserir webhook_event
    console.log('\n📝 Testando inserção em webhook_events...');
    const webhookData = {
      event_id: 'test_' + Date.now(),
      event_type: 'Message',
      event_date: new Date().toISOString(),
      payload: { test: 'data' },
      processed: false,
      source_ip: '127.0.0.1',
      user_agent: 'test-script'
    };
    
    const webhookResult = await insertWithRetry('webhook_events', webhookData);
    console.log('✅ webhook_events inserido com sucesso:', webhookResult.id);
    
    // Teste 2: Inserir contato
    console.log('\n👤 Testando inserção em contacts...');
    const contactData = {
      phone: '+5511999999999',
      name: 'Teste Supabase',
      email: 'teste@exemplo.com',
      status: 'active',
      tags: ['teste'],
      metadata: { source: 'test-script' }
    };
    
    const contactResult = await insertWithRetry('contacts', contactData);
    console.log('✅ contacts inserido com sucesso:', contactResult.id);
    
    // Teste 3: Inserir conversa
    console.log('\n💬 Testando inserção em conversations...');
    const conversationData = {
      contact_id: contactResult.id,
      umbler_chat_id: 'test_chat_' + Date.now(),
      status: 'open',
      is_open: true,
      is_private: false,
      is_waiting: false,
      total_unread: 0,
      metadata: { source: 'test-script' }
    };
    
    const conversationResult = await insertWithRetry('conversations', conversationData);
    console.log('✅ conversations inserido com sucesso:', conversationResult.id);
    
    // Teste 4: Inserir mensagem
    console.log('\n📨 Testando inserção em messages...');
    const messageData = {
      umbler_message_id: 'test_msg_' + Date.now(),
      chat_id: conversationResult.id,
      contact_id: contactResult.id,
      message_type: 'text',
      content: 'Mensagem de teste do Supabase',
      direction: 'inbound',
      source: 'Contact',
      message_state: 'received',
      is_private: false,
      event_at_utc: new Date().toISOString(),
      created_at_utc: new Date().toISOString(),
      metadata: { source: 'test-script' }
    };
    
    const messageResult = await insertWithRetry('messages', messageData);
    console.log('✅ messages inserido com sucesso:', messageResult.id);
    
    console.log('\n🎉 TODOS OS TESTES PASSARAM!');
    console.log('✅ Supabase está funcionando corretamente');
    console.log('✅ Inserções estão sendo salvas no banco');
    console.log('✅ Backend pode usar o Supabase normalmente');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Executar teste
testSupabaseConnection().catch(console.error);