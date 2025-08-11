const { spawn } = require('child_process');
const axios = require('axios');
require('dotenv').config();

// Payload simplificado para teste
const simplePayload = {
  "Type": "Message",
  "EventDate": "2025-08-08T11:06:56.200543Z",
  "Payload": {
    "Type": "Chat",
    "Content": {
      "Contact": {
        "PhoneNumber": "+5548996579768",
        "Name": "Andre Locatelli",
        "Id": "ZnQu0ro6tVW4ayaP"
      },
      "LastMessage": {
        "Content": "Bom dia tudo bem ?",
        "Id": "aJXaTksQRpfS0_HJ",
        "Source": "Member"
      },
      "Id": "aJUSQlUKzVp4UwtV"
    }
  },
  "EventId": "aJXaUBEeo4HKM1P3"
};

async function waitForServer() {
  console.log('⏳ Aguardando servidor iniciar...');
  
  for (let i = 0; i < 30; i++) {
    try {
      const response = await axios.get('http://localhost:3000/health', { timeout: 2000 });
      console.log('✅ Servidor iniciado e respondendo!');
      return true;
    } catch (err) {
      process.stdout.write('.');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('\n❌ Servidor não iniciou em 30 segundos');
  return false;
}

async function testSimpleWebhook() {
  console.log('🧪 TESTE SIMPLES DO WEBHOOK');
  console.log('============================\n');

  // Iniciar servidor
  console.log('📡 Iniciando servidor...');
  const server = spawn('node', ['src/app.js'], {
    stdio: 'pipe',
    shell: true
  });

  // Capturar logs do servidor
  server.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('📡 SERVIDOR:', output.trim());
  });

  server.stderr.on('data', (data) => {
    const output = data.toString();
    console.log('❌ ERRO SERVIDOR:', output.trim());
  });

  // Aguardar servidor iniciar
  const serverReady = await waitForServer();
  
  if (!serverReady) {
    console.log('❌ Falha ao iniciar servidor');
    server.kill();
    return;
  }

  // Aguardar um pouco mais
  console.log('\n⏳ Aguardando 3 segundos...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Testar endpoint de saúde
  console.log('\n1️⃣ Testando endpoint de saúde...');
  try {
    const healthResponse = await axios.get('http://localhost:3000/health');
    console.log('✅ Health check OK:', healthResponse.data);
  } catch (err) {
    console.log('❌ Health check falhou:', err.message);
  }

  // Testar endpoint de teste
  console.log('\n2️⃣ Testando endpoint de teste...');
  try {
    const testResponse = await axios.get('http://localhost:3000/webhook/test');
    console.log('✅ Test endpoint OK:', testResponse.data);
  } catch (err) {
    console.log('❌ Test endpoint falhou:', err.message);
  }

  // Testar webhook simples
  console.log('\n3️⃣ Testando webhook simples...');
  try {
    const response = await axios.post('http://localhost:3000/webhook/umbler', simplePayload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Simple-Test'
      },
      timeout: 10000
    });

    console.log('✅ Webhook simples enviado com sucesso!');
    console.log('📊 Resposta:', response.data);
  } catch (error) {
    console.log('❌ Erro ao enviar webhook simples:', error.message);
    if (error.response) {
      console.log('📊 Status:', error.response.status);
      console.log('📊 Data:', error.response.data);
    }
  }

  // Aguardar mais um pouco
  console.log('\n⏳ Aguardando 5 segundos para logs...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Parar servidor
  console.log('\n🛑 Parando servidor...');
  server.kill();
  
  console.log('\n🎉 TESTE SIMPLES CONCLUÍDO!');
}

// Executar
testSimpleWebhook()
  .catch(error => {
    console.error('❌ Erro:', error);
  });
