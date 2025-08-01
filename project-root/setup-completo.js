const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function runScript(scriptName, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔄 ${description}...`);
    console.log('=' .repeat(50));
    
    const child = spawn('node', [scriptName], {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${description} - Concluído`);
        resolve();
      } else {
        console.log(`❌ ${description} - Falhou (código: ${code})`);
        reject(new Error(`Script ${scriptName} falhou`));
      }
    });
    
    child.on('error', (error) => {
      console.log(`❌ Erro ao executar ${scriptName}:`, error.message);
      reject(error);
    });
  });
}

async function setupCompleto() {
  console.log('🚀 CONFIGURAÇÃO COMPLETA DO SUPABASE');
  console.log('=' .repeat(60));
  console.log('Este script irá configurar automaticamente todo o seu ambiente Supabase.');
  console.log('');
  
  try {
    // Verificar se o arquivo .env já existe e tem credenciais válidas
    const envPath = path.join(__dirname, '.env');
    let needsCredentials = true;
    
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const hasUrl = envContent.includes('SUPABASE_URL=https://') && !envContent.includes('seu-projeto.supabase.co');
      const hasAnonKey = envContent.includes('SUPABASE_ANON_KEY=eyJ');
      const hasServiceKey = envContent.includes('SUPABASE_SERVICE_ROLE_KEY=eyJ');
      
      if (hasUrl && hasAnonKey && hasServiceKey) {
        console.log('✅ Credenciais do Supabase já configuradas');
        needsCredentials = false;
      }
    }
    
    // Passo 1: Configurar credenciais (se necessário)
    if (needsCredentials) {
      console.log('\n1️⃣ CONFIGURAÇÃO DAS CREDENCIAIS');
      console.log('Você precisará inserir as credenciais do seu projeto Supabase.');
      await runScript('setup-supabase-credentials.js', 'Configurando credenciais do Supabase');
    } else {
      console.log('\n1️⃣ CREDENCIAIS - ✅ Já configuradas');
    }
    
    // Passo 2: Testar conexão
    console.log('\n2️⃣ TESTE DE CONEXÃO');
    await runScript('test-supabase-connection.js', 'Testando conexão com Supabase');
    
    // Passo 3: Configurar tabelas
    console.log('\n3️⃣ CONFIGURAÇÃO DAS TABELAS');
    await runScript('setup-database-tables.js', 'Criando tabelas no Supabase');
    
    // Passo 4: Testar inserção de dados
    console.log('\n4️⃣ TESTE DE INSERÇÃO');
    await runScript('test-webhook-insertion.js', 'Testando inserção de dados via webhook');
    
    // Sucesso
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('=' .repeat(60));
    console.log('');
    console.log('✅ Credenciais configuradas');
    console.log('✅ Conexão com Supabase estabelecida');
    console.log('✅ Tabelas criadas/verificadas');
    console.log('✅ Sistema de inserção funcionando');
    console.log('');
    console.log('🚀 Próximos passos:');
    console.log('1. Inicie o servidor: npm run dev');
    console.log('2. Teste o webhook: POST http://localhost:3000/webhook/umbler');
    console.log('3. Verifique os dados no Supabase Dashboard');
    console.log('');
    console.log('📚 Documentação adicional:');
    console.log('- CONFIGURACAO_SUPABASE.md - Guia detalhado');
    console.log('- README.md - Documentação completa');
    console.log('');
    
  } catch (error) {
    console.log('\n' + '=' .repeat(60));
    console.log('❌ CONFIGURAÇÃO FALHOU');
    console.log('=' .repeat(60));
    console.log('');
    console.log('Erro:', error.message);
    console.log('');
    console.log('🔧 Soluções possíveis:');
    console.log('1. Verifique suas credenciais do Supabase');
    console.log('2. Certifique-se de que o projeto Supabase está ativo');
    console.log('3. Execute os scripts individualmente para diagnóstico:');
    console.log('   - node setup-supabase-credentials.js');
    console.log('   - node test-supabase-connection.js');
    console.log('   - node setup-database-tables.js');
    console.log('   - node test-webhook-insertion.js');
    console.log('');
    console.log('📖 Consulte CONFIGURACAO_SUPABASE.md para mais detalhes');
    console.log('');
  }
}

// Executar configuração completa
setupCompleto();