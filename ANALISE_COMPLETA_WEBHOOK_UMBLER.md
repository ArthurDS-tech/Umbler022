# 📋 ANÁLISE COMPLETA DO REPOSITÓRIO - WEBHOOK UMBLER

## 🎯 RESUMO EXECUTIVO

Este repositório contém um sistema completo de webhook para a **Umbler** que processa dados de atendimentos de WhatsApp, integrado com PostgreSQL (Neon) e frontend React/Next.js. O sistema é projetado para capturar 100% dos dados sem perda de informações.

---

## 📁 ESTRUTURA DO REPOSITÓRIO

### 🗂️ **Estrutura Principal**
```
/
├── project-root/           # Backend Node.js/Express
│   ├── src/               # Código fonte do backend
│   ├── scripts/           # Scripts de setup e migração
│   ├── public/            # Arquivos estáticos
│   └── logs/              # Logs da aplicação
├── frontend/              # Frontend Next.js/React
│   └── src/               # Código fonte do frontend
├── Umbler-2/              # Documentação adicional
└── [arquivos de documentação]
```

### 🔧 **Backend (project-root/)**

#### **Estrutura do Código Fonte**
```
src/
├── app.js                 # Aplicação principal Express
├── config/                # Configurações
│   ├── database.js        # Configuração PostgreSQL
│   └── environment.js     # Variáveis de ambiente
├── controllers/           # Controladores da API
│   ├── webhookController.js    # Processamento de webhooks
│   ├── contactController.js    # Gestão de contatos
│   ├── conversationController.js # Gestão de conversas
│   └── messageController.js    # Gestão de mensagens
├── services/             # Lógica de negócio
│   ├── webhookService.js      # Processamento de webhooks
│   ├── contactService.js      # Serviços de contatos
│   ├── conversationService.js # Serviços de conversas
│   └── messageService.js      # Serviços de mensagens
├── routes/               # Rotas da API
│   ├── webhook.js        # Rotas de webhook
│   ├── api.js            # Rotas gerais da API
│   ├── contacts.js       # Rotas de contatos
│   ├── conversations.js  # Rotas de conversas
│   ├── messages.js       # Rotas de mensagens
│   └── dashboard.js      # Rotas do dashboard
├── middleware/           # Middlewares
│   ├── validation.js     # Validação de dados
│   └── errorHandler.js   # Tratamento de erros
└── utils/               # Utilitários
    ├── helpers.js        # Funções auxiliares
    ├── logger.js         # Sistema de logs
    └── tunnel.js         # Gerenciamento de túnel
```

---

## 🔗 **ENDPOINT PRINCIPAL DO WEBHOOK**

### **URL do Webhook**
```
POST /webhook/umbler
```

### **Configuração na Umbler**
- **URL**: `https://seu-dominio.com/webhook/umbler`
- **Método**: POST
- **Content-Type**: application/json
- **Headers**: 
  - `x-umbler-signature` (opcional, para validação)

---

## 📊 **ESTRUTURA DO PAYLOAD PROCESSADO**

