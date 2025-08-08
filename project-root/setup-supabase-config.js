const fs = require('fs');
const path = require('path');

/**
 * Script para configurar Supabase corretamente
 */

console.log('🔧 Configurando Supabase...');

// 1. Criar arquivo .env se não existir
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

// 2. Corrigir configuração do Supabase para usar database.js corretamente
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

// 5. Executar todas as correções
async function runSetup() {
  try {
    console.log('🚀 Iniciando configuração do Supabase...\n');
    
    createEnvFile();
    console.log('');
    
    fixSupabaseConfig();
    console.log('');
    
    fixServices();
    console.log('');
    
    createSupabaseTest();
    console.log('');
    
    console.log('🎉 Configuração do Supabase finalizada!');
    console.log('');
    console.log('📋 Próximos passos:');
    console.log('1. Configure as credenciais do Supabase no arquivo .env');
    console.log('2. Execute: node test-supabase-connection.js');
    console.log('3. Execute: npm start');
    console.log('');
    console.log('✅ Supabase configurado!');
    
  } catch (error) {
    console.error('❌ Erro durante a configuração:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runSetup();
}

module.exports = {
  createEnvFile,
  fixSupabaseConfig,
  fixServices,
  createSupabaseTest,
  runSetup
};
