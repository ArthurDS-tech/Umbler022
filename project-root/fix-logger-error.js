#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRIGINDO ERRO DO LOGGER...');

const loggerPath = path.join(__dirname, 'src', 'utils', 'logger.js');

if (!fs.existsSync(loggerPath)) {
  console.log('❌ Arquivo logger.js não encontrado:', loggerPath);
  process.exit(1);
}

// Ler o arquivo atual
let content = fs.readFileSync(loggerPath, 'utf8');

console.log('📖 Lendo arquivo logger.js...');

// Verificar se o erro ainda existe
if (content.includes('environment.paths.logs')) {
  console.log('❌ Encontrado erro: environment.paths.logs');
  
  // Aplicar correção
  content = content.replace(
    'const logsDir = environment.paths.logs;',
    'const logsDir = path.dirname(environment.logging.file);'
  );
  
  console.log('✅ Aplicando correção...');
} else if (content.includes('path.dirname(environment.logging.file)')) {
  console.log('✅ Correção já aplicada');
} else {
  console.log('⚠️ Estrutura do arquivo diferente do esperado');
}

// Verificar e corrigir prettyLogs também
if (content.includes('environment.logging.prettyLogs')) {
  console.log('❌ Encontrado erro: environment.logging.prettyLogs');
  
  content = content.replace(
    'if (environment.isDevelopment() || environment.logging.prettyLogs) {',
    'if (environment.isDevelopment()) {'
  );
  
  console.log('✅ Corrigindo prettyLogs...');
}

// Salvar o arquivo corrigido
fs.writeFileSync(loggerPath, content);

console.log('💾 Arquivo logger.js corrigido!');
console.log('');
console.log('🚀 Agora execute: npm run dev');
console.log('');
console.log('✅ O servidor deve iniciar sem erros!');