### **Payload Real da Umbler (Exemplo)**
```json
{
  "Type": "Message",
  "EventDate": "2025-07-28T19:05:51.9844624Z",
  "EventId": "aIfKD-wfPw5dlZ2v",
  "Payload": {
    "Type": "Chat",
    "Content": {
      "_t": "BasicChatModel",
      "Organization": {
        "Id": "ZQG4wFMHGHuTs59F"
      },
      "Contact": {
        "LastActiveUTC": "2025-07-28T19:05:50.927Z",
        "PhoneNumber": "+5547999955497",
        "ProfilePictureUrl": null,
        "IsBlocked": false,
        "ScheduledMessages": [],
        "GroupIdentifier": null,
        "ContactType": "DirectMessage",
        "Tags": [
          {
            "Name": "Troca",
            "Id": "ZfSJ3uEJHZvJr_xh"
          }
        ],
        "Preferences": [],
        "Name": "ANDERSON FERRARI",
        "Id": "aId-BgQTEBXeyQBx"
      },
      "Channel": {
        "_t": "ChatGupshupWhatsappChannelReferenceModel",
        "ChannelType": "WhatsappApi",
        "PhoneNumber": "+554891294620",
        "Name": "AUTO FACIL DESPACHANTE - DVA",
        "Id": "ZU0nK9hshgRZ-Pkm"
      },
      "Sector": {
        "Default": false,
        "Order": 6,
        "GroupIds": [],
        "Name": "DVA",
        "Id": "ZUJJB3U0FyapzNuL"
      },
      "OrganizationMember": {
        "Muted": false,
        "TotalUnread": null,
        "Id": "ZW-E1ydfRz6GV84t"
      },
      "OrganizationMembers": [
        {
          "Muted": false,
          "TotalUnread": null,
          "Id": "ZW-E1ydfRz6GV84t"
        }
      ],
      "Tags": [],
      "LastMessage": {
        "Prefix": null,
        "HeaderContent": null,
        "Content": "Ok",
        "Footer": null,
        "File": null,
        "Thumbnail": null,
        "QuotedStatusUpdate": null,
        "Contacts": [],
        "MessageType": "Text",
        "SentByOrganizationMember": null,
        "IsPrivate": false,
        "Location": null,
        "Question": null,
        "Source": "Contact",
        "InReplyTo": null,
        "MessageState": "Read",
        "EventAtUTC": "2025-07-28T19:05:50.927Z",
        "Chat": {
          "Id": "aId-BlZU5FkyRHXS"
        },
        "FromContact": null,
        "TemplateId": null,
        "Buttons": [],
        "LatestEdit": null,
        "BotInstance": null,
        "ForwardedFrom": null,
        "ScheduledMessage": null,
        "BulkSendSession": null,
        "Elements": null,
        "Mentions": [],
        "Ad": null,
        "FileId": null,
        "Reactions": [],
        "DeductedAiCredits": null,
        "Carousel": [],
        "Billable": null,
        "Id": "aIfKD-wfPw5dlZ2r",
        "CreatedAtUTC": "2025-07-28T19:05:51.6169202Z"
      },
      "LastMessageReaction": null,
      "RedactReason": null,
      "UsingInactivityFlow": false,
      "UsingWaitingFlow": false,
      "InactivityFlowAt": null,
      "WaitingFlowAt": null,
      "Open": true,
      "Private": false,
      "Waiting": true,
      "WaitingSinceUTC": "2025-07-28T19:05:50.927Z",
      "TotalUnread": 0,
      "TotalAIResponses": null,
      "ClosedAtUTC": null,
      "EventAtUTC": "2025-07-28T19:05:50.927Z",
      "FirstMemberReplyMessage": {
        "EventAtUTC": "2025-07-28T14:21:06.002Z",
        "Id": "aIeHUlZU5FkyX_0q"
      },
      "FirstContactMessage": {
        "EventAtUTC": "2025-07-28T14:18:44.987Z",
        "Id": "aIeGxbN9CJoV06Vk"
      },
      "Bots": [],
      "LastOrganizationMember": {
        "Id": "ZW-E1ydfRz6GV84t"
      },
      "Message": null,
      "Visibility": null,
      "Id": "aId-BlZU5FkyRHXS",
      "CreatedAtUTC": "2025-07-28T13:41:26.928Z"
    }
  }
}
```

---

## 🗄️ **ESTRUTURA DO BANCO DE DADOS**

### **Tabelas Principais**

#### **1. webhook_events**
```sql
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    source_ip INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **2. contacts**
```sql
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    umbler_contact_id VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    profile_picture_url TEXT,
    is_blocked BOOLEAN DEFAULT FALSE,
    contact_type VARCHAR(50) DEFAULT 'DirectMessage',
    last_active_utc TIMESTAMP WITH TIME ZONE,
    group_identifier VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **3. chats (conversas)**
