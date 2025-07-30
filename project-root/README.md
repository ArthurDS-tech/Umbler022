# 🚀 Backend Umbler Webhook

Backend completo para webhook da Umbler integrado com Supabase, oferecendo API RESTful para gerenciamento de contatos, mensagens e conversas do WhatsApp.

## ✨ Funcionalidades

- **Webhook Umbler**: Recebe e processa eventos da Umbler
- **API RESTful**: CRUD completo para contatos, mensagens e conversas
- **Banco PostgreSQL**: Via Supabase com schema otimizado
- **Túnel Público**: Ngrok integrado para desenvolvimento
- **Interface Web**: Interface para testes e monitoramento
- **Logs Avançados**: Sistema de logs com rotação
- **Rate Limiting**: Proteção contra spam
- **CORS Configurado**: Pronto para integração com frontend
- **Health Checks**: Monitoramento de saúde da aplicação

## 🏗️ Arquitetura

```
src/
├── app.js              # Aplicação principal
├── config/             # Configurações (ambiente, banco)
├── controllers/        # Controladores da API
├── middleware/         # Middlewares (CORS, auth, validação)
├── routes/            # Rotas da API
├── services/          # Lógica de negócio
└── utils/             # Utilitários (logger, helpers)
```

## 🚀 Setup Rápido

### 1. Setup Automático
```bash
# Clone o repositório
git clone <seu-repositorio>
cd project-root

# Setup automático
npm run setup:quick
```

### 2. Setup Manual

#### 2.1 Instalar Dependências
```bash
npm install
```

#### 2.2 Configurar Ambiente
```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar configurações
nano .env
```

#### 2.3 Configurar Supabase
1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute o schema SQL no SQL Editor:
   ```sql
   -- Copie o conteúdo de schema.sql
   ```
3. Configure as credenciais no `.env`:
   ```env
   SUPABASE_URL=https://seu-projeto.supabase.co
   SUPABASE_ANON_KEY=sua_chave_anonima
   SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
   ```

#### 2.4 Iniciar Desenvolvimento
```bash
npm run dev
```

## 📡 Endpoints da API

### Health Check
```http
GET /health
GET /health/detailed
```

### Webhook Umbler
```http
POST /webhook/umbler
```

### Contatos
```http
GET    /api/contacts          # Listar contatos
POST   /api/contacts          # Criar contato
GET    /api/contacts/:id      # Buscar contato
PUT    /api/contacts/:id      # Atualizar contato
DELETE /api/contacts/:id      # Deletar contato
```

### Mensagens
```http
GET    /api/messages          # Listar mensagens
POST   /api/messages          # Enviar mensagem
GET    /api/messages/:id      # Buscar mensagem
PUT    /api/messages/:id      # Atualizar mensagem
DELETE /api/messages/:id      # Deletar mensagem
```

### Conversas
```http
GET    /api/conversations     # Listar conversas
POST   /api/conversations     # Criar conversa
GET    /api/conversations/:id # Buscar conversa
PUT    /api/conversations/:id # Atualizar conversa
DELETE /api/conversations/:id # Deletar conversa
```

### Sistema
```http
GET    /api/status           # Status do sistema
GET    /api/webhook/info     # Info do webhook
GET    /api/logs/recent      # Logs recentes
POST   /api/tunnel/start     # Iniciar túnel
POST   /api/tunnel/stop      # Parar túnel
```

## 🔧 Integração com Frontend

### Cliente HTTP (JavaScript)
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

  // Mensagens
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
}

export default new ApiClient();
```

### Exemplo React
```javascript
import apiClient from './config/api';

function ContactList() {
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const data = await apiClient.getContacts();
      setContacts(data.contacts || []);
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
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
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  return (
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
  );
}
```

## 🔐 Configuração de Segurança

### Variáveis Obrigatórias
```env
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role

# Segurança
JWT_SECRET=sua_chave_jwt_secreta
WEBHOOK_SECRET=chave_secreta_do_webhook

# CORS (para seu frontend)
CORS_ORIGIN=http://localhost:3001,https://seu-dominio.com
```

### Gerar Chaves Seguras
```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Webhook Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🌐 Configuração do Webhook

