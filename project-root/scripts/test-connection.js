#!/usr/bin/env node

/**
 * Script para testar a conexão com o Supabase
 */

const { supabaseAdmin, supabaseClient } = require('../src/config/database');

async function testConnection() {
    console.log('🔍 Testando conexão com Supabase...');
    console.log('');
    
    try {
        // Teste com cliente anônimo
        console.log('📡 Testando cliente anônimo...');
        const { data: anonData, error: anonError } = await supabaseClient
            .from('contacts')
            .select('count')
            .limit(1);
        
        if (anonError) {
            console.log('❌ Erro com cliente anônimo:', anonError.message);
        } else {
            console.log('✅ Cliente anônimo funcionando');
        }
        
        // Teste com cliente admin
        console.log('📡 Testando cliente admin...');
        const { data: adminData, error: adminError } = await supabaseAdmin
            .from('contacts')
            .select('count')
            .limit(1);
        
        if (adminError) {
            console.log('❌ Erro com cliente admin:', adminError.message);
        } else {
            console.log('✅ Cliente admin funcionando');
        }
        
        // Teste de inserção (apenas admin)
        console.log('📡 Testando inserção...');
        const testData = {
            phone: '+5511999999999',
            name: 'Teste Conexão',
            created_at: new Date().toISOString()
        };
        
        const { data: insertData, error: insertError } = await supabaseAdmin
            .from('contacts')
            .insert(testData)
            .select();
        
        if (insertError) {
            console.log('❌ Erro na inserção:', insertError.message);
        } else {
            console.log('✅ Inserção funcionando');
            
            // Limpar dados de teste
            if (insertData && insertData[0]) {
                await supabaseAdmin
                    .from('contacts')
                    .delete()
                    .eq('id', insertData[0].id);
                console.log('🧹 Dados de teste removidos');
            }
        }
        
        console.log('');
        console.log('🎉 Teste de conexão concluído!');
        
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
        console.log('');
        console.log('🔧 Verifique:');
        console.log('1. Se as chaves do Supabase estão corretas');
        console.log('2. Se o projeto está ativo');
        console.log('3. Se as tabelas foram criadas');
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    testConnection();
}

module.exports = { testConnection };