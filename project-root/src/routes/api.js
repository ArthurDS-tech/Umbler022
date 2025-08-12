const express = require('express');
const router = express.Router();
const { supabaseAdmin, executeQuery, findWithCache, insertWithRetry, updateWithRetry } = require('../config/database');
const logger = require('../utils/logger');

// Importar rotas de mensagens webhook
const mensagensWebhookRoutes = require('./mensagensWebhook');

// Forçar uso do PostgreSQL - sem modo mock
const isMockMode = false; // Desabilitado - usando PostgreSQL direto
const usePostgreSQL = process.env.USE_POSTGRESQL === 'true';

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
        const offset = (page - 1) * limit;

        logger.info('Buscando contatos no PostgreSQL', { page, limit, search, tag });

        // Query base para contatos com último mensagem
        let query = `
            SELECT 
                c.id,
                c.external_id,
                c.name,
                c.phone,
                c.email,
                c.tags,
                c.status,
                c.last_interaction,
                c.metadata,
                c.created_at,
                ch.id as chat_id,
                ch.total_messages,
                ch.total_unread,
                m.content as last_message_content,
                m.created_at as last_message_created_at,
                m.message_type as last_message_type
            FROM contacts c
            LEFT JOIN chats ch ON ch.contact_id = c.id
            LEFT JOIN messages m ON m.id = (
                SELECT m2.id FROM messages m2 
                WHERE m2.contact_id = c.id 
                ORDER BY m2.event_at_utc DESC 
                LIMIT 1
            )
        `;
        
        const params = [];
        const whereConditions = [];

        // Aplicar filtros
        if (search) {
            whereConditions.push(`(c.name ILIKE $${params.length + 1} OR c.phone ILIKE $${params.length + 1})`);
            params.push(`%${search}%`);
        }

        if (tag) {
            whereConditions.push(`$${params.length + 1} = ANY(c.tags)`);
            params.push(tag);
        }

        if (whereConditions.length > 0) {
            query += ` WHERE ${whereConditions.join(' AND ')}`;
        }

        query += ` ORDER BY c.last_interaction DESC`;
        query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), offset);

        const contacts = await executeQuery(query, params);

        // Query para contar total de registros
        let countQuery = `SELECT COUNT(DISTINCT c.id) as total FROM contacts c`;
        const countParams = [];
        
        if (whereConditions.length > 0) {
            countQuery += ` WHERE ${whereConditions.join(' AND ')}`;
            // Recriar parâmetros para count query
            if (search) {
                countParams.push(`%${search}%`);
            }
            if (tag) {
                countParams.push(tag);
            }
        }

        const countResult = await executeQuery(countQuery, countParams);
        const total = parseInt(countResult[0]?.total || 0);

        // Processar dados dos contatos
        const processedContacts = contacts.map(contact => ({
            id: contact.id.toString(),
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
            tags: contact.tags || [],
            status: contact.status,
            last_interaction: contact.last_interaction,
            last_message: contact.last_message_content ? {
                content: contact.last_message_content,
                created_at: contact.last_message_created_at,
                type: contact.last_message_type
            } : null,
            active_conversations: contact.total_unread || 0
        }));

        logger.info('Contatos encontrados no PostgreSQL', { 
            total: processedContacts.length, 
            totalRecords: total 
        });

        res.json({
            contacts: processedContacts,
            total: total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        logger.error('Erro ao buscar contatos no PostgreSQL:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/contacts/:id/messages - Mensagens de um contato
router.get('/contacts/:id/messages', async (req, res) => {
    try {
        const { id } = req.params;

        logger.info('Buscando mensagens do contato no PostgreSQL', { contactId: id });

        // Buscar contato
        const contactQuery = `
            SELECT id, external_id, name, phone, email, tags, status, metadata, last_interaction
            FROM contacts 
            WHERE id = $1
        `;
        const contactResult = await executeQuery(contactQuery, [parseInt(id)]);
        
        if (contactResult.length === 0) {
            return res.status(404).json({ error: 'Contato não encontrado' });
        }
        
        const contact = contactResult[0];

        // Buscar mensagens do contato
        const messagesQuery = `
            SELECT 
                id,
                external_id,
                content,
                message_type,
                direction,
                file_url,
                file_type,
                file_size,
                location_data,
                event_at_utc,
                created_at
            FROM messages 
            WHERE contact_id = $1 
            ORDER BY event_at_utc ASC
        `;
        const messages = await executeQuery(messagesQuery, [parseInt(id)]);

        // Processar dados das mensagens
        const processedMessages = messages.map(message => ({
            id: message.id.toString(),
            content: message.content,
            message_type: message.message_type,
            direction: message.direction,
            file_url: message.file_url,
            file_type: message.file_type,
            file_size: message.file_size,
            location_data: message.location_data,
            created_at: message.event_at_utc || message.created_at
        }));

        logger.info('Mensagens encontradas no PostgreSQL', { 
            contactId: id, 
            totalMessages: processedMessages.length 
        });

        res.json({
            contact: {
                id: contact.id.toString(),
                name: contact.name,
                phone: contact.phone,
                email: contact.email,
                tags: contact.tags || [],
                status: contact.status,
                last_interaction: contact.last_interaction
            },
            messages: processedMessages
        });
    } catch (error) {
        logger.error('Erro ao buscar mensagens do contato no PostgreSQL:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/contacts/:id - Buscar contato específico
router.get('/contacts/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (isMockMode) {
            const mockContact = {
                id: id,
                name: 'João Silva',
                phoneNumber: '+5511999999999',
                profilePictureUrl: 'https://via.placeholder.com/150',
                isBlocked: false,
                lastActiveUTC: new Date().toISOString(),
                tags: ['✨ REPECON FIAT', '🐨 LOJISTA'],
                createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
            };

            return res.json(mockContact);
        }

        const { data: contact, error } = await supabaseAdmin
            .from('contacts')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        res.json(contact);
    } catch (error) {
        logger.error('Erro ao buscar contato:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =============================================
// ROTAS DE MENSAGENS
// =============================================

// GET /api/messages - Listar mensagens
router.get('/messages', async (req, res) => {
    try {
        const { conversationId } = req.query;

        if (isMockMode) {
            const mockMessages = [
                {
                    id: 'msg-1',
                    content: 'Olá! Gostaria de informações sobre o carro.',
                    messageType: 'Text',
                    sentByOrganizationMember: null,
                    fromContact: { id: 'contact-1' },
                    chatId: conversationId || 'chat-1',
                    messageState: 'Sent',
                    eventAtUTC: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
                },
                {
                    id: 'msg-2',
                    content: 'Olá! Claro, posso te ajudar. Qual modelo você tem interesse?',
                    messageType: 'Text',
                    sentByOrganizationMember: { id: 'member-1' },
                    fromContact: null,
                    chatId: conversationId || 'chat-1',
                    messageState: 'Sent',
                    eventAtUTC: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
                    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString()
                },
                {
                    id: 'msg-3',
                    content: 'Estou interessado no Fiat Argo. Tem disponível?',
                    messageType: 'Text',
                    sentByOrganizationMember: null,
                    fromContact: { id: 'contact-1' },
                    chatId: conversationId || 'chat-1',
                    messageState: 'Sent',
                    eventAtUTC: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
                    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString()
                }
            ];

            return res.json(mockMessages);
        }

        let query = supabaseAdmin
            .from('messages')
            .select('*')
            .order('created_at', { ascending: true });

        if (conversationId) {
            query = query.eq('conversation_id', conversationId);
        }

        const { data: messages, error } = await query;

        if (error) throw error;

        res.json(messages || []);
    } catch (error) {
        logger.error('Erro ao buscar mensagens:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/messages/:id - Buscar mensagem específica
router.get('/messages/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (isMockMode) {
            const mockMessage = {
                id: id,
                content: 'Olá! Gostaria de informações sobre o carro.',
                messageType: 'Text',
                sentByOrganizationMember: null,
                fromContact: { id: 'contact-1' },
                chatId: 'chat-1',
                messageState: 'Sent',
                eventAtUTC: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
            };

            return res.json(mockMessage);
        }

        const { data: message, error } = await supabaseAdmin
            .from('messages')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        res.json(message);
    } catch (error) {
        logger.error('Erro ao buscar mensagem:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =============================================
// ROTAS DE CONVERSAS
// =============================================

// GET /api/conversations - Listar conversas
router.get('/conversations', async (req, res) => {
    try {
        if (isMockMode) {
            const mockConversations = [
                {
                    id: 'conv-1',
                    contactId: 'contact-1',
                    channelId: 'channel-1',
                    sectorId: 'sector-1',
                    open: true,
                    waiting: false,
                    totalUnread: 2,
                    lastMessage: {
                        id: 'msg-3',
                        content: 'Estou interessado no Fiat Argo. Tem disponível?',
                        messageType: 'Text',
                        eventAtUTC: new Date(Date.now() - 20 * 60 * 1000).toISOString()
                    },
                    firstContactMessage: {
                        id: 'msg-1',
                        eventAtUTC: new Date(Date.now() - 30 * 60 * 1000).toISOString()
                    },
                    firstMemberReplyMessage: {
                        id: 'msg-2',
                        eventAtUTC: new Date(Date.now() - 25 * 60 * 1000).toISOString()
                    },
                    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
                },
                {
                    id: 'conv-2',
                    contactId: 'contact-2',
                    channelId: 'channel-1',
                    sectorId: 'sector-1',
                    open: true,
                    waiting: true,
                    totalUnread: 0,
                    lastMessage: {
                        id: 'msg-4',
                        content: 'Preciso de ajuda com financiamento.',
                        messageType: 'Text',
                        eventAtUTC: new Date(Date.now() - 10 * 60 * 1000).toISOString()
                    },
                    firstContactMessage: {
                        id: 'msg-5',
                        eventAtUTC: new Date(Date.now() - 15 * 60 * 1000).toISOString()
                    },
                    firstMemberReplyMessage: null,
                    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString()
                }
            ];

            return res.json(mockConversations);
        }

        const { data: conversations, error } = await supabaseAdmin
            .from('conversations')
            .select(`
                *,
                last_message:messages!inner(id, content, message_type, event_at_utc),
                first_contact_message:messages!inner(id, event_at_utc),
                first_member_reply_message:messages!inner(id, event_at_utc)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(conversations || []);
    } catch (error) {
        logger.error('Erro ao buscar conversas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/conversations/:id - Buscar conversa específica
router.get('/conversations/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (isMockMode) {
            const mockConversation = {
                id: id,
                contactId: 'contact-1',
                channelId: 'channel-1',
                sectorId: 'sector-1',
                open: true,
                waiting: false,
                totalUnread: 2,
                lastMessage: {
                    id: 'msg-3',
                    content: 'Estou interessado no Fiat Argo. Tem disponível?',
                    messageType: 'Text',
                    eventAtUTC: new Date(Date.now() - 20 * 60 * 1000).toISOString()
                },
                firstContactMessage: {
                    id: 'msg-1',
                    eventAtUTC: new Date(Date.now() - 30 * 60 * 1000).toISOString()
                },
                firstMemberReplyMessage: {
                    id: 'msg-2',
                    eventAtUTC: new Date(Date.now() - 25 * 60 * 1000).toISOString()
                },
                createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
            };

            return res.json(mockConversation);
        }

        const { data: conversation, error } = await supabaseAdmin
            .from('conversations')
            .select(`
                *,
                last_message:messages!inner(id, content, message_type, event_at_utc),
                first_contact_message:messages!inner(id, event_at_utc),
                first_member_reply_message:messages!inner(id, event_at_utc)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        res.json(conversation);
    } catch (error) {
        logger.error('Erro ao buscar conversa:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =============================================
// ROTA DE DASHBOARD
// =============================================

// GET /api/dashboard/stats - Estatísticas do dashboard
router.get('/dashboard/stats', async (req, res) => {
    try {
        if (isMockMode) {
            return res.json({
                totalContacts: 156,
                activeConversations: 23,
                messagesToday: 89,
                avgResponseTime: 3.2,
                webhookEvents: 15420,
                successfulWebhooks: 15380,
                failedWebhooks: 40
            });
        }

        // Buscar estatísticas do banco
        const [
            { count: totalContacts },
            { count: activeConversations },
            { count: messagesToday },
            { count: webhookEvents },
            { count: successfulWebhooks },
            { count: failedWebhooks }
        ] = await Promise.all([
            supabaseAdmin.from('contacts').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('conversations').select('*', { count: 'exact', head: true }).eq('open', true),
            supabaseAdmin.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', new Date().toISOString().split('T')[0]),
            supabaseAdmin.from('webhook_events').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('webhook_events').select('*', { count: 'exact', head: true }).eq('processed', true),
            supabaseAdmin.from('webhook_events').select('*', { count: 'exact', head: true }).eq('processed', false)
        ]);

        const avgResponseTime = await calculateAverageResponseTime();

        res.json({
            totalContacts: totalContacts || 0,
            activeConversations: activeConversations || 0,
            messagesToday: messagesToday || 0,
            avgResponseTime: avgResponseTime || 0,
            webhookEvents: webhookEvents || 0,
            successfulWebhooks: successfulWebhooks || 0,
            failedWebhooks: failedWebhooks || 0
        });
    } catch (error) {
        logger.error('Erro ao buscar estatísticas do dashboard:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =============================================
// ROTAS DE WEBHOOK
// =============================================

// GET /api/webhook/events - Listar eventos de webhook
router.get('/webhook/events', async (req, res) => {
    try {
        const { limit = 50 } = req.query;

        if (isMockMode) {
            const mockEvents = Array.from({ length: parseInt(limit) }, (_, i) => ({
                id: `event-${i + 1}`,
                eventType: ['Message', 'Contact', 'Conversation'][Math.floor(Math.random() * 3)],
                eventData: {
                    Type: "Message",
                    EventDate: new Date(Date.now() - i * 60000).toISOString(),
                    Payload: {
                        Type: "Chat",
                        Content: {
                            Contact: {
                                Name: `Cliente ${i + 1}`,
                                PhoneNumber: `+554899999999${i}`
                            }
                        }
                    }
                },
                processed: Math.random() > 0.1,
                createdAt: new Date(Date.now() - i * 60000).toISOString()
            }));

            return res.json(mockEvents);
        }

        const { data: events, error } = await supabaseAdmin
            .from('webhook_events')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        if (error) throw error;

        res.json(events || []);
    } catch (error) {
        logger.error('Erro ao buscar eventos de webhook:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/webhook/stats - Estatísticas de webhook
router.get('/webhook/stats', async (req, res) => {
    try {
        if (isMockMode) {
            return res.json({
                totalRequests: 15420,
                successfulRequests: 15380,
                failedRequests: 40,
                averageResponseTime: 245,
                lastWebhookTime: new Date().toISOString(),
                activeConnections: 8,
                messagesPerMinute: 12
            });
        }

        // Buscar estatísticas do banco
        const [
            { count: totalRequests },
            { count: successfulRequests },
            { count: failedRequests }
        ] = await Promise.all([
            supabaseAdmin.from('webhook_events').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('webhook_events').select('*', { count: 'exact', head: true }).eq('processed', true),
            supabaseAdmin.from('webhook_events').select('*', { count: 'exact', head: true }).eq('processed', false)
        ]);

        // Calcular tempo médio de resposta (mock por enquanto)
        const averageResponseTime = 245;
        const activeConnections = 8;
        const messagesPerMinute = 12;

        res.json({
            totalRequests: totalRequests || 0,
            successfulRequests: successfulRequests || 0,
            failedRequests: failedRequests || 0,
            averageResponseTime,
            lastWebhookTime: new Date().toISOString(),
            activeConnections,
            messagesPerMinute
        });
    } catch (error) {
        logger.error('Erro ao buscar estatísticas de webhook:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

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

// =============================================
// ROTAS DE MENSAGENS WEBHOOK
// =============================================

// Usar as rotas de mensagens webhook
router.use('/mensagens-webhook', mensagensWebhookRoutes);

module.exports = router;