```sql
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    umbler_chat_id VARCHAR(255) UNIQUE NOT NULL,
    contact_id UUID NOT NULL REFERENCES contacts(id),
    channel_id UUID REFERENCES channels(id),
    sector_id UUID REFERENCES sectors(id),
    assigned_member_id UUID REFERENCES organization_members(id),
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    is_open BOOLEAN DEFAULT TRUE,
    is_private BOOLEAN DEFAULT FALSE,
    is_waiting BOOLEAN DEFAULT FALSE,
    waiting_since_utc TIMESTAMP WITH TIME ZONE,
    total_unread INTEGER DEFAULT 0,
    total_ai_responses INTEGER DEFAULT 0,
    closed_at_utc TIMESTAMP WITH TIME ZONE,
    event_at_utc TIMESTAMP WITH TIME ZONE,
    first_contact_message_id VARCHAR(255),
    first_member_reply_message_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **4. messages**
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    umbler_message_id VARCHAR(255) UNIQUE NOT NULL,
    chat_id UUID NOT NULL REFERENCES chats(id),
    contact_id UUID NOT NULL REFERENCES contacts(id),
    organization_member_id UUID REFERENCES organization_members(id),
    message_type VARCHAR(50) NOT NULL DEFAULT 'text',
    content TEXT,
    direction VARCHAR(20) NOT NULL DEFAULT 'inbound',
    source VARCHAR(50) DEFAULT 'Contact',
    message_state VARCHAR(50) DEFAULT 'sent',
    is_private BOOLEAN DEFAULT FALSE,
    event_at_utc TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at_utc TIMESTAMP WITH TIME ZONE,
    file_id VARCHAR(255),
    template_id VARCHAR(255),
    quoted_message_id VARCHAR(255),
    raw_webhook_data JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **5. channels**
```sql
CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    umbler_channel_id VARCHAR(255) UNIQUE NOT NULL,
    channel_type VARCHAR(50) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **6. sectors**
```sql
CREATE TABLE sectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    umbler_sector_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    order_position INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **7. organization_members**
```sql
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    umbler_member_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **8. contact_tags**
```sql
CREATE TABLE contact_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(id),
    umbler_tag_id VARCHAR(255),
    tag_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(contact_id, tag_name)
);
```

---

## 🔄 **FLUXO DE PROCESSAMENTO DO WEBHOOK**

### **1. Recebimento do Webhook**
```javascript
// src/controllers/webhookController.js
async receiveUmblerWebhook(req, res) {
  // 1. Validar payload
  // 2. Verificar assinatura (se configurada)
  // 3. Registrar evento para auditoria
  // 4. Processar dados de forma assíncrona
  // 5. Retornar resposta de sucesso
}
```

### **2. Processamento dos Dados**
```javascript
// src/services/webhookService.js
async processWebhook(payload, webhookEventId) {
  // 1. Validar estrutura do payload
  // 2. Determinar tipo de evento
  // 3. Processar contato
  // 4. Processar canal
  // 5. Processar setor
  // 6. Processar membro da organização
  // 7. Processar conversa
  // 8. Processar mensagem (se existir)
  // 9. Processar tags do contato
}
```

### **3. Mapeamento de Dados**

#### **Contato (Contact)**
- `Contact.Id` → `contacts.umbler_contact_id`
- `Contact.PhoneNumber` → `contacts.phone_number`
- `Contact.Name` → `contacts.name`
- `Contact.ProfilePictureUrl` → `contacts.profile_picture_url`
- `Contact.IsBlocked` → `contacts.is_blocked`
- `Contact.ContactType` → `contacts.contact_type`
- `Contact.LastActiveUTC` → `contacts.last_active_utc`

#### **Canal (Channel)**
- `Channel.Id` → `channels.umbler_channel_id`
- `Channel.ChannelType` → `channels.channel_type`
- `Channel.PhoneNumber` → `channels.phone_number`
- `Channel.Name` → `channels.name`

