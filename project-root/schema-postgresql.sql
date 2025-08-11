-- =============================================
-- SCHEMA POSTGRESQL PARA SISTEMA DE WEBHOOK UMBLER
-- Otimizado para dados de atendimentos e chat
-- =============================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- =============================================
-- TABELA: webhook_events (Dados brutos dos webhooks)
-- =============================================
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(255) UNIQUE NOT NULL, -- EventId da Umbler
    event_type VARCHAR(100) NOT NULL, -- Type do webhook
    event_date TIMESTAMP WITH TIME ZONE NOT NULL, -- EventDate
    payload JSONB NOT NULL, -- Dados completos do webhook
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    source_ip INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para webhook_events
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_date ON webhook_events(event_date);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_payload_gin ON webhook_events USING GIN(payload);

-- =============================================
-- TABELA: contacts (Contatos/Clientes)
-- =============================================
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    umbler_contact_id VARCHAR(255) UNIQUE NOT NULL, -- Contact.Id da Umbler
    phone_number VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    profile_picture_url TEXT,
    is_blocked BOOLEAN DEFAULT FALSE,
    contact_type VARCHAR(50) DEFAULT 'DirectMessage',
    last_active_utc TIMESTAMP WITH TIME ZONE,
    group_identifier VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para contacts
CREATE INDEX IF NOT EXISTS idx_contacts_umbler_id ON contacts(umbler_contact_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contacts_is_blocked ON contacts(is_blocked);
CREATE INDEX IF NOT EXISTS idx_contacts_last_active ON contacts(last_active_utc);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);

-- =============================================
-- TABELA: contact_tags (Tags dos contatos)
-- =============================================
CREATE TABLE IF NOT EXISTS contact_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    umbler_tag_id VARCHAR(255), -- Tag.Id da Umbler
    tag_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(contact_id, tag_name)
);

