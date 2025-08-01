-- =============================================
-- CORREÇÃO DOS PROBLEMAS DE SEGURANÇA DO SUPABASE
-- =============================================
-- Este script corrige todos os problemas identificados pelo Database Linter

-- =============================================
-- 1. HABILITAR RLS (Row Level Security) EM TODAS AS TABELAS
-- =============================================

-- Habilitar RLS na tabela contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS na tabela conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS na tabela messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS na tabela webhook_events
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS na tabela agents (se existir)
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS na tabela message_templates (se existir)
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS na tabela conversation_metrics (se existir)
ALTER TABLE public.conversation_metrics ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 2. CRIAR POLÍTICAS RLS PARA ACESSO PÚBLICO
-- =============================================

-- Política para contacts - permitir acesso completo para service_role
CREATE POLICY "Enable all operations for service_role" ON public.contacts
    FOR ALL USING (auth.role() = 'service_role');

-- Política para conversations - permitir acesso completo para service_role
CREATE POLICY "Enable all operations for service_role" ON public.conversations
    FOR ALL USING (auth.role() = 'service_role');

-- Política para messages - permitir acesso completo para service_role
CREATE POLICY "Enable all operations for service_role" ON public.messages
    FOR ALL USING (auth.role() = 'service_role');

-- Política para webhook_events - permitir acesso completo para service_role
CREATE POLICY "Enable all operations for service_role" ON public.webhook_events
    FOR ALL USING (auth.role() = 'service_role');

-- Política para agents (se existir)
CREATE POLICY "Enable all operations for service_role" ON public.agents
    FOR ALL USING (auth.role() = 'service_role');

-- Política para message_templates (se existir)
CREATE POLICY "Enable all operations for service_role" ON public.message_templates
    FOR ALL USING (auth.role() = 'service_role');

-- Política para conversation_metrics (se existir)
CREATE POLICY "Enable all operations for service_role" ON public.conversation_metrics
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- 3. POLÍTICAS ADICIONAIS PARA DIFERENTES CENÁRIOS
-- =============================================

-- Política para permitir leitura pública de contacts (se necessário)
CREATE POLICY "Enable read access for anon users" ON public.contacts
    FOR SELECT USING (true);

-- Política para permitir leitura pública de conversations (se necessário)
CREATE POLICY "Enable read access for anon users" ON public.conversations
    FOR SELECT USING (true);

-- Política para permitir leitura pública de messages (se necessário)
CREATE POLICY "Enable read access for anon users" ON public.messages
    FOR SELECT USING (true);

-- =============================================
-- 4. CORRIGIR VIEWS COM SECURITY DEFINER
-- =============================================

-- Remover views existentes com SECURITY DEFINER
DROP VIEW IF EXISTS public.recent_messages;
DROP VIEW IF EXISTS public.conversation_details;

-- Recriar view recent_messages sem SECURITY DEFINER
CREATE VIEW public.recent_messages AS
SELECT 
    m.id,
    m.content,
    m.direction,
    m.message_type,
    m.status,
    m.created_at,
    c.phone,
    c.name as contact_name,
    conv.id as conversation_id,
    conv.status as conversation_status
FROM messages m
JOIN contacts c ON m.contact_id = c.id
JOIN conversations conv ON m.conversation_id = conv.id
WHERE m.created_at >= NOW() - INTERVAL '7 days'
ORDER BY m.created_at DESC;

-- Recriar view conversation_details sem SECURITY DEFINER
CREATE VIEW public.conversation_details AS
SELECT 
    conv.id,
    conv.status,
    conv.channel,
    conv.created_at,
    conv.updated_at,
    c.phone,
    c.name as contact_name,
    c.email as contact_email,
    COUNT(m.id) as message_count,
    MAX(m.created_at) as last_message_at
FROM conversations conv
JOIN contacts c ON conv.contact_id = c.id
LEFT JOIN messages m ON conv.id = m.conversation_id
GROUP BY conv.id, c.id;

-- =============================================
-- 5. HABILITAR RLS NAS VIEWS (SE SUPORTADO)
-- =============================================

-- Nota: Views herdam as políticas RLS das tabelas subjacentes
-- Não é necessário habilitar RLS diretamente nas views

-- =============================================
-- 6. VERIFICAR SE AS TABELAS EXISTEM ANTES DE APLICAR CORREÇÕES
-- =============================================

-- Função para verificar se uma tabela existe
CREATE OR REPLACE FUNCTION table_exists(table_name text, schema_name text DEFAULT 'public')
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = schema_name 
        AND table_name = table_exists.table_name
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 7. APLICAR CORREÇÕES CONDICIONALMENTE
-- =============================================

-- Aplicar RLS apenas se as tabelas existirem
DO $$
BEGIN
    -- Verificar e aplicar RLS para agents
    IF table_exists('agents') THEN
        ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Enable all operations for service_role" ON public.agents;
        CREATE POLICY "Enable all operations for service_role" ON public.agents
            FOR ALL USING (auth.role() = 'service_role');
    END IF;

    -- Verificar e aplicar RLS para message_templates
    IF table_exists('message_templates') THEN
        ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Enable all operations for service_role" ON public.message_templates;
        CREATE POLICY "Enable all operations for service_role" ON public.message_templates
            FOR ALL USING (auth.role() = 'service_role');
    END IF;

    -- Verificar e aplicar RLS para conversation_metrics
    IF table_exists('conversation_metrics') THEN
        ALTER TABLE public.conversation_metrics ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Enable all operations for service_role" ON public.conversation_metrics;
        CREATE POLICY "Enable all operations for service_role" ON public.conversation_metrics
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- =============================================
-- 8. LIMPAR FUNÇÃO TEMPORÁRIA
-- =============================================

DROP FUNCTION IF EXISTS table_exists(text, text);

-- =============================================
-- 9. VERIFICAR CONFIGURAÇÕES DE SEGURANÇA
-- =============================================

-- Verificar se RLS está habilitado em todas as tabelas
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Listar todas as políticas RLS criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;