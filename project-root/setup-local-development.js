#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('./src/utils/logger');

console.log('🚀 Configurando ambiente de desenvolvimento local...\n');

// Função para executar comandos
function runCommand(command, args, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    console.log(`📋 Executando: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Comando falhou com código ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Função para verificar se um comando existe
function checkCommand(command) {
  return new Promise((resolve) => {
    const child = spawn('which', [command], { stdio: 'ignore' });
    child.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

// Função para criar arquivo .env se não existir
function createEnvFile() {
  const envPath = path.join(__dirname, '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('📝 Criando arquivo .env...');
    
    const envContent = `# Configurações do Backend
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Supabase (configure suas credenciais)
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Database
DATABASE_URL=your_database_url_here

# Webhook
WEBHOOK_SECRET=your_webhook_secret_here

# CORS
CORS_ORIGIN=http://localhost:8080,http://127.0.0.1:8080

# Ngrok (opcional)
NGROK_AUTH_TOKEN=your_ngrok_auth_token_here
AUTO_START_TUNNEL=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WEBHOOK_MAX=1000

# Logging
LOG_LEVEL=debug
LOG_FILE=logs/app.log

# Development
AUTO_RELOAD=true
DEBUG_MODE=true
MOCK_DATA=true
`;

    fs.writeFileSync(envPath, envContent);
    console.log('✅ Arquivo .env criado com sucesso!');
    console.log('⚠️  Configure suas credenciais do Supabase no arquivo .env');
  } else {
    console.log('✅ Arquivo .env já existe');
  }
}

// Função para instalar dependências do backend
async function installBackendDependencies() {
  console.log('\n📦 Instalando dependências do backend...');
  
  try {
    await runCommand('npm', ['install']);
    console.log('✅ Dependências do backend instaladas');
  } catch (error) {
    console.error('❌ Erro ao instalar dependências do backend:', error.message);
    throw error;
  }
}

// Função para instalar dependências do frontend
async function installFrontendDependencies() {
  const frontendPath = path.join(__dirname, '../google-ads-zenith');
  
  if (!fs.existsSync(frontendPath)) {
    console.log('⚠️  Diretório do frontend não encontrado em ../google-ads-zenith');
    return;
  }

  console.log('\n📦 Instalando dependências do frontend...');
  
  try {
    await runCommand('npm', ['install'], frontendPath);
    console.log('✅ Dependências do frontend instaladas');
  } catch (error) {
    console.error('❌ Erro ao instalar dependências do frontend:', error.message);
    throw error;
  }
}

// Função para verificar ngrok
async function checkNgrok() {
  console.log('\n🔍 Verificando ngrok...');
  
  const hasNgrok = await checkCommand('ngrok');
  
  if (!hasNgrok) {
    console.log('⚠️  Ngrok não encontrado. Instalando...');
    
    try {
      // Tentar instalar ngrok via npm
      await runCommand('npm', ['install', '-g', 'ngrok']);
      console.log('✅ Ngrok instalado via npm');
    } catch (error) {
      console.log('❌ Erro ao instalar ngrok via npm. Instale manualmente:');
      console.log('   https://ngrok.com/download');
      console.log('   ou execute: npm install -g ngrok');
    }
  } else {
    console.log('✅ Ngrok já está instalado');
  }
}

// Função para criar script de inicialização
function createStartScript() {
  const startScript = `#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando ambiente de desenvolvimento...\\n');

// Iniciar backend
console.log('📡 Iniciando backend...');
const backend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'project-root'),
  stdio: 'inherit'
});

