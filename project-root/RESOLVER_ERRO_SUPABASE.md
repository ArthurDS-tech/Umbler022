# 🔧 Como Resolver o Erro do Supabase - Guia Completo

## ❌ Problema Identificado

O backend não está enviando informações para o Supabase e as tabelas estão vazias porque:

1. **Credenciais não configuradas**: O arquivo `.env` tem valores de exemplo (placeholders)
2. **Tabelas não existem**: O banco Supabase não tem as tabelas necessárias
3. **Conexão falhando**: Sistema não consegue conectar com o Supabase

## 🚀 Solução Completa (3 Passos)

### Passo 1: Configurar Credenciais do Supabase

#### 1.1 Obter Credenciais
1. Acesse https://supabase.com/dashboard
2. Faça login na sua conta
3. Selecione seu projeto (ou crie um novo)
4. Vá em **Settings** → **API**
5. Copie:
   - **URL**: `https://seu-projeto-id.supabase.co`
   - **Service Role Key**: `eyJ...` (chave longa)

#### 1.2 Configurar Arquivo .env
Execute o script de configuração automática:

```bash
node fix-supabase-configuration.js
```

**OU** configure manualmente:

1. Abra o arquivo `.env` na raiz do projeto
2. Substitua as linhas:
   ```env
   SUPABASE_URL=https://seu-projeto-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### Passo 2: Criar Tabelas no Supabase

#### 2.1 Método Automático (Recomendado)
```bash
node fix-supabase-configuration.js
```

#### 2.2 Método Manual
1. Acesse o Supabase Dashboard
2. Vá para **SQL Editor**
3. Execute este SQL:

```sql
-- Tabela de eventos de webhook
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  source_ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de contatos
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  umbler_contact_id VARCHAR(255) UNIQUE,
  phone_number VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  profile_picture_url TEXT,
  is_blocked BOOLEAN DEFAULT FALSE,
  contact_type VARCHAR(50),
  last_active_utc TIMESTAMPTZ,
  group_identifier VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de chats/conversas
CREATE TABLE IF NOT EXISTS chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  umbler_chat_id VARCHAR(255) UNIQUE,
  contact_id UUID REFERENCES contacts(id),
  channel_id UUID,
  sector_id UUID,
  assigned_member_id UUID,
  status VARCHAR(50) DEFAULT 'open',
  is_open BOOLEAN DEFAULT TRUE,
  is_private BOOLEAN DEFAULT FALSE,
  is_waiting BOOLEAN DEFAULT FALSE,
  waiting_since_utc TIMESTAMPTZ,
  total_unread INTEGER DEFAULT 0,
  total_ai_responses INTEGER DEFAULT 0,
  closed_at_utc TIMESTAMPTZ,
  event_at_utc TIMESTAMPTZ,
  first_contact_message_id VARCHAR(255),
  first_member_reply_message_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de mensagens
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  umbler_message_id VARCHAR(255) UNIQUE,
  chat_id UUID REFERENCES chats(id),
  contact_id UUID REFERENCES contacts(id),
  organization_member_id UUID,
  message_type VARCHAR(50) DEFAULT 'text',
  content TEXT,
  direction VARCHAR(20) DEFAULT 'inbound',
  source VARCHAR(50),
  message_state VARCHAR(50),
  is_private BOOLEAN DEFAULT FALSE,
  event_at_utc TIMESTAMPTZ,
  created_at_utc TIMESTAMPTZ,
  file_id VARCHAR(255),
  template_id VARCHAR(255),
  quoted_message_id VARCHAR(255),
  raw_webhook_data JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabelas auxiliares
CREATE TABLE IF NOT EXISTS channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  umbler_channel_id VARCHAR(255) UNIQUE,
  channel_type VARCHAR(50),
  phone_number VARCHAR(20),
  name VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sectors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  umbler_sector_id VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  is_default BOOLEAN DEFAULT FALSE,
  order_position INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  umbler_member_id VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES contacts(id),
  umbler_tag_id VARCHAR(255),
  tag_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Passo 3: Testar a Configuração

