# 🔗 API Integration Guide

## 📋 Visão Geral

Esta API foi desenvolvida para receber e processar webhooks da Umbler, salvando os dados nas tabelas do Supabase. A API está pronta para integração com qualquer frontend.

## 🚀 Endpoints Principais

### 1. Webhook Umbler
```
POST /webhook/umbler
```

**Descrição:** Recebe webhooks da Umbler e processa os dados

**Headers:**
```
Content-Type: application/json
```

**Body (exemplo):**
```json
{
  "event": "message.received",
  "timestamp": "2025-07-29T21:30:00.000Z",
  "webhook_id": "webhook_123",
  
  "message": {
    "id": "msg_123",
    "type": "text",
    "content": "Olá! Como posso ajudar?",
    "direction": "inbound",
    "timestamp": "2025-07-29T21:30:00.000Z"
  },
  
  "contact": {
    "phone": "+5511999999999",
    "name": "João Silva",
    "email": "joao@exemplo.com"
  },
  
  "conversation": {
    "id": "conv_123",
    "status": "open",
    "channel": "whatsapp"
  }
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "Webhook processado com sucesso",
  "data": {
    "eventId": "uuid-do-evento",
    "processingTime": "150ms",
    "eventType": "message.received"
  }
}
```

### 2. Health Check
```
GET /health
```

**Descrição:** Verifica se a API está funcionando

**Resposta:**
```json
{
  "status": "OK",
  "timestamp": "2025-07-29T21:30:00.000Z",
  "uptime": 3600,
  "environment": "development",
  "version": "1.0.0"
}
```

### 3. Health Check Detalhado
```
GET /health/detailed
```

**Descrição:** Verificação detalhada do status da API

**Resposta:**
```json
{
  "status": "OK",
  "timestamp": "2025-07-29T21:30:00.000Z",
  "uptime": 3600,
  "environment": "development",
  "version": "1.0.0",
  "database": "connected",
  "memory": {
    "rss": 12345678,
    "heapTotal": 9876543,
    "heapUsed": 5432109
  }
}
```

## 📊 Endpoints de Dados

### 4. Listar Contatos
```
GET /api/contacts
```

**Query Parameters:**
- `page` (number): Página (padrão: 1)
- `limit` (number): Itens por página (padrão: 50, máximo: 100)
- `status` (string): Filtrar por status (active, blocked, archived)
- `name` (string): Buscar por nome
- `phone` (string): Buscar por telefone
- `email` (string): Buscar por email

**Resposta:**
```json
{
  "success": true,
  "data": {
    "contacts": [
      {
        "id": "uuid",
        "phone": "+5511999999999",
        "name": "João Silva",
        "email": "joao@exemplo.com",
        "status": "active",
        "created_at": "2025-07-29T21:30:00.000Z",
        "last_interaction": "2025-07-29T21:30:00.000Z"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 50,
    "pages": 2
  }
}
```

### 5. Buscar Contato por ID
```
GET /api/contacts/:id
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "phone": "+5511999999999",
    "name": "João Silva",
    "email": "joao@exemplo.com",
    "status": "active",
    "created_at": "2025-07-29T21:30:00.000Z",
    "last_interaction": "2025-07-29T21:30:00.000Z"
  }
}
```

### 6. Listar Conversas
```
GET /api/conversations
```

**Query Parameters:**
- `page` (number): Página (padrão: 1)
- `limit` (number): Itens por página (padrão: 50, máximo: 100)
- `status` (string): Filtrar por status (open, closed, pending, resolved)
- `channel` (string): Filtrar por canal (whatsapp, telegram, email, chat)
- `priority` (string): Filtrar por prioridade (low, normal, high, urgent)
- `contactId` (string): Filtrar por contato

