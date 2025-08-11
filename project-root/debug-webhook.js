const { createClient } = require('@supabase/supabase-js');
const logger = require('./src/utils/logger');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Credenciais do Supabase não configuradas');
  console.log('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugWebhookProcessing() {
  console.log('🔍 DIAGNÓSTICO DETALHADO DO WEBHOOK');
  console.log('=====================================\n');

  // 1. Verificar configuração do Supabase
  console.log('1️⃣ Verificando configuração do Supabase...');
  try {
    const { data, error } = await supabase
      .from('webhook_events')
      .select('count')
      .limit(1);

    if (error) {
      console.log('❌ Erro na conexão com Supabase:', error.message);
      return;
    } else {
      console.log('✅ Conexão com Supabase OK');
    }
  } catch (err) {
    console.log('❌ Erro ao conectar com Supabase:', err.message);
    return;
  }

  // 2. Verificar se o servidor está rodando
  console.log('\n2️⃣ Verificando se o servidor está rodando...');
  try {
    const axios = require('axios');
    const response = await axios.get('http://localhost:3000/health', { timeout: 5000 });
    console.log('✅ Servidor está rodando');
    console.log('📊 Status:', response.data);
  } catch (err) {
    console.log('❌ Servidor não está rodando ou não responde');
    console.log('💡 Execute: npm run dev');
    return;
  }

  // 3. Testar inserção direta no Supabase
  console.log('\n3️⃣ Testando inserção direta no Supabase...');
  try {
    const testData = {
      event_type: 'test',
      event_data: { test: true },
      processed: false,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('webhook_events')
      .insert(testData)
      .select();

    if (error) {
      console.log('❌ Erro ao inserir teste:', error.message);
    } else {
      console.log('✅ Inserção direta funcionando');
      console.log('📝 ID inserido:', data[0].id);
    }
  } catch (err) {
    console.log('❌ Erro na inserção direta:', err.message);
  }

  // 4. Verificar logs do servidor
  console.log('\n4️⃣ Verificando logs do servidor...');
  console.log('💡 Verifique o terminal onde o servidor está rodando');
  console.log('💡 Procure por mensagens como:');
  console.log('   - "🔄 Iniciando processamento do webhook"');
  console.log('   - "✅ Webhook processado com sucesso"');
  console.log('   - "❌ Erro no processamento do webhook"');

  // 5. Verificar estrutura das tabelas
  console.log('\n5️⃣ Verificando estrutura das tabelas...');
  const tables = ['webhook_events', 'contacts', 'chats', 'messages', 'mensagens_webhook'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: Acessível`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }

  // 6. Verificar configuração do .env
  console.log('\n6️⃣ Verificando configuração do .env...');
  console.log('SUPABASE_URL:', supabaseUrl ? '✅ Configurado' : '❌ Não configurado');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅ Configurado' : '❌ Não configurado');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Configurado' : '❌ Não configurado');
  console.log('WEBHOOK_SECRET:', process.env.WEBHOOK_SECRET ? '✅ Configurado' : '❌ Não configurado');

  // 7. Testar webhook real
  console.log('\n7️⃣ Testando webhook real...');
  console.log('💡 Execute: node test-webhook-real.js');
  console.log('💡 Isso enviará um webhook real para o servidor');

  // 8. Verificar se há dados recentes
  console.log('\n8️⃣ Verificando dados recentes...');
  try {
    const { data: recentEvents, error } = await supabase
      .from('webhook_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.log('❌ Erro ao buscar eventos recentes:', error.message);
    } else {
      console.log(`📊 ${recentEvents.length} eventos recentes encontrados`);
      if (recentEvents.length > 0) {
        console.log('📝 Último evento:', {
          id: recentEvents[0].id,
          event_type: recentEvents[0].event_type,
          processed: recentEvents[0].processed,
          created_at: recentEvents[0].created_at
        });
      }
    }
  } catch (err) {
    console.log('❌ Erro ao verificar dados recentes:', err.message);
  }

  // 9. Verificar se há erros no código
  console.log('\n9️⃣ Verificando código...');
  console.log('💡 Verifique se há erros de sintaxe:');
  console.log('   - node -c src/services/webhookService.js');
  console.log('   - node -c src/services/mensagensWebhookService.js');
  console.log('   - node -c src/config/supabase.js');

  // 10. Sugestões de solução
  console.log('\n🔧 SUGESTÕES DE SOLUÇÃO:');
  console.log('==========================');
  console.log('1. Verifique se o servidor está rodando: npm run dev');
  console.log('2. Execute o teste real: node test-webhook-real.js');
  console.log('3. Verifique os logs do servidor no terminal');
  console.log('4. Confirme as credenciais do Supabase no .env');
  console.log('5. Teste a conexão: node test-supabase-connection.js');
  console.log('6. Verifique se todas as tabelas existem: node verify-tables.js');

  console.log('\n📋 PRÓXIMOS PASSOS:');
  console.log('====================');
  console.log('1. Execute: node test-webhook-real.js');
  console.log('2. Verifique os logs do servidor');
  console.log('3. Se houver erros, execute: node debug-webhook.js novamente');
}

// Executar diagnóstico
debugWebhookProcessing()
  .then(() => {
    console.log('\n🎉 DIAGNÓSTICO CONCLUÍDO!');
  })
  .catch(error => {
    console.error('❌ Erro durante o diagnóstico:', error);
  });
