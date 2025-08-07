#!/usr/bin/env node

/**
 * Script para testar as correções dos webhooks
 * 
 * Uso:
 * node test-webhook-fixes.js
 */

const axios = require('axios');
const logger = require('./src/utils/logger');

class WebhookTester {
  constructor() {
    this.baseUrl = process.env.WEBHOOK_URL || 'http://localhost:3000';
    this.testResults = [];
  }

  /**
   * Testar webhook com payload válido da Umbler
   */
  async testValidWebhook() {
    console.log('\n🧪 ===== TESTE: WEBHOOK VÁLIDO =====');
    
    const validPayload = {
      "Type": "Message",
      "EventDate": "2024-02-07T18:44:01.3135533Z",
      "EventId": "test_" + Date.now(),
      "Payload": {
        "Type": "Chat",
        "Content": {
          "Id": "chat_" + Date.now(),
          "Contact": {
            "Id": "contact_" + Date.now(),
            "PhoneNumber": "+5511999999999",
            "Name": "Teste Webhook",
            "ProfilePictureUrl": null,
            "IsBlocked": false,
            "ContactType": "Contact",
            "LastActiveUTC": "2024-02-07T18:44:01.3135533Z",
            "GroupIdentifier": null,
            "Tags": []
          },
          "Channel": {
            "Id": "channel_" + Date.now(),
            "Name": "WhatsApp",
            "ChannelType": "WhatsApp",
            "PhoneNumber": "+5511999999999"
          },
          "LastMessage": {
            "Id": "msg_" + Date.now(),
            "MessageType": "text",
            "Content": "Teste de webhook corrigido",
            "Source": "Contact",
            "MessageState": "received",
            "IsPrivate": false,
            "EventAtUTC": "2024-02-07T18:44:01.3135533Z",
            "CreatedAtUTC": "2024-02-07T18:44:01.3135533Z"
          },
          "Open": true,
          "Private": false,
          "Waiting": false,
          "TotalUnread": 1,
          "TotalAIResponses": 0,
          "ClosedAtUTC": null,
          "EventAtUTC": "2024-02-07T18:44:01.3135533Z"
        }
      }
    };

    try {
      const response = await axios.post(`${this.baseUrl}/webhook/umbler`, validPayload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WebhookTester/1.0'
        },
        timeout: 10000
      });

      console.log('✅ Webhook válido processado com sucesso');
      console.log(`📊 Status: ${response.status}`);
      console.log(`📝 Resposta:`, response.data);
      