**Resposta:**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "uuid",
        "contact_id": "uuid",
        "status": "open",
        "channel": "whatsapp",
        "priority": "normal",
        "created_at": "2025-07-29T21:30:00.000Z",
        "last_message_at": "2025-07-29T21:30:00.000Z",
        "message_count": 5,
        "contact": {
          "id": "uuid",
          "name": "João Silva",
          "phone": "+5511999999999"
        }
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 50,
    "pages": 1
  }
}
```

### 7. Buscar Conversa por ID
```
GET /api/conversations/:id
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "contact_id": "uuid",
    "status": "open",
    "channel": "whatsapp",
    "priority": "normal",
    "created_at": "2025-07-29T21:30:00.000Z",
    "last_message_at": "2025-07-29T21:30:00.000Z",
    "message_count": 5,
    "contact": {
      "id": "uuid",
      "name": "João Silva",
      "phone": "+5511999999999"
    },
    "messages": [
      {
        "id": "uuid",
        "direction": "inbound",
        "message_type": "text",
        "content": "Olá!",
        "created_at": "2025-07-29T21:30:00.000Z"
      }
    ]
  }
}
```

### 8. Listar Mensagens
```
GET /api/messages
```

**Query Parameters:**
- `page` (number): Página (padrão: 1)
- `limit` (number): Itens por página (padrão: 50, máximo: 100)
- `conversationId` (string): Filtrar por conversa
- `contactId` (string): Filtrar por contato
- `direction` (string): Filtrar por direção (inbound, outbound)
- `messageType` (string): Filtrar por tipo (text, image, audio, video, document)
- `startDate` (string): Data inicial (ISO)
- `endDate` (string): Data final (ISO)

**Resposta:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "uuid",
        "conversation_id": "uuid",
        "contact_id": "uuid",
        "direction": "inbound",
        "message_type": "text",
        "content": "Olá!",
        "status": "received",
        "created_at": "2025-07-29T21:30:00.000Z",
        "contact": {
          "id": "uuid",
          "name": "João Silva",
          "phone": "+5511999999999"
        }
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 50,
    "pages": 2
  }
}
```

### 9. Buscar Mensagem por ID
```
GET /api/messages/:id
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "conversation_id": "uuid",
    "contact_id": "uuid",
    "direction": "inbound",
    "message_type": "text",
    "content": "Olá!",
    "status": "received",
    "created_at": "2025-07-29T21:30:00.000Z",
    "contact": {
      "id": "uuid",
      "name": "João Silva",
      "phone": "+5511999999999"
    },
    "conversation": {
      "id": "uuid",
      "status": "open"
    }
  }
}
```

## 📈 Endpoints de Estatísticas

### 10. Estatísticas de Contatos
```
GET /api/contacts/stats?period=24h
```

**Query Parameters:**
- `period` (string): Período (1h, 24h, 7d, 30d, 90d)

**Resposta:**
```json
{
  "success": true,
  "data": {
    "period": "24h",
    "total_contacts": 150,
    "new_contacts": 25,
    "active_contacts": 80,
    "by_status": {
      "active": 120,
      "blocked": 5,
      "archived": 25
    }
  }
}
```

### 11. Estatísticas de Conversas
```
GET /api/conversations/stats?period=24h
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "period": "24h",
    "stats": {
      "total": 50,
      "open": 15,
      "closed": 30,
      "pending": 3,
      "resolved": 2,
      "unassigned": 10,
      "byPriority": {
        "low": 10,
        "normal": 25,
        "high": 10,
        "urgent": 5
      },
      "byChannel": {
        "whatsapp": 45,
        "telegram": 5
      },
      "averageResolutionTime": 45
    }
  }
}
```

### 12. Estatísticas de Mensagens
```
GET /api/messages/stats?period=24h
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "period": "24h",
    "stats": {
      "total": 200,
      "inbound": 120,
      "outbound": 80,
      "unread": 15,
      "byType": {
        "text": 150,
        "image": 30,
        "audio": 10,
        "video": 10
      },
      "byStatus": {
        "sent": 80,
        "delivered": 70,
        "read": 50
      }
    }
  }
}
```

## 🔧 Endpoints de Gerenciamento

### 13. Atualizar Status de Conversa
```
PUT /api/conversations/:id
```

**Body:**
```json
{
  "status": "closed",
  "assignedAgentId": "uuid",
  "priority": "high"
}
```

