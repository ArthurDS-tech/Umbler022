const fs = require('fs');
const path = require('path');

/**
 * Script para configurar as variáveis de ambiente
 */

function setupEnvironment() {
  console.log('🔧 Configurando variáveis de ambiente...\n');
  
  const envPath = path.join(__dirname, '.env');
  const envExamplePath = path.join(__dirname, '.env.example');
  
  // Verificar se .env já existe
  if (fs.existsSync(envPath)) {
    console.log('📄 Arquivo .env já existe');
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    // Verificar variáveis obrigatórias
    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'JWT_SECRET'
    ];
    
    const missingVars = [];
    
    for (const varName of requiredVars) {
      const hasVar = lines.some(line => line.startsWith(`${varName}=`));
      if (!hasVar) {
        missingVars.push(varName);
      }
    }
    
    if (missingVars.length > 0) {
      console.log('⚠️ Variáveis faltando:', missingVars.join(', '));
      console.log('💡 Adicione as variáveis faltando ao arquivo .env');
    } else {
      console.log('✅ Todas as variáveis obrigatórias estão configuradas');
    }
    
    return;
  }
  
  // Se .env não existe, copiar do exemplo
  if (fs.existsSync(envExamplePath)) {
    console.log('📋 Copiando .env.example para .env...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Arquivo .env criado a partir do exemplo');
    console.log('\n⚠️ IMPORTANTE: Configure as variáveis do Supabase no arquivo .env');
    console.log('💡 Você precisa:');
    console.log('   1. Acessar seu projeto no Supabase');
    console.log('   2. Ir em Settings > API');
    console.log('   3. Copiar as chaves para o arquivo .env');
  } else {
    console.log('❌ Arquivo .env.example não encontrado');
    console.log('💡 Crie um arquivo .env com as seguintes variáveis:');
    console.log('');
    console.log('NODE_ENV=development');
    console.log('PORT=3000');
    console.log('SUPABASE_URL=https://seu-projeto.supabase.co');
    console.log('SUPABASE_ANON_KEY=sua-chave-anonima');
    console.log('SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role');
    console.log('JWT_SECRET=sua-chave-jwt-de-32-caracteres-minimo');
  }
}

function generateJWTSecret() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

function showInstructions() {
  console.log('\n📋 INSTRUÇÕES PARA CONFIGURAR O SUPABASE:\n');
  
  console.log('1. 🌐 Acesse o Supabase:');
  console.log('   https://supabase.com/dashboard');
  
  console.log('\n2. 📁 Crie um novo projeto ou acesse um existente');
  
  console.log('\n3. ⚙️ Vá em Settings > API');
  
  console.log('\n4. 📋 Copie as seguintes informações:');
  console.log('   - Project URL (SUPABASE_URL)');
  console.log('   - anon public key (SUPABASE_ANON_KEY)');
  console.log('   - service_role secret key (SUPABASE_SERVICE_ROLE_KEY)');
  
  console.log('\n5. 📝 Edite o arquivo .env e substitua os valores:');
  console.log('   SUPABASE_URL=https://seu-projeto.supabase.co');
  console.log('   SUPABASE_ANON_KEY=sua-chave-anonima');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role');
  
  console.log('\n6. 🔑 Gere uma chave JWT:');
  console.log(`   JWT_SECRET=${generateJWTSecret()}`);
  
  console.log('\n7. 🗄️ Execute o schema SQL no Supabase:');
  console.log('   - Vá em SQL Editor');
  console.log('   - Cole o conteúdo do arquivo schema.sql');
  console.log('   - Execute o script');
  
  console.log('\n8. ✅ Teste a configuração:');
  console.log('   node check-database.js');
}

function checkCurrentConfig() {
  console.log('\n🔍 Verificando configuração atual...\n');
  
  const envPath = path.join(__dirname, '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ Arquivo .env não encontrado');
    return false;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  const config = {};
  
  for (const line of lines) {
    if (line.includes('=') && !line.startsWith('#')) {
      const [key, value] = line.split('=', 2);
      config[key.trim()] = value.trim();
    }
  }
  
  console.log('📋 Variáveis configuradas:');
  
  const requiredVars = [
    'NODE_ENV',
    'PORT',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET'
  ];
  
  for (const varName of requiredVars) {
    const value = config[varName];
    if (value) {
      if (varName.includes('KEY') || varName.includes('SECRET')) {
        console.log(`✅ ${varName}: ${value.substring(0, 10)}...`);
      } else {
        console.log(`✅ ${varName}: ${value}`);
      }
    } else {
      console.log(`❌ ${varName}: Não configurado`);
    }
  }
  
  return true;
}

// Executar se chamado diretamente
if (require.main === module) {
  setupEnvironment();
  checkCurrentConfig();
  showInstructions();
}

module.exports = {
  setupEnvironment,
  generateJWTSecret,
  showInstructions,
  checkCurrentConfig
};