-- Índices para contact_tags
CREATE INDEX IF NOT EXISTS idx_contact_tags_contact_id ON contact_tags(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_tag_name ON contact_tags(tag_name);
CREATE INDEX IF NOT EXISTS idx_contact_tags_umbler_id ON contact_tags(umbler_tag_id);

-- =============================================
-- TABELA: channels (Canais de comunicação)
-- =============================================
CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    umbler_channel_id VARCHAR(255) UNIQUE NOT NULL, -- Channel.Id da Umbler
    channel_type VARCHAR(50) NOT NULL, -- ChannelType (WhatsappApi, etc)
    phone_number VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para channels
CREATE INDEX IF NOT EXISTS idx_channels_umbler_id ON channels(umbler_channel_id);
CREATE INDEX IF NOT EXISTS idx_channels_type ON channels(channel_type);
CREATE INDEX IF NOT EXISTS idx_channels_phone ON channels(phone_number);

-- =============================================
-- TABELA: sectors (Setores de atendimento)
-- =============================================
CREATE TABLE IF NOT EXISTS sectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    umbler_sector_id VARCHAR(255) UNIQUE NOT NULL, -- Sector.Id da Umbler
    name VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    order_position INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para sectors
CREATE INDEX IF NOT EXISTS idx_sectors_umbler_id ON sectors(umbler_sector_id);
CREATE INDEX IF NOT EXISTS idx_sectors_name ON sectors(name);
CREATE INDEX IF NOT EXISTS idx_sectors_order ON sectors(order_position);

-- =============================================
-- TABELA: organization_members (Agentes/Membros)
-- =============================================
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    umbler_member_id VARCHAR(255) UNIQUE NOT NULL, -- OrganizationMember.Id
    name VARCHAR(255),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para organization_members
CREATE INDEX IF NOT EXISTS idx_org_members_umbler_id ON organization_members(umbler_member_id);
CREATE INDEX IF NOT EXISTS idx_org_members_is_active ON organization_members(is_active);

-- =============================================
-- TABELA: chats (Conversas/Atendimentos)
-- =============================================
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    umbler_chat_id VARCHAR(255) UNIQUE NOT NULL, -- Chat.Id da Umbler
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES channels(id) ON DELETE SET NULL,
    sector_id UUID REFERENCES sectors(id) ON DELETE SET NULL,
    assigned_member_id UUID REFERENCES organization_members(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'open', -- open, waiting, closed, private
    is_open BOOLEAN DEFAULT TRUE,
    is_private BOOLEAN DEFAULT FALSE,
    is_waiting BOOLEAN DEFAULT FALSE,
    waiting_since_utc TIMESTAMP WITH TIME ZONE,
    total_unread INTEGER DEFAULT 0,
    total_ai_responses INTEGER DEFAULT 0,
    closed_at_utc TIMESTAMP WITH TIME ZONE,
    event_at_utc TIMESTAMP WITH TIME ZONE,
    first_contact_message_id VARCHAR(255),
    first_member_reply_message_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para chats
CREATE INDEX IF NOT EXISTS idx_chats_umbler_id ON chats(umbler_chat_id);
CREATE INDEX IF NOT EXISTS idx_chats_contact_id ON chats(contact_id);
CREATE INDEX IF NOT EXISTS idx_chats_channel_id ON chats(channel_id);
CREATE INDEX IF NOT EXISTS idx_chats_sector_id ON chats(sector_id);
CREATE INDEX IF NOT EXISTS idx_chats_assigned_member_id ON chats(assigned_member_id);
CREATE INDEX IF NOT EXISTS idx_chats_status ON chats(status);
CREATE INDEX IF NOT EXISTS idx_chats_is_waiting ON chats(is_waiting);
CREATE INDEX IF NOT EXISTS idx_chats_is_open ON chats(is_open);
CREATE INDEX IF NOT EXISTS idx_chats_waiting_since ON chats(waiting_since_utc);
CREATE INDEX IF NOT EXISTS idx_chats_event_at ON chats(event_at_utc);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at);

-- Índice composto para consultas de performance
CREATE INDEX IF NOT EXISTS idx_chats_status_waiting ON chats(status, is_waiting) WHERE is_waiting = TRUE;
CREATE INDEX IF NOT EXISTS idx_chats_sector_status ON chats(sector_id, status);

-- =============================================
-- TABELA: messages (Mensagens das conversas)
-- =============================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    umbler_message_id VARCHAR(255) UNIQUE NOT NULL, -- Message.Id da Umbler
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    organization_member_id UUID REFERENCES organization_members(id) ON DELETE SET NULL,
    message_type VARCHAR(50) NOT NULL DEFAULT 'text', -- text, image, audio, etc
    content TEXT,
    direction VARCHAR(20) NOT NULL DEFAULT 'inbound', -- inbound, outbound
    source VARCHAR(50) DEFAULT 'Contact', -- Contact, OrganizationMember
    message_state VARCHAR(50) DEFAULT 'sent', -- sent, delivered, read, failed
    is_private BOOLEAN DEFAULT FALSE,
    event_at_utc TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at_utc TIMESTAMP WITH TIME ZONE,
    file_id VARCHAR(255),
    template_id VARCHAR(255),
    quoted_message_id VARCHAR(255),
    raw_webhook_data JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para messages
CREATE INDEX IF NOT EXISTS idx_messages_umbler_id ON messages(umbler_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_contact_id ON messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_org_member_id ON messages(organization_member_id);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);
CREATE INDEX IF NOT EXISTS idx_messages_source ON messages(source);
CREATE INDEX IF NOT EXISTS idx_messages_state ON messages(message_state);
CREATE INDEX IF NOT EXISTS idx_messages_event_at ON messages(event_at_utc);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_content_gin ON messages USING GIN(to_tsvector('portuguese', content));

-- Índice composto para consultas de chat
CREATE INDEX IF NOT EXISTS idx_messages_chat_event_at ON messages(chat_id, event_at_utc DESC);

-- =============================================
-- TABELA: message_reactions (Reações das mensagens)
-- =============================================
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    reaction_type VARCHAR(50) NOT NULL, -- 👍, ❤️, etc
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    organization_member_id UUID REFERENCES organization_members(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, reaction_type, COALESCE(contact_id::text, organization_member_id::text))
);

-- Índices para message_reactions
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_type ON message_reactions(reaction_type);

