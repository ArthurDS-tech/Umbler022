const { spawn } = require('child_process');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Credenciais do Supabase não configuradas');
  console.log('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

async function testWebhook() {
  console.log('\n🧪 TESTANDO WEBHOOK REAL');
  console.log('========================\n');

  try {
    // Enviar webhook
    console.log('📤 Enviando webhook para servidor...');
    
    const response = await axios.post('http://localhost:3000/webhook/umbler', realWebhookPayload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Umbler-Webhook-Test'
      },
      timeout: 10000
    });

    console.log('✅ Webhook enviado com sucesso!');
    console.log('📊 Resposta:', response.data);

    // Aguardar processamento
    console.log('\n⏳ Aguardando 5 segundos para processamento...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verificar dados no Supabase
    console.log('\n🔍 Verificando dados no Supabase...\n');

    // Verificar webhook_events
    const { data: webhookEvents, error: webhookError } = await supabase
      .from('webhook_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);

    if (webhookError) {
      console.log('❌ Erro ao buscar webhook_events:', webhookError.message);
    } else {
      console.log(`✅ ${webhookEvents.length} eventos de webhook encontrados`);
      if (webhookEvents.length > 0) {
        console.log('📝 Último evento:', {
          id: webhookEvents[0].id,
          event_type: webhookEvents[0].event_type,
          processed: webhookEvents[0].processed,
          created_at: webhookEvents[0].created_at
        });
      }
    }

    // Verificar contacts
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .eq('umbler_contact_id', 'ZnQu0ro6tVW4ayaP')
      .limit(1);

    if (contactsError) {
      console.log('❌ Erro ao buscar contacts:', contactsError.message);
    } else {
      console.log(`✅ ${contacts.length} contatos encontrados`);
      if (contacts.length > 0) {
        console.log('📝 Contato:', {
          id: contacts[0].id,
          name: contacts[0].name,
          phone_number: contacts[0].phone_number
        });
      }
    }

    // Verificar chats
    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select('*')
      .eq('umbler_chat_id', 'aJUSQlUKzVp4UwtV')
      .limit(1);

    if (chatsError) {
      console.log('❌ Erro ao buscar chats:', chatsError.message);
    } else {
      console.log(`✅ ${chats.length} chats encontrados`);
      if (chats.length > 0) {
        console.log('📝 Chat:', {
          id: chats[0].id,
          umbler_chat_id: chats[0].umbler_chat_id,
          is_open: chats[0].is_open
        });
      }
    }

    // Verificar messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('umbler_message_id', 'aJXaTksQRpfS0_HJ')
      .limit(1);

    if (messagesError) {
      console.log('❌ Erro ao buscar messages:', messagesError.message);
    } else {
      console.log(`✅ ${messages.length} mensagens encontradas`);
      if (messages.length > 0) {
        console.log('📝 Mensagem:', {
          id: messages[0].id,
          content: messages[0].content?.substring(0, 50) + '...',
          direction: messages[0].direction
        });
      }
    }

    // Verificar mensagens_webhook
    const { data: mensagensWebhook, error: mensagensError } = await supabase
      .from('mensagens_webhook')
      .select('*')
      .eq('umbler_message_id', 'aJXaTksQRpfS0_HJ')
      .limit(1);

    if (mensagensError) {
      console.log('❌ Erro ao buscar mensagens_webhook:', mensagensError.message);
    } else {
      console.log(`✅ ${mensagensWebhook.length} mensagens webhook encontradas`);
      if (mensagensWebhook.length > 0) {
        console.log('📝 Mensagem webhook:', {
          id: mensagensWebhook[0].id,
          telefone: mensagensWebhook[0].telefone,
          autor: mensagensWebhook[0].autor
        });
      }
    }

    console.log('\n📊 RESUMO:');
    console.log('==========');
    console.log('✅ Webhook enviado com sucesso');
    console.log('✅ Conexão com Supabase estabelecida');
    console.log('✅ Dados verificados no Supabase');

    // Contar registros
    const tables = ['webhook_events', 'contacts', 'chats', 'messages', 'mensagens_webhook'];
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.log(`❌ ${table}: Erro ao contar`);
        } else {
          console.log(`📊 ${table}: ${count} registros`);
        }
      } catch (err) {
        console.log(`❌ ${table}: Erro - ${err.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    if (error.response) {
      console.log('📊 Status:', error.response.status);
      console.log('📊 Data:', error.response.data);
    }
  }
}

async function startServerAndTest() {
  console.log('🚀 INICIANDO SERVIDOR E TESTE COMPLETO');
  console.log('=======================================\n');

  // Iniciar servidor
  console.log('📡 Iniciando servidor...');
  const server = spawn('node', ['src/app.js'], {
    stdio: 'pipe',
    shell: true
  });

  // Capturar logs do servidor
  server.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Servidor iniciado') || output.includes('3000')) {
      console.log('📡 Servidor iniciando...');
    }
  });

  server.stderr.on('data', (data) => {
    console.log('❌ Erro do servidor:', data.toString());
  });

  // Aguardar servidor iniciar
  const serverReady = await waitForServer();
  
  if (!serverReady) {
    console.log('❌ Falha ao iniciar servidor');
    server.kill();
    return;
  }

  // Executar teste
  await testWebhook();

  // Parar servidor
  console.log('\n🛑 Parando servidor...');
  server.kill();
  
  console.log('\n🎉 TESTE CONCLUÍDO!');
}

// Executar
startServerAndTest()
  .catch(error => {
    console.error('❌ Erro:', error);
  });
