const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupSupabaseCredentials() {
  console.log('🚀 Configuração das Credenciais do Supabase');
  console.log('=' .repeat(50));
  console.log('');
  console.log('Este script irá ajudá-lo a configurar as credenciais do Supabase.');
  console.log('Você precisará das seguintes informações do seu projeto Supabase:');
  console.log('');
  console.log('1. 📍 Project URL (ex: https://abcdefg.supabase.co)');
  console.log('2. 🔑 anon/public key (chave longa que começa com eyJ...)');
  console.log('3. 🔐 service_role key (chave longa que começa com eyJ...)');
  console.log('');
  console.log('💡 Para obter essas informações:');
  console.log('   1. Acesse https://supabase.com/dashboard');
  console.log('   2. Selecione seu projeto');
  console.log('   3. Vá em Settings > API');
  console.log('');
  
  const continuar = await question('Deseja continuar? (s/n): ');
  if (continuar.toLowerCase() !== 's' && continuar.toLowerCase() !== 'sim') {
    console.log('❌ Configuração cancelada.');
    rl.close();
    return;
  }
  
  console.log('');
  console.log('📝 Insira as credenciais do seu projeto Supabase:');
  console.log('');
  
  // Obter URL do projeto
  let supabaseUrl = '';
  while (!supabaseUrl || !supabaseUrl.startsWith('https://') || !supabaseUrl.includes('supabase.co')) {
    supabaseUrl = await question('🌐 Project URL (https://seuprojetoid.supabase.co): ');
    if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('supabase.co')) {
      console.log('❌ URL inválida. Deve começar com https:// e conter supabase.co');
    }
  }
  
  // Obter chave anônima
  let anonKey = '';
  while (!anonKey || !anonKey.startsWith('eyJ')) {
    anonKey = await question('🔑 Anon/Public Key (eyJ...): ');
    if (!anonKey.startsWith('eyJ')) {
      console.log('❌ Chave inválida. Deve começar com "eyJ"');
    }
  }
  
  // Obter chave service role
  let serviceRoleKey = '';
  while (!serviceRoleKey || !serviceRoleKey.startsWith('eyJ')) {
    serviceRoleKey = await question('🔐 Service Role Key (eyJ...): ');
    if (!serviceRoleKey.startsWith('eyJ')) {
      console.log('❌ Chave inválida. Deve começar com "eyJ"');
    }
  }
  
  console.log('');
  console.log('📋 Resumo das configurações:');
  console.log('URL:', supabaseUrl);
  console.log('Anon Key:', anonKey.substring(0, 20) + '...');
  console.log('Service Role Key:', serviceRoleKey.substring(0, 20) + '...');
  console.log('');
  
  const confirmar = await question('✅ Confirma essas configurações? (s/n): ');
  if (confirmar.toLowerCase() !== 's' && confirmar.toLowerCase() !== 'sim') {
    console.log('❌ Configuração cancelada.');
    rl.close();
    return;
  }
  
  try {
    // Ler arquivo .env atual
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    } else {
      // Se não existe .env, usar o .env.example como base
      const envExamplePath = path.join(__dirname, '.env.example');
      if (fs.existsSync(envExamplePath)) {
        envContent = fs.readFileSync(envExamplePath, 'utf8');
      }
    }
    
    // Atualizar as credenciais no conteúdo
    envContent = envContent.replace(
      /SUPABASE_URL=.*/,
      `SUPABASE_URL=${supabaseUrl}`
    );
    
    envContent = envContent.replace(
      /SUPABASE_ANON_KEY=.*/,
      `SUPABASE_ANON_KEY=${anonKey}`
    );
    
    envContent = envContent.replace(
      /SUPABASE_SERVICE_ROLE_KEY=.*/,
      `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`
    );
    
    // Salvar arquivo .env
    fs.writeFileSync(envPath, envContent);
    
    console.log('');
    console.log('✅ Credenciais configuradas com sucesso!');
    console.log('📁 Arquivo .env atualizado');
    console.log('');
    console.log('🔄 Próximos passos:');
    console.log('1. Execute: node test-supabase-connection.js');
    console.log('2. Se necessário, execute o schema.sql no Supabase');
    console.log('3. Teste a inserção: node test-webhook-insertion.js');
    console.log('4. Inicie o servidor: npm run dev');
    console.log('');
    
  } catch (error) {
    console.log('❌ Erro ao salvar as configurações:', error.message);
  }
  
  rl.close();
}

// Executar configuração
setupSupabaseCredentials().catch(error => {
  console.error('❌ Erro inesperado:', error.message);
  rl.close();
});