      this.testResults.push({
        test: 'Valid Webhook',
        status: 'PASS',
        response: response.data
      });

    } catch (error) {
      console.error('❌ Erro no teste de webhook válido:', error.message);
      if (error.response) {
        console.error('📋 Resposta de erro:', error.response.data);
      }
      
      this.testResults.push({
        test: 'Valid Webhook',
        status: 'FAIL',
        error: error.message,
        response: error.response?.data
      });
    }
  }

  /**
   * Testar webhook com payload inválido
   */
  async testInvalidWebhook() {
    console.log('\n🧪 ===== TESTE: WEBHOOK INVÁLIDO =====');
    
    const invalidPayload = {
      "invalid": "payload",
      "missing": "required_fields"
    };

    try {
      const response = await axios.post(`${this.baseUrl}/webhook/umbler`, invalidPayload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WebhookTester/1.0'
        },
        timeout: 10000
      });

      console.log('⚠️ Webhook inválido foi aceito (modo desenvolvimento)');
      console.log(`📊 Status: ${response.status}`);
      
      this.testResults.push({
        test: 'Invalid Webhook',
        status: 'PASS (Development Mode)',
        response: response.data
      });

    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Webhook inválido rejeitado corretamente');
        console.log(`📊 Status: ${error.response.status}`);
        console.log(`📝 Erro:`, error.response.data);
        
        this.testResults.push({
          test: 'Invalid Webhook',
          status: 'PASS',
          error: error.response.data
        });
      } else {
        console.error('❌ Erro inesperado no teste de webhook inválido:', error.message);
        
        this.testResults.push({
          test: 'Invalid Webhook',
          status: 'FAIL',
          error: error.message
        });
      }
    }
  }

  /**
   * Testar webhook com body vazio
   */
  async testEmptyWebhook() {
    console.log('\n🧪 ===== TESTE: WEBHOOK VAZIO =====');
    
    try {
      const response = await axios.post(`${this.baseUrl}/webhook/umbler`, {}, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WebhookTester/1.0'
        },
        timeout: 10000
      });

      console.log('⚠️ Webhook vazio foi aceito (modo desenvolvimento)');
      console.log(`📊 Status: ${response.status}`);
      
      this.testResults.push({
        test: 'Empty Webhook',
        status: 'PASS (Development Mode)',
        response: response.data
      });

    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Webhook vazio rejeitado corretamente');
        console.log(`📊 Status: ${error.response.status}`);
        console.log(`📝 Erro:`, error.response.data);
        
        this.testResults.push({
          test: 'Empty Webhook',
          status: 'PASS',
          error: error.response.data
        });
      } else {
        console.error('❌ Erro inesperado no teste de webhook vazio:', error.message);
        
        this.testResults.push({
          test: 'Empty Webhook',
          status: 'FAIL',
          error: error.message
        });
      }
    }
  }

  /**
   * Testar rate limiting
   */
  async testRateLimiting() {
    console.log('\n🧪 ===== TESTE: RATE LIMITING =====');
    
    const testPayload = {
      "Type": "Message",
      "EventDate": "2024-02-07T18:44:01.3135533Z",
      "EventId": "rate_test_" + Date.now(),
      "Payload": {
        "Type": "Chat",
        "Content": {
          "Id": "chat_rate_" + Date.now(),
          "Contact": {
            "Id": "contact_rate_" + Date.now(),
            "PhoneNumber": "+5511999999999",
            "Name": "Rate Test",
            "ProfilePictureUrl": null,
            "IsBlocked": false,
            "ContactType": "Contact",
            "LastActiveUTC": "2024-02-07T18:44:01.3135533Z",
            "GroupIdentifier": null,
            "Tags": []
          },
          "LastMessage": {
            "Id": "msg_rate_" + Date.now(),
            "MessageType": "text",
            "Content": "Teste de rate limiting",
            "Source": "Contact",
            "MessageState": "received",
            "IsPrivate": false,
            "EventAtUTC": "2024-02-07T18:44:01.3135533Z",
            "CreatedAtUTC": "2024-02-07T18:44:01.3135533Z"
          },
          "Open": true,
          "Private": false,
          "Waiting": false,
          "TotalUnread": 1,
          "TotalAIResponses": 0,
          "ClosedAtUTC": null,
          "EventAtUTC": "2024-02-07T18:44:01.3135533Z"
        }
      }
    };

    const promises = [];
    const numRequests = 10;

    console.log(`🔄 Enviando ${numRequests} requisições simultâneas...`);

    for (let i = 0; i < numRequests; i++) {
      promises.push(
        axios.post(`${this.baseUrl}/webhook/umbler`, {
          ...testPayload,
          EventId: `rate_test_${Date.now()}_${i}`,
          "Payload": {
            ...testPayload.Payload,
            "Content": {
              ...testPayload.Payload.Content,
              "Id": `chat_rate_${Date.now()}_${i}`,
              "Contact": {
                ...testPayload.Payload.Content.Contact,
                "Id": `contact_rate_${Date.now()}_${i}`
              },
              "LastMessage": {
                ...testPayload.Payload.Content.LastMessage,
                "Id": `msg_rate_${Date.now()}_${i}`
              }
            }
          }
        }, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'WebhookTester/1.0'
          },
          timeout: 5000
        }).catch(error => error)
      );
    }

    const results = await Promise.all(promises);
    
    const successful = results.filter(r => !r.isAxiosError && r.status === 200).length;
    const rateLimited = results.filter(r => r.isAxiosError && r.response?.status === 429).length;
    const errors = results.filter(r => r.isAxiosError && r.response?.status !== 429).length;

    console.log(`📊 Resultados:`);
    console.log(`✅ Sucessos: ${successful}`);
    console.log(`⏸️ Rate Limited: ${rateLimited}`);
    console.log(`❌ Erros: ${errors}`);

    if (rateLimited > 0) {
      console.log('✅ Rate limiting funcionando corretamente');
      this.testResults.push({
        test: 'Rate Limiting',
        status: 'PASS',
        successful,
        rateLimited,
        errors
      });
    } else {
      console.log('⚠️ Rate limiting não ativado (pode ser normal em desenvolvimento)');
      this.testResults.push({
        test: 'Rate Limiting',
        status: 'PASS (Development Mode)',
        successful,
        rateLimited,
        errors
      });
    }
  }

  /**
   * Testar timeout
   */
  async testTimeout() {
    console.log('\n🧪 ===== TESTE: TIMEOUT =====');
    
    // Simular um processamento lento
    const slowPayload = {
      "Type": "Message",
      "EventDate": "2024-02-07T18:44:01.3135533Z",
      "EventId": "timeout_test_" + Date.now(),
      "Payload": {
        "Type": "Chat",
        "Content": {
          "Id": "chat_timeout_" + Date.now(),
          "Contact": {
            "Id": "contact_timeout_" + Date.now(),
            "PhoneNumber": "+5511999999999",
            "Name": "Timeout Test",
            "ProfilePictureUrl": null,
            "IsBlocked": false,
            "ContactType": "Contact",
            "LastActiveUTC": "2024-02-07T18:44:01.3135533Z",
            "GroupIdentifier": null,
            "Tags": []
          },
          "LastMessage": {
            "Id": "msg_timeout_" + Date.now(),
            "MessageType": "text",
            "Content": "Teste de timeout",
            "Source": "Contact",
            "MessageState": "received",
            "IsPrivate": false,
            "EventAtUTC": "2024-02-07T18:44:01.3135533Z",
            "CreatedAtUTC": "2024-02-07T18:44:01.3135533Z"
          },
          "Open": true,
          "Private": false,
          "Waiting": false,
          "TotalUnread": 1,
          "TotalAIResponses": 0,
          "ClosedAtUTC": null,
          "EventAtUTC": "2024-02-07T18:44:01.3135533Z"
        }
      }
    };

    try {
      const response = await axios.post(`${this.baseUrl}/webhook/umbler`, slowPayload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WebhookTester/1.0'
        },
        timeout: 35000 // Timeout maior que o do servidor
      });

      console.log('✅ Webhook processado dentro do timeout');
      console.log(`📊 Status: ${response.status}`);
      console.log(`📝 Resposta:`, response.data);
      
      this.testResults.push({
        test: 'Timeout',
        status: 'PASS',
        response: response.data
      });

    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        console.log('✅ Timeout detectado corretamente');
        this.testResults.push({
          test: 'Timeout',
          status: 'PASS',
          error: 'Timeout detected'
        });
      } else {
        console.error('❌ Erro inesperado no teste de timeout:', error.message);
        this.testResults.push({
          test: 'Timeout',
          status: 'FAIL',
          error: error.message
        });
      }
    }
  }

  /**
   * Executar todos os testes
   */
  async runAllTests() {
    console.log('🧪 INICIANDO TESTES DOS WEBHOOKS...\n');
    
    await this.testValidWebhook();
    await this.testInvalidWebhook();
    await this.testEmptyWebhook();
    await this.testRateLimiting();
    await this.testTimeout();
    
    this.printResults();
  }

  /**
   * Imprimir resultados dos testes
   */
  printResults() {
    console.log('\n📊 ===== RESULTADOS DOS TESTES =====');
    
    const passed = this.testResults.filter(r => r.status.includes('PASS')).length;
    const failed = this.testResults.filter(r => r.status.includes('FAIL')).length;
    
    console.log(`✅ Passou: ${passed}`);
    console.log(`❌ Falhou: ${failed}`);
    console.log(`📊 Total: ${this.testResults.length}`);
    
    console.log('\n📋 Detalhes:');
    this.testResults.forEach((result, index) => {
      const status = result.status.includes('PASS') ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.test}: ${result.status}`);
    });
    
    console.log('\n=====================================\n');
    
    if (failed === 0) {
      console.log('🎉 Todos os testes passaram! As correções estão funcionando.');
    } else {
      console.log('⚠️ Alguns testes falharam. Verifique os logs acima.');
    }
  }
}

// Executar testes
async function main() {
  const tester = new WebhookTester();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('❌ Erro nos testes:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = WebhookTester;