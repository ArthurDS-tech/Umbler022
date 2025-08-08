-- Script para criar as tabelas que estão faltando no Supabase
-- Execute este script no SQL Editor do Supabase

-- 1. Criar tabela mensagens_webhook
CREATE TABLE IF NOT EXISTS mensagens_webhook (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    telefone VARCHAR(20) NOT NULL,
    autor VARCHAR(20) NOT NULL CHECK (autor IN ('cliente', 'atendente')),
    mensagem TEXT NOT NULL,
    data_envio TIMESTAMP WITH TIME ZONE NOT NULL,
    umbler_message_id VARCHAR(100),
    umbler_contact_id VARCHAR(100),
    umbler_member_id VARCHAR(100),
    source VARCHAR(50),
    message_type VARCHAR(50),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_mensagens_webhook_telefone ON mensagens_webhook(telefone);
CREATE INDEX IF NOT EXISTS idx_mensagens_webhook_autor ON mensagens_webhook(autor);
CREATE INDEX IF NOT EXISTS idx_mensagens_webhook_data_envio ON mensagens_webhook(data_envio);
CREATE INDEX IF NOT EXISTS idx_mensagens_webhook_umbler_message_id ON mensagens_webhook(umbler_message_id);

-- 2. Criar tabela respostas
CREATE TABLE IF NOT EXISTS respostas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    telefone VARCHAR(20) NOT NULL,
    data_cliente TIMESTAMP WITH TIME ZONE NOT NULL,
    data_atendente TIMESTAMP WITH TIME ZONE NOT NULL,
    tempo_resposta_segundos DECIMAL(10,2) NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_respostas_telefone ON respostas(telefone);
CREATE INDEX IF NOT EXISTS idx_respostas_data_cliente ON respostas(data_cliente);
CREATE INDEX IF NOT EXISTS idx_respostas_tempo_resposta ON respostas(tempo_resposta_segundos);

-- 3. Criar tabela customer_response_times (se necessário)
CREATE TABLE IF NOT EXISTS customer_response_times (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id UUID REFERENCES contacts(id),
    conversation_id UUID REFERENCES conversations(id),
    message_id UUID REFERENCES messages(id),
    customer_message_time TIMESTAMP WITH TIME ZONE NOT NULL,
    agent_response_time TIMESTAMP WITH TIME ZONE NOT NULL,
    response_time_seconds DECIMAL(10,2) NOT NULL,
    agent_id VARCHAR(100),
    channel VARCHAR(50),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_customer_response_times_contact_id ON customer_response_times(contact_id);
CREATE INDEX IF NOT EXISTS idx_customer_response_times_conversation_id ON customer_response_times(conversation_id);
CREATE INDEX IF NOT EXISTS idx_customer_response_times_response_time ON customer_response_times(response_time_seconds);

-- 4. Adicionar comentários para documentação
COMMENT ON TABLE mensagens_webhook IS 'Tabela para armazenar mensagens processadas via webhook da Umbler';
COMMENT ON TABLE respostas IS 'Tabela para armazenar tempos de resposta dos atendentes';
COMMENT ON TABLE customer_response_times IS 'Tabela para armazenar tempos de resposta dos clientes';

-- 5. Configurar RLS (Row Level Security) se necessário
-- ALTER TABLE mensagens_webhook ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE respostas ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE customer_response_times ENABLE ROW LEVEL SECURITY;

-- 6. Criar políticas de acesso (ajuste conforme suas necessidades)
-- CREATE POLICY "Enable read access for all users" ON mensagens_webhook FOR SELECT USING (true);
-- CREATE POLICY "Enable insert access for authenticated users" ON mensagens_webhook FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Enable update access for authenticated users" ON mensagens_webhook FOR UPDATE USING (true);

-- CREATE POLICY "Enable read access for all users" ON respostas FOR SELECT USING (true);
-- CREATE POLICY "Enable insert access for authenticated users" ON respostas FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Enable update access for authenticated users" ON respostas FOR UPDATE USING (true);

-- CREATE POLICY "Enable read access for all users" ON customer_response_times FOR SELECT USING (true);
-- CREATE POLICY "Enable insert access for authenticated users" ON customer_response_times FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Enable update access for authenticated users" ON customer_response_times FOR UPDATE USING (true);