#### **Setor (Sector)**
- `Sector.Id` → `sectors.umbler_sector_id`
- `Sector.Name` → `sectors.name`
- `Sector.Default` → `sectors.is_default`
- `Sector.Order` → `sectors.order_position`

#### **Conversa (Chat)**
- `Content.Id` → `chats.umbler_chat_id`
- `Content.Open` → `chats.is_open`
- `Content.Private` → `chats.is_private`
- `Content.Waiting` → `chats.is_waiting`
- `Content.WaitingSinceUTC` → `chats.waiting_since_utc`
- `Content.TotalUnread` → `chats.total_unread`
- `Content.TotalAIResponses` → `chats.total_ai_responses`
- `Content.ClosedAtUTC` → `chats.closed_at_utc`
- `Content.EventAtUTC` → `chats.event_at_utc`

#### **Mensagem (LastMessage)**
- `LastMessage.Id` → `messages.umbler_message_id`
- `LastMessage.Content` → `messages.content`
- `LastMessage.MessageType` → `messages.message_type`
- `LastMessage.Source` → `messages.source`
- `LastMessage.MessageState` → `messages.message_state`
- `LastMessage.EventAtUTC` → `messages.event_at_utc`
- `LastMessage.CreatedAtUTC` → `messages.created_at_utc`

---

## 🛠️ **CONFIGURAÇÕES E DEPENDÊNCIAS**

### **Package.json (Dependências Principais)**
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "pg-pool": "^3.6.1",
    "joi": "^17.11.0",
    "winston": "^3.11.0",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.1.5",
    "compression": "^1.7.4",
    "uuid": "^9.0.1",
    "dotenv": "^16.3.1"
  }
}
```

### **Variáveis de Ambiente (.env)**
```bash
# Banco de Dados
DATABASE_URL=postgresql://user:password@host:port/database
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000

# Segurança
WEBHOOK_SECRET=seu_secret_aqui
JWT_SECRET=seu_jwt_secret_aqui

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WEBHOOK_MAX=1000

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
CORS_CREDENTIALS=true

# Logs
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Túnel (Desenvolvimento)
AUTO_START_TUNNEL=true
NGROK_AUTH_TOKEN=seu_token_ngrok
```

---

## 🔒 **SEGURANÇA E VALIDAÇÃO**

### **Validação de Assinatura**
```javascript
// src/utils/helpers.js
function validateWebhookSignature(payload, signature, secret) {
  const expectedSignature = generateHash(
    typeof payload === 'string' ? payload : JSON.stringify(payload),
    secret
  );
  
  const providedSignature = signature.replace('sha256=', '');
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(providedSignature, 'hex')
  );
}
```

### **Rate Limiting**
```javascript
// Rate limiting específico para webhooks
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 1000, // Máximo 1000 webhooks por minuto
  message: {
    error: 'Muitos webhooks recebidos, aguarde um momento',
    code: 'WEBHOOK_RATE_LIMIT'
  }
});
```

### **Validação de Payload**
```javascript
// src/middleware/validation.js
const webhookPayloadSchema = Joi.object({
  Type: Joi.string().required(),
  EventDate: Joi.string().isoDate().required(),
  EventId: Joi.string().required(),
  Payload: Joi.object().required()
});
```

---

## 📊 **API ENDPOINTS DISPONÍVEIS**

### **Webhooks**
```
POST /webhook/umbler          # Receber webhook da Umbler
GET  /webhook/test           # Testar webhook
POST /webhook/retry/:id      # Reprocessar webhook falhado
GET  /webhook/events         # Listar eventos
GET  /webhook/stats          # Estatísticas
POST /webhook/simulate       # Simular webhook (dev)
```

### **Contatos**
```
GET  /api/contacts           # Listar contatos
GET  /api/contacts/:id       # Detalhes do contato
GET  /api/contacts/:id/chats # Histórico de chats
POST /api/contacts           # Criar contato
PUT  /api/contacts/:id       # Atualizar contato
```

### **Conversas**
```
GET  /api/conversations      # Listar conversas
GET  /api/conversations/:id  # Detalhes da conversa
GET  /api/conversations/waiting # Conversas em espera
GET  /api/conversations/sector/:id # Por setor
```

### **Mensagens**
```
GET  /api/messages           # Listar mensagens
GET  /api/messages/:id       # Detalhes da mensagem
GET  /api/messages/chat/:id  # Mensagens da conversa
```

### **Dashboard**
```
GET  /api/dashboard/overview # Visão geral
GET  /api/dashboard/stats    # Estatísticas
GET  /api/dashboard/reports  # Relatórios
```

---

## 🎨 **FRONTEND (Next.js/React)**

### **Estrutura do Frontend**
```
frontend/src/
├── app/
│   ├── layout.tsx          # Layout principal
│   └── page.tsx            # Página principal
├── components/
│   ├── Layout/             # Componentes de layout
│   ├── Dashboard/          # Componentes do dashboard
│   ├── Contacts/           # Componentes de contatos
│   ├── Conversations/      # Componentes de conversas
│   ├── Tags/               # Componentes de tags
│   └── Settings/           # Componentes de configurações
├── lib/                    # Utilitários
├── styles/                 # Estilos
└── types/                  # Tipos TypeScript
```

### **Tecnologias do Frontend**
- **Framework**: Next.js 13+ (App Router)
- **UI**: React + Tailwind CSS
- **Animações**: Framer Motion
- **Ícones**: Heroicons
- **Estado**: React Hooks
- **Tipagem**: TypeScript

---

## 🚀 **SCRIPTS DE SETUP E DEPLOY**

### **Scripts Disponíveis**
```bash
# Desenvolvimento
npm run dev              # Iniciar em modo desenvolvimento
npm run dev:tunnel       # Iniciar com túnel automático

