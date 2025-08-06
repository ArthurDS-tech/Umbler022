# 🚀 Sistema de Webhook Umbler com Supabase

Sistema completo para receber e processar webhooks da Umbler, armazenando os dados no Supabase de forma organizada e estruturada.

## 📋 Pré-requisitos

- Node.js 16+ 
- Conta no [Supabase](https://supabase.com)
- Projeto criado no Supabase

## 🔧 Configuração Rápida

### Passo 1: Obter Credenciais do Supabase

1. **Acesse o Dashboard do Supabase**
   - Vá para: https://supabase.com/dashboard
   - Faça login na sua conta

2. **Selecione ou Crie um Projeto**
   - Clique no projeto que você quer usar
   - Se não tem projeto, crie um novo

3. **Obter as Credenciais**
   - No menu lateral, clique em **Settings** → **API**
   - Copie as seguintes informações:
     - **Project URL** (ex: `https://abcdefg.supabase.co`)
     - **anon public** (chave que começa com `eyJ`)
     - **service_role** (chave que começa com `eyJ`)

### Passo 2: Configurar Arquivo .env

1. **Edite o arquivo `.env`** na raiz do projeto
2. **Substitua as credenciais pelos valores reais:**

```env
# =============================================
# SUPABASE CONFIGURATION (OBRIGATÓRIO)
# =============================================

# Supabase project URL (substitua pela URL real do seu projeto)
SUPABASE_URL=https://seu-projeto-id.supabase.co

# Supabase anon/public key (substitua pela chave real)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase service role key (substitua pela chave real)  
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# =============================================
# OUTRAS CONFIGURAÇÕES
# =============================================

NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Secret para validação de webhooks (opcional)
WEBHOOK_SECRET=seu_webhook_secret_aqui

# Outras configurações...
```

⚠️ **IMPORTANTE**: 
- Substitua `https://seu-projeto-id.supabase.co` pela URL real do seu projeto
- Substitua as chaves pelas chaves reais (são muito longas)
- **NUNCA** compartilhe essas chaves publicamente

### Passo 3: Instalar Dependências

```bash
npm install
```

### Passo 4: Configurar Banco de Dados

Execute o script de configuração completa:

```bash
node setup-supabase-complete.js
```

Este script irá:
- ✅ Verificar conexão com Supabase
- ✅ Criar todas as tabelas necessárias
- ✅ Criar índices para performance
- ✅ Testar inserção de dados

### Passo 5: Iniciar o Sistema

```bash
npm run dev
```

O servidor estará disponível em: http://localhost:3000

### Passo 6: Testar o Sistema

Execute o teste completo:

```bash
node test-webhook-supabase.js
```

## 📊 Estrutura do Banco de Dados

O sistema cria as seguintes tabelas no Supabase:

### Tabelas Principais

- **`webhook_events`** - Eventos de webhook recebidos
- **`contacts`** - Contatos/clientes
- **`chats`** - Conversas/atendimentos  
- **`messages`** - Mensagens
- **`channels`** - Canais de comunicação
- **`sectors`** - Setores de atendimento
- **`organization_members`** - Membros da organização
- **`contact_tags`** - Tags dos contatos
- **`message_reactions`** - Reações das mensagens

### Relacionamentos

```
contacts (1) → (N) chats → (N) messages
channels (1) → (N) chats
sectors (1) → (N) chats  
organization_members (1) → (N) chats
contacts (1) → (N) contact_tags
messages (1) → (N) message_reactions
```

## 🔗 Endpoints da API

### Webhook Principal
- **POST** `/webhook/umbler` - Receber webhooks da Umbler

### Endpoints de Teste
- **GET** `/webhook/test` - Testar se o webhook está funcionando
- **GET** `/health` - Status do sistema
- **GET** `/health/detailed` - Status detalhado com informações do banco

### Endpoints de Administração
- **GET** `/webhook/events` - Listar eventos de webhook
- **GET** `/webhook/stats` - Estatísticas dos webhooks
- **POST** `/webhook/retry/:eventId` - Reprocessar evento que falhou

## 🧪 Testando o Sistema

### 1. Teste Básico de Conexão

```bash
curl http://localhost:3000/health
```

### 2. Teste do Webhook

```bash
curl -X POST http://localhost:3000/webhook/test
```

### 3. Teste Completo com Dados

```bash
node test-webhook-supabase.js
```

### 4. Simular Webhook da Umbler

```bash
curl -X POST http://localhost:3000/webhook/umbler \
  -H "Content-Type: application/json" \
  -d '{
    "Type": "Message",
    "EventDate": "2024-01-01T12:00:00Z",
    "EventId": "test123",
    "Payload": {
      "Content": {
        "Id": "chat123",
        "Contact": {
          "Id": "contact123",
          "PhoneNumber": "+5511999999999",
          "Name": "Teste"
        },
        "LastMessage": {
          "Id": "msg123",
          "Content": "Olá!",
          "MessageType": "text"
        }
      }
    }
  }'
```

## 📈 Monitoramento

### Verificar Dados no Supabase

1. **Acesse o Dashboard do Supabase**
2. **Vá para Table Editor**
3. **Verifique as tabelas:**
   - `webhook_events` - Eventos recebidos
   - `contacts` - Contatos criados
   - `chats` - Conversas
   - `messages` - Mensagens

### Logs do Sistema

O sistema gera logs detalhados em:
- Console (desenvolvimento)
- Arquivo `logs/app.log` (produção)

### Métricas Importantes

- **Taxa de sucesso** dos webhooks
- **Tempo de processamento** 
- **Erros de conexão** com Supabase
- **Volume de dados** por tabela

## 🔧 Solução de Problemas

### Problema: "Credenciais não configuradas"

**Solução:**
1. Verifique se o arquivo `.env` existe
2. Confirme se as variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estão definidas
3. Execute: `node setup-supabase-complete.js`

### Problema: "Tabelas não existem"

**Solução:**
1. Execute: `node setup-supabase-complete.js`
2. Verifique no Dashboard do Supabase se as tabelas foram criadas
3. Confirme as permissões RLS (Row Level Security)

### Problema: "Erro de conexão com Supabase"

**Solução:**
1. Verifique se o projeto Supabase está ativo
2. Confirme se as credenciais estão corretas
3. Teste a conexão: `node test-webhook-supabase.js`

### Problema: "Webhook não está salvando dados"

**Solução:**
1. Verifique os logs do sistema
2. Execute o teste: `node test-webhook-supabase.js`
3. Confirme se as tabelas têm as permissões corretas
4. Verifique se o payload do webhook está no formato esperado

## 🚀 Deploy em Produção

### Variáveis de Ambiente Obrigatórias

```env
NODE_ENV=production
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
WEBHOOK_SECRET=seu_secret_seguro
```

### Configurações Recomendadas

```env
# Segurança
TRUST_PROXY=true
CORS_CREDENTIALS=true

# Performance
DB_MAX_CONNECTIONS=20
CACHE_ENABLED=true

# Monitoramento
LOG_LEVEL=info
MONITORING_ENABLED=true

# Limpeza automática
CLEANUP_ENABLED=true
BACKUP_ENABLED=true
```

## 📚 Documentação Adicional

- [Documentação da API Umbler](https://docs.umbler.com)
- [Documentação do Supabase](https://supabase.com/docs)
- [Guia de Webhooks](./WEBHOOK-GUIDE.md)

## 🆘 Suporte

Se encontrar problemas:

1. **Verifique os logs** do sistema
2. **Execute os testes** de diagnóstico
3. **Consulte a documentação** do Supabase
4. **Verifique as configurações** do projeto Umbler

---

✅ **Sistema configurado e funcionando!** 

O webhook está pronto para receber dados da Umbler e armazenar no Supabase automaticamente.