const { supabase, testConnection } = require('./src/config/supabase');
const logger = require('./src/utils/logger');

async function testSupabaseConnection() {
  try {
    console.log('🔍 Testando conexão com Supabase...');
    
    if (!supabase) {
      console.log('❌ Supabase não configurado');
      console.log('Configure as variáveis de ambiente:');
      console.log('- SUPABASE_URL');
      console.log('- SUPABASE_SERVICE_ROLE_KEY');
      return false;
    }
    
    const isConnected = await testConnection();
    
    if (isConnected) {
      console.log('✅ Conexão com Supabase estabelecida');
      
      // Testar inserção
      console.log('🧪 Testando inserção...');
      const testData = {
        event_type: 'test',
        event_date: new Date().toISOString(),
        payload: { test: true },
        processed: false
      };
      
      const { data, error } = await supabase
        .from('webhook_events')
        .insert(testData)
        .select()
        .single();
      
      if (error) {
        console.log('❌ Erro na inserção:', error.message);
        return false;
      }
      
      console.log('✅ Inserção testada com sucesso');
      
      // Limpar dados de teste
      await supabase
        .from('webhook_events')
        .delete()
        .eq('event_type', 'test');
      
      console.log('✅ Dados de teste removidos');
      return true;
      
    } else {
      console.log('❌ Falha na conexão com Supabase');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Erro no teste:', error.message);
    return false;
  }
}

// Executar teste
testSupabaseConnection().then(success => {
  if (success) {
    console.log('🎉 Teste do Supabase concluído com sucesso!');
    process.exit(0);
  } else {
    console.log('💥 Teste do Supabase falhou!');
    process.exit(1);
  }
});