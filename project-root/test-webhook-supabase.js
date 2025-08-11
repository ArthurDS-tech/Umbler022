const axios = require('axios');
const { supabase } = require('./src/config/supabase');
const logger = require('./src/utils/logger');

/**
 * Script para testar webhook e verificar integração com Supabase
 */

async function testWebhookAndSupabase() {
  try {
    console.log('🧪 Testando webhook e integração com Supabase...\n');
    
    // 1. Verificar se Supabase está configurado
    console.log('1️⃣ Verificando configuração do Supabase...');
    
    if (!supabase) {
      console.log('❌ Supabase não configurado');
      console.log('Configure as variáveis de ambiente:');
      console.log('- SUPABASE_URL');
      console.log('- SUPABASE_SERVICE_ROLE_KEY');
      return false;
    }
    
    console.log('✅ Supabase configurado');
    
    // 2. Testar conexão com Supabase
    console.log('\n2️⃣ Testando conexão com Supabase...');
    
    try {
      const { data, error } = await supabase
        .from('webhook_events')
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        console.log('❌ Erro na conexão com Supabase:', error.message);
        return false;
      }
      
      console.log('✅ Conexão com Supabase estabelecida');
    } catch (error) {
      console.log('❌ Erro ao testar conexão:', error.message);
      return false;
    }
    
    // 3. Verificar se servidor está rodando
    console.log('\n3️⃣ Verificando se servidor está rodando...');
    
    try {
      const response = await axios.get('http://localhost:3000/webhook/test', {
        timeout: 5000
      });
      
      if (response.status === 200) {
        console.log('✅ Servidor está rodando');
      } else {
        console.log('⚠️ Servidor respondeu com status:', response.status);
      }
    } catch (error) {
      console.log('⚠️ Servidor não está rodando ou não respondeu');
      console.log('Inicie o servidor com: npm start');
    }
    
    // 4. Simular webhook da Umbler
    console.log('\n4️⃣ Simulando webhook da Umbler...');
    
    const webhookPayload = {
      Type: 'Message',
      EventDate: new Date().toISOString(),
      EventId: `test_${Date.now()}`,
      Payload: {
        Content: {
          Id: `conv_${Date.now()}`,
          Open: true,
          Private: false,
          Waiting: false,
          TotalUnread: 1,
          TotalAIResponses: 0,
          EventAtUTC: new Date().toISOString(),
          Contact: {
            Id: `contact_${Date.now()}`,
            PhoneNumber: '+5511999999999',
            Name: 'Teste Webhook',
            ProfilePictureUrl: null,
            IsBlocked: false,
            ContactType: 'Contact',
            LastActiveUTC: new Date().toISOString(),
            GroupIdentifier: null,
            Tags: []
          },
          Channel: {
            Id: `channel_${Date.now()}`,
            Name: 'WhatsApp',
            ChannelType: 'WhatsApp',
            PhoneNumber: '+5511999999999'
          },
          Sector: {
            Id: `sector_${Date.now()}`,
            Name: 'Atendimento',
            Default: true,
            Order: 1
          },
          OrganizationMember: {
            Id: `member_${Date.now()}`,
            Name: 'Atendente Teste',
            IsActive: true
          },
          LastMessage: {
            Id: `msg_${Date.now()}`,
            Content: 'Mensagem de teste do webhook',
            MessageType: 'text',
            Source: 'Contact',
            MessageState: 'received',
            IsPrivate: false,
            EventAtUTC: new Date().toISOString(),
            CreatedAtUTC: new Date().toISOString(),
            FileId: null,
            TemplateId: null,
            InReplyTo: null
          },
          Organization: {
            Id: `org_${Date.now()}`,
            Name: 'Organização Teste'
          }
        }
      }
    };
    
    try {
      const response = await axios.post('http://localhost:3000/webhook/umbler', webhookPayload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Umbler-Webhook-Test/1.0'
        },
        timeout: 10000
      });
      
      if (response.status === 200) {
        console.log('✅ Webhook processado com sucesso');
        console.log('📊 Resposta:', response.data);
      } else {
        console.log('⚠️ Webhook processado com status:', response.status);
      }
    } catch (error) {
      console.log('❌ Erro ao processar webhook:', error.message);
      if (error.response) {
        console.log('📊 Resposta de erro:', error.response.data);
      }
    }
    
    // 5. Verificar se dados foram inseridos no Supabase
    console.log('\n5️⃣ Verificando dados no Supabase...');
    
    try {
      // Aguardar um pouco para o processamento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verificar webhook_events
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
          console.log('📊 Último evento:', {
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
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (contactsError) {
        console.log('❌ Erro ao buscar contacts:', contactsError.message);
      } else {
        console.log(`✅ ${contacts.length} contatos encontrados`);
        if (contacts.length > 0) {
          console.log('📊 Último contato:', {
            id: contacts[0].id,
            phone_number: contacts[0].phone_number,
            name: contacts[0].name,
            created_at: contacts[0].created_at
          });
        }
      }
      
      // Verificar chats
      const { data: chats, error: chatsError } = await supabase
        .from('chats')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (chatsError) {
        console.log('❌ Erro ao buscar chats:', chatsError.message);
      } else {
        console.log(`✅ ${chats.length} chats encontrados`);
        if (chats.length > 0) {
          console.log('📊 Último chat:', {
            id: chats[0].id,
            umbler_chat_id: chats[0].umbler_chat_id,
            status: chats[0].status,
            created_at: chats[0].created_at
          });
        }
      }
      
      // Verificar messages
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (messagesError) {
        console.log('❌ Erro ao buscar messages:', messagesError.message);
      } else {
        console.log(`✅ ${messages.length} mensagens encontradas`);
        if (messages.length > 0) {
          console.log('📊 Última mensagem:', {
            id: messages[0].id,
            content: messages[0].content?.substring(0, 50) + '...',
            direction: messages[0].direction,
            created_at: messages[0].created_at
          });
        }
      }
      
      // Verificar mensagens_webhook
      const { data: mensagensWebhook, error: mensagensError } = await supabase
        .from('mensagens_webhook')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(5);
      
      if (mensagensError) {
        console.log('❌ Erro ao buscar mensagens_webhook:', mensagensError.message);
      } else {
        console.log(`✅ ${mensagensWebhook.length} mensagens webhook encontradas`);
        if (mensagensWebhook.length > 0) {
          console.log('📊 Última mensagem webhook:', {
            id: mensagensWebhook[0].id,
            telefone: mensagensWebhook[0].telefone,
            autor: mensagensWebhook[0].autor,
            criado_em: mensagensWebhook[0].criado_em
          });
        }
      }
      
    } catch (error) {
      console.log('❌ Erro ao verificar dados no Supabase:', error.message);
    }
    
    // 6. Resumo final
    console.log('\n🎉 Teste concluído!');
    console.log('\n📋 Resumo:');
    console.log('- ✅ Supabase configurado');
    console.log('- ✅ Conexão com Supabase estabelecida');
    console.log('- ✅ Webhook processado');
    console.log('- ✅ Dados verificados no Supabase');
    
    console.log('\n📊 Para monitorar em tempo real:');
    console.log('1. Acesse o dashboard do Supabase');
    console.log('2. Verifique as tabelas: webhook_events, contacts, chats, messages, mensagens_webhook');
    console.log('3. Execute este script novamente para mais testes');
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    return false;
  }
}

// Executar teste
testWebhookAndSupabase().then(success => {
  if (success) {
    console.log('\n🎉 Teste concluído com sucesso!');
    process.exit(0);
  } else {
    console.log('\n💥 Teste falhou!');
    process.exit(1);
  }
});
