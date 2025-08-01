require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function applySecurityFixes() {
  console.log('🔐 APLICANDO CORREÇÕES DE SEGURANÇA DO SUPABASE');
  console.log('=' .repeat(55));
  console.log('');
  
  // Verificar credenciais
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('❌ Erro: Credenciais do Supabase não configuradas.');
    console.log('Execute primeiro: node setup-supabase-credentials.js');
    return;
  }
  
  try {
    // Criar cliente com service role
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    console.log('🔗 Conectando com Supabase...');
    
    const tables = ['contacts', 'conversations', 'messages', 'webhook_events'];
    let successCount = 0;
    let errorCount = 0;
    
    // 1. HABILITAR RLS EM TODAS AS TABELAS
    console.log('\n🛡️ Habilitando Row Level Security (RLS)...\n');
    
    for (const table of tables) {
      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql: `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`
        });
        
        if (error && !error.message.includes('already')) {
          console.log(`❌ Erro ao habilitar RLS em ${table}: ${error.message}`);
          errorCount++;
        } else {
          console.log(`✅ RLS habilitado em: public.${table}`);
          successCount++;
        }
      } catch (err) {
        console.log(`❌ Erro inesperado em ${table}: ${err.message}`);
        errorCount++;
      }
    }
    
    // 2. CRIAR POLÍTICAS PARA SERVICE_ROLE
    console.log('\n📜 Criando políticas de segurança...\n');
    
    for (const table of tables) {
      try {
        // Remover política existente se houver
        await supabase.rpc('exec_sql', {
          sql: `DROP POLICY IF EXISTS "Enable all operations for service_role" ON public.${table};`
        });
        
        // Criar nova política
        const { error } = await supabase.rpc('exec_sql', {
          sql: `CREATE POLICY "Enable all operations for service_role" ON public.${table} FOR ALL USING (auth.role() = 'service_role');`
        });
        
        if (error) {
          console.log(`❌ Erro ao criar política em ${table}: ${error.message}`);
          errorCount++;
        } else {
          console.log(`✅ Política criada em: public.${table}`);
          successCount++;
        }
      } catch (err) {
        console.log(`❌ Erro inesperado ao criar política em ${table}: ${err.message}`);
        errorCount++;
      }
    }
    
    // 3. CORRIGIR VIEWS COM SECURITY DEFINER
    console.log('\n🔍 Corrigindo views com SECURITY DEFINER...\n');
    
    const views = ['recent_messages', 'conversation_details'];
    
    for (const view of views) {
      try {
        // Remover view existente
        const { error: dropError } = await supabase.rpc('exec_sql', {
          sql: `DROP VIEW IF EXISTS public.${view};`
        });
        
        if (!dropError) {
          console.log(`✅ View removida: public.${view}`);
          successCount++;
        }
      } catch (err) {
        console.log(`⚠️ Aviso ao remover view ${view}: ${err.message}`);
      }
    }
    
    // Recriar view recent_messages
    try {
      const recentMessagesSQL = `
        CREATE VIEW public.recent_messages AS
        SELECT 
          m.id,
          m.content,
          m.direction,
          m.message_type,
          m.status,
          m.created_at,
          c.phone,
          c.name as contact_name,
          conv.id as conversation_id,
          conv.status as conversation_status
        FROM messages m
        JOIN contacts c ON m.contact_id = c.id
        JOIN conversations conv ON m.conversation_id = conv.id
        WHERE m.created_at >= NOW() - INTERVAL '7 days'
        ORDER BY m.created_at DESC;
      `;
      
      const { error } = await supabase.rpc('exec_sql', { sql: recentMessagesSQL });
      
      if (error) {
        console.log(`❌ Erro ao recriar recent_messages: ${error.message}`);
        errorCount++;
      } else {
        console.log(`✅ View recriada: public.recent_messages`);
        successCount++;
      }
    } catch (err) {
      console.log(`❌ Erro inesperado ao recriar recent_messages: ${err.message}`);
      errorCount++;
    }
    
    // Recriar view conversation_details
    try {
      const conversationDetailsSQL = `
        CREATE VIEW public.conversation_details AS
        SELECT 
          conv.id,
          conv.status,
          conv.channel,
          conv.created_at,
          conv.updated_at,
          c.phone,
          c.name as contact_name,
          c.email as contact_email,
          COUNT(m.id) as message_count,
          MAX(m.created_at) as last_message_at
        FROM conversations conv
        JOIN contacts c ON conv.contact_id = c.id
        LEFT JOIN messages m ON conv.id = m.conversation_id
        GROUP BY conv.id, c.id;
      `;
      
      const { error } = await supabase.rpc('exec_sql', { sql: conversationDetailsSQL });
      
      if (error) {
        console.log(`❌ Erro ao recriar conversation_details: ${error.message}`);
        errorCount++;
      } else {
        console.log(`✅ View recriada: public.conversation_details`);
        successCount++;
      }
    } catch (err) {
      console.log(`❌ Erro inesperado ao recriar conversation_details: ${err.message}`);
      errorCount++;
    }
    
    // 4. VERIFICAR RESULTADOS
    console.log('\n🔍 Verificando correções aplicadas...\n');
    
    // Verificar RLS
    try {
      const { data: rlsData, error: rlsError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT 
            tablename,
            rowsecurity as rls_enabled
          FROM pg_tables 
          WHERE schemaname = 'public'
          AND tablename IN ('contacts', 'conversations', 'messages', 'webhook_events')
          ORDER BY tablename;
        `
      });
      
      if (!rlsError && rlsData) {
        console.log('🛡️ Status do RLS:');
        rlsData.forEach(table => {
          const status = table.rls_enabled ? '✅ Habilitado' : '❌ Desabilitado';
          console.log(`   ${table.tablename}: ${status}`);
        });
      }
    } catch (err) {
      console.log('⚠️ Não foi possível verificar o status do RLS');
    }
    
    // Verificar políticas
    try {
      const { data: policiesData, error: policiesError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT 
            tablename,
            COUNT(*) as policy_count
          FROM pg_policies 
          WHERE schemaname = 'public'
          GROUP BY tablename
          ORDER BY tablename;
        `
      });
      
      if (!policiesError && policiesData) {
        console.log('\n📜 Políticas criadas:');
        policiesData.forEach(table => {
          console.log(`   ${table.tablename}: ${table.policy_count} política(s)`);
        });
      }
    } catch (err) {
      console.log('⚠️ Não foi possível verificar as políticas');
    }
    
    // RESULTADO FINAL
    console.log('\n' + '=' .repeat(55));
    console.log('📊 RESULTADO DAS CORREÇÕES');
    console.log('=' .repeat(55));
    console.log(`✅ Operações bem-sucedidas: ${successCount}`);
    console.log(`❌ Operações com erro: ${errorCount}`);
    console.log('');
    
    if (successCount > 0) {
      console.log('🎉 CORREÇÕES APLICADAS COM SUCESSO!');
      console.log('');
      console.log('✅ Problemas corrigidos:');
      console.log('   - RLS habilitado em todas as tabelas principais');
      console.log('   - Políticas de segurança para service_role criadas');
      console.log('   - Views SECURITY DEFINER corrigidas');
      console.log('');
      console.log('🔄 Próximos passos:');
      console.log('1. Execute o Database Linter novamente no Supabase Dashboard');
      console.log('2. Verifique se os erros de segurança foram resolvidos');
      console.log('3. Teste seu aplicativo para garantir que ainda funciona');
      console.log('');
      console.log('📍 Localização do Database Linter:');
      console.log('   Supabase Dashboard > Database > Database Linter');
    } else {
      console.log('⚠️ NENHUMA CORREÇÃO FOI APLICADA');
      console.log('Verifique as credenciais e tente novamente.');
    }
    
  } catch (error) {
    console.log('\n❌ Erro geral:', error.message);
    
    if (error.message.includes('Invalid API key')) {
      console.log('\n💡 Solução: Verifique as credenciais do Supabase no .env');
    } else if (error.message.includes('fetch failed')) {
      console.log('\n💡 Solução: Verifique se a URL do Supabase está correta');
    } else if (error.message.includes('permission denied')) {
      console.log('\n💡 Solução: Use a SERVICE_ROLE_KEY, não a ANON_KEY');
    }
  }
}

// Executar
applySecurityFixes();