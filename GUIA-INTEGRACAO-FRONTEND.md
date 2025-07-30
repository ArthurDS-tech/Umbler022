# 🚀 Guia Completo de Integração Frontend-Backend

## 📋 Visão Geral do Backend

Este é um backend completo para webhook da Umbler integrado com Supabase, oferecendo:

- **API RESTful** para gerenciamento de contatos, mensagens e conversas
- **Webhook endpoint** para receber eventos da Umbler
- **Banco de dados PostgreSQL** via Supabase
- **Sistema de logs** e monitoramento
- **Túnel público** para desenvolvimento
- **Interface web** para testes

## 🏗️ Estrutura do Backend

```
project-root/
├── src/
│   ├── app.js              # Aplicação principal
│   ├── config/             # Configurações
│   ├── controllers/        # Controladores da API
│   ├── middleware/         # Middlewares
│   ├── routes/            # Rotas da API
│   ├── services/          # Lógica de negócio
│   └── utils/             # Utilitários
├── public/                # Interface web
├── schema.sql            # Schema do banco
└── package.json          # Dependências
```

## 🔧 Passo a Passo da Integração

### 1. Configuração Inicial

#### 1.1 Instalar Dependências
```bash
cd project-root
npm install
```

#### 1.2 Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto:

```env
# =============================================
# CONFIGURAÇÕES BÁSICAS
# =============================================
NODE_ENV=development
PORT=3000
HOST=localhost

# =============================================
# SUPABASE (OBRIGATÓRIO)
# =============================================
SUPABASE_URL=sua_url_do_supabase
SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role

# =============================================
# SEGURANÇA
# =============================================
JWT_SECRET=sua_chave_jwt_secreta_muito_segura
WEBHOOK_SECRET=chave_secreta_do_webhook_umbler

# =============================================
# CORS (para seu frontend)
# =============================================
CORS_ORIGIN=http://localhost:3001,http://localhost:5173,http://localhost:8080
CORS_CREDENTIALS=true

# =============================================
# NGROK (para túnel público)
# =============================================
NGROK_AUTHTOKEN=seu_token_ngrok
NGROK_SUBDOMAIN=seu_subdominio

# =============================================
# OPCIONAIS
# =============================================
LOG_LEVEL=info
DEBUG=true
AUTO_START_TUNNEL=true
```

#### 1.3 Configurar Banco de Dados
Execute o schema SQL no seu Supabase:

```bash
# Copie o conteúdo de schema.sql e execute no Supabase SQL Editor
```

### 2. Iniciar o Backend

#### 2.1 Modo Desenvolvimento
```bash
npm run dev
```

#### 2.2 Modo Produção
```bash
npm start
```

### 3. Endpoints Disponíveis

#### 3.1 Health Check
```javascript
GET /health
GET /health/detailed
```

#### 3.2 Webhook Umbler
```javascript
POST /webhook/umbler
```

#### 3.3 API de Contatos
```javascript
GET    /api/contacts          # Listar contatos
POST   /api/contacts          # Criar contato
GET    /api/contacts/:id      # Buscar contato
PUT    /api/contacts/:id      # Atualizar contato
DELETE /api/contacts/:id      # Deletar contato
```

#### 3.4 API de Mensagens
```javascript
GET    /api/messages          # Listar mensagens
POST   /api/messages          # Enviar mensagem
GET    /api/messages/:id      # Buscar mensagem
PUT    /api/messages/:id      # Atualizar mensagem
DELETE /api/messages/:id      # Deletar mensagem
```

#### 3.5 API de Conversas
```javascript
GET    /api/conversations     # Listar conversas
POST   /api/conversations     # Criar conversa
GET    /api/conversations/:id # Buscar conversa
PUT    /api/conversations/:id # Atualizar conversa
DELETE /api/conversations/:id # Deletar conversa
```

