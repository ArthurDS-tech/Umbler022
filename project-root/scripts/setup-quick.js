#!/usr/bin/env node

/**
 * Script de Setup Rápido
 * Configura o projeto automaticamente
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

console.log('🚀 Configurando Backend Umbler Webhook...\n');

// Cores para output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  console.log(`\n${colors.blue}${colors.bold}[${step}]${colors.reset} ${message}`);
}

// 1. Verificar se estamos no diretório correto
logStep('1', 'Verificando estrutura do projeto...');

const requiredFiles = [
  'package.json',
  'src/app.js',
  'schema.sql',
  '.env.example'
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    log(`❌ Arquivo ${file} não encontrado!`, 'red');
    log('Certifique-se de estar no diretório raiz do projeto.', 'yellow');
    process.exit(1);
  }
}

log('✅ Estrutura do projeto verificada!', 'green');

// 2. Verificar se .env já existe
logStep('2', 'Verificando arquivo de configuração...');

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  log('⚠️  Arquivo .env já existe!', 'yellow');
  const answer = process.argv.includes('--force') ? 'y' : 
    require('readline-sync').question('Deseja sobrescrever? (y/N): ');
  
  if (answer.toLowerCase() !== 'y') {
    log('Setup cancelado. Mantendo configuração existente.', 'yellow');
    process.exit(0);
  }
}

// 3. Gerar chaves seguras
logStep('3', 'Gerando chaves de segurança...');

const jwtSecret = crypto.randomBytes(64).toString('hex');
const webhookSecret = crypto.randomBytes(32).toString('hex');
const rateLimitSecret = crypto.randomBytes(32).toString('base64');

log('✅ Chaves geradas com sucesso!', 'green');

// 4. Criar arquivo .env
logStep('4', 'Criando arquivo .env...');

const envContent = `# =============================================
# CONFIGURAÇÕES BÁSICAS
# =============================================
NODE_ENV=development
PORT=3000
HOST=localhost
TRUST_PROXY=false
FORCE_HTTPS=false

# =============================================
# SUPABASE (OBRIGATÓRIO - CONFIGURE MANUALMENTE)
# =============================================
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anonima_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui

# =============================================
# SEGURANÇA (GERADAS AUTOMATICAMENTE)
# =============================================
JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=24h
WEBHOOK_SECRET=${webhookSecret}
BCRYPT_ROUNDS=12

# =============================================
# CORS (CONFIGURE PARA SEU FRONTEND)
# =============================================
CORS_ORIGIN=http://localhost:3001,http://localhost:5173,http://localhost:8080
CORS_CREDENTIALS=true

# =============================================
# RATE LIMITING
# =============================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WEBHOOK_MAX=1000
RATE_LIMIT_SECRET=${rateLimitSecret}

# =============================================
# LOGS
# =============================================
LOG_LEVEL=info
LOG_FILE=logs/app.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5
PRETTY_LOGS=true

# =============================================
# WEBHOOK
# =============================================
WEBHOOK_BASE_URL=http://localhost:3000
WEBHOOK_PATH=/webhook/umbler
WEBHOOK_TIMEOUT=30000
MAX_RETRY_ATTEMPTS=3
RETRY_DELAY=5000

# =============================================
# NGROK (OPCIONAL - CONFIGURE MANUALMENTE)
# =============================================
# NGROK_AUTHTOKEN=seu_token_ngrok_aqui
# NGROK_SUBDOMAIN=seu_subdominio_aqui

# =============================================
# DESENVOLVIMENTO
# =============================================
DEBUG=true
MOCK_WEBHOOKS=false
LOG_REQUESTS=true
AUTO_START_TUNNEL=true

# =============================================
# BACKUP (OPCIONAL)
# =============================================
BACKUP_ENABLED=false
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30

# =============================================
# PRÓXIMOS PASSOS
# =============================================
# 1. Configure SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY
# 2. Execute o schema SQL no Supabase
# 3. Configure CORS_ORIGIN para seu frontend
# 4. Execute: npm install && npm run dev
`;

fs.writeFileSync(envPath, envContent);
log('✅ Arquivo .env criado com sucesso!', 'green');

// 5. Instalar dependências
logStep('5', 'Instalando dependências...');

try {
  execSync('npm install', { stdio: 'inherit' });
  log('✅ Dependências instaladas!', 'green');
} catch (error) {
  log('❌ Erro ao instalar dependências!', 'red');
  log('Execute manualmente: npm install', 'yellow');
}

// 6. Criar diretório de logs
logStep('6', 'Criando diretórios necessários...');

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  log('✅ Diretório logs criado!', 'green');
}

// 7. Mostrar próximos passos
logStep('7', 'Próximos passos...');

console.log(`
${colors.green}${colors.bold}🎉 Setup concluído com sucesso!${colors.reset}

${colors.yellow}${colors.bold}Próximos passos:${colors.reset}

1. ${colors.blue}Configure o Supabase:${colors.reset}
   - Acesse: https://supabase.com
   - Crie um novo projeto
   - Copie as credenciais para o arquivo .env

2. ${colors.blue}Configure o banco de dados:${colors.reset}
   - Execute o schema SQL no Supabase SQL Editor
   - Arquivo: schema.sql

3. ${colors.blue}Configure o CORS:${colors.reset}
   - Edite CORS_ORIGIN no .env para incluir seu frontend

4. ${colors.blue}Teste o backend:${colors.reset}
   - Execute: npm run dev
   - Acesse: http://localhost:3000

5. ${colors.blue}Configure o webhook:${colors.reset}
   - Use a URL: http://localhost:3000/webhook/umbler
   - Ou use o túnel público se configurado

${colors.green}${colors.bold}Comandos úteis:${colors.reset}
- npm run dev          # Desenvolvimento
- npm run dev:tunnel   # Com túnel público
- npm start           # Produção
- npm test            # Testes
- npm run logs        # Ver logs

${colors.blue}${colors.bold}URLs importantes:${colors.reset}
- Backend: http://localhost:3000
- Health Check: http://localhost:3000/health
- Webhook: http://localhost:3000/webhook/umbler
- Interface: http://localhost:3000 (se disponível)

${colors.yellow}${colors.bold}⚠️  IMPORTANTE:${colors.reset}
- Configure SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY
- Execute o schema SQL no Supabase antes de usar
- Configure CORS_ORIGIN para seu frontend

${colors.green}${colors.bold}🚀 Pronto para integrar com seu frontend!${colors.reset}
`);

// 8. Verificar se tudo está funcionando
logStep('8', 'Verificando configuração...');

try {
  // Verificar se o arquivo .env foi criado
  if (fs.existsSync(envPath)) {
    log('✅ Arquivo .env criado', 'green');
  }

  // Verificar se node_modules existe
  if (fs.existsSync('node_modules')) {
    log('✅ Dependências instaladas', 'green');
  }

  // Verificar se logs existe
  if (fs.existsSync('logs')) {
    log('✅ Diretório logs criado', 'green');
  }

  log('\n🎉 Setup concluído com sucesso!', 'green');
  log('Configure as variáveis do Supabase e execute: npm run dev', 'yellow');

} catch (error) {
  log('❌ Erro na verificação final', 'red');
  console.error(error);
}