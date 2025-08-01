require('dotenv').config();
const webhookService = require('./src/services/webhookService');
const logger = require('./src/utils/logger');

// Payload de exemplo da Umbler
const sampleWebhookPayload = {
  event: 'message.received',
  Payload: {
    Content: {
      Id: 'conv-123-456-789',
      Contact: {
        Id: 'contact-123',
        PhoneNumber: '+5511999887766',
        Name: 'João Silva Teste',
        ProfilePictureUrl: 'https://example.com/profile.jpg',
        IsBlocked: false,
        ContactType: 'person',
        LastActiveUTC: '2024-01-15T10:30:00Z',
        Tags: [
          { Name: 'cliente' },
          { Name: 'vip' }
        ]
      },
      Channel: {
        Id: 'whatsapp-channel',
        Name: 'WhatsApp',
        Type: 'whatsapp'
      },
      LastMessage: {
        Id: 'msg-789-456-123',
        Content: 'Olá, preciso de ajuda!',
        Direction: 'Inbound',
        Type: 'text',
        Status: 'received',
        CreatedAtUTC: '2024-01-15T10:30:00Z',
        From: {
          PhoneNumber: '+5511999887766',
          Name: 'João Silva Teste'
        },
        To: {
          PhoneNumber: '+5511888777666',
          Name: 'Empresa Teste'
        }
      }
    }
  }
};

async function testWebhookInsertion() {
  console.log('🧪 Testando inserção de dados via webhook...\n');
  
  try {
    console.log('📦 Payload do webhook:');
    console.log(JSON.stringify(sampleWebhookPayload, null, 2));
    console.log('\n🔄 Processando webhook...\n');
    
    // Processar o webhook
    const result = await webhookService.processWebhook(sampleWebhookPayload);
    
    console.log('✅ Webhook processado com sucesso!');
    console.log('📊 Resultado:');
    console.log({
      eventType: result.eventType,
      contactId: result.contactId,
      conversationId: result.conversationId,
      messageId: result.messageId,
      processed: result.processed
    });
    
    // Verificar se os dados foram inseridos corretamente
    console.log('\n🔍 Verificando dados inseridos...');
    
    if (result.contactId) {
      const contactService = require('./src/services/contactService');
      const contact = await contactService.findContactById(result.contactId);
      console.log('👤 Contato criado/atualizado:', {
        id: contact.id,
        phone: contact.phone,
        name: contact.name,
        status: contact.status,
        tags: contact.tags
      });
    }
    
    if (result.conversationId) {
      const conversationService = require('./src/services/conversationService');
      const conversation = await conversationService.findConversationById(result.conversationId);
      console.log('💬 Conversa criada/atualizada:', {
        id: conversation.id,
        status: conversation.status,
        channel: conversation.channel,
        contactId: conversation.contact_id
      });
    }
    
    if (result.messageId) {
      const messageService = require('./src/services/messageService');
      const message = await messageService.findMessageById(result.messageId);
      console.log('📨 Mensagem criada:', {
        id: message.id,
        content: message.content,
        direction: message.direction,
        messageType: message.message_type,
        status: message.status
      });
    }
    
    console.log('\n🎉 Teste concluído com sucesso!');
    console.log('✅ Os dados estão sendo inseridos corretamente no Supabase.');
    
  } catch (error) {
    console.log('\n❌ Erro durante o teste:', error.message);
    console.log('📋 Detalhes do erro:', error);
    
    // Diagnóstico de problemas comuns
    if (error.message.includes('Invalid API key')) {
      console.log('\n💡 Dica: Verifique as credenciais do Supabase no arquivo .env');
    }
    
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.log('\n💡 Dica: Execute o schema.sql no Supabase para criar as tabelas');
    }
    
    if (error.message.includes('fetch failed')) {
      console.log('\n💡 Dica: Verifique se a URL do Supabase está correta');
    }
    
    if (error.message.includes('violates')) {
      console.log('\n💡 Dica: Problema de validação de dados - verifique os campos obrigatórios');
    }
  }
}

// Função para testar apenas a conexão básica
async function testBasicConnection() {
  console.log('🔗 Testando conexão básica...\n');
  
  try {
    const { testConnection } = require('./src/config/database');
    const isConnected = await testConnection();
    
    if (isConnected) {
      console.log('✅ Conexão com Supabase OK');
      return true;
    } else {
      console.log('❌ Falha na conexão com Supabase');
      return false;
    }
  } catch (error) {
    console.log('❌ Erro na conexão:', error.message);
    return false;
  }
}

// Executar testes
async function runTests() {
  console.log('🚀 Iniciando testes de integração com Supabase\n');
  console.log('=' .repeat(50));
  
  // Teste 1: Conexão básica
  console.log('\n1️⃣ TESTE DE CONEXÃO');
  const connectionOk = await testBasicConnection();
  
  if (!connectionOk) {
    console.log('\n❌ Teste abortado: Não foi possível conectar com Supabase');
    console.log('\n📋 Verifique:');
    console.log('- As credenciais no arquivo .env estão corretas');
    console.log('- O projeto Supabase está ativo');
    console.log('- As tabelas foram criadas (execute schema.sql)');
    return;
  }
  
  // Teste 2: Inserção via webhook
  console.log('\n2️⃣ TESTE DE INSERÇÃO VIA WEBHOOK');
  await testWebhookInsertion();
  
  console.log('\n' + '=' .repeat(50));
  console.log('🏁 Testes concluídos!');
}

runTests();