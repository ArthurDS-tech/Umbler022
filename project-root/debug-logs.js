const { spawn } = require('child_process');
const axios = require('axios');
require('dotenv').config();

// Payload real que você está recebendo
const realWebhookPayload = {
  "Type": "Message",
  "EventDate": "2025-08-08T11:06:56.200543Z",
  "Payload": {
    "Type": "Chat",
    "Content": {
      "_t": "BasicChatModel",
      "Organization": {
        "Id": "ZQG4wFMHGHuTs59F"
      },
      "Contact": {
        "LastActiveUTC": "2025-08-07T21:08:50.598Z",
        "PhoneNumber": "+5548996579768",
        "ProfilePictureUrl": "https://utalk-wamedia.s3.amazonaws.com/ZQG4wFMHGHuTs59F/ZnQu0ro6tVW4ayaP/pmKw-3u65a0zR701tk1yczWQmIwjjlBeITBaK2pRlnw",
        "IsBlocked": false,
        "ScheduledMessages": [],
        "GroupIdentifier": null,
        "ContactType": "DirectMessage",
        "Tags": [],
        "Preferences": [],
        "Name": "Andre Locatelli",
        "Id": "ZnQu0ro6tVW4ayaP"
      },
      "Channel": {
        "_t": "ChatBrokerWhatsappChannelReferenceModel",
        "ChannelType": "WhatsappBroker",
        "PhoneNumber": "+5548996330672",
        "Name": "PH - Amanda",
        "Id": "ZZRS4Jl_JmIQyDKA"
      },
      "Sector": {
        "Default": true,
        "Order": 0,
        "GroupIds": [],
        "Name": "Geral",
        "Id": "ZQG4wFMHGHuTs59H"
      },
      "OrganizationMember": {
        "Muted": false,
        "TotalUnread": null,
        "Id": "ZuGqFp5N9i3HAKOn"
      },
      "OrganizationMembers": [
        {
          "Muted": false,
          "TotalUnread": null,
          "Id": "ZuGqFp5N9i3HAKOn"
        }
      ],
      "Tags": [],
      "LastMessage": {
        "Prefix": "*Amanda 💙:*",
        "HeaderContent": null,
        "Content": "Bom dia tudo bem ?",
        "Footer": null,
        "File": null,
        "Thumbnail": null,
        "QuotedStatusUpdate": null,
        "Contacts": [],
        "MessageType": "Text",
        "SentByOrganizationMember": {
          "Id": "ZuGqFp5N9i3HAKOn"
        },
        "IsPrivate": false,
        "Location": null,
        "Question": null,
        "Source": "Member",
        "InReplyTo": null,
        "MessageState": "Sent",
        "EventAtUTC": "2025-08-08T11:06:54.643Z",
        "Chat": {
          "Id": "aJUSQlUKzVp4UwtV"
        },
        "FromContact": null,
        "TemplateId": null,
        "Buttons": [],
        "LatestEdit": null,
        "BotInstance": null,
        "ForwardedFrom": null,
        "ScheduledMessage": null,
        "BulkSendSession": null,
        "Elements": null,
        "Mentions": [],
        "Ad": null,
        "FileId": null,
        "Reactions": [],
        "DeductedAiCredits": null,
        "Carousel": [],
        "Billable": null,
        "Id": "aJXaTksQRpfS0_HJ",
        "CreatedAtUTC": "2025-08-08T11:06:54.643Z"
      },
      "LastMessageReaction": null,
      "RedactReason": null,
      "UsingInactivityFlow": false,
      "UsingWaitingFlow": false,
      "InactivityFlowAt": null,
      "WaitingFlowAt": null,
      "Open": true,
      "Private": false,
      "Waiting": false,
      "WaitingSinceUTC": null,
      "TotalUnread": 0,
      "TotalAIResponses": null,
      "ClosedAtUTC": null,
      "EventAtUTC": "2025-08-08T11:06:54.643Z",
      "FirstMemberReplyMessage": {
        "EventAtUTC": "2025-08-08T11:06:54.643Z",
        "Id": "aJXaTksQRpfS0_HJ"
      },
      "FirstContactMessage": {
        "EventAtUTC": "2025-08-07T21:08:50.598Z",
        "Id": "aJUV5JMSceba2JkV"
      },
      "Bots": [],
      "LastOrganizationMember": {
        "Id": "ZuGqFp5N9i3HAKOn"
      },
      "Message": null,
      "Visibility": null,
      "Id": "aJUSQlUKzVp4UwtV",
      "CreatedAtUTC": "2025-08-07T20:53:22.121Z"
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

async function debugWebhookWithLogs() {
  console.log('🔍 DEBUG WEBHOOK COM LOGS');
  console.log('==========================\n');

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

  // Aguardar um pouco mais para garantir que tudo está carregado
  console.log('\n⏳ Aguardando 3 segundos para carregamento completo...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Enviar webhook
  console.log('\n📤 Enviando webhook para servidor...');
  try {
    const response = await axios.post('http://localhost:3000/webhook/umbler', realWebhookPayload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Umbler-Webhook-Test'
      },
      timeout: 10000
    });

    console.log('✅ Webhook enviado com sucesso!');
    console.log('📊 Resposta:', response.data);
  } catch (error) {
    console.log('❌ Erro ao enviar webhook:', error.message);
    if (error.response) {
      console.log('📊 Status:', error.response.status);
      console.log('📊 Data:', error.response.data);
    }
  }

  // Aguardar mais um pouco para ver logs adicionais
  console.log('\n⏳ Aguardando 5 segundos para logs adicionais...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Parar servidor
  console.log('\n🛑 Parando servidor...');
  server.kill();
  
  console.log('\n🎉 DEBUG CONCLUÍDO!');
  console.log('\n📋 ANÁLISE DOS LOGS:');
  console.log('=====================');
  console.log('1. Procure por mensagens de erro (❌)');
  console.log('2. Procure por mensagens de sucesso (✅)');
  console.log('3. Procure por mensagens de processamento (🔄)');
  console.log('4. Verifique se há erros de conexão com Supabase');
  console.log('5. Verifique se há erros de sintaxe ou importação');
}

// Executar
debugWebhookWithLogs()
  .catch(error => {
    console.error('❌ Erro:', error);
  });
