const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Script para corrigir problemas do Supabase e fazer limpeza do projeto
 */

console.log('🔧 Iniciando correção do Supabase e limpeza do projeto...');

// 1. Verificar e criar arquivo .env se não existir
function createEnvFile() {
  const envPath = path.join(__dirname, '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('📝 Criando arquivo .env...');
    
    const envContent = `# Configurações do Supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Configurações do banco de dados (fallback)
DATABASE_URL=postgresql://user:password@localhost:5432/umbler_webhook

# Configurações da aplicação
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Configurações de segurança
WEBHOOK_SECRET=your_webhook_secret_here
JWT_SECRET=your_jwt_secret_here

# Configurações de CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Configurações de logging
LOG_LEVEL=info

# Configurações de desenvolvimento
AUTO_RELOAD=true
DEBUG_MODE=true
SKIP_DB_CONNECTION=false

# Configurações de túnel (ngrok)
AUTO_START_TUNNEL=false
NGROK_AUTH_TOKEN=your_ngrok_auth_token_here

# Configurações de rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WEBHOOK_MAX=1000

# Configurações de upload
MAX_FILE_SIZE=10485760
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/gif,application/pdf,text/plain

# Configurações de cache
CACHE_ENABLED=false
CACHE_TTL=300
CACHE_MAX_SIZE=100

# Configurações de monitoramento
MONITORING_ENABLED=false
METRICS_PORT=9090

# Configurações de backup
BACKUP_ENABLED=false
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30

# Configurações de limpeza
CLEANUP_ENABLED=false
CLEANUP_SCHEDULE=0 3 * * *
CLEANUP_WEBHOOK_DAYS=30
CLEANUP_MESSAGES_DAYS=365

# URLs e endpoints
WEBHOOK_URL=/webhook/umbler
API_BASE_URL=/api
DASHBOARD_URL=/dashboard
BASE_URL=http://localhost:3000

# Configurações de proxy
TRUST_PROXY=false

# Configurações de desenvolvimento
MOCK_DATA=false
`;
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Arquivo .env criado com sucesso');
    console.log('⚠️  IMPORTANTE: Configure as credenciais do Supabase no arquivo .env');
  } else {
    console.log('✅ Arquivo .env já existe');
  }
}

// 2. Corrigir configuração do Supabase
function fixSupabaseConfig() {
  console.log('🔧 Corrigindo configuração do Supabase...');
  
  const supabaseConfigPath = path.join(__dirname, 'src/config/supabase.js');
  
  if (fs.existsSync(supabaseConfigPath)) {
    let content = fs.readFileSync(supabaseConfigPath, 'utf8');
    
    // Corrigir importação do database
    content = content.replace(
      /const \{ executeQuery, insertWithRetry, updateWithRetry, findWithCache \} = require\('\.\.\/config\/database'\);/g,
      `const { executeQuery, insertWithRetry, updateWithRetry, findWithCache } = require('./database');`
    );
    
    // Adicionar fallback para quando Supabase não estiver configurado
    const fallbackCode = `
// Fallback para quando Supabase não estiver configurado
if (!supabaseUrl || !supabaseKey) {
  logger.warn('⚠️ Supabase não configurado, usando PostgreSQL direto');
  module.exports = {
    supabase: null,
    testConnection: async () => {
      logger.warn('⚠️ Teste de conexão Supabase não disponível');
      return false;
    },
    executeQuery: async () => {
      throw new Error('Supabase não configurado');
    },
    insertWithRetry: async () => {
      throw new Error('Supabase não configurado');
    },
    updateWithRetry: async () => {
      throw new Error('Supabase não configurado');
    },
    findWithCache: async () => {
      throw new Error('Supabase não configurado');
    },
    executeTransaction: async () => {
      throw new Error('Supabase não configurado');
    },
    healthCheck: async () => {
      return {
        status: 'unhealthy',
        error: 'Supabase não configurado',
        timestamp: new Date().toISOString()
      };
    },
    initializeSupabase: async () => {
      logger.warn('⚠️ Supabase não configurado');
      return false;
    }
  };
  return;
}`;
    
    // Inserir o código de fallback após a verificação das credenciais
    content = content.replace(
      /if \(!supabaseUrl \|\| !supabaseKey\) \{[\s\S]*?process\.exit\(1\);\s*\}\s*}/,
      `if (!supabaseUrl || !supabaseKey) {
  logger.error('❌ Credenciais do Supabase não configuradas');
  logger.info('Configure as seguintes variáveis no arquivo .env:');
  logger.info('- SUPABASE_URL=https://your-project-id.supabase.co');
  logger.info('- SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here');
  
  if (environment.isProduction()) {
    process.exit(1);
  }
}`
    );
    
    // Adicionar o código de fallback no final do arquivo
    if (!content.includes('Fallback para quando Supabase não estiver configurado')) {
      content = content.replace(
        /module\.exports = \{[\s\S]*?\};/,
        `module.exports = {
  supabase,
  testConnection: testSupabaseConnection,
  executeQuery,
  insertWithRetry,
  updateWithRetry,
  findWithCache,
  executeTransaction,
  healthCheck,
  initializeSupabase
};

// Fallback para quando Supabase não estiver configurado
if (!supabaseUrl || !supabaseKey) {
  logger.warn('⚠️ Supabase não configurado, usando PostgreSQL direto');
  module.exports = {
    supabase: null,
    testConnection: async () => {
      logger.warn('⚠️ Teste de conexão Supabase não disponível');
      return false;
    },
    executeQuery: async () => {
      throw new Error('Supabase não configurado');
    },
    insertWithRetry: async () => {
      throw new Error('Supabase não configurado');
    },
    updateWithRetry: async () => {
      throw new Error('Supabase não configurado');
    },
    findWithCache: async () => {
      throw new Error('Supabase não configurado');
    },
    executeTransaction: async () => {
      throw new Error('Supabase não configurado');
    },
    healthCheck: async () => {
      return {
        status: 'unhealthy',
        error: 'Supabase não configurado',
        timestamp: new Date().toISOString()
      };
    },
    initializeSupabase: async () => {
      logger.warn('⚠️ Supabase não configurado');
      return false;
    }
  };
}`
      );
    }
    
    fs.writeFileSync(supabaseConfigPath, content);
    console.log('✅ Configuração do Supabase corrigida');
  }
}

