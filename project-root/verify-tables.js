const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Credenciais do Supabase não configuradas');
  console.log('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTables() {
  console.log('🔍 Verificando tabelas no Supabase...\n');

  const requiredTables = [
    'webhook_events',
    'contacts', 
    'chats',
    'messages',
    'channels',
    'sectors',
    'organization_members',
    'contact_tags',
    'agent_response_tracking',
    'mensagens_webhook', // Nova tabela
    'respostas', // Nova tabela
    'customer_response_times' // Nova tabela
  ];

  const results = {};

  for (const table of requiredTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        if (error.code === 'PGRST116') {
          results[table] = { exists: false, error: 'Tabela não existe' };
        } else {
          results[table] = { exists: false, error: error.message };
        }
      } else {
        results[table] = { exists: true, count: data.length };
      }
    } catch (err) {
      results[table] = { exists: false, error: err.message };
    }
  }

  // Exibir resultados
  console.log('📊 RESULTADO DA VERIFICAÇÃO:');
  console.log('============================\n');

  let allTablesExist = true;
  const missingTables = [];

  for (const [table, result] of Object.entries(results)) {
    if (result.exists) {
      console.log(`✅ ${table} - EXISTE`);
    } else {
      console.log(`❌ ${table} - NÃO EXISTE (${result.error})`);
      allTablesExist = false;
      missingTables.push(table);
    }
  }

  console.log('\n📋 RESUMO:');
  console.log('==========');

  if (allTablesExist) {
    console.log('🎉 TODAS AS TABELAS EXISTEM!');
    console.log('O sistema está pronto para funcionar.');
  } else {
    console.log('⚠️ TABELAS FALTANDO:');
    missingTables.forEach(table => {
      console.log(`   - ${table}`);
    });
    console.log('\n🔧 SOLUÇÃO:');
    console.log('1. Execute o script create-missing-tables.sql no SQL Editor do Supabase');
    console.log('2. Ou execute: node create-missing-tables.js');
  }

  // Verificar views também
  console.log('\n🔍 Verificando views...');
  const views = ['agent_response_stats', 'pending_customer_messages'];
  
  for (const view of views) {
    try {
      const { data, error } = await supabase
        .from(view)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ ${view} (view) - NÃO EXISTE`);
      } else {
        console.log(`✅ ${view} (view) - EXISTE`);
      }
    } catch (err) {
      console.log(`❌ ${view} (view) - ERRO: ${err.message}`);
    }
  }

  return { allTablesExist, missingTables, results };
}

// Executar verificação
verifyTables()
  .then(({ allTablesExist, missingTables }) => {
    if (allTablesExist) {
      console.log('\n🎉 VERIFICAÇÃO CONCLUÍDA COM SUCESSO!');
      console.log('Todas as tabelas necessárias estão presentes no Supabase.');
    } else {
      console.log('\n⚠️ AÇÃO NECESSÁRIA:');
      console.log('Execute o script create-missing-tables.sql no Supabase para criar as tabelas faltantes.');
    }
  })
  .catch(error => {
    console.error('❌ Erro durante a verificação:', error);
  });