#### 3.1 Iniciar o Servidor
```bash
npm run dev
```

#### 3.2 Testar Conexão
```bash
node test-webhook-supabase.js
```

#### 3.3 Testar Webhook
1. Acesse: http://localhost:3000/webhook/test
2. Deve retornar: `{"success":true,"message":"Webhook funcionando corretamente"}`

#### 3.4 Simular Webhook da Umbler
```bash
curl -X POST http://localhost:3000/webhook/umbler \
  -H "Content-Type: application/json" \
  -d '{
    "Type": "Message",
    "EventDate": "2024-01-15T10:30:00Z",
    "EventId": "test_123",
    "Payload": {
      "Content": {
        "Id": "chat_123",
        "Open": true,
        "Private": false,
        "Waiting": false,
        "TotalUnread": 1,
        "EventAtUTC": "2024-01-15T10:30:00Z",
        "Contact": {
          "Id": "contact_123",
          "PhoneNumber": "+5511999999999",
          "Name": "Teste Webhook",
          "ProfilePictureUrl": null,
          "IsBlocked": false,
          "ContactType": "DirectMessage",
          "LastActiveUTC": "2024-01-15T10:30:00Z",
          "Tags": []
        },
        "Channel": {
          "Id": "channel_123",
          "ChannelType": "WhatsApp",
          "PhoneNumber": "+5511888888888",
          "Name": "Canal Teste"
        },
        "Sector": {
          "Id": "sector_123",
          "Name": "Atendimento",
          "Default": true,
          "Order": 1
        },
        "OrganizationMember": {
          "Id": "member_123"
        },
        "LastMessage": {
          "Id": "msg_123",
          "MessageType": "text",
          "Content": "Mensagem de teste do webhook",
          "Source": "Contact",
          "MessageState": "received",
          "EventAtUTC": "2024-01-15T10:30:00Z",
          "CreatedAtUTC": "2024-01-15T10:30:00Z",
          "IsPrivate": false
        }
      }
    }
  }'
```

## ✅ Verificação dos Resultados

### 1. No Terminal (Logs)
Você deve ver logs como:
```
✅ Conexão com Supabase estabelecida com sucesso
💾 Tentando inserir em "contacts" (tentativa 1/3)
✅ Inserção em "contacts" realizada com sucesso
💾 Tentando inserir em "chats" (tentativa 1/3)
✅ Inserção em "chats" realizada com sucesso
💾 Tentando inserir em "messages" (tentativa 1/3)
✅ Inserção em "messages" realizada com sucesso
```

### 2. No Supabase Dashboard
1. Acesse o Supabase Dashboard
2. Vá para **Table Editor**
3. Verifique se as tabelas têm dados:
   - `webhook_events`: Eventos de webhook registrados
   - `contacts`: Contatos criados
   - `chats`: Conversas registradas
   - `messages`: Mensagens salvas

## 🔍 Diagnóstico de Problemas

### Erro: "TypeError: fetch failed"
**Causa**: Credenciais incorretas ou URL inválida
**Solução**: Verifique as credenciais no arquivo `.env`

### Erro: "relation does not exist"
**Causa**: Tabelas não foram criadas
**Solução**: Execute o SQL no Dashboard do Supabase

### Erro: "duplicate key value violates unique constraint"
**Causa**: Tentando inserir dados duplicados (normal)
**Solução**: Sistema está funcionando, dados já existem

### Dados não aparecem nas tabelas
**Causa**: Webhook não está sendo processado
**Solução**: 
1. Verifique logs do servidor
2. Teste com `curl` ou Postman
3. Verifique se o payload está correto

## 🎯 Resumo da Solução

1. **Configurar credenciais**: `node fix-supabase-configuration.js`
2. **Criar tabelas**: SQL Editor no Supabase Dashboard
3. **Testar**: `npm run dev` + `node test-webhook-supabase.js`
4. **Verificar**: Dados nas tabelas do Supabase

Após seguir esses passos, o sistema deve estar funcionando corretamente e salvando dados no Supabase! 🎉