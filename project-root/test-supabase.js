require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Testando conexão com Supabase...\n');

// Verificar variáveis de ambiente
console.log('📋 Variáveis de ambiente:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Configurado' : '❌ Não configurado');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Configurado' : '❌ Não configurado');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configurado' : '❌ Não configurado');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('\n❌ Erro: Variáveis do Supabase não configuradas!');
  console.log('📝 Configure as variáveis no arquivo .env');
  process.exit(1);
}

// Criar cliente Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testConnection() {
  try {
    console.log('\n🔄 Testando conexão...');
    
    // Teste 1: Verificar se consegue acessar a tabela contacts
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('count')
      .limit(1);
    
    if (contactsError) {
      console.log('❌ Erro ao acessar tabela contacts:', contactsError.message);
      return false;
    }
    
    console.log('✅ Conexão com Supabase estabelecida!');
    console.log('✅ Tabela contacts acessível');
    
    // Teste 2: Tentar inserir um registro de teste
    console.log('\n🔄 Testando inserção...');
    
    const testContact = {
      phone: '5511999999999',
      name: 'Teste Webhook',
      email: 'teste@webhook.com',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: insertResult, error: insertError } = await supabase
      .from('contacts')
      .insert(testContact)
      .select()
      .single();
    
    if (insertError) {
      console.log('❌ Erro ao inserir teste:', insertError.message);
      return false;
    }
    
    console.log('✅ Inserção de teste realizada com sucesso!');
    console.log('📊 ID do contato criado:', insertResult.id);
    
    // Teste 3: Limpar o registro de teste
    console.log('\n🔄 Limpando registro de teste...');
    
    const { error: deleteError } = await supabase
      .from('contacts')
      .delete()
      .eq('id', insertResult.id);
    
    if (deleteError) {
      console.log('⚠️ Erro ao limpar teste:', deleteError.message);
    } else {
      console.log('✅ Registro de teste removido');
    }
    
    console.log('\n🎉 Todos os testes passaram! O Supabase está funcionando corretamente.');
    return true;
    
  } catch (error) {
    console.log('❌ Erro geral:', error.message);
    return false;
  }
}

// Executar teste
testConnection().then(success => {
  if (success) {
    console.log('\n✅ Sistema pronto para receber webhooks!');
  } else {
    console.log('\n❌ Problemas encontrados. Verifique as configurações.');
  }
  process.exit(success ? 0 : 1);
});