#!/usr/bin/env node

/**
 * Script para testar webhook com dados reais da Umbler
 * Este script simula webhooks reais para testar o sistema PostgreSQL
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`)
};

/**
 * Gerador de dados de teste baseados nos dados reais da Umbler
 */
class WebhookTestGenerator {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.testData = {
      contacts: [
        {
          id: 'aId-BgQTEBXeyQBx',
          name: 'ANDERSON FERRARI',
          phone: '+5547999955497',
          tags: [{ id: 'ZfSJ3uEJHZvJr_xh', name: 'Troca' }]
        },
        {
          id: 'aId-Contact2',
          name: 'MARIA SILVA',
          phone: '+5547998888888',
          tags: [{ id: 'ZfSJ3uEJHZvJr_xh', name: 'Suporte' }]
        },
        {
          id: 'aId-Contact3',
          name: 'JOÃO SANTOS',
          phone: '+5547997777777',
          tags: [{ id: 'ZfSJ3uEJHZvJr_xh', name: 'Vendas' }]
        }
      ],
      channels: [
        {
          id: 'ZU0nK9hshgRZ-Pkm',
          name: 'AUTO FACIL DESPACHANTE - DVA',
          phone: '+554891294620',
          type: 'WhatsappApi'
        }
      ],
      sectors: [
        {
          id: 'ZUJJB3U0FyapzNuL',
          name: 'DVA',
          default: false,
          order: 6
        },
        {
          id: 'ZUJJB3U0FyapzNuL2',
          name: 'Suporte Técnico',
          default: false,
          order: 2
        }
      ],
      members: [
        {
          id: 'ZW-E1ydfRz6GV84t',
          name: 'Agente Principal'
        }
      ]
    };
  }

  /**
   * Gerar webhook de mensagem realista
   */
  generateMessageWebhook(contactIndex = 0, messageContent = null) {
    const contact = this.testData.contacts[contactIndex];
    const channel = this.testData.channels[0];
    const sector = this.testData.sectors[0];
    const member = this.testData.members[0];
    const now = new Date().toISOString();

    return {
      Type: "Message",
      EventDate: now,
      EventId: `test-${uuidv4()}`,
      Payload: {
        Type: "Chat",
        Content: {
          _t: "BasicChatModel",
          Organization: {
            Id: "ZQG4wFMHGHuTs59F"
          },
          Contact: {
            LastActiveUTC: now,
            PhoneNumber: contact.phone,
            ProfilePictureUrl: null,
            IsBlocked: false,
            ScheduledMessages: [],
            GroupIdentifier: null,
            ContactType: "DirectMessage",
            Tags: contact.tags,
            Preferences: [],
            Name: contact.name,
            Id: contact.id
          },
          Channel: {
            _t: "ChatGupshupWhatsappChannelReferenceModel",
            ChannelType: channel.type,
            PhoneNumber: channel.phone,
            Name: channel.name,
            Id: channel.id
          },
          Sector: {
            Default: sector.default,
            Order: sector.order,
            GroupIds: [],
            Name: sector.name,
            Id: sector.id
          },
          OrganizationMember: {
            Muted: false,
            TotalUnread: null,
            Id: member.id
          },
          OrganizationMembers: [
            {
              Muted: false,
              TotalUnread: null,
              Id: member.id
            }
          ],
          Tags: [],
          LastMessage: {
            Prefix: null,
            HeaderContent: null,
            Content: messageContent || "Olá, preciso de ajuda!",
            Footer: null,
            File: null,
            Thumbnail: null,
            QuotedStatusUpdate: null,
            Contacts: [],
            MessageType: "Text",
            SentByOrganizationMember: null,
            IsPrivate: false,
            Location: null,
            Question: null,
            Source: "Contact",
            InReplyTo: null,
            MessageState: "Read",
            EventAtUTC: now,
            Chat: {
              Id: `chat-${uuidv4()}`
            },
            FromContact: null,
            TemplateId: null,
            Buttons: [],
            LatestEdit: null,
            BotInstance: null,
            ForwardedFrom: null,
            ScheduledMessage: null,
            BulkSendSession: null,
            Elements: null,
            Mentions: [],
            Ad: null,
            FileId: null,
            Reactions: [],
            DeductedAiCredits: null,
            Carousel: [],
            Billable: null,
            Id: `msg-${uuidv4()}`,
            CreatedAtUTC: now
          },
          LastMessageReaction: null,
          RedactReason: null,
          UsingInactivityFlow: false,
          UsingWaitingFlow: false,
          InactivityFlowAt: null,
          WaitingFlowAt: null,
          Open: true,
          Private: false,
          Waiting: true,
          WaitingSinceUTC: now,
          TotalUnread: 0,
          TotalAIResponses: null,
          ClosedAtUTC: null,
          EventAtUTC: now,
          FirstMemberReplyMessage: {
            EventAtUTC: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            Id: `msg-reply-${uuidv4()}`
          },
          FirstContactMessage: {
            EventAtUTC: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            Id: `msg-first-${uuidv4()}`
          },
          Bots: [],
          LastOrganizationMember: {
            Id: member.id
          },
          Message: null,
          Visibility: null,
          Id: `chat-${uuidv4()}`,
          CreatedAtUTC: new Date(Date.now() - 15 * 60 * 1000).toISOString()
        }
      }
    };
  }

  /**
   * Gerar webhook de conversa
   */
  generateConversationWebhook(contactIndex = 0, status = 'open') {
    const contact = this.testData.contacts[contactIndex];
    const now = new Date().toISOString();

    return {
      Type: "Conversation",
      EventDate: now,
      EventId: `conv-${uuidv4()}`,
      Payload: {
        Type: "Chat",
        Content: {
          Id: `chat-${uuidv4()}`,
          Contact: {
            Id: contact.id,
            Name: contact.name,
            PhoneNumber: contact.phone
          },
          Status: status,
          Open: status === 'open',
          Waiting: status === 'waiting',
          EventAtUTC: now,
          CreatedAtUTC: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        }
      }
    };
  }

  /**
   * Enviar webhook para o servidor
   */
  async sendWebhook(webhookData) {
    try {
      const startTime = Date.now();
      
      const response = await axios.post(`${this.baseUrl}/webhook/umbler`, webhookData, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Umbler-Webhook-Test/1.0'
        },
        timeout: 10000
      });

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        status: response.status,
        data: response.data,
        processingTime: `${processingTime}ms`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      };
    }
  }

  /**
   * Testar webhook de mensagem
   */
  async testMessageWebhook(contactIndex = 0, messageContent = null) {
    log.info(`Enviando webhook de mensagem para ${this.testData.contacts[contactIndex].name}...`);
    
    const webhookData = this.generateMessageWebhook(contactIndex, messageContent);
    const result = await this.sendWebhook(webhookData);

    if (result.success) {
      log.success(`Webhook processado com sucesso em ${result.processingTime}`);
      log.info(`Event ID: ${result.data.data.eventId}`);
      log.info(`Event Type: ${result.data.data.eventType}`);
    } else {
      log.error(`Erro no webhook: ${result.error}`);
      if (result.data) {
        log.error(`Detalhes: ${JSON.stringify(result.data, null, 2)}`);
      }
    }

    return result;
  }

  /**
   * Testar webhook de conversa
   */
  async testConversationWebhook(contactIndex = 0, status = 'open') {
    log.info(`Enviando webhook de conversa (${status}) para ${this.testData.contacts[contactIndex].name}...`);
    
    const webhookData = this.generateConversationWebhook(contactIndex, status);
    const result = await this.sendWebhook(webhookData);

    if (result.success) {
      log.success(`Webhook de conversa processado com sucesso em ${result.processingTime}`);
    } else {
      log.error(`Erro no webhook de conversa: ${result.error}`);
    }

    return result;
  }

  /**
   * Teste em lote
   */
  async runBatchTest(count = 5) {
    log.title(`🧪 EXECUTANDO TESTE EM LOTE (${count} webhooks)`);

    const results = {
      total: count,
      success: 0,
      failed: 0,
      totalTime: 0
    };

    for (let i = 0; i < count; i++) {
      log.info(`\n--- Teste ${i + 1}/${count} ---`);
      
      const contactIndex = i % this.testData.contacts.length;
      const messageContent = `Mensagem de teste #${i + 1} - ${new Date().toLocaleTimeString()}`;
      
      const startTime = Date.now();
      const result = await this.testMessageWebhook(contactIndex, messageContent);
      const processingTime = Date.now() - startTime;

      results.totalTime += processingTime;

      if (result.success) {
        results.success++;
      } else {
        results.failed++;
      }

      // Aguardar um pouco entre os testes
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Relatório final
    log.title('📊 RELATÓRIO DO TESTE EM LOTE');
    log.info(`Total de webhooks: ${results.total}`);
    log.success(`Sucessos: ${results.success}`);
    if (results.failed > 0) {
      log.error(`Falhas: ${results.failed}`);
    }
    log.info(`Tempo total: ${results.totalTime}ms`);
    log.info(`Tempo médio: ${Math.round(results.totalTime / results.total)}ms por webhook`);
    log.info(`Taxa de sucesso: ${Math.round((results.success / results.total) * 100)}%`);

    return results;
  }

  /**
   * Teste de diferentes tipos de mensagem
   */
  async testDifferentMessageTypes() {
    log.title('🎭 TESTANDO DIFERENTES TIPOS DE MENSAGEM');

    const messageTypes = [
      { type: 'text', content: 'Olá, preciso de ajuda!' },
      { type: 'text', content: 'Quero fazer uma troca de produto' },
      { type: 'text', content: 'Qual o status do meu pedido?' },
      { type: 'text', content: 'Preciso de suporte técnico urgente' },
      { type: 'text', content: 'Obrigado pelo atendimento!' }
    ];

    for (let i = 0; i < messageTypes.length; i++) {
      const messageType = messageTypes[i];
      log.info(`\n--- Testando: ${messageType.content} ---`);
      
      await this.testMessageWebhook(i % this.testData.contacts.length, messageType.content);
      
      if (i < messageTypes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  /**
   * Teste de conversas em diferentes status
   */
  async testConversationStatuses() {
    log.title('🔄 TESTANDO DIFERENTES STATUS DE CONVERSA');

    const statuses = ['open', 'waiting', 'closed'];

    for (let i = 0; i < statuses.length; i++) {
      const status = statuses[i];
      log.info(`\n--- Testando status: ${status} ---`);
      
      await this.testConversationWebhook(i % this.testData.contacts.length, status);
      
      if (i < statuses.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  /**
   * Verificar dados salvos no banco
   */
  async checkSavedData() {
    log.title('🔍 VERIFICANDO DADOS SALVOS NO BANCO');

    try {
      // Verificar webhook events
      const webhookResponse = await axios.get(`${this.baseUrl}/webhook/events?limit=5`);
      log.success(`Webhook events encontrados: ${webhookResponse.data.data.events.length}`);

      // Verificar estatísticas
      const statsResponse = await axios.get(`${this.baseUrl}/webhook/stats?period=1h`);
      log.success(`Estatísticas: ${JSON.stringify(statsResponse.data.data, null, 2)}`);

      // Verificar chats
      const chatsResponse = await axios.get(`${this.baseUrl}/api/chats?limit=5`);
      log.success(`Chats encontrados: ${chatsResponse.data.data?.length || 0}`);

    } catch (error) {
      log.error(`Erro ao verificar dados: ${error.message}`);
    }
  }
}

/**
 * Menu interativo
 */
async function showMenu() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  log.title('🧪 TESTADOR DE WEBHOOK POSTGRESQL');

  const baseUrl = await question('URL do servidor (padrão: http://localhost:3000): ') || 'http://localhost:3000';
  const generator = new WebhookTestGenerator(baseUrl);

  while (true) {
    console.log('\n' + '='.repeat(50));
    console.log('OPÇÕES DISPONÍVEIS:');
    console.log('1. Teste único de mensagem');
    console.log('2. Teste em lote');
    console.log('3. Teste diferentes tipos de mensagem');
    console.log('4. Teste status de conversa');
    console.log('5. Verificar dados salvos');
    console.log('6. Teste completo');
    console.log('0. Sair');
    console.log('='.repeat(50));

    const choice = await question('Escolha uma opção: ');

    switch (choice) {
      case '1':
        const contactIndex = parseInt(await question('Índice do contato (0-2): ')) || 0;
        const message = await question('Mensagem (Enter para padrão): ') || null;
        await generator.testMessageWebhook(contactIndex, message);
        break;

      case '2':
        const count = parseInt(await question('Quantidade de webhooks (padrão: 5): ')) || 5;
        await generator.runBatchTest(count);
        break;

      case '3':
        await generator.testDifferentMessageTypes();
        break;

      case '4':
        await generator.testConversationStatuses();
        break;

      case '5':
        await generator.checkSavedData();
        break;

      case '6':
        log.title('🚀 EXECUTANDO TESTE COMPLETO');
        await generator.testDifferentMessageTypes();
        await new Promise(resolve => setTimeout(resolve, 3000));
        await generator.testConversationStatuses();
        await new Promise(resolve => setTimeout(resolve, 3000));
        await generator.runBatchTest(3);
        await new Promise(resolve => setTimeout(resolve, 3000));
        await generator.checkSavedData();
        break;

      case '0':
        log.success('Teste finalizado!');
        rl.close();
        return;

      default:
        log.warning('Opção inválida!');
    }

    if (choice !== '0') {
      await question('\nPressione Enter para continuar...');
    }
  }
}

/**
 * Executar teste automático
 */
async function runAutomaticTest() {
  log.title('🤖 EXECUTANDO TESTE AUTOMÁTICO');

  const generator = new WebhookTestGenerator();

  try {
    // Teste 1: Webhook único
    log.info('Teste 1: Webhook único de mensagem');
    await generator.testMessageWebhook(0, 'Teste automático - mensagem única');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Teste 2: Diferentes tipos
    log.info('Teste 2: Diferentes tipos de mensagem');
    await generator.testDifferentMessageTypes();

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Teste 3: Status de conversa
    log.info('Teste 3: Status de conversa');
    await generator.testConversationStatuses();

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Teste 4: Lote
    log.info('Teste 4: Teste em lote');
    await generator.runBatchTest(3);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Teste 5: Verificar dados
    log.info('Teste 5: Verificar dados salvos');
    await generator.checkSavedData();

    log.success('🎉 Teste automático concluído com sucesso!');

  } catch (error) {
    log.error(`Erro no teste automático: ${error.message}`);
  }
}

/**
 * Executar script
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--auto') || args.includes('-a')) {
    await runAutomaticTest();
  } else if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🧪 Testador de Webhook PostgreSQL

Uso:
  node test-webhook-postgresql.js [opções]

Opções:
  --auto, -a     Executar teste automático
  --help, -h     Mostrar esta ajuda
  (sem opções)   Menu interativo

Exemplos:
  node test-webhook-postgresql.js --auto
  node test-webhook-postgresql.js
    `);
  } else {
    await showMenu();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(error => {
    log.error('Erro fatal:');
    log.error(error.message);
    process.exit(1);
  });
}

module.exports = WebhookTestGenerator;