# Setup do Banco
npm run db:setup         # Configurar banco de dados
npm run db:migrate       # Executar migrações
npm run db:seed          # Inserir dados de exemplo

# Testes
npm run test:connection  # Testar conexão com banco
npm run test:webhook     # Testar webhook
npm run test:webhook:auto # Teste automático

# Deploy
npm run build            # Build para produção
npm start                # Iniciar em produção

# Docker
npm run docker:build     # Build da imagem Docker
npm run docker:run       # Executar container
```

---

## 📈 **MONITORAMENTO E LOGS**

### **Sistema de Logs**
```javascript
// src/utils/logger.js
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

### **Health Checks**
```
GET /health              # Health check básico
GET /health/detailed     # Health check detalhado
```

### **Métricas Disponíveis**
- Total de webhooks recebidos
- Taxa de sucesso/falha
- Tempo de processamento
- Uso de memória e CPU
- Status da conexão com banco

---

## 🔧 **CONFIGURAÇÃO PARA PRODUÇÃO**

### **1. Configurar Banco de Dados**
```bash
# Criar banco PostgreSQL (Neon recomendado)
# Configurar DATABASE_URL no .env
npm run db:setup
```

### **2. Configurar Segurança**
```bash
# Gerar secrets seguros
WEBHOOK_SECRET=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)

# Configurar no .env
echo "WEBHOOK_SECRET=$WEBHOOK_SECRET" >> .env
echo "JWT_SECRET=$JWT_SECRET" >> .env
```

### **3. Configurar CORS**
```bash
# Permitir apenas domínios específicos
CORS_ORIGIN=https://seu-dominio.com
```

### **4. Configurar Rate Limiting**
```bash
# Ajustar limites conforme necessidade
RATE_LIMIT_WEBHOOK_MAX=1000
RATE_LIMIT_MAX_REQUESTS=100
```

### **5. Configurar Logs**
```bash
# Configurar rotação de logs
LOG_LEVEL=info
LOG_MAX_SIZE=20m
LOG_MAX_FILES=14
```

---

## 🐛 **TRATAMENTO DE ERROS**