// Aguardar um pouco e iniciar frontend
setTimeout(() => {
  console.log('\\n🌐 Iniciando frontend...');
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, 'google-ads-zenith'),
    stdio: 'inherit'
  });

  // Gerenciar encerramento
  process.on('SIGINT', () => {
    console.log('\\n🛑 Encerrando servidores...');
    backend.kill('SIGINT');
    frontend.kill('SIGINT');
    process.exit(0);
  });

  frontend.on('close', (code) => {
    console.log(\`Frontend encerrado com código \${code}\`);
    backend.kill('SIGINT');
  });
}, 3000);

backend.on('close', (code) => {
  console.log(\`Backend encerrado com código \${code}\`);
  process.exit(code);
});

backend.on('error', (error) => {
  console.error('Erro no backend:', error);
  process.exit(1);
});
`;

  const scriptPath = path.join(__dirname, 'start-dev.js');
  fs.writeFileSync(scriptPath, startScript);
  fs.chmodSync(scriptPath, '755');
  
  console.log('✅ Script de inicialização criado: start-dev.js');
  console.log('   Execute: node start-dev.js para iniciar backend e frontend');
}

// Função para criar script de teste de webhook
function createWebhookTestScript() {
  const testScript = `#!/usr/bin/env node

const axios = require('axios');

const testWebhook = async () => {
  try {
    console.log('🧪 Testando webhook...');
    
    const payload = {
      Type: "Message",
      EventDate: new Date().toISOString(),
      Payload: {
        Type: "Chat",
        Content: {
          Organization: {
            Id: "ZQG4wFMHGHuTs59F"
          },
          Contact: {
            LastActiveUTC: new Date().toISOString(),
            PhoneNumber: "+5548996579768",
            ProfilePictureUrl: "https://via.placeholder.com/150",
            IsBlocked: false,
            ScheduledMessages: [],
            GroupIdentifier: null,
            ContactType: "DirectMessage",
            Tags: [],
            Preferences: [],
            Name: "Teste Frontend",
            Id: "test-contact-id"
          },
          Channel: {
            _t: "ChatBrokerWhatsappChannelReferenceModel",
            ChannelType: "WhatsappBroker",
            PhoneNumber: "+5548996330672",
            Name: "PH - Amanda",
            Id: "ZZRS4Jl_JmIQyDKA"
          },
          Sector: {
            Default: true,
            Order: 0,
            GroupIds: [],
            Name: "Geral",
            Id: "ZQG4wFMHGHuTs59H"
          },
          OrganizationMember: {
            Muted: false,
            TotalUnread: null,
            Id: "ZuGqFp5N9i3HAKOn"
          },
          OrganizationMembers: [
            {
              Muted: false,
              TotalUnread: null,
              Id: "ZuGqFp5N9i3HAKOn"
            }
          ],
          Tags: [],
          LastMessage: {
            Prefix: "*Amanda 💙:*",
            HeaderContent: null,
            Content: "Teste de webhook do frontend",
            Footer: null,
            File: null,
            Thumbnail: null,
            QuotedStatusUpdate: null,
            Contacts: [],
            MessageType: "Text",
            SentByOrganizationMember: {
              Id: "ZuGqFp5N9i3HAKOn"
            },
            IsPrivate: false,
            Location: null,
            Question: null,
            Source: "Member",
            InReplyTo: null,
            MessageState: "Sent",
            EventAtUTC: new Date().toISOString(),
            Chat: {
              Id: "test-chat-id"
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
            Id: "test-message-id",
            CreatedAtUTC: new Date().toISOString()
          },
          LastMessageReaction: null,
          RedactReason: null,
          UsingInactivityFlow: false,
          UsingWaitingFlow: false,
          InactivityFlowAt: null,
          WaitingFlowAt: null,
          Open: true,
          Private: false,
          Waiting: false,
          WaitingSinceUTC: null,
          TotalUnread: 0,
          TotalAIResponses: null,
          ClosedAtUTC: null,
          EventAtUTC: new Date().toISOString(),
          FirstMemberReplyMessage: {
            EventAtUTC: new Date().toISOString(),
            Id: "test-message-id"
          },
          FirstContactMessage: {
            EventAtUTC: new Date().toISOString(),
            Id: "test-contact-message-id"
          },
          Bots: [],
          LastOrganizationMember: {
            Id: "ZuGqFp5N9i3HAKOn"
          },
          Message: null,
          Visibility: null,
          Id: "test-conversation-id",
          CreatedAtUTC: new Date().toISOString()
        },
        EventId: "test-event-id"
      }
    };

    const response = await axios.post('http://localhost:3000/webhook/umbler', payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Umbler-Signature': 'test-signature'
      }
    });

    console.log('✅ Webhook testado com sucesso!');
    console.log('📊 Resposta:', response.data);
    
  } catch (error) {
    console.error('❌ Erro ao testar webhook:', error.response?.data || error.message);
  }
};

testWebhook();
`;

  const scriptPath = path.join(__dirname, 'test-webhook-local.js');
  fs.writeFileSync(scriptPath, testScript);
  fs.chmodSync(scriptPath, '755');
  
  console.log('✅ Script de teste de webhook criado: test-webhook-local.js');
}

// Função principal
async function setupLocalDevelopment() {
  try {
    // 1. Criar arquivo .env
    createEnvFile();
    
    // 2. Instalar dependências do backend
    await installBackendDependencies();
    
    // 3. Instalar dependências do frontend
    await installFrontendDependencies();
    
    // 4. Verificar ngrok
    await checkNgrok();
    
    // 5. Criar scripts de inicialização
    createStartScript();
    createWebhookTestScript();
    
    console.log('\n🎉 Configuração concluída com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Configure suas credenciais do Supabase no arquivo .env');
    console.log('2. Execute: node start-dev.js para iniciar backend e frontend');
    console.log('3. Execute: node test-webhook-local.js para testar webhooks');
    console.log('4. Acesse o frontend em: http://localhost:8080');
    console.log('5. Configure o ngrok para receber webhooks da Umbler');
    console.log('\n🔗 URLs importantes:');
    console.log('   Backend: http://localhost:3000');
    console.log('   Frontend: http://localhost:8080');
    console.log('   Health Check: http://localhost:3000/health');
    console.log('   Webhook: http://localhost:3000/webhook/umbler');
    
  } catch (error) {
    console.error('\n❌ Erro durante a configuração:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupLocalDevelopment();
}

module.exports = { setupLocalDevelopment };