-- =============================================
-- TABELA: chat_assignments (Histórico de atribuições)
-- =============================================
CREATE TABLE IF NOT EXISTS chat_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unassigned_at TIMESTAMP WITH TIME ZONE,
    reason VARCHAR(255),
    metadata JSONB DEFAULT '{}'
);

-- Índices para chat_assignments
CREATE INDEX IF NOT EXISTS idx_chat_assignments_chat_id ON chat_assignments(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_assignments_member_id ON chat_assignments(member_id);
CREATE INDEX IF NOT EXISTS idx_chat_assignments_assigned_at ON chat_assignments(assigned_at);

-- =============================================
-- TABELA: performance_metrics (Métricas de performance)
-- =============================================
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES organization_members(id) ON DELETE CASCADE,
    sector_id UUID REFERENCES sectors(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- response_time, messages_sent, etc
    metric_value DECIMAL(10,2) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(member_id, sector_id, date, metric_type)
);

-- Índices para performance_metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_member_id ON performance_metrics(member_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_sector_id ON performance_metrics(sector_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_date ON performance_metrics(date);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON performance_metrics(metric_type);

-- =============================================
-- FUNÇÕES E TRIGGERS
-- =============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sectors_updated_at BEFORE UPDATE ON sectors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_org_members_updated_at BEFORE UPDATE ON organization_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para calcular tempo médio de resposta
CREATE OR REPLACE FUNCTION calculate_response_time(chat_uuid UUID)
RETURNS INTERVAL AS $$
DECLARE
    first_contact_msg TIMESTAMP WITH TIME ZONE;
    first_member_msg TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Buscar primeira mensagem do contato
    SELECT MIN(event_at_utc) INTO first_contact_msg
    FROM messages 
    WHERE chat_id = chat_uuid AND direction = 'inbound';
    
    -- Buscar primeira resposta do membro
    SELECT MIN(event_at_utc) INTO first_member_msg
    FROM messages 
    WHERE chat_id = chat_uuid AND direction = 'outbound';
    
    IF first_contact_msg IS NULL OR first_member_msg IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN first_member_msg - first_contact_msg;
END;
$$ LANGUAGE plpgsql;

-- Função para obter estatísticas de webhooks
CREATE OR REPLACE FUNCTION get_webhook_stats(period_interval INTERVAL)
RETURNS TABLE(
    total_events BIGINT,
    processed_events BIGINT,
    failed_events BIGINT,
    events_by_type JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE processed = true) as processed,
            COUNT(*) FILTER (WHERE processed = false) as failed,
            jsonb_object_agg(event_type, count) as by_type
        FROM (
            SELECT 
                event_type,
                COUNT(*) as count
            FROM webhook_events 
            WHERE created_at >= NOW() - period_interval
            GROUP BY event_type
        ) type_counts,
        webhook_events we
        WHERE we.created_at >= NOW() - period_interval
    )
    SELECT 
        stats.total,
        stats.processed,
        stats.failed,
        stats.by_type
    FROM stats;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar chats em espera
CREATE OR REPLACE FUNCTION get_waiting_chats()
RETURNS TABLE(
    chat_id UUID,
    contact_name VARCHAR(255),
    contact_phone VARCHAR(20),
    sector_name VARCHAR(100),
    waiting_since TIMESTAMP WITH TIME ZONE,
    last_message TEXT,
    unread_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        ct.name,
        ct.phone_number,
        s.name as sector_name,
        c.waiting_since_utc,
        m.content as last_message,
        c.total_unread
    FROM chats c
    JOIN contacts ct ON c.contact_id = ct.id
    LEFT JOIN sectors s ON c.sector_id = s.id
    LEFT JOIN messages m ON m.id = (
        SELECT id FROM messages 
        WHERE chat_id = c.id 
        ORDER BY event_at_utc DESC 
        LIMIT 1
    )
    WHERE c.is_waiting = true AND c.is_open = true
    ORDER BY c.waiting_since_utc ASC;
END;
$$ LANGUAGE plpgsql;

-- Função para obter performance de agentes
CREATE OR REPLACE FUNCTION get_agent_performance(
    agent_uuid UUID,
    start_date DATE,
    end_date DATE
)
RETURNS TABLE(
    metric_type VARCHAR(50),
    metric_value DECIMAL(10,2),
    total_chats BIGINT,
    avg_response_time INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.metric_type,
        pm.metric_value,
        COUNT(DISTINCT c.id) as total_chats,
        AVG(calculate_response_time(c.id)) as avg_response_time
    FROM performance_metrics pm
    LEFT JOIN chats c ON c.assigned_member_id = pm.member_id
    WHERE pm.member_id = agent_uuid 
        AND pm.date BETWEEN start_date AND end_date
    GROUP BY pm.metric_type, pm.metric_value;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- VIEWS PARA CONSULTAS COMUNS
-- =============================================

-- View para chats com informações completas
CREATE OR REPLACE VIEW chat_summary AS
SELECT 
    c.id,
    c.umbler_chat_id,
    c.status,
    c.is_waiting,
    c.is_open,
    c.waiting_since_utc,
    c.total_unread,
    c.event_at_utc,
    c.created_at,
    ct.name as contact_name,
    ct.phone_number as contact_phone,
    ct.umbler_contact_id,
    s.name as sector_name,
    s.umbler_sector_id,
    ch.name as channel_name,
    ch.channel_type,
    om.name as assigned_agent_name,
    om.umbler_member_id as assigned_agent_id,
    (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id) as total_messages,
    (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id AND m.direction = 'inbound') as inbound_messages,
    (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id AND m.direction = 'outbound') as outbound_messages
FROM chats c
JOIN contacts ct ON c.contact_id = ct.id
LEFT JOIN sectors s ON c.sector_id = s.id
LEFT JOIN channels ch ON c.channel_id = ch.id
LEFT JOIN organization_members om ON c.assigned_member_id = om.id;

-- View para mensagens com informações do chat
CREATE OR REPLACE VIEW message_summary AS
SELECT 
    m.id,
    m.umbler_message_id,
    m.message_type,
    m.content,
    m.direction,
    m.source,
    m.message_state,
    m.event_at_utc,
    m.created_at,
    c.umbler_chat_id,
    c.status as chat_status,
    ct.name as contact_name,
    ct.phone_number as contact_phone,
    om.name as agent_name,
    s.name as sector_name
FROM messages m
JOIN chats c ON m.chat_id = c.id
JOIN contacts ct ON m.contact_id = ct.id
LEFT JOIN organization_members om ON m.organization_member_id = om.id
LEFT JOIN sectors s ON c.sector_id = s.id;

-- =============================================
-- ÍNDICES ADICIONAIS PARA PERFORMANCE
-- =============================================

-- Índices para consultas de relatórios
CREATE INDEX IF NOT EXISTS idx_chats_sector_date ON chats(sector_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_chat_direction ON messages(chat_id, direction);
CREATE INDEX IF NOT EXISTS idx_messages_date_range ON messages(event_at_utc) WHERE event_at_utc >= '2024-01-01';

-- Índices para consultas de performance
CREATE INDEX IF NOT EXISTS idx_performance_metrics_member_date ON performance_metrics(member_id, date);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_sector_date ON performance_metrics(sector_id, date);

-- =============================================
-- COMENTÁRIOS DAS TABELAS
-- =============================================

COMMENT ON TABLE webhook_events IS 'Dados brutos dos webhooks recebidos da Umbler';
COMMENT ON TABLE contacts IS 'Contatos/clientes do sistema';
COMMENT ON TABLE contact_tags IS 'Tags associadas aos contatos';
COMMENT ON TABLE channels IS 'Canais de comunicação (WhatsApp, etc)';
COMMENT ON TABLE sectors IS 'Setores de atendimento';
COMMENT ON TABLE organization_members IS 'Agentes/membros da organização';
COMMENT ON TABLE chats IS 'Conversas/atendimentos';
COMMENT ON TABLE messages IS 'Mensagens das conversas';
COMMENT ON TABLE message_reactions IS 'Reações das mensagens';
COMMENT ON TABLE chat_assignments IS 'Histórico de atribuições de chats';
COMMENT ON TABLE performance_metrics IS 'Métricas de performance dos agentes';

-- =============================================
-- FIM DO SCHEMA
-- =============================================