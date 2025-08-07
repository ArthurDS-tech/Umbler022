const axios = require('axios');
const colors = require('colors');

const BASE_URL = 'http://localhost:3000';

/**
 * Script para testar o sistema de tempo de resposta dos atendentes
 */
class AgentResponseTimeTest {
  
  async testAgentResponseTimeSystem() {
    console.log('🚀 Testando Sistema de Tempo de Resposta dos Atendentes\n'.cyan.bold);

    try {
      // 1. Simular mensagem do cliente
      console.log('📩 1. Simulando mensagem do cliente...'.yellow);
      await this.simulateCustomerMessage();
      
      await this.sleep(2000); // Aguardar 2 segundos
      
      // 2. Simular resposta do atendente
      console.log('👨‍💼 2. Simulando resposta do atendente...'.yellow);
      await this.simulateAgentResponse();
      
      await this.sleep(1000);
      
      // 3. Verificar estatísticas
      console.log('📊 3. Verificando estatísticas...'.yellow);
      await this.checkStats();
      
      // 4. Verificar mensagens pendentes
      console.log('⏳ 4. Verificando mensagens pendentes...'.yellow);
      await this.checkPendingMessages();
      
      // 5. Verificar dashboard
      console.log('📈 5. Verificando dashboard...'.yellow);
      await this.checkDashboard();
      
      console.log('\n✅ Teste concluído com sucesso!'.green.bold);
      
    } catch (error) {
      console.error('❌ Erro durante o teste:'.red.bold, error.message);
      if (error.response?.data) {
        console.error('Detalhes:', error.response.data);
      }
    }
  }

  async simulateCustomerMessage() {
    const webhookData = {
      Type: "Message",
      EventDate: new Date().toISOString(),
      EventId: `test-${Date.now()}-customer`,
      Payload: {
        Type: "Chat",
        Content: {
          _t: "BasicChatModel",
          Organization: {
            Id: "test-org-123"
          },
          Contact: {
            PhoneNumber: "+5548996620779",
            Name: "Cliente Teste",
            ContactType: "DirectMessage"
          },
          LastMessage: {
            Content: "Olá, preciso de ajuda com meu pedido!",
            MessageType: "Text",
            Source: "Contact", // Mensagem do cliente
            EventAtUTC: new Date().toISOString(),
            Id: `msg-customer-${Date.now()}`
          },
          Id: "chat-test-123"
        }
      }
    };

    const response = await axios.post(`${BASE_URL}/webhook/umbler`, webhookData);
    console.log('   ✓ Mensagem do cliente enviada'.green);
    return response.data;
  }

  async simulateAgentResponse() {
    const webhookData = {
      Type: "Message",
      EventDate: new Date().toISOString(),
      EventId: `test-${Date.now()}-agent`,
      Payload: {
        Type: "Chat",
        Content: {
          _t: "BasicChatModel",
          Organization: {
            Id: "test-org-123"
          },
          Contact: {
            PhoneNumber: "+5548996620779",
            Name: "Cliente Teste",
            ContactType: "DirectMessage"
          },
          LastMessage: {
            Content: "Olá! Claro, vou te ajudar com seu pedido. Pode me dar mais detalhes?",
            MessageType: "Text",
            Source: "OrganizationMember", // Mensagem do atendente
            EventAtUTC: new Date().toISOString(),
            Id: `msg-agent-${Date.now()}`
          },
          Id: "chat-test-123"
        }
      }
    };

    const response = await axios.post(`${BASE_URL}/webhook/umbler`, webhookData);
    console.log('   ✓ Resposta do atendente enviada'.green);
    return response.data;
  }

  async checkStats() {
    try {
      const response = await axios.get(`${BASE_URL}/api/agent-response-time/stats?days=1`);
      const stats = response.data.data;
      
      console.log('   📊 Estatísticas Gerais:'.cyan);
      console.log(`      Total de respostas: ${stats.total_responses}`);
      console.log(`      Tempo médio: ${stats.average_response_time_minutes} minutos`);
      console.log(`      Resposta mais rápida: ${stats.fastest_response_minutes} minutos`);
      console.log(`      Resposta mais lenta: ${stats.slowest_response_minutes} minutos`);
      
      if (stats.distribution) {
        console.log('      Distribuição:');
        console.log(`        Muito rápido (≤2 min): ${stats.distribution.very_fast}`);
        console.log(`        Rápido (2-5 min): ${stats.distribution.fast}`);
        console.log(`        Normal (5-15 min): ${stats.distribution.normal}`);
        console.log(`        Lento (15-60 min): ${stats.distribution.slow}`);
        console.log(`        Muito lento (>60 min): ${stats.distribution.very_slow}`);
      }
      
    } catch (error) {
      console.log('   ⚠️ Erro ao obter estatísticas:'.yellow, error.message);
    }
  }

