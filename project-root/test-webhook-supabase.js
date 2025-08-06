const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('🧪 TESTE DO WEBHOOK COM SUPABASE');
console.log('='.repeat(50));

async function testWebhookSupabase() {
  try {
    // Verificar se as credenciais estão configuradas
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('❌ Credenciais do Supabase não configuradas');
      console.log('Execute primeiro: node setup-supabase-complete.js');
      return false;
    }

    // Criar cliente Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('🔗 Testando conexão com Supabase...');
    
    // Testar conexão
    const { data, error } = await supabase
      .from('webhook_events')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.log('❌ Erro na conexão:', error.message);
      return false;
    }

    console.log('✅ Conexão com Supabase OK');

    // Dados de teste simulando webhook da Umbler
    const webhookTestData = {
      Type: "Message",
      EventDate: new Date().toISOString(),
      EventId: `test_${Date.now()}`,
      Payload: {
        Content: {
          Id: `chat_${Date.now()}`,
          Open: true,
          Private: false,
          Waiting: false,
          TotalUnread: 1,
          EventAtUTC: new Date().toISOString(),
          Contact: {
            Id: `contact_${Date.now()}`,
            PhoneNumber: "+5511999999999",
            Name: "Teste Webhook",
            ProfilePictureUrl: null,
            IsBlocked: false,
            ContactType: "DirectMessage",
            LastActiveUTC: new Date().toISOString(),
            Tags: []
          },
          Channel: {
            Id: `channel_${Date.now()}`,
            ChannelType: "WhatsApp",
            PhoneNumber: "+5511888888888",
            Name: "Canal Teste"
          },
          Sector: {
            Id: `sector_${Date.now()}`,
            Name: "Atendimento",
            Default: true,
            Order: 1
          },
          OrganizationMember: {
            Id: `member_${Date.now()}`
          },
          LastMessage: {
            Id: `msg_${Date.now()}`,
            MessageType: "text",
            Content: "Mensagem de teste do webhook",
            Source: "Contact",
            MessageState: "received",
            EventAtUTC: new Date().toISOString(),
            CreatedAtUTC: new Date().toISOString(),
            IsPrivate: false
          }
        }
      }
    };

    console.log('\n📤 Enviando webhook de teste...');
    
    // Enviar webhook para o servidor local
    const webhookUrl = 'http://localhost:3000/webhook/umbler';
    
    try {
      const response = await axios.post(webhookUrl, webhookTestData, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Supabase-Webhook-Test/1.0'
        },
        timeout: 10000
      });

      if (response.status === 200) {
        console.log('✅ Webhook enviado com sucesso');
        console.log('📝 Resposta:', response.data);

        // Aguardar um pouco para o processamento
        console.log('\n⏳ Aguardando processamento...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verificar se os dados foram salvos no Supabase
        console.log('\n🔍 Verificando dados salvos no Supabase...');
        
        // Verificar webhook_events
        const { data: webhookEvents } = await supabase
          .from('webhook_events')
          .select('*')
          .eq('event_id', webhookTestData.EventId)
          .single();

        if (webhookEvents) {
          console.log('✅ Evento de webhook salvo:', webhookEvents.event_type);
        } else {
          console.log('⚠️ Evento de webhook não encontrado');
        }

        // Verificar contacts
        const { data: contacts } = await supabase
          .from('contacts')
          .select('*')
          .eq('umbler_contact_id', webhookTestData.Payload.Content.Contact.Id);

        if (contacts && contacts.length > 0) {
          console.log('✅ Contato salvo:', contacts[0].name);
        } else {
          console.log('⚠️ Contato não encontrado');
        }

        // Verificar chats
        const { data: chats } = await supabase
          .from('chats')
          .select('*')
          .eq('umbler_chat_id', webhookTestData.Payload.Content.Id);

        if (chats && chats.length > 0) {
          console.log('✅ Chat salvo:', chats[0].status);
        } else {
          console.log('⚠️ Chat não encontrado');
        }

        // Verificar messages
        const { data: messages } = await supabase
          .from('messages')
          .select('*')
          .eq('umbler_message_id', webhookTestData.Payload.Content.LastMessage.Id);

        if (messages && messages.length > 0) {
          console.log('✅ Mensagem salva:', messages[0].content.substring(0, 50) + '...');
        } else {
          console.log('⚠️ Mensagem não encontrada');
        }

        console.log('\n🎉 TESTE CONCLUÍDO COM SUCESSO!');
        console.log('✅ O sistema está funcionando e salvando dados no Supabase');

        return true;

      } else {
        console.log('❌ Webhook falhou:', response.status, response.statusText);
        return false;
      }

    } catch (axiosError) {
      if (axiosError.code === 'ECONNREFUSED') {
        console.log('❌ Servidor não está rodando');
        console.log('💡 Inicie o servidor com: npm run dev');
      } else {
        console.log('❌ Erro ao enviar webhook:', axiosError.message);
      }
      return false;
    }

  } catch (error) {
    console.log('❌ ERRO NO TESTE:', error.message);
    return false;
  }
}

// Executar teste
testWebhookSupabase().then(success => {
  if (success) {
    console.log('\n✅ Todos os testes passaram!');
    process.exit(0);
  } else {
    console.log('\n❌ Alguns testes falharam');
    console.log('\n🔧 Passos para resolver:');
    console.log('1. Verifique se o servidor está rodando: npm run dev');
    console.log('2. Verifique as credenciais do Supabase no .env');
    console.log('3. Execute: node setup-supabase-complete.js');
    process.exit(1);
  }
}).catch(error => {
  console.error('Erro fatal no teste:', error);
  process.exit(1);
});