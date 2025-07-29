const axios = require('axios');

/**
 * Script de teste simples para verificar se o webhook está funcionando
 */

const WEBHOOK_URL = 'http://localhost:3000/webhook/umbler';

// Dados de teste mais simples
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
    email: 'teste@exemplo.com'
  },
  
  conversation: {
    id: `conv_${Date.now()}`,
    status: 'open',
    channel: 'whatsapp'
  }
};

async function testWebhook() {
  try {
    console.log('🧪 Testando webhook...');
    console.log('📤 Enviando dados:', JSON.stringify(testWebhookData, null, 2));
    
    const response = await axios.post(WEBHOOK_URL, testWebhookData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Webhook funcionando!');
    console.log('📊 Status:', response.status);
    console.log('📄 Resposta:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('❌ Erro no webhook:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', error.response.data);
    } else {
      console.error('Erro:', error.message);
    }
    throw error;
  }
}

async function testHealth() {
  try {
    console.log('🏥 Testando health check...');
    const response = await axios.get('http://localhost:3000/health');
    console.log('✅ Health check OK:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Health check falhou:', error.message);
    return false;
  }
}

async function runTest() {
  console.log('🚀 Iniciando teste do webhook...\n');
  
  // Teste 1: Health check
  const healthOk = await testHealth();
  if (!healthOk) {
    console.log('❌ Servidor não está respondendo');
    return;
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Teste 2: Webhook
  try {
    await testWebhook();
    console.log('\n✅ Teste concluído com sucesso!');
  } catch (error) {
    console.log('\n❌ Teste falhou');
  }
}

// Executar teste
if (require.main === module) {
  runTest().catch(console.error);
}

module.exports = { testWebhook, testHealth, runTest };