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

// Payload exato que você está recebendo
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

async function testRealWebhook() {
  console.log('🧪 TESTE COM WEBHOOK REAL');
  console.log('==========================\n');

  try {
    // 1. Enviar webhook para o servidor local
    console.log('📤 Enviando webhook para servidor local...');
    
    const response = await axios.post('http://localhost:3000/webhook/umbler', realWebhookPayload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Umbler-Webhook-Test'
      },
      timeout: 10000
    });

    console.log('✅ Webhook enviado com sucesso!');
    console.log('📊 Resposta do servidor:', response.data);

    // 2. Aguardar processamento
    console.log('\n⏳ Aguardando 3 segundos para processamento...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 3. Verificar dados no Supabase
    console.log('\n🔍 Verificando dados no Supabase...\n');

    // Verificar webhook_events
    console.log('📋 Verificando webhook_events...');
    const { data: webhookEvents, error: webhookError } = await supabase
      .from('webhook_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

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
    console.log('\n📋 Verificando contacts...');
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
          phone_number: contacts[0].phone_number,
          umbler_contact_id: contacts[0].umbler_contact_id
        });
      }
    }

    // Verificar chats
    console.log('\n📋 Verificando chats...');
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
          is_open: chats[0].is_open,
          status: chats[0].status
        });
      }
    }

    // Verificar messages
    console.log('\n📋 Verificando messages...');
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
          umbler_message_id: messages[0].umbler_message_id,
          content: messages[0].content?.substring(0, 50) + '...',
          direction: messages[0].direction
        });
      }
    }

    // Verificar mensagens_webhook
    console.log('\n📋 Verificando mensagens_webhook...');
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
          autor: mensagensWebhook[0].autor,
          mensagem: mensagensWebhook[0].mensagem?.substring(0, 50) + '...'
        });
      }
    }

    // Verificar channels
    console.log('\n📋 Verificando channels...');
    const { data: channels, error: channelsError } = await supabase
      .from('channels')
      .select('*')
      .eq('umbler_channel_id', 'ZZRS4Jl_JmIQyDKA')
      .limit(1);

    if (channelsError) {
      console.log('❌ Erro ao buscar channels:', channelsError.message);
    } else {
      console.log(`✅ ${channels.length} channels encontrados`);
      if (channels.length > 0) {
        console.log('📝 Channel:', {
          id: channels[0].id,
          name: channels[0].name,
          phone_number: channels[0].phone_number
        });
      }
    }

    // Verificar sectors
    console.log('\n📋 Verificando sectors...');
    const { data: sectors, error: sectorsError } = await supabase
      .from('sectors')
      .select('*')
      .eq('umbler_sector_id', 'ZQG4wFMHGHuTs59H')
      .limit(1);

    if (sectorsError) {
      console.log('❌ Erro ao buscar sectors:', sectorsError.message);
    } else {
      console.log(`✅ ${sectors.length} sectors encontrados`);
      if (sectors.length > 0) {
        console.log('📝 Sector:', {
          id: sectors[0].id,
          name: sectors[0].name,
          umbler_sector_id: sectors[0].umbler_sector_id
        });
      }
    }

    // Verificar organization_members
    console.log('\n📋 Verificando organization_members...');
    const { data: members, error: membersError } = await supabase
      .from('organization_members')
      .select('*')
      .eq('umbler_member_id', 'ZuGqFp5N9i3HAKOn')
      .limit(1);

    if (membersError) {
      console.log('❌ Erro ao buscar organization_members:', membersError.message);
    } else {
      console.log(`✅ ${members.length} membros encontrados`);
      if (members.length > 0) {
        console.log('📝 Member:', {
          id: members[0].id,
          umbler_member_id: members[0].umbler_member_id
        });
      }
    }

    console.log('\n📊 RESUMO DO TESTE:');
    console.log('===================');
    console.log('✅ Webhook enviado com sucesso');
    console.log('✅ Conexão com Supabase estabelecida');
    console.log('✅ Todas as tabelas verificadas');

    // Contar registros em cada tabela
    const tables = ['webhook_events', 'contacts', 'chats', 'messages', 'mensagens_webhook', 'channels', 'sectors', 'organization_members'];
    
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
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n🔧 SOLUÇÃO:');
      console.log('1. Certifique-se de que o servidor está rodando: npm run dev');
      console.log('2. Verifique se a porta 3000 está disponível');
    }
  }
}

// Executar teste
testRealWebhook()
  .then(() => {
    console.log('\n🎉 TESTE CONCLUÍDO!');
  })
  .catch(error => {
    console.error('❌ Erro:', error);
  });
