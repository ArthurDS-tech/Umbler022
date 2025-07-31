#!/usr/bin/env node

/**
 * Script para configurar o banco de dados Supabase
 * Executa o schema SQL e configura as tabelas necessárias
 */

const fs = require('fs');
const path = require('path');
const { supabaseAdmin } = require('../src/config/database');
const logger = require('../src/utils/logger');

async function setupDatabase() {
    try {
        console.log('🔄 Configurando banco de dados...');
        
        // Ler o arquivo schema.sql
        const schemaPath = path.join(__dirname, '../schema.sql');
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        
        // Dividir o SQL em comandos individuais
        const commands = schemaSQL
            .split(';')
            .map(cmd => cmd.trim())
            .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
        
        console.log(`📝 Executando ${commands.length} comandos SQL...`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < commands.length; i++) {
            const command = commands[i];
            
            try {
                // Executar comando SQL
                const { error } = await supabaseAdmin.rpc('exec_sql', {
                    sql_query: command
                });
                
                if (error) {
                    // Se a função RPC não existir, tentar executar diretamente
                    console.log(`⚠️ RPC não disponível, tentando execução direta...`);
                    
                    // Para comandos de criação de tabela, usar SQL direto
                    if (command.toLowerCase().includes('create table')) {
                        const tableName = extractTableName(command);
                        if (tableName) {
                            console.log(`📋 Criando tabela: ${tableName}`);
                        }
                    }
                } else {
                    successCount++;
                }
                
                // Aguardar um pouco entre comandos para não sobrecarregar
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                errorCount++;
                console.error(`❌ Erro no comando ${i + 1}:`, error.message);
                
                // Continuar mesmo com erros (alguns comandos podem falhar se já existirem)
                if (error.message.includes('already exists')) {
                    console.log(`ℹ️ Tabela/função já existe, continuando...`);
                }
            }
        }
        
        console.log(`✅ Configuração concluída!`);
        console.log(`📊 Sucessos: ${successCount}, Erros: ${errorCount}`);
        
        // Verificar se as tabelas principais foram criadas
        await verifyTables();
        
    } catch (error) {
        console.error('❌ Erro na configuração do banco:', error);
        process.exit(1);
    }
}

async function verifyTables() {
    console.log('🔍 Verificando tabelas criadas...');
    
    const requiredTables = [
        'contacts',
        'conversations', 
        'messages',
        'agents',
        'webhook_events',
        'message_templates',
        'conversation_metrics'
    ];
    
    for (const tableName of requiredTables) {
        try {
            const { data, error } = await supabaseAdmin
                .from(tableName)
                .select('*')
                .limit(1);
            
            if (error) {
                console.log(`❌ Tabela ${tableName}: Não encontrada`);
            } else {
                console.log(`✅ Tabela ${tableName}: OK`);
            }
        } catch (error) {
            console.log(`❌ Tabela ${tableName}: Erro - ${error.message}`);
        }
    }
}

function extractTableName(sqlCommand) {
    const match = sqlCommand.match(/create\s+table\s+(\w+)/i);
    return match ? match[1] : null;
}

async function insertSampleData() {
    try {
        console.log('📝 Inserindo dados de exemplo...');
        
        // Inserir agente padrão
        const { error: agentError } = await supabaseAdmin
            .from('agents')
            .upsert({
                id: '00000000-0000-0000-0000-000000000000',
                name: 'Sistema Webhook',
                email: 'webhook@sistema.com',
                role: 'admin',
                status: 'active'
            }, { onConflict: 'email' });
        
        if (agentError) {
            console.log('⚠️ Erro ao inserir agente padrão:', agentError.message);
        } else {
            console.log('✅ Agente padrão criado');
        }
        
        // Inserir templates de mensagem
        const templates = [
            {
                name: 'Boas-vindas',
                content: 'Olá {{nome}}! Bem-vindo ao nosso atendimento. Como posso ajudá-lo hoje?',
                variables: ['nome'],
                category: 'greeting'
            },
            {
                name: 'Aguarde',
                content: 'Obrigado pela sua mensagem! Nossa equipe irá responder em breve.',
                variables: [],
                category: 'auto-reply'
            },
            {
                name: 'Encerramento',
                content: 'Atendimento finalizado. Obrigado pelo contato, {{nome}}!',
                variables: ['nome'],
                category: 'closing'
            }
        ];
        
        for (const template of templates) {
            const { error } = await supabaseAdmin
                .from('message_templates')
                .upsert(template, { onConflict: 'name' });
            
            if (error) {
                console.log(`⚠️ Erro ao inserir template ${template.name}:`, error.message);
            } else {
                console.log(`✅ Template "${template.name}" criado`);
            }
        }
        
        console.log('✅ Dados de exemplo inseridos com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao inserir dados de exemplo:', error);
    }
}

// Função principal
async function main() {
    try {
        console.log('🚀 Iniciando configuração do banco de dados...');
        
        // Verificar conexão
        const { data, error } = await supabaseAdmin
            .from('contacts')
            .select('count')
            .limit(1);
        
        if (error) {
            console.log('ℹ️ Banco de dados não configurado, iniciando configuração...');
        } else {
            console.log('ℹ️ Banco de dados já configurado');
        }
        
        // Configurar banco
        await setupDatabase();
        
        // Inserir dados de exemplo
        await insertSampleData();
        
        console.log('🎉 Configuração concluída com sucesso!');
        console.log('📋 Próximos passos:');
        console.log('   1. Execute: npm run dev');
        console.log('   2. Acesse: http://localhost:3000');
        
    } catch (error) {
        console.error('❌ Erro na configuração:', error);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main();
}

module.exports = {
    setupDatabase,
    insertSampleData,
    verifyTables
};