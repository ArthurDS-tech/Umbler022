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

async function createMissingTables() {
  console.log('🔧 Criando tabelas faltantes no Supabase...\n');

  const createTablesSQL = `
    -- 1. Criar tabela mensagens_webhook
    CREATE TABLE IF NOT EXISTS mensagens_webhook (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        telefone VARCHAR(20) NOT NULL,
        autor VARCHAR(20) NOT NULL CHECK (autor IN ('cliente', 'atendente')),
        mensagem TEXT NOT NULL,
        data_envio TIMESTAMP WITH TIME ZONE NOT NULL,
        umbler_message_id VARCHAR(100),
        umbler_contact_id VARCHAR(100),
        umbler_member_id VARCHAR(100),
        source VARCHAR(50),
        message_type VARCHAR(50),
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Índices para melhor performance
    CREATE INDEX IF NOT EXISTS idx_mensagens_webhook_telefone ON mensagens_webhook(telefone);
    CREATE INDEX IF NOT EXISTS idx_mensagens_webhook_autor ON mensagens_webhook(autor);
    CREATE INDEX IF NOT EXISTS idx_mensagens_webhook_data_envio ON mensagens_webhook(data_envio);
    CREATE INDEX IF NOT EXISTS idx_mensagens_webhook_umbler_message_id ON mensagens_webhook(umbler_message_id);

    -- 2. Criar tabela respostas
    CREATE TABLE IF NOT EXISTS respostas (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        telefone VARCHAR(20) NOT NULL,
        data_cliente TIMESTAMP WITH TIME ZONE NOT NULL,
        data_atendente TIMESTAMP WITH TIME ZONE NOT NULL,
        tempo_resposta_segundos DECIMAL(10,2) NOT NULL,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Índices para melhor performance
    CREATE INDEX IF NOT EXISTS idx_respostas_telefone ON respostas(telefone);
    CREATE INDEX IF NOT EXISTS idx_respostas_data_cliente ON respostas(data_cliente);
    CREATE INDEX IF NOT EXISTS idx_respostas_tempo_resposta ON respostas(tempo_resposta_segundos);

    -- 3. Criar tabela customer_response_times
    CREATE TABLE IF NOT EXISTS customer_response_times (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        contact_id UUID REFERENCES contacts(id),
        conversation_id UUID REFERENCES conversations(id),
        message_id UUID REFERENCES messages(id),
        customer_message_time TIMESTAMP WITH TIME ZONE NOT NULL,
        agent_response_time TIMESTAMP WITH TIME ZONE NOT NULL,
        response_time_seconds DECIMAL(10,2) NOT NULL,
        agent_id VARCHAR(100),
        channel VARCHAR(50),
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Índices para melhor performance
    CREATE INDEX IF NOT EXISTS idx_customer_response_times_contact_id ON customer_response_times(contact_id);
    CREATE INDEX IF NOT EXISTS idx_customer_response_times_conversation_id ON customer_response_times(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_customer_response_times_response_time ON customer_response_times(response_time_seconds);

    -- 4. Adicionar comentários para documentação
    COMMENT ON TABLE mensagens_webhook IS 'Tabela para armazenar mensagens processadas via webhook da Umbler';
    COMMENT ON TABLE respostas IS 'Tabela para armazenar tempos de resposta dos atendentes';
    COMMENT ON TABLE customer_response_times IS 'Tabela para armazenar tempos de resposta dos clientes';
  `;

  try {
    console.log('📝 Executando SQL para criar tabelas...');
    
    // Executar o SQL usando rpc (Remote Procedure Call)
    const { data, error } = await supabase.rpc('exec_sql', { sql: createTablesSQL });
    
    if (error) {
      console.log('⚠️ Erro ao executar SQL via RPC:', error.message);
      console.log('Tentando método alternativo...');
      
      // Método alternativo: executar cada comando separadamente
      const commands = createTablesSQL.split(';').filter(cmd => cmd.trim());
      
      for (const command of commands) {
        if (command.trim()) {
          try {
            const { error: cmdError } = await supabase.rpc('exec_sql', { sql: command.trim() });
            if (cmdError) {
              console.log(`⚠️ Erro no comando: ${command.substring(0, 50)}...`);
            }
          } catch (err) {
            console.log(`⚠️ Erro ao executar comando: ${err.message}`);
          }
        }
      }
    } else {
      console.log('✅ SQL executado com sucesso!');
    }

    console.log('\n🔍 Verificando se as tabelas foram criadas...');
    
    // Verificar se as tabelas foram criadas
    const tablesToCheck = ['mensagens_webhook', 'respostas', 'customer_response_times'];
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (error) {
          console.log(`❌ ${table} - Ainda não existe`);
        } else {
          console.log(`✅ ${table} - Criada com sucesso!`);
        }
      } catch (err) {
        console.log(`❌ ${table} - Erro: ${err.message}`);
      }
    }

    console.log('\n📋 INSTRUÇÕES MANUAIS:');
    console.log('Se as tabelas não foram criadas automaticamente, execute manualmente:');
    console.log('1. Acesse o dashboard do Supabase');
    console.log('2. Vá para SQL Editor');
    console.log('3. Execute o conteúdo do arquivo create-missing-tables.sql');
    console.log('4. Ou execute cada comando separadamente:');
    
    const commands = createTablesSQL.split(';').filter(cmd => cmd.trim());
    commands.forEach((cmd, index) => {
      if (cmd.trim()) {
        console.log(`   ${index + 1}. ${cmd.trim().substring(0, 100)}...`);
      }
    });

  } catch (error) {
    console.error('❌ Erro durante a criação das tabelas:', error);
    console.log('\n🔧 SOLUÇÃO MANUAL:');
    console.log('1. Acesse o dashboard do Supabase');
    console.log('2. Vá para SQL Editor');
    console.log('3. Execute o conteúdo do arquivo create-missing-tables.sql');
  }
}

// Executar criação das tabelas
createMissingTables()
  .then(() => {
    console.log('\n🎉 PROCESSO CONCLUÍDO!');
    console.log('Execute node verify-tables.js para verificar se todas as tabelas foram criadas.');
  })
  .catch(error => {
    console.error('❌ Erro:', error);
  });
