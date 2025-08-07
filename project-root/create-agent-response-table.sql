-- =============================================
-- TABELA PARA RASTREAMENTO DE TEMPO DE RESPOSTA DOS ATENDENTES
-- =============================================

-- Criar tabela para rastrear tempo de resposta dos atendentes
CREATE TABLE IF NOT EXISTS agent_response_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    contact_name VARCHAR(255),
    
    -- Dados da mensagem do cliente
    customer_message_time TIMESTAMP WITH TIME ZONE NOT NULL,
    customer_message_id VARCHAR(255),
    customer_message_content TEXT,
    
    -- Dados da resposta do atendente
    agent_response_time TIMESTAMP WITH TIME ZONE,
    agent_message_id VARCHAR(255),
    agent_message_content TEXT,
    
    -- Tempo de resposta calculado
    response_time_ms BIGINT,
    response_time_seconds INTEGER,
    response_time_minutes INTEGER,
    
    -- Status de controle
    is_pending BOOLEAN DEFAULT TRUE,
    
    -- Timestamps de controle
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_agent_response_tracking_contact_phone 
ON agent_response_tracking(contact_phone);

CREATE INDEX IF NOT EXISTS idx_agent_response_tracking_chat_id 
ON agent_response_tracking(chat_id);

CREATE INDEX IF NOT EXISTS idx_agent_response_tracking_is_pending 
ON agent_response_tracking(is_pending);

CREATE INDEX IF NOT EXISTS idx_agent_response_tracking_customer_message_time 
ON agent_response_tracking(customer_message_time);

CREATE INDEX IF NOT EXISTS idx_agent_response_tracking_response_time_minutes 
ON agent_response_tracking(response_time_minutes);

CREATE INDEX IF NOT EXISTS idx_agent_response_tracking_updated_at 
ON agent_response_tracking(updated_at);

-- Índice composto para consultas comuns
CREATE INDEX IF NOT EXISTS idx_agent_response_tracking_phone_pending 
ON agent_response_tracking(contact_phone, is_pending);

CREATE INDEX IF NOT EXISTS idx_agent_response_tracking_chat_pending 
ON agent_response_tracking(chat_id, is_pending);

-- Comentários para documentação
COMMENT ON TABLE agent_response_tracking IS 'Tabela para rastrear tempo de resposta dos atendentes às mensagens dos clientes';
COMMENT ON COLUMN agent_response_tracking.chat_id IS 'ID único da conversa/chat';
COMMENT ON COLUMN agent_response_tracking.contact_phone IS 'Telefone do cliente';
COMMENT ON COLUMN agent_response_tracking.contact_name IS 'Nome do cliente';
COMMENT ON COLUMN agent_response_tracking.customer_message_time IS 'Timestamp da mensagem do cliente';
COMMENT ON COLUMN agent_response_tracking.agent_response_time IS 'Timestamp da resposta do atendente';
COMMENT ON COLUMN agent_response_tracking.response_time_ms IS 'Tempo de resposta em milissegundos';
COMMENT ON COLUMN agent_response_tracking.response_time_minutes IS 'Tempo de resposta em minutos (para relatórios)';
COMMENT ON COLUMN agent_response_tracking.is_pending IS 'Se a mensagem ainda está aguardando resposta do atendente';

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_agent_response_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_response_tracking_updated_at_trigger
    BEFORE UPDATE ON agent_response_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_response_tracking_updated_at();

-- View para estatísticas rápidas
CREATE OR REPLACE VIEW agent_response_stats AS
SELECT 
    COUNT(*) as total_responses,
    AVG(response_time_minutes) as avg_response_time_minutes,
    MIN(response_time_minutes) as min_response_time_minutes,
    MAX(response_time_minutes) as max_response_time_minutes,
    COUNT(*) FILTER (WHERE response_time_minutes <= 2) as very_fast_responses,
    COUNT(*) FILTER (WHERE response_time_minutes > 2 AND response_time_minutes <= 5) as fast_responses,
    COUNT(*) FILTER (WHERE response_time_minutes > 5 AND response_time_minutes <= 15) as normal_responses,
    COUNT(*) FILTER (WHERE response_time_minutes > 15 AND response_time_minutes <= 60) as slow_responses,
    COUNT(*) FILTER (WHERE response_time_minutes > 60) as very_slow_responses,
    COUNT(*) FILTER (WHERE is_pending = TRUE) as pending_responses
FROM agent_response_tracking 
WHERE is_pending = FALSE;

-- View para mensagens pendentes com tempo de espera
CREATE OR REPLACE VIEW pending_customer_messages AS
SELECT 
    *,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - customer_message_time))/60 as waiting_time_minutes,
    CASE 
        WHEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - customer_message_time))/60 > 120 THEN 'critical'
        WHEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - customer_message_time))/60 > 30 THEN 'urgent'
        ELSE 'normal'
    END as urgency_level
FROM agent_response_tracking 
WHERE is_pending = TRUE
ORDER BY customer_message_time ASC;

-- Função para limpar dados antigos (opcional - executar periodicamente)
CREATE OR REPLACE FUNCTION cleanup_old_agent_response_data(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM agent_response_tracking 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * days_to_keep
    AND is_pending = FALSE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Exemplo de uso da função de limpeza:
-- SELECT cleanup_old_agent_response_data(90); -- Remove dados de mais de 90 dias

COMMENT ON FUNCTION cleanup_old_agent_response_data IS 'Remove dados antigos da tabela de tempo de resposta dos atendentes';

-- Grant de permissões (ajustar conforme necessário)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON agent_response_tracking TO your_app_user;
-- GRANT SELECT ON agent_response_stats TO your_app_user;
-- GRANT SELECT ON pending_customer_messages TO your_app_user;