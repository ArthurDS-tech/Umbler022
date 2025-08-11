const fs = require('fs');
const path = require('path');

/**
 * Script para verificar o status atual do projeto
 */

console.log('📊 Verificando status do projeto...\n');

// 1. Verificar estrutura do projeto
function checkProjectStructure() {
  console.log('1️⃣ Verificando estrutura do projeto...');
  
  const requiredDirs = [
    'src',
    'src/config',
    'src/controllers',
    'src/middleware',
    'src/routes',
    'src/services',
    'src/utils',
    'logs'
  ];
  
  const requiredFiles = [
    'package.json',
    'src/app.js',
    'src/config/environment.js',
    'src/config/database.js',
    'src/config/supabase.js',
    'src/controllers/webhookController.js',
    'src/services/webhookService.js',
    'src/services/mensagensWebhookService.js',
    'src/utils/logger.js'
  ];
  
  let dirsOk = 0;
  let filesOk = 0;
  
  requiredDirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (fs.existsSync(dirPath)) {
      console.log(`✅ ${dir}`);
      dirsOk++;
    } else {
      console.log(`❌ ${dir} (não encontrado)`);
    }
  });
  
  console.log('');
  
  requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file}`);
      filesOk++;
    } else {
      console.log(`❌ ${file} (não encontrado)`);
    }
  });
  
  console.log(`\n📊 Estrutura: ${dirsOk}/${requiredDirs.length} diretórios, ${filesOk}/${requiredFiles.length} arquivos`);
  
  return dirsOk === requiredDirs.length && filesOk === requiredFiles.length;
}

// 2. Verificar configurações
function checkConfigurations() {
  console.log('\n2️⃣ Verificando configurações...');
  
  // Verificar .env
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    const hasSupabaseUrl = envContent.includes('SUPABASE_URL=');
    const hasSupabaseKey = envContent.includes('SUPABASE_SERVICE_ROLE_KEY=');
    const hasDatabaseUrl = envContent.includes('DATABASE_URL=');
    const hasWebhookSecret = envContent.includes('WEBHOOK_SECRET=');
    
    console.log(`✅ Arquivo .env encontrado`);
    console.log(`- SUPABASE_URL: ${hasSupabaseUrl ? '✅' : '❌'}`);
    console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${hasSupabaseKey ? '✅' : '❌'}`);
    console.log(`- DATABASE_URL: ${hasDatabaseUrl ? '✅' : '❌'}`);
    console.log(`- WEBHOOK_SECRET: ${hasWebhookSecret ? '✅' : '❌'}`);
    
    return hasSupabaseUrl && hasSupabaseKey && hasDatabaseUrl && hasWebhookSecret;
  } else {
    console.log('❌ Arquivo .env não encontrado');
    return false;
  }
}

// 3. Verificar dependências
function checkDependencies() {
  console.log('\n3️⃣ Verificando dependências...');
  
  const packagePath = path.join(__dirname, 'package.json');
  if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    const requiredDeps = [
      'express',
      '@supabase/supabase-js',
      'pg',
      'dotenv',
      'cors',
      'helmet',
      'express-rate-limit',
      'uuid'
    ];
    
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    let depsOk = 0;
    
    requiredDeps.forEach(dep => {
      if (deps[dep]) {
        console.log(`✅ ${dep} (${deps[dep]})`);
        depsOk++;
      } else {
        console.log(`❌ ${dep} (não encontrado)`);
      }
    });
    
    console.log(`\n📊 Dependências: ${depsOk}/${requiredDeps.length} instaladas`);
    
    return depsOk === requiredDeps.length;
  } else {
    console.log('❌ package.json não encontrado');
    return false;
  }
}

// 4. Verificar scripts de teste
function checkTestScripts() {
  console.log('\n4️⃣ Verificando scripts de teste...');
  
  const testScripts = [
    'test-supabase-connection.js',
    'test-webhook-supabase.js',
    'setup-supabase-config.js'
  ];
  
  let scriptsOk = 0;
  
  testScripts.forEach(script => {
    const scriptPath = path.join(__dirname, script);
    if (fs.existsSync(scriptPath)) {
      console.log(`✅ ${script}`);
      scriptsOk++;
    } else {
      console.log(`❌ ${script} (não encontrado)`);
    }
  });
  
  console.log(`\n📊 Scripts de teste: ${scriptsOk}/${testScripts.length} encontrados`);
  
  return scriptsOk === testScripts.length;
}

// 5. Verificar arquivos removidos
function checkCleanup() {
  console.log('\n5️⃣ Verificando limpeza do projeto...');
  
  const removedFiles = [
    'frontend',
    'Umbler-2',
    'GUIA_DEPLOY_COMPLETO.md',
    'GUIA-INTEGRACAO-FRONTEND.md',
    'RESUMO_FRONTEND_COMPLETO.md',
    'ERRO_CORRIGIDO_README.md',
    'PROBLEMA_IDENTIFICADO.md',
    'RESOLVER_ERRO_SUPABASE.md',
    'test-mensagens-webhook.js',
    'testar-webhook-completo.js',
    'setup-supabase-complete.js',
    'fix-supabase-configuration.js'
  ];
  
  let removedOk = 0;
  
  removedFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      console.log(`✅ ${file} (removido)`);
      removedOk++;
    } else {
      console.log(`❌ ${file} (ainda existe)`);
    }
  });
  
  console.log(`\n📊 Limpeza: ${removedOk}/${removedFiles.length} arquivos removidos`);
  
  return removedOk === removedFiles.length;
}

// 6. Gerar relatório final
function generateReport() {
  console.log('\n📋 RELATÓRIO FINAL');
  console.log('==================');
  
  const structureOk = checkProjectStructure();
  const configOk = checkConfigurations();
  const depsOk = checkDependencies();
  const scriptsOk = checkTestScripts();
  const cleanupOk = checkCleanup();
  
  console.log('\n📊 RESUMO:');
  console.log(`- Estrutura do projeto: ${structureOk ? '✅' : '❌'}`);
  console.log(`- Configurações: ${configOk ? '✅' : '❌'}`);
  console.log(`- Dependências: ${depsOk ? '✅' : '❌'}`);
  console.log(`- Scripts de teste: ${scriptsOk ? '✅' : '❌'}`);
  console.log(`- Limpeza: ${cleanupOk ? '✅' : '❌'}`);
  
  const totalOk = [structureOk, configOk, depsOk, scriptsOk, cleanupOk].filter(Boolean).length;
  const total = 5;
  
  console.log(`\n🎯 PROGRESSO: ${totalOk}/${total} (${Math.round(totalOk/total*100)}%)`);
  
  if (totalOk === total) {
    console.log('\n🎉 PROJETO CONFIGURADO COM SUCESSO!');
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. Configure as credenciais do Supabase no arquivo .env');
    console.log('2. Execute: npm install (se necessário)');
    console.log('3. Execute: node test-supabase-connection.js');
    console.log('4. Execute: npm start');
    console.log('5. Execute: node test-webhook-supabase.js');
  } else {
    console.log('\n⚠️  ALGUNS PROBLEMAS ENCONTRADOS:');
    
    if (!structureOk) console.log('- Verifique a estrutura do projeto');
    if (!configOk) console.log('- Configure o arquivo .env');
    if (!depsOk) console.log('- Execute: npm install');
    if (!scriptsOk) console.log('- Execute: node setup-supabase-config.js');
    if (!cleanupOk) console.log('- Execute: node fix-supabase-and-cleanup.js');
  }
  
  return totalOk === total;
}

// Executar verificação
generateReport();
