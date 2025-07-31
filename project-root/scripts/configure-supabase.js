#!/usr/bin/env node

/**
 * Script para configurar as chaves do Supabase
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Configuração do Supabase');
console.log('============================');
console.log('');

console.log('Para configurar o Supabase, você precisa:');
console.log('');
console.log('1. Acessar https://supabase.com');
console.log('2. Criar um novo projeto ou usar um existente');
console.log('3. Ir em Settings > API');
console.log('4. Copiar as seguintes informações:');
console.log('');

console.log('📋 Informações necessárias:');
console.log('- Project URL (ex: https://xyz.supabase.co)');
console.log('- anon public key');
console.log('- service_role secret key');
console.log('');

console.log('🔑 Exemplo de configuração:');
console.log('SUPABASE_URL=https://xyz.supabase.co');
console.log('SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
console.log('SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
console.log('');

console.log('💡 Dica: As chaves começam com "eyJ" e são muito longas');
console.log('');

// Verificar se o arquivo .env existe
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Verificar se as chaves estão configuradas
    const hasUrl = envContent.includes('SUPABASE_URL=') && !envContent.includes('seu-projeto.supabase.co');
    const hasAnonKey = envContent.includes('SUPABASE_ANON_KEY=') && !envContent.includes('sua_chave_anonima_aqui');
    const hasServiceKey = envContent.includes('SUPABASE_SERVICE_ROLE_KEY=') && !envContent.includes('sua_chave_service_role_aqui');
    
    if (hasUrl && hasAnonKey && hasServiceKey) {
        console.log('✅ Arquivo .env já está configurado!');
        console.log('');
        console.log('Para testar a conexão, execute:');
        console.log('npm run test:connection');
        console.log('');
    } else {
        console.log('⚠️ Arquivo .env encontrado mas precisa ser configurado');
        console.log('');
        console.log('Edite o arquivo .env e configure:');
        console.log('- SUPABASE_URL');
        console.log('- SUPABASE_ANON_KEY');
        console.log('- SUPABASE_SERVICE_ROLE_KEY');
        console.log('');
    }
} else {
    console.log('❌ Arquivo .env não encontrado');
    console.log('');
    console.log('Execute: cp .env.example .env');
    console.log('Depois edite o arquivo .env com suas configurações');
    console.log('');
}

console.log('🚀 Após configurar, execute:');
console.log('npm run setup');
console.log('npm run dev');
console.log('');
console.log('📊 Para testar se está funcionando:');
console.log('curl http://localhost:3000/health');
console.log('');