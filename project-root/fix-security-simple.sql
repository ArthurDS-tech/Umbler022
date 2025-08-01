-- =============================================
-- CORREÇÃO SIMPLIFICADA DOS PROBLEMAS DE SEGURANÇA
-- =============================================

-- 1. HABILITAR RLS EM TODAS AS TABELAS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- 2. REMOVER POLÍTICAS EXISTENTES (SE HOUVER)
DROP POLICY IF EXISTS "Enable all operations for service_role" ON public.contacts;
DROP POLICY IF EXISTS "Enable all operations for service_role" ON public.conversations;
DROP POLICY IF EXISTS "Enable all operations for service_role" ON public.messages;
DROP POLICY IF EXISTS "Enable all operations for service_role" ON public.webhook_events;

-- 3. CRIAR POLÍTICAS PARA SERVICE_ROLE (ACESSO COMPLETO)
CREATE POLICY "Enable all operations for service_role" ON public.contacts
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all operations for service_role" ON public.conversations
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all operations for service_role" ON public.messages
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all operations for service_role" ON public.webhook_events
    FOR ALL USING (auth.role() = 'service_role');

-- 4. POLÍTICAS PARA USUÁRIOS AUTENTICADOS (SE NECESSÁRIO)
CREATE POLICY "Enable read access for authenticated users" ON public.contacts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON public.conversations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON public.messages
    FOR SELECT USING (auth.role() = 'authenticated');