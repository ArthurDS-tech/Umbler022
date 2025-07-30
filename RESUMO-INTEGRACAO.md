# 🎯 Resumo: Integração Frontend-Backend Umbler

## 📋 O que é este Backend?

Este é um **backend completo** para webhook da Umbler que oferece:

- ✅ **API RESTful** para contatos, mensagens e conversas
- ✅ **Webhook endpoint** para receber eventos da Umbler
- ✅ **Banco PostgreSQL** via Supabase
- ✅ **CORS configurado** para integração com frontend
- ✅ **Túnel público** para desenvolvimento
- ✅ **Interface web** para testes
- ✅ **Logs e monitoramento** completos

## 🚀 Passo a Passo da Integração

### 1. Setup Inicial (5 minutos)

```bash
# 1. Clone o repositório
git clone <seu-repositorio>
cd project-root

# 2. Setup automático
npm run setup:quick

# 3. Configure o Supabase (obrigatório)
# - Acesse: https://supabase.com
# - Crie um projeto
# - Execute o schema.sql no SQL Editor
# - Configure as credenciais no .env
```

### 2. Configurar Variáveis (2 minutos)

Edite o arquivo `.env`:

```env
# SUPABASE (OBRIGATÓRIO)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role

# CORS (para seu frontend)
CORS_ORIGIN=http://localhost:3001,http://localhost:5173,https://seu-dominio.com
```

### 3. Iniciar Backend (1 minuto)

```bash
npm run dev
```

Acesse: http://localhost:3000

### 4. Integrar com Frontend (10 minutos)

#### 4.1 Criar Cliente HTTP

```javascript
// config/api.js
const API_BASE_URL = 'http://localhost:3000/api';

class ApiClient {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    };

    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Erro na requisição');
    }
    
    return data;
  }

  // Contatos
  async getContacts() {
    return this.request('/contacts');
  }

  async createContact(contactData) {
    return this.request('/contacts', {
      method: 'POST',
      body: JSON.stringify(contactData),
    });
  }

  // Mensagens
  async sendMessage(messageData) {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  // Conversas
  async getConversations() {
    return this.request('/conversations');
  }
}

export default new ApiClient();
```

#### 4.2 Usar no Frontend

```javascript
// Exemplo React
import apiClient from './config/api';

function App() {
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const data = await apiClient.getContacts();
      setContacts(data.contacts || []);
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const sendMessage = async (contactId, message) => {
    try {
      await apiClient.sendMessage({
        contact_id: contactId,
        content: message,
        direction: 'outbound',
        message_type: 'text'
      });
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  return (
    <div>
      {contacts.map(contact => (
        <div key={contact.id}>
          <h3>{contact.name}</h3>
          <p>{contact.phone}</p>
          <button onClick={() => sendMessage(contact.id, 'Olá!')}>
            Enviar Mensagem
          </button>
        </div>
      ))}
    </div>
  );
}
```

### 5. Configurar Webhook (3 minutos)

#### 5.1 Obter URL do Webhook
```javascript
const webhookInfo = await apiClient.getWebhookInfo();
console.log('Webhook URL:', webhookInfo.webhookUrl);
// Resultado: http://localhost:3000/webhook/umbler
```

#### 5.2 Configurar na Umbler
1. Acesse o painel da Umbler
2. Configure o webhook: `http://localhost:3000/webhook/umbler`
3. Configure o secret se necessário

### 6. Testar Integração (2 minutos)

```bash
# Testar API
curl http://localhost:3000/api/contacts

# Testar Webhook
curl -X POST http://localhost:3000/webhook/umbler \
  -H "Content-Type: application/json" \
  -d '{
    "event": "message_received",
    "message": {
      "id": "msg_123",
      "content": "Teste",
      "from": "5511999999999"
    }
  }'
```

## 📡 Endpoints Disponíveis

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/health` | Health check |
| GET | `/api/contacts` | Listar contatos |
| POST | `/api/contacts` | Criar contato |
| GET | `/api/messages` | Listar mensagens |
| POST | `/api/messages` | Enviar mensagem |
| GET | `/api/conversations` | Listar conversas |
| POST | `/api/conversations` | Criar conversa |
| POST | `/webhook/umbler` | Webhook Umbler |

## 📊 Estrutura de Dados

### Contato
```javascript
{
  id: "uuid",
  phone: "5511999999999",
  name: "João Silva",
  email: "joao@email.com",
  status: "active",
  created_at: "2024-01-01T00:00:00Z"
}
```

### Mensagem
```javascript
{
  id: "uuid",
  contact_id: "uuid",
  content: "Olá!",
  direction: "inbound", // ou "outbound"
  message_type: "text",
  status: "sent",
  created_at: "2024-01-01T00:00:00Z"
}
```

### Conversa
```javascript
{
  id: "uuid",
  contact_id: "uuid",
  status: "open",
  priority: "normal",
  message_count: 5,
  created_at: "2024-01-01T00:00:00Z"
}
```

## 🔧 Comandos Úteis

```bash
# Desenvolvimento
npm run dev              # Desenvolvimento normal
npm run dev:tunnel       # Com túnel público

# Produção
npm start               # Iniciar produção

# Manutenção
npm run setup:quick     # Setup automático
npm run logs            # Ver logs
npm run health          # Health check
```

## 🌐 URLs Importantes

- **Backend**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **Webhook**: http://localhost:3000/webhook/umbler
- **Interface**: http://localhost:3000

## ✅ Checklist de Integração

- [ ] Setup automático executado
- [ ] Supabase configurado
- [ ] Schema SQL executado
- [ ] Variáveis de ambiente configuradas
- [ ] Backend iniciado (npm run dev)
- [ ] Cliente HTTP criado no frontend
- [ ] CORS configurado para seu frontend
- [ ] Webhook configurado na Umbler
- [ ] Testes realizados
- [ ] Frontend integrado

## 🆘 Troubleshooting

### Erro de CORS
```env
# Adicione seu domínio no .env
CORS_ORIGIN=http://localhost:3001,https://seu-dominio.com
```

### Erro de Supabase
- Verifique as credenciais no `.env`
- Execute o schema SQL no Supabase

### Webhook não funciona
- Verifique a URL: `http://localhost:3000/webhook/umbler`
- Teste com curl
- Verifique os logs: `npm run logs`

## 🎉 Resultado Final

Após seguir estes passos, você terá:

1. ✅ **Backend funcionando** em http://localhost:3000
2. ✅ **API RESTful** para contatos, mensagens e conversas
3. ✅ **Webhook configurado** para receber eventos da Umbler
4. ✅ **Frontend integrado** com cliente HTTP
5. ✅ **Banco de dados** configurado no Supabase
6. ✅ **CORS configurado** para seu frontend

**Tempo total estimado: 20-30 minutos**

---

**🚀 Pronto para usar!** Seu backend está totalmente integrado e pronto para receber webhooks da Umbler e servir seu frontend.