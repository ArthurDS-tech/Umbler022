#!/usr/bin/env node

/**
 * Script para inserir dados de exemplo no banco
 */

const { supabaseAdmin } = require('../src/config/database');
const logger = require('../src/utils/logger');

async function seedData() {
    try {
        console.log('🌱 Inserindo dados de exemplo...');

        // Inserir contatos de exemplo
        const contacts = [
            {
                phone: '+5511999999999',
                name: 'João Silva',
                email: 'joao@email.com',
                tags: ['✨ REPECON FIAT', '🐨 LOJISTA'],
                status: 'active',
                last_interaction: new Date().toISOString()
            },
            {
                phone: '+5511888888888',
                name: 'Maria Santos',
                email: 'maria@email.com',
                tags: ['✨ AUTOMEGA', '💗 Troca'],
                status: 'active',
                last_interaction: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
            },
            {
                phone: '+5521777777777',
                name: 'Pedro Costa',
                email: 'pedro@email.com',
                tags: ['🐨 DICAS', '💛 Zero'],
                status: 'active',
                last_interaction: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
            },
            {
                phone: '+5531666666666',
                name: 'Ana Oliveira',
                email: 'ana@email.com',
                tags: ['🥳 PV', '💚 seminovo'],
                status: 'active',
                last_interaction: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
            },
            {
                phone: '+5541555555555',
                name: 'Carlos Lima',
                email: 'carlos@email.com',
                tags: ['🐨 PIX VISTORIA', '🤎 zero fora'],
                status: 'active',
                last_interaction: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
            }
        ];

        console.log('📞 Inserindo contatos...');
        for (const contact of contacts) {
            const { error } = await supabaseAdmin
                .from('contacts')
                .upsert(contact, { onConflict: 'phone' });
            
            if (error) {
                console.log(`⚠️ Erro ao inserir contato ${contact.name}:`, error.message);
            } else {
                console.log(`✅ Contato ${contact.name} inserido`);
            }
        }

        // Buscar contatos inseridos
        const { data: insertedContacts, error: fetchError } = await supabaseAdmin
            .from('contacts')
            .select('id, phone');

        if (fetchError) {
            console.log('⚠️ Erro ao buscar contatos:', fetchError.message);
            return;
        }

        // Inserir conversas
        console.log('💬 Inserindo conversas...');
        for (const contact of insertedContacts) {
            const conversation = {
                contact_id: contact.id,
                umbler_conversation_id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                channel: 'whatsapp',
                status: 'open',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data: conv, error } = await supabaseAdmin
                .from('conversations')
                .insert(conversation)
                .select()
                .single();

            if (error) {
                console.log(`⚠️ Erro ao inserir conversa para ${contact.phone}:`, error.message);
            } else {
                console.log(`✅ Conversa criada para ${contact.phone}`);

                // Inserir mensagens para esta conversa
                const messages = [
                    {
                        conversation_id: conv.id,
                        contact_id: contact.id,
                        umbler_message_id: `msg_${Date.now()}_1`,
                        direction: 'inbound',
                        message_type: 'text',
                        content: 'Olá! Gostaria de informações sobre o carro.',
                        status: 'received',
                        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
                    },
                    {
                        conversation_id: conv.id,
                        contact_id: contact.id,
                        umbler_message_id: `msg_${Date.now()}_2`,
                        direction: 'outbound',
                        message_type: 'text',
                        content: 'Olá! Claro, posso te ajudar. Qual modelo você tem interesse?',
                        status: 'sent',
                        created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString()
                    },
                    {
                        conversation_id: conv.id,
                        contact_id: contact.id,
                        umbler_message_id: `msg_${Date.now()}_3`,
                        direction: 'inbound',
                        message_type: 'text',
                        content: 'Estou interessado no Fiat Argo. Tem disponível?',
                        status: 'received',
                        created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString()
                    },
                    {
                        conversation_id: conv.id,
                        contact_id: contact.id,
                        umbler_message_id: `msg_${Date.now()}_4`,
                        direction: 'outbound',
                        message_type: 'text',
                        content: 'Sim! Temos o Argo disponível. Posso te enviar as especificações?',
                        status: 'sent',
                        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
                    },
                    {
                        conversation_id: conv.id,
                        contact_id: contact.id,
                        umbler_message_id: `msg_${Date.now()}_5`,
                        direction: 'inbound',
                        message_type: 'text',
                        content: 'Perfeito! Envie por favor.',
                        status: 'received',
                        created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
                    }
                ];

                for (const message of messages) {
                    const { error: msgError } = await supabaseAdmin
                        .from('messages')
                        .insert(message);

                    if (msgError) {
                        console.log(`⚠️ Erro ao inserir mensagem:`, msgError.message);
                    }
                }

                console.log(`✅ 5 mensagens inseridas para ${contact.phone}`);
            }
        }

        // Inserir mais mensagens para diferentes horários (para gráficos)
        console.log('📊 Inserindo mensagens para gráficos...');
        const now = new Date();
        for (let i = 0; i < 24; i++) {
            const hour = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
            const messageCount = Math.floor(Math.random() * 10) + 1; // 1-10 mensagens por hora

            for (let j = 0; j < messageCount; j++) {
                const message = {
                    conversation_id: insertedContacts[0].id, // Usar primeiro contato
                    contact_id: insertedContacts[0].id,
                    umbler_message_id: `msg_${Date.now()}_${i}_${j}`,
                    direction: Math.random() > 0.5 ? 'inbound' : 'outbound',
                    message_type: 'text',
                    content: `Mensagem de teste ${i}:${j}`,
                    status: 'received',
                    created_at: new Date(hour.getTime() + j * 5 * 60 * 1000).toISOString()
                };

                const { error } = await supabaseAdmin
                    .from('messages')
                    .insert(message);

                if (error) {
                    console.log(`⚠️ Erro ao inserir mensagem de teste:`, error.message);
                }
            }
        }

        console.log('✅ Dados de exemplo inseridos com sucesso!');
        console.log('');
        console.log('📋 Resumo:');
        console.log(`- ${contacts.length} contatos inseridos`);
        console.log(`- ${insertedContacts.length} conversas criadas`);
        console.log('- Mensagens de exemplo para gráficos');
        console.log('');
        console.log('🎉 Dashboard pronto para uso!');
        console.log('Acesse: http://localhost:3000');

    } catch (error) {
        console.error('❌ Erro ao inserir dados de exemplo:', error);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    seedData();
}

module.exports = { seedData };