  async checkPendingMessages() {
    try {
      const response = await axios.get(`${BASE_URL}/api/agent-response-time/pending`);
      const pending = response.data.data;
      
      console.log('   ⏳ Mensagens Pendentes:'.cyan);
      console.log(`      Total pendentes: ${pending.total_pending}`);
      console.log(`      Urgentes: ${pending.urgent_count}`);
      console.log(`      Críticas: ${pending.critical_count}`);
      
      if (pending.pending_messages.length > 0) {
        console.log('      Exemplos:');
        pending.pending_messages.slice(0, 3).forEach(msg => {
          console.log(`        ${msg.contact_name} (${msg.contact_phone}) - ${msg.waiting_time_minutes} min aguardando`);
        });
      }
      
    } catch (error) {
      console.log('   ⚠️ Erro ao obter mensagens pendentes:'.yellow, error.message);
    }
  }

  async checkDashboard() {
    try {
      const response = await axios.get(`${BASE_URL}/api/agent-response-time/dashboard?days=1`);
      const dashboard = response.data.data;
      
      console.log('   📈 Dashboard:'.cyan);
      console.log(`      Performance: ${dashboard.insights.performance_level}`);
      console.log(`      Precisa atenção: ${dashboard.insights.needs_attention ? 'Sim' : 'Não'}`);
      console.log(`      Contatos atendidos: ${dashboard.insights.total_contacts_served}`);
      
      console.log('      Resumo:');
      console.log(`        Total respostas: ${dashboard.summary.total_responses}`);
      console.log(`        Tempo médio: ${dashboard.summary.average_response_time_minutes} min`);
      console.log(`        Mensagens pendentes: ${dashboard.summary.pending_messages}`);
      
    } catch (error) {
      console.log('   ⚠️ Erro ao obter dashboard:'.yellow, error.message);
    }
  }

  async checkContactStats() {
    try {
      const phone = "+5548996620779";
      const response = await axios.get(`${BASE_URL}/api/agent-response-time/contact/${encodeURIComponent(phone)}?days=1`);
      const stats = response.data.data;
      
      console.log(`   👤 Estatísticas do Contato ${stats.contact_name}:`.cyan);
      console.log(`      Telefone: ${stats.contact_phone}`);
      console.log(`      Total de respostas: ${stats.total_responses}`);
      console.log(`      Tempo médio de resposta: ${stats.average_response_time_minutes} min`);
      console.log(`      Resposta mais rápida: ${stats.fastest_response_minutes} min`);
      console.log(`      Resposta mais lenta: ${stats.slowest_response_minutes} min`);
      
    } catch (error) {
      console.log('   ⚠️ Erro ao obter estatísticas do contato:'.yellow, error.message);
    }
  }

  async testCompleteFlow() {
    console.log('🔄 Testando fluxo completo com múltiplas mensagens...\n'.cyan.bold);
    
    // Simular várias mensagens do cliente
    for (let i = 1; i <= 3; i++) {
      console.log(`📩 Mensagem do cliente #${i}...`.yellow);
      await this.simulateCustomerMessage();
      await this.sleep(1000);
    }
    
    // Aguardar um pouco antes da resposta do atendente
    console.log('⏱️ Aguardando 5 segundos antes da resposta do atendente...'.yellow);
    await this.sleep(5000);
    
    // Resposta do atendente
    console.log('👨‍💼 Resposta do atendente...'.yellow);
    await this.simulateAgentResponse();
    
    await this.sleep(1000);
    
    // Verificar estatísticas
    await this.checkStats();
    await this.checkContactStats();
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Executar teste
const test = new AgentResponseTimeTest();

// Verificar se deve executar teste completo ou básico
const args = process.argv.slice(2);
if (args.includes('--completo')) {
  test.testCompleteFlow();
} else {
  test.testAgentResponseTimeSystem();
}

module.exports = AgentResponseTimeTest;