// 3. Corrigir serviços para usar Supabase corretamente
function fixServices() {
  console.log('🔧 Corrigindo serviços...');
  
  // Corrigir webhookService.js
  const webhookServicePath = path.join(__dirname, 'src/services/webhookService.js');
  if (fs.existsSync(webhookServicePath)) {
    let content = fs.readFileSync(webhookServicePath, 'utf8');
    
    // Corrigir importação
    content = content.replace(
      /const \{ executeQuery, insertWithRetry, updateWithRetry, findWithCache \} = require\('\.\.\/config\/database'\);/g,
      `const { executeQuery, insertWithRetry, updateWithRetry, findWithCache } = require('../config/database');`
    );
    
    // Adicionar tratamento de erro para Supabase
    content = content.replace(
      /async processWebhook\(payload, webhookEventId = null\) \{/,
      `async processWebhook(payload, webhookEventId = null) {
    try {
      // Verificar se Supabase está configurado
      const { supabase } = require('../config/supabase');
      if (!supabase) {
        logger.warn('⚠️ Supabase não configurado, processando apenas localmente');
        return {
          eventType: 'unknown',
          processed: false,
          error: 'Supabase não configurado'
        };
      }`
    );
    
    fs.writeFileSync(webhookServicePath, content);
    console.log('✅ webhookService.js corrigido');
  }
  
  // Corrigir mensagensWebhookService.js
  const mensagensServicePath = path.join(__dirname, 'src/services/mensagensWebhookService.js');
  if (fs.existsSync(mensagensServicePath)) {
    let content = fs.readFileSync(mensagensServicePath, 'utf8');
    
    // Corrigir importação
    content = content.replace(
      /const \{ executeQuery, insertWithRetry, findWithCache \} = require\('\.\.\/config\/database'\);/g,
      `const { executeQuery, insertWithRetry, findWithCache } = require('../config/database');`
    );
    
    // Adicionar verificação de Supabase
    content = content.replace(
      /async processarMensagemWebhook\(payload\) \{/,
      `async processarMensagemWebhook(payload) {
    try {
      // Verificar se Supabase está configurado
      const { supabase } = require('../config/supabase');
      if (!supabase) {
        logger.warn('⚠️ Supabase não configurado, pulando processamento de mensagem webhook');
        return null;
      }`
    );
    
    fs.writeFileSync(mensagensServicePath, content);
    console.log('✅ mensagensWebhookService.js corrigido');
  }
}

// 4. Criar script de teste do Supabase
function createSupabaseTest() {
  console.log('🧪 Criando script de teste do Supabase...');
  
  const testScript = `const { supabase, testConnection } = require('./src/config/supabase');
const logger = require('./src/utils/logger');

async function testSupabaseConnection() {
  try {
    console.log('🔍 Testando conexão com Supabase...');
    
    if (!supabase) {
      console.log('❌ Supabase não configurado');
      console.log('Configure as variáveis de ambiente:');
      console.log('- SUPABASE_URL');
      console.log('- SUPABASE_SERVICE_ROLE_KEY');
      return false;
    }
    
    const isConnected = await testConnection();
    
    if (isConnected) {
      console.log('✅ Conexão com Supabase estabelecida');
      
      // Testar inserção
      console.log('🧪 Testando inserção...');
      const testData = {
        event_type: 'test',
        event_date: new Date().toISOString(),
        payload: { test: true },
        processed: false
      };
      
      const { data, error } = await supabase
        .from('webhook_events')
        .insert(testData)
        .select()
        .single();
      
      if (error) {
        console.log('❌ Erro na inserção:', error.message);
        return false;
      }
      
      console.log('✅ Inserção testada com sucesso');
      
      // Limpar dados de teste
      await supabase
        .from('webhook_events')
        .delete()
        .eq('event_type', 'test');
      
      console.log('✅ Dados de teste removidos');
      return true;
      
    } else {
      console.log('❌ Falha na conexão com Supabase');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Erro no teste:', error.message);
    return false;
  }
}

// Executar teste
testSupabaseConnection().then(success => {
  if (success) {
    console.log('🎉 Teste do Supabase concluído com sucesso!');
    process.exit(0);
  } else {
    console.log('💥 Teste do Supabase falhou!');
    process.exit(1);
  }
});`;
  
  fs.writeFileSync(path.join(__dirname, 'test-supabase-connection.js'), testScript);
  console.log('✅ Script de teste do Supabase criado');
}

// 5. Limpar arquivos desnecessários
function cleanupFiles() {
  console.log('🧹 Limpando arquivos desnecessários...');
  
  const filesToRemove = [
    // Manuais antigos
    'GUIA_DEPLOY_COMPLETO.md',
    'GUIA-INTEGRACAO-FRONTEND.md',
    'RESUMO_FRONTEND_COMPLETO.md',
    'RESUMO-INTEGRACAO.md',
    'ERRO_CORRIGIDO_README.md',
    'PROBLEMA_IDENTIFICADO.md',
    'RESOLVER_ERRO_SUPABASE.md',
    'RESUMO_SOLUCAO_SUPABASE.md',
    'SOLUCAO_PROBLEMAS_SUPABASE.md',
    'BACKEND_LIMPO.md',
    'CONFIGURACAO_SUPABASE.md',
    'GUIA_SEGURANCA_SUPABASE.md',
    'MIGRACAO-COMPLETA.md',
    'README-MIGRACAO-POSTGRESQL.md',
    'README-SUPABASE-SETUP.md',
    'SISTEMA_TEMPO_RESPOSTA_ATENDENTE.md',
    'WEBHOOK-GUIDE.md',
    'QUICK-START.md',
    
    // Scripts de teste antigos
    'test-mensagens-webhook.js',
    'testar-webhook-completo.js',
    'testar-tempo-resposta-atendente.js',
    'test-webhook-supabase.js',
    'test-webhook-insertion.js',
    'diagnosticar-supabase.js',
    'configurar-supabase-real.js',
    'setup-supabase-complete.js',
    'setup-supabase-credentials.js',
    'setup-mensagens-webhook.js',
    'setup-database-tables.js',
    'setup-completo.js',
    'apply-security-fixes.js',
    'fix-security-issues.sql',
    'fix-security-simple.sql',
    'fix-supabase-configuration.js',
    'create-agent-response-table.sql',
    
    // Arquivos vazios
    '.eslintrc.js',
    'nodemon',
    'umbler-webhook-backend@1.0.0'
  ];
  
  let removedCount = 0;
  
  filesToRemove.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Removido: ${file}`);
        removedCount++;
      } catch (error) {
        console.log(`⚠️  Erro ao remover ${file}:`, error.message);
      }
    }
  });
  
  console.log(`✅ ${removedCount} arquivos removidos`);
}

// 6. Remover pasta frontend
function removeFrontend() {
  console.log('🗑️  Removendo pasta frontend...');
  
  const frontendPath = path.join(__dirname, '..', 'frontend');
  if (fs.existsSync(frontendPath)) {
    try {
      // Remover recursivamente
      const removeDir = (dir) => {
        if (fs.existsSync(dir)) {
          fs.readdirSync(dir).forEach(file => {
            const curPath = path.join(dir, file);
            if (fs.lstatSync(curPath).isDirectory()) {
              removeDir(curPath);
            } else {
              fs.unlinkSync(curPath);
            }
          });
          fs.rmdirSync(dir);
        }
      };
      
      removeDir(frontendPath);
      console.log('✅ Pasta frontend removida');
    } catch (error) {
      console.log('⚠️  Erro ao remover pasta frontend:', error.message);
    }
  } else {
    console.log('ℹ️  Pasta frontend não encontrada');
  }
}

// 7. Remover pasta Umbler-2
function removeUmbler2() {
  console.log('🗑️  Removendo pasta Umbler-2...');
  
  const umbler2Path = path.join(__dirname, '..', 'Umbler-2');
  if (fs.existsSync(umbler2Path)) {
    try {
      // Remover recursivamente
      const removeDir = (dir) => {
        if (fs.existsSync(dir)) {
          fs.readdirSync(dir).forEach(file => {
            const curPath = path.join(dir, file);
            if (fs.lstatSync(curPath).isDirectory()) {
              removeDir(curPath);
            } else {
              fs.unlinkSync(curPath);
            }
          });
          fs.rmdirSync(dir);
        }
      };
      
      removeDir(umbler2Path);
      console.log('✅ Pasta Umbler-2 removida');
    } catch (error) {
      console.log('⚠️  Erro ao remover pasta Umbler-2:', error.message);
    }
  } else {
    console.log('ℹ️  Pasta Umbler-2 não encontrada');
  }
}

// 8. Criar README atualizado
function createUpdatedReadme() {
  console.log('📝 Criando README atualizado...');
  
  const readmeContent = `# Umbler Webhook Backend

Backend para processamento de webhooks da Umbler com integração ao Supabase.

## 🚀 Configuração Rápida

### 1. Instalar dependências
\`\`\`bash
npm install
\`\`\`

### 2. Configurar variáveis de ambiente
Copie o arquivo \`.env.example\` para \`.env\` e configure:

\`\`\`env
# Supabase (obrigatório)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Banco de dados (fallback)
DATABASE_URL=postgresql://user:password@localhost:5432/umbler_webhook

# Aplicação
NODE_ENV=development
PORT=3000
WEBHOOK_SECRET=your_webhook_secret_here
\`\`\`

### 3. Testar conexão com Supabase
\`\`\`bash
node test-supabase-connection.js
\`\`\`

### 4. Iniciar servidor
\`\`\`bash
npm start
\`\`\`

## 📋 Endpoints

- \`POST /webhook/umbler\` - Receber webhooks da Umbler
- \`GET /webhook/test\` - Teste de conectividade
- \`GET /api/health\` - Health check
- \`GET /api/stats\` - Estatísticas

## 🔧 Desenvolvimento

\`\`\`bash
# Modo desenvolvimento com auto-reload
npm run dev

# Testar webhook
curl -X POST http://localhost:3000/webhook/test
\`\`\`

## 📊 Monitoramento

- Logs: \`logs/app.log\`
- Health check: \`/api/health\`
- Estatísticas: \`/api/stats\`

## 🛠️ Estrutura do Projeto

\`\`\`
src/
├── config/          # Configurações
├── controllers/     # Controllers
├── middleware/      # Middlewares
├── routes/          # Rotas
├── services/        # Serviços
└── utils/           # Utilitários
\`\`\`

## 🔒 Segurança

- Validação de assinatura de webhook
- Rate limiting
- CORS configurável
- Logs de auditoria

## 📈 Funcionalidades

- ✅ Processamento de webhooks da Umbler
- ✅ Integração com Supabase
- ✅ Cálculo de tempo de resposta
- ✅ Estatísticas em tempo real
- ✅ Sistema de retry automático
- ✅ Logs detalhados
- ✅ Health checks

## 🆘 Suporte

Para problemas com Supabase:
1. Verifique as credenciais no arquivo \`.env\`
2. Execute \`node test-supabase-connection.js\`
3. Verifique os logs em \`logs/app.log\`
`;

  fs.writeFileSync(path.join(__dirname, 'README.md'), readmeContent);
  console.log('✅ README atualizado');
}

// 9. Executar todas as correções
async function runAllFixes() {
  try {
    console.log('🚀 Iniciando correção completa do projeto...\n');
    
    createEnvFile();
    console.log('');
    
    fixSupabaseConfig();
    console.log('');
    
    fixServices();
    console.log('');
    
    createSupabaseTest();
    console.log('');
    
    cleanupFiles();
    console.log('');
    
    removeFrontend();
    console.log('');
    
    removeUmbler2();
    console.log('');
    
    createUpdatedReadme();
    console.log('');
    
    console.log('🎉 Correção completa finalizada!');
    console.log('');
    console.log('📋 Próximos passos:');
    console.log('1. Configure as credenciais do Supabase no arquivo .env');
    console.log('2. Execute: node test-supabase-connection.js');
    console.log('3. Execute: npm start');
    console.log('');
    console.log('✅ Projeto limpo e configurado!');
    
  } catch (error) {
    console.error('❌ Erro durante a correção:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runAllFixes();
}

module.exports = {
  createEnvFile,
  fixSupabaseConfig,
  fixServices,
  createSupabaseTest,
  cleanupFiles,
  removeFrontend,
  removeUmbler2,
  createUpdatedReadme,
  runAllFixes
};
