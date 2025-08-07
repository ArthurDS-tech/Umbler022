#!/usr/bin/env node

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('🧪 TESTE COMPLETO DO WEBHOOK + SUPABASE');
console.log('='.repeat(50));

async function testWebhookComplete() {
  try {
    // 1. Verificar credenciais
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('❌ Credenciais do Supabase não configuradas');
      console.log('Execute: node configurar-supabase-real.js');
      return false;
    }

    if (process.env.SUPABASE_URL.includes('your-project-id')) {
      console.log('❌ Credenciais são valores de exemplo');
      console.log('Execute: node configurar-supabase-real.js');
      return false;
    }

    console.log('✅ Credenciais configuradas');

    // 2. Testar conexão Supabase
    console.log('\n🔗 Testando conexão com Supabase...');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
      .from('webhook_events')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.log('❌ Erro na conexão:', error.message);
      if (error.message.includes('relation "webhook_events" does not exist')) {
        console.log('💡 Tabelas não existem. Execute o SQL no Dashboard do Supabase');
      }
      return false;
    }

    console.log('✅ Conexão com Supabase OK');

    // 3. Contar registros antes
    const { data: beforeCount } = await supabase
      .from('webhook_events')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Eventos antes do teste: ${beforeCount?.length || 0}`);

    // 4. Enviar webhook de teste
    console.log('\n📤 Enviando webhook de teste...');
    
    const webhookData = {
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
            Name: "Teste Webhook Completo",
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
            Content: "TESTE: Verificando se dados são salvos no Supabase",
            Source: "Contact",
            MessageState: "received",
            EventAtUTC: new Date().toISOString(),
            CreatedAtUTC: new Date().toISOString(),
            IsPrivate: false
          }
        }
      }
    };

    try {
      const response = await axios.post('http://localhost:3000/webhook/umbler', webhookData, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Teste-Completo/1.0'
        },
        timeout: 10000
      });

      if (response.status === 200) {
        console.log('✅ Webhook enviado com sucesso');
        console.log('📝 Resposta:', response.data);
      } else {
        console.log('❌ Webhook falhou:', response.status);
        return false;
      }
    } catch (axiosError) {
      if (axiosError.code === 'ECONNREFUSED') {
        console.log('❌ Servidor não está rodando');
        console.log('💡 Execute: npm run dev');
        return false;
      }
      console.log('❌ Erro ao enviar webhook:', axiosError.message);
      return false;
    }

    // 5. Aguardar processamento
    console.log('\n⏳ Aguardando processamento (3 segundos)...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 6. Verificar se dados foram salvos
    console.log('\n🔍 Verificando se dados foram salvos...');

    // Verificar webhook_events
    const { data: webhookEvents } = await supabase
      .from('webhook_events')
      .select('*')
      .eq('event_id', webhookData.EventId);

    if (webhookEvents && webhookEvents.length > 0) {
      console.log('✅ Evento de webhook salvo');
      console.log(`   - ID: ${webhookEvents[0].id}`);
      console.log(`   - Tipo: ${webhookEvents[0].event_type}`);
      console.log(`   - Processado: ${webhookEvents[0].processed ? 'Sim' : 'Não'}`);
    } else {
      console.log('❌ Evento de webhook NÃO foi salvo');
      return false;
    }

    // Verificar contacts
    const { data: contacts } = await supabase
      .from('contacts')
      .select('*')
      .eq('umbler_contact_id', webhookData.Payload.Content.Contact.Id);

    if (contacts && contacts.length > 0) {
      console.log('✅ Contato salvo');
      console.log(`   - Nome: ${contacts[0].name}`);
      console.log(`   - Telefone: ${contacts[0].phone_number}`);
    } else {
      console.log('❌ Contato NÃO foi salvo');
    }

    // Verificar chats
    const { data: chats } = await supabase
      .from('chats')
      .select('*')
      .eq('umbler_chat_id', webhookData.Payload.Content.Id);

    if (chats && chats.length > 0) {
      console.log('✅ Chat salvo');
      console.log(`   - Status: ${chats[0].status}`);
    } else {
      console.log('❌ Chat NÃO foi salvo');
    }

    // Verificar messages
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('umbler_message_id', webhookData.Payload.Content.LastMessage.Id);

    if (messages && messages.length > 0) {
      console.log('✅ Mensagem salva');
      console.log(`   - Conteúdo: ${messages[0].content.substring(0, 50)}...`);
    } else {
      console.log('❌ Mensagem NÃO foi salva');
    }

    // 7. Contar registros depois
    const { data: afterData } = await supabase
      .from('webhook_events')
      .select('*');

    console.log(`📊 Eventos depois do teste: ${afterData?.length || 0}`);

    console.log('\n🎉 TESTE CONCLUÍDO!');
    
    if (webhookEvents && webhookEvents.length > 0) {
      console.log('✅ SUCESSO: Dados estão sendo salvos no Supabase!');
      return true;
    } else {
      console.log('❌ PROBLEMA: Dados NÃO estão sendo salvos');
      return false;
    }

  } catch (error) {
    console.log('❌ ERRO NO TESTE:', error.message);
    return false;
  }
}

// Executar teste
testWebhookComplete().then(success => {
  if (success) {
    console.log('\n🎯 DIAGNÓSTICO: Sistema funcionando perfeitamente!');
    process.exit(0);
  } else {
    console.log('\n🔧 DIAGNÓSTICO: Ainda há problemas');
    console.log('\n💡 Possíveis soluções:');
    console.log('1. Verifique se as credenciais estão corretas');
    console.log('2. Verifique se as tabelas foram criadas no Supabase');
    console.log('3. Execute: node diagnosticar-supabase.js');
    process.exit(1);
  }
});