### 1. Obter URL do Webhook
```javascript
const webhookInfo = await apiClient.getWebhookInfo();
console.log('Webhook URL:', webhookInfo.webhookUrl);
```

### 2. Configurar na Umbler
1. Acesse o painel da Umbler
2. Configure o webhook: `https://seu-dominio.com/webhook/umbler`
3. Configure o secret se necessário

### 3. Testar Webhook
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

## 📊 Estrutura de Dados

### Contato
```javascript
{
  id: "uuid",
  phone: "5511999999999",
  name: "João Silva",
  email: "joao@email.com",
  profile_pic_url: "https://...",
  created_at: "2024-01-01T00:00:00Z",
  status: "active",
  tags: ["cliente", "vip"],
  metadata: {}
}
```

### Mensagem
```javascript
{
  id: "uuid",
  conversation_id: "uuid",
  contact_id: "uuid",
  direction: "inbound", // ou "outbound"
  message_type: "text", // text, image, audio, video, document
  content: "Olá, como posso ajudar?",
  status: "sent", // sent, delivered, read, failed
  created_at: "2024-01-01T00:00:00Z"
}
```

### Conversa
```javascript
{
  id: "uuid",
  contact_id: "uuid",
  channel: "whatsapp",
  status: "open", // open, closed, pending, resolved
  priority: "normal", // low, normal, high, urgent
  created_at: "2024-01-01T00:00:00Z",
  message_count: 5
}
```

## 🛠️ Comandos Úteis

```bash
# Desenvolvimento
npm run dev              # Desenvolvimento normal
npm run dev:tunnel       # Com túnel público

# Produção
npm start               # Iniciar produção
npm run build           # Build (se necessário)

# Testes
npm test                # Executar testes
npm run test:watch      # Testes em modo watch
npm run test:coverage   # Cobertura de testes

# Manutenção
npm run setup:quick     # Setup automático
npm run logs            # Ver logs
npm run health          # Health check
npm run clean           # Limpar arquivos

# Docker
npm run docker:build    # Build Docker
npm run docker:run      # Executar Docker
npm run docker:dev      # Docker Compose
```

## 📱 URLs Importantes

### Desenvolvimento
- **Backend**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **Webhook**: http://localhost:3000/webhook/umbler
- **Interface**: http://localhost:3000

### Produção
- **Backend**: https://seu-dominio.com
- **Webhook**: https://seu-dominio.com/webhook/umbler

## 🔍 Monitoramento

### Health Check
```bash
curl http://localhost:3000/health
```

### Logs
```bash
# Logs em tempo real
npm run logs

# Ou diretamente
tail -f logs/app.log
```

### Status Detalhado
```bash
curl http://localhost:3000/health/detailed
```

## 🚀 Deploy

### Variáveis de Produção
```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
CORS_ORIGIN=https://seu-frontend.com
WEBHOOK_SECRET=sua_chave_secreta_producao
```

### PM2 (Recomendado)
```bash
npm install -g pm2
pm2 start src/app.js --name "umbler-webhook"
pm2 save
pm2 startup
```

### Docker
```bash
# Build
docker build -t umbler-webhook .

# Executar
docker run -p 3000:3000 umbler-webhook
```

## 🆘 Troubleshooting

### Erro de Conexão com Supabase
- Verifique as credenciais no `.env`
- Teste a conexão: `npm run health`

### Erro de CORS
- Configure `CORS_ORIGIN` no `.env`
- Adicione o domínio do seu frontend

### Webhook não recebido
- Verifique a URL do webhook
- Teste com curl
- Verifique os logs: `npm run logs`

### Erro de Banco de Dados
- Execute o schema SQL no Supabase
- Verifique as permissões das tabelas

## 📚 Recursos

- [Documentação da Umbler](https://docs.umbler.com)
- [Documentação do Supabase](https://supabase.com/docs)
- [Express.js](https://expressjs.com)
- [Node.js](https://nodejs.org)

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -am 'Adiciona nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## 📄 Licença

MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

**🎉 Pronto para integrar com seu frontend!**

Para dúvidas ou suporte, abra uma issue no repositório.