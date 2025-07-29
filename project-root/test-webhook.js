const axios = require('axios');

/**
 * Script de teste para verificar se o webhook está funcionando corretamente
 */

const WEBHOOK_URL = 'http://localhost:3000/webhook/umbler';

// Dados de teste para simular webhook da Umbler
const testWebhookData = {
  event: 'message.received',
  timestamp: new Date().toISOString(),
  webhook_id: `test_${Date.now()}`,
  
  message: {
    id: `msg_${Date.now()}`,
    type: 'text',
    content: 'Olá! Esta é uma mensagem de teste.',
    direction: 'inbound',
    timestamp: new Date().toISOString()
  },
  
  contact: {
    phone: '+5511999999999',
    name: 'Teste Usuário',
    email: 'teste@exemplo.com',
    profile_pic: null
  },
  
  conversation: {
    id: `conv_${Date.now()}`,
    status: 'open',
    channel: 'whatsapp'
  }
};

async function testWebhook() {
  try {
    console.log('🧪 Iniciando teste do webhook...');
    console.log('📤 Enviando dados de teste:', JSON.stringify(testWebhookData, null, 2));
    
    const response = await axios.post(WEBHOOK_URL, testWebhookData, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TestWebhook/1.0'
      },
      timeout: 10000
    });
    
    console.log('✅ Webhook respondido com sucesso!');
    console.log('📊 Status:', response.status);
    console.log('📄 Resposta:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao testar webhook:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', error.response.data);
    } else {
      console.error('Erro:', error.message);
    }
    throw error;
  }
}

async function testHealthCheck() {
  try {
    console.log('🏥 Verificando health check...');
    const response = await axios.get('http://localhost:3000/health');
    console.log('✅ Health check OK:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Health check falhou:', error.message);
    return false;
  }
}

async function testWebhookStats() {
  try {
    console.log('📊 Verificando estatísticas do webhook...');
    const response = await axios.get('http://localhost:3000/webhook/stats');
    console.log('✅ Estatísticas:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas:', error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Iniciando testes do webhook...\n');
  
  // Teste 1: Health check
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('❌ Servidor não está respondendo. Certifique-se de que está rodando.');
    return;
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Teste 2: Webhook
  try {
    await testWebhook();
  } catch (error) {
    console.log('❌ Teste do webhook falhou');
    return;
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Teste 3: Estatísticas
  await testWebhookStats();
  
  console.log('\n✅ Todos os testes concluídos!');
  console.log('\n💡 Para verificar se os dados foram salvos, acesse:');
  console.log('   - http://localhost:3000/api/contacts');
  console.log('   - http://localhost:3000/api/conversations');
  console.log('   - http://localhost:3000/api/messages');
}

// Executar testes se o script for chamado diretamente
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testWebhook,
  testHealthCheck,
  testWebhookStats,
  runTests
};