### **Tipos de Erro Tratados**
1. **Validação de Payload**: Payload inválido ou malformado
2. **Erro de Banco**: Falha na conexão ou operação
3. **Rate Limiting**: Muitas requisições
4. **Assinatura Inválida**: Webhook secret incorreto
5. **Timeout**: Processamento muito lento
6. **Erro de Rede**: Falha na comunicação

### **Sistema de Retry**
```javascript
// Reprocessamento automático de webhooks falhados
async retryWebhookEvent(eventId) {
  // 1. Buscar evento falhado
  // 2. Verificar tentativas (máximo 3)
  // 3. Reprocessar payload
  // 4. Marcar como processado ou erro
}
```

---

## 📋 **CHECKLIST DE IMPLEMENTAÇÃO**

### **✅ Configuração Inicial**
- [ ] Clone do repositório
- [ ] Instalação de dependências (`npm install`)
- [ ] Configuração do banco PostgreSQL
- [ ] Configuração das variáveis de ambiente
- [ ] Setup do banco de dados (`npm run db:setup`)

### **✅ Testes**
- [ ] Teste de conexão com banco (`npm run test:connection`)
- [ ] Teste do webhook (`npm run test:webhook`)
- [ ] Teste da API (`curl http://localhost:3000/health`)

### **✅ Configuração na Umbler**
- [ ] URL do webhook configurada
- [ ] Método POST configurado
- [ ] Headers configurados (se necessário)
- [ ] Teste de envio de webhook

### **✅ Monitoramento**
- [ ] Logs configurados
- [ ] Health checks funcionando
- [ ] Métricas sendo coletadas
- [ ] Alertas configurados (se necessário)

---

## 🎯 **FUNCIONALIDADES PRINCIPAIS**

### **✅ Captura Completa de Dados**
- Processamento de 100% dos webhooks
- Armazenamento de dados brutos para auditoria
- Sistema de retry para webhooks falhados
- Logs detalhados de processamento

### **✅ Estruturação Automática**
- Mapeamento automático de dados da Umbler
- Criação/atualização de contatos
- Gestão de conversas e mensagens
- Processamento de tags e metadados

### **✅ Performance Otimizada**
- Índices PostgreSQL otimizados
- Pool de conexões configurado
- Consultas rápidas (< 2 segundos)
- Cache inteligente

### **✅ Segurança Robusta**
- Validação de assinatura de webhook
- Rate limiting configurável
- Sanitização de dados
- Headers de segurança

### **✅ API Completa**
- Endpoints REST para todos os dados
- Paginação e filtros
- Relatórios e estatísticas
- Dashboard de monitoramento

### **✅ Frontend Moderno**
- Interface React/Next.js
- Design responsivo
- Animações suaves
- Componentes reutilizáveis

---

## 📞 **SUPORTE E MANUTENÇÃO**

### **Logs Importantes**
- `logs/app.log`: Logs gerais da aplicação
- `logs/error.log`: Logs de erro
- `logs/webhook.log`: Logs específicos de webhook

### **Comandos Úteis**
```bash
# Ver logs em tempo real
npm run logs

# Testar webhook
npm run test:webhook

# Backup do banco
npm run db:backup

# Restaurar backup
npm run db:restore
```

### **Monitoramento**
- Health checks: `/health` e `/health/detailed`
- Métricas: `/api/dashboard/stats`
- Eventos de webhook: `/webhook/events`

---

## 🎉 **CONCLUSÃO**

Este repositório implementa um sistema completo e robusto para processamento de webhooks da Umbler, com as seguintes características principais:

1. **Zero perda de dados** com sistema de retry e auditoria
2. **Performance otimizada** com PostgreSQL e índices específicos
3. **Segurança robusta** com validação e rate limiting
4. **API completa** para acesso aos dados processados
5. **Frontend moderno** para visualização e gestão
6. **Monitoramento completo** com logs e métricas

O sistema está pronto para produção e pode processar milhares de webhooks por minuto com confiabilidade total.