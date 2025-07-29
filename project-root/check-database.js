const { supabaseAdmin, testConnection } = require('./src/config/database');
const logger = require('./src/utils/logger');

/**
 * Script para verificar se o banco de dados está configurado corretamente
 */

async function checkDatabaseConnection() {
  try {
    console.log('🔍 Verificando conexão com o banco de dados...');
    
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Falha na conexão com o banco de dados');
      return false;
    }
    
    console.log('✅ Conexão com o banco de dados estabelecida');
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com o banco:', error.message);
    return false;
  }
}

async function checkTables() {
  try {
    console.log('\n📋 Verificando tabelas...');
    
    const tables = [
      'contacts',
      'conversations', 
      'messages',
      'webhook_events',
      'agents'
    ];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('count')
          .limit(1);
        
        if (error) {
          console.error(`❌ Tabela ${table}: ${error.message}`);
        } else {
          console.log(`✅ Tabela ${table}: OK`);
        }
      } catch (error) {
        console.error(`❌ Erro ao verificar tabela ${table}:`, error.message);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao verificar tabelas:', error.message);
  }
}

async function checkSampleData() {
  try {
    console.log('\n📊 Verificando dados de exemplo...');
    
    // Verificar contatos
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('contacts')
      .select('count')
      .limit(1);
    
    if (contactsError) {
      console.error('❌ Erro ao verificar contatos:', contactsError.message);
    } else {
      console.log('✅ Tabela de contatos acessível');
    }
    
    // Verificar conversas
    const { data: conversations, error: conversationsError } = await supabaseAdmin
      .from('conversations')
      .select('count')
      .limit(1);
    
    if (conversationsError) {
      console.error('❌ Erro ao verificar conversas:', conversationsError.message);
    } else {
      console.log('✅ Tabela de conversas acessível');
    }
    
    // Verificar mensagens
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select('count')
      .limit(1);
    
    if (messagesError) {
      console.error('❌ Erro ao verificar mensagens:', messagesError.message);
    } else {
      console.log('✅ Tabela de mensagens acessível');
    }
    
    // Verificar eventos de webhook
    const { data: webhookEvents, error: webhookError } = await supabaseAdmin
      .from('webhook_events')
      .select('count')
      .limit(1);
    
    if (webhookError) {
      console.error('❌ Erro ao verificar eventos de webhook:', webhookError.message);
    } else {
      console.log('✅ Tabela de eventos de webhook acessível');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar dados:', error.message);
  }
}

async function testInsert() {
  try {
    console.log('\n🧪 Testando inserção de dados...');
    
    // Testar inserção de contato
    const testContact = {
      phone: '+5511999999999',
      name: 'Teste Usuário',
      email: 'teste@exemplo.com',
      status: 'active'
    };
    
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .insert(testContact)
      .select()
      .single();
    
    if (contactError) {
      console.error('❌ Erro ao inserir contato de teste:', contactError.message);
    } else {
      console.log('✅ Contato de teste inserido:', contact.id);
      
      // Limpar contato de teste
      await supabaseAdmin
        .from('contacts')
        .delete()
        .eq('id', contact.id);
      
      console.log('🧹 Contato de teste removido');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste de inserção:', error.message);
  }
}

async function checkEnvironment() {
  console.log('\n🔧 Verificando variáveis de ambiente...');
  
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: Configurado`);
    } else {
      console.error(`❌ ${varName}: Não configurado`);
    }
  }
}

async function runDatabaseCheck() {
  console.log('🚀 Iniciando verificação do banco de dados...\n');
  
  // Verificar variáveis de ambiente
  await checkEnvironment();
  
  // Verificar conexão
  const isConnected = await checkDatabaseConnection();
  if (!isConnected) {
    console.log('\n❌ Não foi possível conectar ao banco de dados.');
    console.log('💡 Verifique suas variáveis de ambiente e a conexão com o Supabase.');
    return;
  }
  
  // Verificar tabelas
  await checkTables();
  
  // Verificar dados
  await checkSampleData();
  
  // Testar inserção
  await testInsert();
  
  console.log('\n✅ Verificação do banco de dados concluída!');
  console.log('\n💡 Se todos os testes passaram, o banco está configurado corretamente.');
  console.log('💡 Agora você pode testar o webhook com: node test-webhook.js');
}

// Executar verificação se o script for chamado diretamente
if (require.main === module) {
  runDatabaseCheck().catch(console.error);
}

module.exports = {
  checkDatabaseConnection,
  checkTables,
  checkSampleData,
  testInsert,
  checkEnvironment,
  runDatabaseCheck
};