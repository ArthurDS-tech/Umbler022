# 🔐 Guia de Segurança do Supabase - Problemas e Soluções

## ❌ Problemas Identificados pelo Database Linter

O Database Linter do Supabase identificou **8 problemas críticos de segurança** no seu banco de dados:

### 1. **RLS Disabled in Public** (6 ocorrências)
- **Problema**: Row Level Security (RLS) não habilitado nas tabelas públicas
- **Tabelas afetadas**: `contacts`, `conversations`, `messages`, `webhook_events`, `agents`, `message_templates`, `conversation_metrics`
- **Risco**: Qualquer usuário pode acessar todos os dados sem restrições

### 2. **Security Definer View** (2 ocorrências)  
- **Problema**: Views criadas com propriedade SECURITY DEFINER
- **Views afetadas**: `recent_messages`, `conversation_details`
- **Risco**: Views executam com permissões do criador, não do usuário atual

## ✅ Soluções Implementadas

### 🛡️ **Row Level Security (RLS)**

**O que é RLS?**
- Sistema de segurança que controla acesso a linhas individuais nas tabelas
- Permite criar políticas granulares de acesso
- Essencial para aplicações multi-tenant ou com diferentes níveis de acesso

**Como foi corrigido:**
```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
```

### 📜 **Políticas de Segurança**

**Política para Service Role:**
```sql
-- Permitir acesso completo para service_role (usado pelo backend)
CREATE POLICY "Enable all operations for service_role" ON public.contacts
    FOR ALL USING (auth.role() = 'service_role');
```

**Por que essa política?**
- `service_role` é usado pelo seu backend Node.js
- Permite operações completas (CREATE, READ, UPDATE, DELETE)
- Garante que o webhook continue funcionando normalmente

### 🔍 **Correção das Views**

**Problema das Views SECURITY DEFINER:**
- Views executavam com permissões do criador
- Podiam contornar políticas RLS
- Representavam risco de escalação de privilégios

**Solução:**
```sql
-- Remover views problemáticas
DROP VIEW IF EXISTS public.recent_messages;
DROP VIEW IF EXISTS public.conversation_details;

-- Recriar sem SECURITY DEFINER
CREATE VIEW public.recent_messages AS
SELECT m.id, m.content, m.direction, ...
FROM messages m
JOIN contacts c ON m.contact_id = c.id
...
```

## 🚀 Como Aplicar as Correções

### Método 1: Script Automatizado (Recomendado)
```bash
node apply-security-fixes.js
```

Este script irá:
- ✅ Habilitar RLS em todas as tabelas
- ✅ Criar políticas de segurança apropriadas  
- ✅ Corrigir views problemáticas
- ✅ Verificar se as correções foram aplicadas

### Método 2: Manual no Supabase Dashboard
1. Acesse: **Supabase Dashboard > SQL Editor**
2. Cole o conteúdo do arquivo `fix-security-simple.sql`
3. Execute o script
4. Verifique no Database Linter se os erros foram resolvidos

## 📊 Verificação das Correções

### Verificar RLS Habilitado:
```sql
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Verificar Políticas Criadas:
```sql
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;
```

## 🔒 Níveis de Segurança Implementados

### 1. **Service Role** (Backend)
- **Acesso**: Completo (CRUD)
- **Uso**: Operações do webhook e API
- **Justificativa**: Backend precisa de acesso total para processar dados

### 2. **Authenticated Users** (Usuários Logados)
- **Acesso**: Apenas leitura
- **Uso**: Interfaces de usuário autenticadas
- **Justificativa**: Usuários podem visualizar dados relevantes

### 3. **Anonymous Users** (Não Logados)
- **Acesso**: Negado por padrão
- **Justificativa**: Dados sensíveis protegidos

## ⚠️ Impacto nas Operações

### ✅ **O que CONTINUA funcionando:**
- Webhook da Umbler (usa service_role)
- Inserção de contatos e mensagens
- APIs do backend
- Todas as operações existentes

### 🔄 **O que pode precisar de ajuste:**
- Queries diretas do frontend (se houver)
- Acesso via anon key (agora restrito)
- Views customizadas (podem precisar de políticas)

## 🛠️ Troubleshooting

### Erro: "permission denied for table"
**Causa**: RLS habilitado mas sem políticas adequadas
**Solução**: Verificar se as políticas foram criadas corretamente

### Erro: "new row violates row-level security policy"
**Causa**: Tentativa de inserir dados que não atendem às políticas
**Solução**: Verificar se está usando a service_role key

### Frontend não consegue acessar dados
**Causa**: RLS bloqueando acesso anônimo
**Solução**: Implementar autenticação ou criar políticas específicas

## 📋 Checklist de Segurança

Após aplicar as correções, verifique:

- [ ] Database Linter não mostra mais erros de RLS
- [ ] Database Linter não mostra mais erros de SECURITY DEFINER
- [ ] Webhook continua funcionando normalmente
- [ ] Inserção de dados via API funciona
- [ ] Consultas do frontend funcionam (se aplicável)
- [ ] Logs não mostram erros de permissão

## 🎯 Resultado Final

Após aplicar todas as correções:

✅ **Segurança Melhorada**
- RLS habilitado em todas as tabelas
- Políticas granulares de acesso
- Views seguras sem SECURITY DEFINER

✅ **Funcionalidade Preservada**  
- Webhook continua operacional
- APIs do backend funcionam normalmente
- Inserção de dados mantida

✅ **Conformidade**
- Database Linter sem erros críticos
- Melhores práticas de segurança aplicadas
- Preparado para produção

---

## 🚀 Executar Correções

**Para aplicar todas as correções automaticamente:**

```bash
node apply-security-fixes.js
```

**Depois, verifique no Supabase Dashboard:**
- Database > Database Linter
- Confirme que não há mais erros de segurança

🎉 **Seu banco de dados estará seguro e funcionando perfeitamente!**