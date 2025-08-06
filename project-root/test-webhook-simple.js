const axios = require('axios');

console.log('🧪 TESTE SIMPLES DO WEBHOOK');
console.log('============================');

async function testWebhook() {
  const webhookUrl = 'http://localhost:3000/webhook/umbler';
  
  const testData = {
    Type: "Message",
    EventDate: new Date().toISOString(),
    EventId: `test_${Date.now()}`,
    Payload: {
      Content: {
        Id: `chat_${Date.now()}`,
        Open: true,
        Contact: {
          Id: `contact_${Date.now()}`,
          PhoneNumber: "+5511999999999",
          Name: "Teste Terminal",
          ContactType: "DirectMessage"
        },
        Channel: {
          Id: `channel_${Date.now()}`,
          ChannelType: "WhatsApp",
          Name: "Canal Teste"
        },
        Sector: {
          Id: `sector_${Date.now()}`,
          Name: "Atendimento"
        },
        OrganizationMember: {
          Id: `member_${Date.now()}`
        },
        LastMessage: {
          Id: `msg_${Date.now()}`,
          Content: "Mensagem de teste do terminal",
          MessageType: "text",
          EventAtUTC: new Date().toISOString()
        }
      }
    }
  };

  try {
    console.log('📤 Enviando webhook de teste...');
    
    const response = await axios.post(webhookUrl, testData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200) {
      console.log('✅ SUCESSO! Webhook funcionando');
      console.log('📝 Resposta:', response.data);
    } else {
      console.log('❌ FALHA:', response.status);
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Servidor não está rodando');
      console.log('💡 Execute: npm run dev');
    } else {
      console.log('❌ Erro:', error.message);
    }
  }
}

testWebhook();