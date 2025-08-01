const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/database');
const logger = require('../utils/logger');

// Modo mock para desenvolvimento
const isMockMode = process.env.NODE_ENV === 'development' && !process.env.SUPABASE_URL?.includes('lmybrxyvnhowddcllloh');

// =============================================
// ROTAS DE ESTATÍSTICAS
// =============================================

// GET /api/stats - Estatísticas gerais do dashboard
router.get('/stats', async (req, res) => {
    try {
        if (isMockMode) {
            // Dados mock para desenvolvimento
            return res.json({
                totalContacts: 5,
                activeConversations: 3,
                messagesToday: 25,
                avgResponseTime: 5
            });
        }

        // Buscar estatísticas do banco
        const [
            { count: totalContacts },
            { count: activeConversations },
            { count: messagesToday },
            avgResponseTime
        ] = await Promise.all([
            supabaseAdmin.from('contacts').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('conversations').select('*', { count: 'exact', head: true }).eq('status', 'open'),
            supabaseAdmin.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', new Date().toISOString().split('T')[0]),
            calculateAverageResponseTime()
        ]);

        res.json({
            totalContacts: totalContacts || 0,
            activeConversations: activeConversations || 0,
            messagesToday: messagesToday || 0,
            avgResponseTime: avgResponseTime || 0
        });
    } catch (error) {
        logger.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/messages/hourly - Mensagens por hora
router.get('/messages/hourly', async (req, res) => {
    try {
        if (isMockMode) {
            // Dados mock para gráfico
            const labels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
            const values = Array.from({ length: 24 }, () => Math.floor(Math.random() * 10) + 1);
            
            return res.json({ labels, values });
        }

        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        const { data: messages, error } = await supabaseAdmin
            .from('messages')
            .select('created_at')
            .gte('created_at', startOfDay.toISOString());

        if (error) throw error;

        // Agrupar por hora
        const hourlyData = new Array(24).fill(0);
        messages.forEach(message => {
            const hour = new Date(message.created_at).getHours();
            hourlyData[hour]++;
        });

        const labels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
        
        res.json({
            labels,
            values: hourlyData
        });
    } catch (error) {
        logger.error('Erro ao buscar mensagens por hora:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/messages/realtime - Dados em tempo real
router.get('/messages/realtime', async (req, res) => {
    try {
        if (isMockMode) {
            return res.json({
                count: Math.floor(Math.random() * 5) + 1,
                timestamp: new Date().toISOString()
            });
        }

        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        
        const { count, error } = await supabaseAdmin
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', fiveMinutesAgo.toISOString());

        if (error) throw error;

        res.json({
            count: count || 0,
            timestamp: now.toISOString()
        });
    } catch (error) {
        logger.error('Erro ao buscar dados em tempo real:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =============================================
// ROTAS DE CONTATOS
// =============================================

// GET /api/contacts - Listar contatos com paginação e filtros
router.get('/contacts', async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', tag = '' } = req.query;

        if (isMockMode) {
            // Dados mock para contatos
            const mockContacts = [
                {
                    id: '1',
                    name: 'João Silva',
                    phone: '+5511999999999',
                    email: 'joao@email.com',
                    tags: ['✨ REPECON FIAT', '🐨 LOJISTA'],
                    status: 'active',
                    last_interaction: new Date().toISOString(),
                    last_message: {
                        content: 'Olá! Gostaria de informações sobre o carro.',
                        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
                    },
                    active_conversations: 1
                },
                {
                    id: '2',
                    name: 'Maria Santos',
                    phone: '+5511888888888',
                    email: 'maria@email.com',
                    tags: ['✨ AUTOMEGA', '💗 Troca'],
                    status: 'active',
                    last_interaction: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                    last_message: {
                        content: 'Estou interessada na troca do meu carro.',
                        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
                    },
                    active_conversations: 1
                },
                {
                    id: '3',
                    name: 'Pedro Costa',
                    phone: '+5521777777777',
                    email: 'pedro@email.com',
                    tags: ['🐨 DICAS', '💛 Zero'],
                    status: 'active',
                    last_interaction: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                    last_message: {
                        content: 'Preciso de dicas sobre financiamento.',
                        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
                    },
                    active_conversations: 0
                },
                {
                    id: '4',
                    name: 'Ana Oliveira',
                    phone: '+5531666666666',
                    email: 'ana@email.com',
                    tags: ['🥳 PV', '💚 seminovo'],
                    status: 'active',
                    last_interaction: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
                    last_message: {
                        content: 'Tem seminovos disponíveis?',
                        created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
                    },
                    active_conversations: 1
                },
                {
                    id: '5',
                    name: 'Carlos Lima',
                    phone: '+5541555555555',
                    email: 'carlos@email.com',
                    tags: ['🐨 PIX VISTORIA', '🤎 zero fora'],
                    status: 'active',
                    last_interaction: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
                    last_message: {
                        content: 'Quero fazer a vistoria via PIX.',
                        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
                    },
                    active_conversations: 0
                }
            ];

            // Aplicar filtros mock
            let filteredContacts = mockContacts;
            
            if (search) {
                filteredContacts = mockContacts.filter(contact => 
                    contact.name.toLowerCase().includes(search.toLowerCase()) ||
                    contact.phone.includes(search)
                );
            }

            if (tag) {
                filteredContacts = filteredContacts.filter(contact => 
                    contact.tags.includes(tag)
                );
            }

            // Aplicar paginação mock
            const offset = (page - 1) * limit;
            const paginatedContacts = filteredContacts.slice(offset, offset + limit);

            return res.json({
                contacts: paginatedContacts,
                total: filteredContacts.length,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(filteredContacts.length / limit)
            });
        }

        const offset = (page - 1) * limit;

        let query = supabaseAdmin
            .from('contacts')
            .select(`
                *,
                conversations!inner(
                    id,
                    status,
                    last_message_at
                ),
                messages!inner(
                    id,
                    content,
                    created_at,
                    direction
                )
            `)
            .order('last_interaction', { ascending: false });

        // Aplicar filtros
        if (search) {
            query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
        }

        if (tag) {
            query = query.contains('tags', [tag]);
        }

        // Aplicar paginação
        query = query.range(offset, offset + limit - 1);

        const { data: contacts, error, count } = await query;

        if (error) throw error;

        // Processar dados dos contatos
        const processedContacts = contacts.map(contact => ({
            id: contact.id,
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
            tags: contact.tags || [],
            status: contact.status,
            last_interaction: contact.last_interaction,
            last_message: contact.messages?.[0] || null,
            active_conversations: contact.conversations?.filter(c => c.status === 'open').length || 0
        }));

        res.json({
            contacts: processedContacts,
            total: count || contacts.length,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil((count || contacts.length) / limit)
        });
    } catch (error) {
        logger.error('Erro ao buscar contatos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/contacts/:id/messages - Mensagens de um contato
router.get('/contacts/:id/messages', async (req, res) => {
    try {
        const { id } = req.params;

        if (isMockMode) {
            // Dados mock para mensagens
            const mockContact = {
                id: id,
                name: 'João Silva',
                phone: '+5511999999999',
                email: 'joao@email.com'
            };

            const mockMessages = [
                {
                    id: '1',
                    content: 'Olá! Gostaria de informações sobre o carro.',
                    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                    direction: 'inbound'
                },
                {
                    id: '2',
                    content: 'Olá! Claro, posso te ajudar. Qual modelo você tem interesse?',
                    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
                    direction: 'outbound'
                },
                {
                    id: '3',
                    content: 'Estou interessado no Fiat Argo. Tem disponível?',
                    created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
                    direction: 'inbound'
                },
                {
                    id: '4',
                    content: 'Sim! Temos o Argo disponível. Posso te enviar as especificações?',
                    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
                    direction: 'outbound'
                },
                {
                    id: '5',
                    content: 'Perfeito! Envie por favor.',
                    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
                    direction: 'inbound'
                }
            ];

            return res.json({
                contact: mockContact,
                messages: mockMessages
            });
        }

        // Buscar contato
        const { data: contact, error: contactError } = await supabaseAdmin
            .from('contacts')
            .select('*')
            .eq('id', id)
            .single();

        if (contactError) throw contactError;

        // Buscar mensagens do contato
        const { data: messages, error: messagesError } = await supabaseAdmin
            .from('messages')
            .select('*')
            .eq('contact_id', id)
            .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;

        res.json({
            contact,
            messages: messages || []
        });
    } catch (error) {
        logger.error('Erro ao buscar mensagens do contato:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =============================================
// ROTAS DE WEBHOOK
// =============================================

// POST /api/webhook/test - Testar webhook
router.post('/webhook/test', async (req, res) => {
    try {
        const testData = {
            Type: "Message",
            EventDate: new Date().toISOString(),
            Payload: {
                Type: "Chat",
                Content: {
                    Contact: {
                        PhoneNumber: "+5511999999999",
                        Name: "Teste Usuário",
                        Tags: [{ Name: "Teste" }]
                    },
                    LastMessage: {
                        Content: "Mensagem de teste",
                        MessageType: "Text",
                        MessageState: "Read"
                    }
                }
            }
        };

        // Processar webhook de teste
        const webhookService = require('../services/webhookService');
        const result = await webhookService.processWebhook(testData);

        res.json({
            success: true,
            message: 'Webhook de teste processado com sucesso',
            result
        });
    } catch (error) {
        logger.error('Erro ao processar webhook de teste:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =============================================
// ROTAS DE CONFIGURAÇÃO
// =============================================

// GET /api/config - Configurações do sistema
router.get('/config', (req, res) => {
    res.json({
        webhookUrl: `${req.protocol}://${req.get('host')}/webhook/umbler`,
        environment: process.env.NODE_ENV,
        version: '1.0.0',
        mockMode: isMockMode
    });
});

// =============================================
// FUNÇÕES AUXILIARES
// =============================================

async function calculateAverageResponseTime() {
    try {
        if (isMockMode) {
            return 5; // 5 minutos em modo mock
        }

        // Buscar mensagens de atendentes (outbound) e calcular tempo médio de resposta
        const { data: messages, error } = await supabaseAdmin
            .from('messages')
            .select('created_at, direction, conversation_id')
            .eq('direction', 'outbound')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error || !messages) return 0;

        let totalResponseTime = 0;
        let responseCount = 0;

        for (const message of messages) {
            // Buscar última mensagem do cliente antes desta resposta
            const { data: lastClientMessage } = await supabaseAdmin
                .from('messages')
                .select('created_at')
                .eq('conversation_id', message.conversation_id)
                .eq('direction', 'inbound')
                .lt('created_at', message.created_at)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (lastClientMessage) {
                const responseTime = new Date(message.created_at) - new Date(lastClientMessage.created_at);
                totalResponseTime += responseTime;
                responseCount++;
            }
        }

        return responseCount > 0 ? Math.round(totalResponseTime / responseCount / 60000) : 0; // Em minutos
    } catch (error) {
        logger.error('Erro ao calcular tempo médio de resposta:', error);
        return 0;
    }
}

module.exports = router;