### 14. Marcar Mensagens como Lidas
```
PUT /api/messages/read
```

**Body:**
```json
{
  "messageIds": ["uuid1", "uuid2", "uuid3"]
}
```

### 15. Atribuir Conversa a Agente
```
PUT /api/conversations/:id/assign
```

**Body:**
```json
{
  "agentId": "uuid"
}
```

## 🛠️ Configuração para Frontend

### CORS
A API está configurada para aceitar requisições de:
- `http://localhost:3000`
- `http://localhost:3001`

Para adicionar outros domínios, configure `CORS_ORIGIN` no arquivo `.env`.

### Autenticação
Atualmente a API não requer autenticação para os endpoints públicos. Para adicionar autenticação:

1. Configure `JWT_SECRET` no arquivo `.env`
2. Implemente middleware de autenticação
3. Proteja os endpoints necessários

### Rate Limiting
A API possui rate limiting configurado:
- **Global:** 100 requisições por 15 minutos
- **Webhook:** 1000 requisições por 15 minutos

## 📝 Exemplos de Uso

### JavaScript (Fetch)
```javascript
// Listar contatos
const response = await fetch('http://localhost:3000/api/contacts?page=1&limit=10');
const data = await response.json();

// Buscar conversa
const conversation = await fetch('http://localhost:3000/api/conversations/uuid');
const convData = await conversation.json();

// Atualizar status
await fetch('http://localhost:3000/api/conversations/uuid', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'closed' })
});
```

### JavaScript (Axios)
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
});

// Listar contatos
const contacts = await api.get('/contacts', {
  params: { page: 1, limit: 10 }
});

// Buscar conversa
const conversation = await api.get('/conversations/uuid');

// Atualizar status
await api.put('/conversations/uuid', { status: 'closed' });
```

### React Hook (useSWR)
```javascript
import useSWR from 'swr';

const fetcher = url => fetch(url).then(r => r.json());

function useContacts(page = 1, limit = 10) {
  const { data, error, mutate } = useSWR(
    `/api/contacts?page=${page}&limit=${limit}`,
    fetcher
  );

  return {
    contacts: data?.data?.contacts || [],
    total: data?.data?.total || 0,
    isLoading: !error && !data,
    isError: error,
    mutate
  };
}
```

## 🚨 Tratamento de Erros

### Códigos de Status HTTP
- `200`: Sucesso
- `400`: Dados inválidos
- `401`: Não autorizado
- `404`: Não encontrado
- `429`: Rate limit excedido
- `500`: Erro interno do servidor

### Formato de Erro
```json
{
  "success": false,
  "error": "Mensagem de erro",
  "code": "ERROR_CODE",
  "details": [
    {
      "field": "campo",
      "message": "Erro específico"
    }
  ]
}
```

## 📊 WebSocket (Opcional)

Para atualizações em tempo real, você pode implementar WebSocket:

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'new_message':
      // Atualizar interface
      break;
    case 'conversation_updated':
      // Atualizar conversa
      break;
  }
};
```

## 🔒 Segurança

### Headers Recomendados
```javascript
const headers = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer YOUR_TOKEN', // Se implementar auth
  'X-Requested-With': 'XMLHttpRequest'
};
```

### Validação de Dados
Sempre valide os dados antes de enviar para a API:

```javascript
function validateContact(contact) {
  if (!contact.phone) {
    throw new Error('Telefone é obrigatório');
  }
  
  if (contact.email && !isValidEmail(contact.email)) {
    throw new Error('Email inválido');
  }
  
  return true;
}
```

## 📱 PWA Support

Para Progressive Web Apps, adicione ao seu `manifest.json`:

```json
{
  "name": "Umbler Webhook Dashboard",
  "short_name": "Umbler",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000"
}
```

## 🎯 Próximos Passos

1. **Implemente o frontend** usando a documentação acima
2. **Configure CORS** para seus domínios
3. **Implemente autenticação** se necessário
4. **Adicione WebSocket** para atualizações em tempo real
5. **Configure monitoramento** para produção

A API está pronta para integração! 🚀