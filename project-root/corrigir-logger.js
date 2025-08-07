const fs = require('fs');
const path = require('path');

console.log('🔧 Corrigindo logger...');

const loggerPath = path.join(__dirname, 'src', 'utils', 'logger.js');

try {
  let content = fs.readFileSync(loggerPath, 'utf8');
  
  // Aplicar todas as correções necessárias
  content = content
    .replace(/environment\.paths\.logs/g, 'path.dirname(environment.logging.file || "./logs/app.log")')
    .replace(/environment\.logging\.prettyLogs/g, 'false');
  
  fs.writeFileSync(loggerPath, content);
  console.log('✅ Logger corrigido!');
  console.log('Execute: npm run dev');
} catch (error) {
  console.error('❌ Erro:', error.message);
}