#### 3.6 API Geral
```javascript
GET    /api/status           # Status do sistema
GET    /api/webhook/info     # Info do webhook
GET    /api/logs/recent      # Logs recentes
POST   /api/tunnel/start     # Iniciar túnel
POST   /api/tunnel/stop      # Parar túnel
```

### 4. Integração com Frontend

#### 4.1 Configuração do CORS
O backend já está configurado para aceitar requisições do frontend. Adicione seu domínio ao `CORS_ORIGIN`:

```env
CORS_ORIGIN=http://localhost:3001,http://localhost:5173,https://seu-dominio.com
```

#### 4.2 Exemplo de Cliente HTTP (JavaScript)

```javascript
// config/api.js
const API_BASE_URL = 'http://localhost:3000/api';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro na requisição');
      }
      
      return data;
    } catch (error) {
      console.error('Erro na API:', error);
      throw error;
    }
  }

  // Contatos
  async getContacts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/contacts?${queryString}`);
  }

  async createContact(contactData) {
    return this.request('/contacts', {
      method: 'POST',
      body: JSON.stringify(contactData),
    });
  }

  async updateContact(id, contactData) {
    return this.request(`/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(contactData),
    });
  }

  async deleteContact(id) {
    return this.request(`/contacts/${id}`, {
      method: 'DELETE',
    });
  }

  // Mensagens
  async getMessages(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/messages?${queryString}`);
  }

  async sendMessage(messageData) {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  // Conversas
  async getConversations(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/conversations?${queryString}`);
  }

  async createConversation(conversationData) {
    return this.request('/conversations', {
      method: 'POST',
      body: JSON.stringify(conversationData),
    });
  }

  // Status e Info
  async getSystemStatus() {
    return this.request('/status');
  }

  async getWebhookInfo() {
    return this.request('/webhook/info');
  }

  async getRecentLogs() {
    return this.request('/logs/recent');
  }
}

export default new ApiClient();
```

#### 4.3 Exemplo de Uso no Frontend (React/Vue/Angular)

```javascript
// Exemplo React
import apiClient from './config/api';

// Componente de Lista de Contatos
function ContactList() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getContacts();
      setContacts(data.contacts || []);
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (contactId, message) => {
    try {
      await apiClient.sendMessage({
        contact_id: contactId,
        content: message,
        direction: 'outbound',
        message_type: 'text'
      });
      // Recarregar mensagens
      loadContacts();
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  return (
    <div>
      <h2>Contatos</h2>
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div>
          {contacts.map(contact => (
            <div key={contact.id}>
              <h3>{contact.name}</h3>
              <p>{contact.phone}</p>
              <button onClick={() => handleSendMessage(contact.id, 'Olá!')}>
                Enviar Mensagem
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 5. Configuração do Webhook

#### 5.1 Obter URL do Webhook
```javascript
// No seu frontend
const webhookInfo = await apiClient.getWebhookInfo();
console.log('Webhook URL:', webhookInfo.webhookUrl);
```

#### 5.2 Configurar na Umbler
1. Acesse o painel da Umbler
2. Configure o webhook com a URL: `https://seu-dominio.com/webhook/umbler`
3. Configure o secret se necessário

### 6. Estrutura de Dados

#### 6.1 Contato
```javascript
{
  id: "uuid",
  phone: "5511999999999",
  name: "João Silva",
  email: "joao@email.com",
  profile_pic_url: "https://...",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  last_interaction: "2024-01-01T00:00:00Z",
  status: "active",
  tags: ["cliente", "vip"],
  metadata: {}
}
```

#### 6.2 Mensagem
```javascript
{
  id: "uuid",
  conversation_id: "uuid",
  contact_id: "uuid",
  umbler_message_id: "msg_123",
  direction: "inbound", // ou "outbound"
  message_type: "text", // text, image, audio, video, document
  content: "Olá, como posso ajudar?",
  media_url: "https://...",
  status: "sent", // sent, delivered, read, failed
  created_at: "2024-01-01T00:00:00Z",
  metadata: {}
}
```

#### 6.3 Conversa
```javascript
{
  id: "uuid",
  contact_id: "uuid",
  umbler_conversation_id: "conv_123",
  channel: "whatsapp",
  status: "open", // open, closed, pending, resolved
  assigned_agent_id: "uuid",
  priority: "normal", // low, normal, high, urgent
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  closed_at: null,
  last_message_at: "2024-01-01T00:00:00Z",
  message_count: 5,
  metadata: {}
}
```

### 7. Tratamento de Erros

#### 7.1 Estrutura de Erro
```javascript
{
  success: false,
  error: "Mensagem de erro",
  code: "ERROR_CODE",
  timestamp: "2024-01-01T00:00:00Z"
}
```

#### 7.2 Códigos de Erro Comuns
- `CONTACT_NOT_FOUND`: Contato não encontrado
- `MESSAGE_SEND_FAILED`: Falha ao enviar mensagem
- `INVALID_DATA`: Dados inválidos
- `RATE_LIMIT_EXCEEDED`: Limite de requisições excedido
- `WEBHOOK_SIGNATURE_INVALID`: Assinatura do webhook inválida

### 8. Monitoramento e Logs

#### 8.1 Health Check
```javascript
// Verificar se o backend está funcionando
const status = await apiClient.getSystemStatus();
console.log('Status:', status);
```

#### 8.2 Logs Recentes
```javascript
// Obter logs recentes
const logs = await apiClient.getRecentLogs();
console.log('Logs:', logs);
```

### 9. Desenvolvimento com Túnel

#### 9.1 Iniciar Túnel
```bash
npm run dev:tunnel
```

#### 9.2 URL Pública
O backend automaticamente gera uma URL pública para desenvolvimento:
- Local: `http://localhost:3000`
- Público: `https://abc123.ngrok.io`

### 10. Deploy em Produção

#### 10.1 Variáveis de Produção
```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
CORS_ORIGIN=https://seu-frontend.com
WEBHOOK_SECRET=sua_chave_secreta_producao
```

#### 10.2 Process Manager (PM2)
```bash
npm install -g pm2
pm2 start src/app.js --name "umbler-webhook"
pm2 save
pm2 startup
```

### 11. Testes

#### 11.1 Testar Webhook
```bash
curl -X POST http://localhost:3000/webhook/umbler \
  -H "Content-Type: application/json" \
  -d '{
    "event": "message_received",
    "message": {
      "id": "msg_123",
      "content": "Teste de webhook",
      "from": "5511999999999"
    }
  }'
```

#### 11.2 Testar API
```bash
# Listar contatos
curl http://localhost:3000/api/contacts

# Criar contato
curl -X POST http://localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5511999999999",
    "name": "João Silva"
  }'
```

## 🎯 Checklist de Integração

- [ ] Configurar variáveis de ambiente
- [ ] Executar schema do banco de dados
- [ ] Testar conexão com Supabase
- [ ] Configurar CORS para seu frontend
- [ ] Implementar cliente HTTP no frontend
- [ ] Testar endpoints da API
- [ ] Configurar webhook na Umbler
- [ ] Testar recebimento de webhooks
- [ ] Implementar tratamento de erros
- [ ] Configurar monitoramento
- [ ] Deploy em produção

## 🆘 Suporte

### Logs do Backend
```bash
# Ver logs em tempo real
npm run logs

# Ou diretamente
tail -f logs/app.log
```

### Debug
```bash
# Modo debug
DEBUG=true npm run dev
```

### Health Check
```bash
# Verificar status
curl http://localhost:3000/health
```

## 📚 Recursos Adicionais

- [Documentação da Umbler](https://docs.umbler.com)
- [Documentação do Supabase](https://supabase.com/docs)
- [Express.js](https://expressjs.com)
- [Node.js](https://nodejs.org)

---

**🎉 Parabéns!** Seu backend está pronto para integração com qualquer frontend moderno!