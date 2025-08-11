-- =============================================
-- SCHEMA COMPLETO PARA WEBHOOK UMBLER
-- =============================================

-- Tabela de contatos/clientes
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255),
    email VARCHAR(255),
    profile_pic_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_interaction TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'archived')),
    tags TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Tabela de conversas
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    umbler_conversation_id VARCHAR(255) UNIQUE,
    channel VARCHAR(50) DEFAULT 'whatsapp',
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending', 'resolved')),
    assigned_agent_id UUID,
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    last_message_at TIMESTAMP WITH TIME ZONE,
    message_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Tabela de mensagens
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    umbler_message_id VARCHAR(255) UNIQUE,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document', 'location', 'contact', 'sticker')),
    content TEXT,
    media_url TEXT,
    media_filename VARCHAR(255),
    media_mime_type VARCHAR(100),
    media_size INTEGER,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    raw_webhook_data JSONB
);

-- Tabela de agentes/usuários
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'agent' CHECK (role IN ('admin', 'supervisor', 'agent')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'busy', 'away')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Tabela de eventos de webhook
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    source_ip INET,
    user_agent TEXT
);

-- Tabela de templates de mensagens
CREATE TABLE message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    variables TEXT[],
    category VARCHAR(50),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES agents(id)
);

-- Tabela de métricas e relatórios
CREATE TABLE conversation_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    first_response_time INTERVAL,
    resolution_time INTERVAL,
    agent_response_count INTEGER DEFAULT 0,
    customer_message_count INTEGER DEFAULT 0,
    satisfaction_score INTEGER CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================

-- Índices para contacts
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_contacts_created_at ON contacts(created_at DESC);
CREATE INDEX idx_contacts_last_interaction ON contacts(last_interaction DESC);

-- Índices para conversations
CREATE INDEX idx_conversations_contact_id ON conversations(contact_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX idx_conversations_umbler_id ON conversations(umbler_conversation_id);
CREATE INDEX idx_conversations_agent ON conversations(assigned_agent_id);

-- Índices para messages
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_contact_id ON messages(contact_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_direction ON messages(direction);
CREATE INDEX idx_messages_type ON messages(message_type);
CREATE INDEX idx_messages_umbler_id ON messages(umbler_message_id);

-- Índices para webhook_events
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at DESC);
CREATE INDEX idx_webhook_events_type ON webhook_events(event_type);

-- =============================================
-- TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- =============================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON message_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar contadores e timestamps
CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualiza último timestamp da mensagem
    UPDATE conversations 
    SET 
        last_message_at = NEW.created_at,
        message_count = message_count + 1,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    
    -- Atualiza última interação do contato
    UPDATE contacts 
    SET 
        last_interaction = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.contact_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar stats quando nova mensagem é inserida
CREATE TRIGGER update_conversation_stats_trigger 
    AFTER INSERT ON messages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_conversation_stats();

-- =============================================
-- VIEWS ÚTEIS PARA RELATÓRIOS
-- =============================================

-- View com informações completas das conversas
CREATE VIEW conversation_details AS
SELECT 
    c.id,
    c.umbler_conversation_id,
    c.status,
    c.priority,
    c.created_at,
    c.updated_at,
    c.last_message_at,
    c.message_count,
    ct.name as contact_name,
    ct.phone as contact_phone,
    ct.email as contact_email,
    a.name as agent_name,
    a.email as agent_email
FROM conversations c
LEFT JOIN contacts ct ON c.contact_id = ct.id
LEFT JOIN agents a ON c.assigned_agent_id = a.id;

-- View para mensagens recentes
CREATE VIEW recent_messages AS
SELECT 
    m.id,
    m.direction,
    m.message_type,
    m.content,
    m.created_at,
    c.phone as contact_phone,
    c.name as contact_name,
    conv.status as conversation_status
FROM messages m
JOIN contacts c ON m.contact_id = c.id
JOIN conversations conv ON m.conversation_id = conv.id
ORDER BY m.created_at DESC;

-- =============================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY) - OPCIONAL
-- =============================================

-- Habilitar RLS nas tabelas principais (descomente se necessário)
-- ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- =============================================
-- DADOS INICIAIS (SEEDS)
-- =============================================

-- Inserir agente padrão do sistema
INSERT INTO agents (id, name, email, role, status) 
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Sistema Webhook',
    'webhook@sistema.com',
    'admin',
    'active'
) ON CONFLICT (email) DO NOTHING;

-- Templates padrão
INSERT INTO message_templates (name, content, variables, category) VALUES
('Boas-vindas', 'Olá {{nome}}! Bem-vindo ao nosso atendimento. Como posso ajudá-lo hoje?', ARRAY['nome'], 'greeting'),
('Aguarde', 'Obrigado pela sua mensagem! Nossa equipe irá responder em breve.', ARRAY[], 'auto-reply'),
('Encerramento', 'Atendimento finalizado. Obrigado pelo contato, {{nome}}!', ARRAY['nome'], 'closing');

-- =============================================
-- TABELAS CUSTOMIZADAS PARA TEMPO DE RESPOSTA
-- =============================================

-- Tabela de mensagens recebidas via webhook
CREATE TABLE IF NOT EXISTS mensagens_webhook (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telefone TEXT NOT NULL,
    autor TEXT NOT NULL CHECK (autor IN ('cliente', 'atendente')),
    mensagem TEXT NOT NULL,
    data_envio TIMESTAMPTZ NOT NULL,
    criado_em TIMESTAMP DEFAULT NOW()
);

-- Tabela de respostas de atendente para cliente
CREATE TABLE IF NOT EXISTS respostas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telefone TEXT NOT NULL,
    data_cliente TIMESTAMP NOT NULL,
    data_atendente TIMESTAMP NOT NULL,
    tempo_resposta_segundos FLOAT NOT NULL
);

-- =============================================
-- COMENTÁRIOS FINAIS
-- =============================================

-- Este schema foi criado para suportar:
-- 1. Webhook da Umbler com WhatsApp
-- 2. Múltiplos tipos de mensagens (texto, mídia, etc.)
-- 3. Sistema de agentes e atribuição
-- 4. Métricas e relatórios
-- 5. Templates de mensagens
-- 6. Auditoria completa via webhook_events
-- 7. Performance otimizada com índices
-- 8. Triggers automáticos para manter dados consistentes