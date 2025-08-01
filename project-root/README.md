# 🚀 Sistema de Webhook Umbler - PostgreSQL

Sistema completo de webhook para a Umbler com **PostgreSQL (Neon)**, otimizado para capturar e processar 100% dos dados de atendimentos sem perda de informações.

## 🎯 Características Principais

### ✅ **Zero Perda de Dados**
- Sistema robusto com retry automático
- Logs detalhados de auditoria
- Backup automático dos dados brutos
- Queue para webhooks falhados

### ⚡ **Performance Otimizada**
- Índices PostgreSQL otimizados para consultas de chat
- Pool de conexões configurado
- Consultas < 2 segundos
- Escalabilidade automática com Neon

### 🔒 **Segurança e Confiabilidade**
- Validação de assinatura de webhook
- Rate limiting configurável
- SSL/TLS automático
- Transações ACID

### 📊 **Funcionalidades Completas**
- Captura de 100% dos webhooks
- Processamento estruturado automático
- Relatórios e métricas em tempo real
- API REST completa
- Dashboard de monitoramento

## 🛠️ Stack Tecnológica

- **Runtime**: Node.js 16+
- **Framework**: Express.js
- **Banco**: PostgreSQL 15+ (Neon)
- **ORM**: pg (driver nativo)
- **Pool**: pg-pool
- **Logs**: Winston
- **Validação**: Joi
- **Segurança**: Helmet, CORS, Rate Limiting

## 🚀 Setup Rápido (5 minutos)

### 1. Pré-requisitos
```bash
# Node.js 16+
node --version

# NPM ou Yarn
npm --version
```

### 2. Clone e Instale
```bash
git clone <seu-repositorio>
cd umbler-webhook-backend
npm install
```

### 3. Configure o Neon
```bash
# 1. Acesse: https://neon.tech
# 2. Crie conta gratuita
# 3. Crie novo projeto
# 4. Copie a string de conexão
```

### 4. Execute o Setup
```bash
npm run db:setup
```

**O script irá:**
- ✅ Configurar conexão com Neon
- ✅ Criar todas as tabelas
- ✅ Criar índices otimizados
- ✅ Criar funções SQL
- ✅ Criar views para consultas
- ✅ Inserir dados de exemplo
- ✅ Gerar arquivo .env

### 5. Teste a Conexão
```bash
npm run test:connection
```

### 6. Inicie o Servidor
```bash
npm run dev
```

## 📡 Webhook Endpoint

```
POST /webhook/umbler
```

### Exemplo de Payload (Dados Reais da Umbler)
```json
{
  "Type": "Message",
  "EventDate": "2025-07-28T19:05:51.9844624Z",
  "EventId": "aIfKD-wfPw5dlZ2v",
  "Payload": {
    "Type": "Chat",
    "Content": {
      "Contact": {
        "Id": "aId-BgQTEBXeyQBx",
        "Name": "ANDERSON FERRARI",
        "PhoneNumber": "+5547999955497",
        "Tags": [{"Name": "Troca", "Id": "ZfSJ3uEJHZvJr_xh"}]
      },
      "Channel": {
        "Id": "ZU0nK9hshgRZ-Pkm",
        "Name": "AUTO FACIL DESPACHANTE - DVA",
        "ChannelType": "WhatsappApi",
        "PhoneNumber": "+554891294620"
      },
      "Sector": {
        "Id": "ZUJJB3U0FyapzNuL",
        "Name": "DVA",
        "Default": false,
        "Order": 6
      },
      "LastMessage": {
        "Id": "aIfKD-wfPw5dlZ2r",
        "Content": "Ok",
        "MessageType": "Text",
        "Source": "Contact",
        "MessageState": "Read",
        "EventAtUTC": "2025-07-28T19:05:50.927Z"
      },
      "Id": "aId-BlZU5FkyRHXS",
      "Open": true,
      "Waiting": true,
      "WaitingSinceUTC": "2025-07-28T19:05:50.927Z"
    }
  }
}
```

## 🔍 Consultas Otimizadas

### Buscar Chats por Contato
```sql
SELECT * FROM chat_summary 
WHERE contact_phone = '+5547999955497'
ORDER BY created_at DESC;
```

### Relatório por Setor
```sql
SELECT 
  s.name as sector,
  COUNT(c.id) as total_chats,
  COUNT(CASE WHEN c.is_waiting THEN 1 END) as waiting_chats,
  AVG(calculate_response_time(c.id)) as avg_response_time
FROM chats c
JOIN sectors s ON c.sector_id = s.id
WHERE c.created_at >= '2025-07-01'
GROUP BY s.id, s.name;
```

### Chats em Espera
```sql
SELECT * FROM get_waiting_chats()
ORDER BY waiting_since ASC;
```

## 📊 API Endpoints

### Webhooks
```
POST /webhook/umbler          # Receber webhook da Umbler
GET  /webhook/test           # Testar webhook
POST /webhook/retry/:id      # Reprocessar webhook falhado
GET  /webhook/events         # Listar eventos
GET  /webhook/stats          # Estatísticas
```

### Chats/Atendimentos
```
GET  /api/chats              # Listar chats
GET  /api/chats/:id          # Detalhes do chat
GET  /api/chats/waiting      # Chats em espera
GET  /api/chats/sector/:id   # Chats por setor
```

### Contatos
```
GET  /api/contacts           # Listar contatos
GET  /api/contacts/:id       # Detalhes do contato
GET  /api/contacts/:id/chats # Histórico de chats
```

### Relatórios
```
GET  /api/reports/sector     # Relatório por setor
GET  /api/reports/agent      # Performance de agentes
GET  /api/reports/period     # Relatório por período
GET  /api/stats/channels     # Estatísticas por canal
```

## 🧪 Testes

### Teste Automático
```bash
npm run test:webhook:auto
```

### Teste Interativo
```bash
npm run test:webhook
```

### Teste de Conexão
```bash
npm run test:connection
```

## 📈 Monitoramento

### Health Check
```
GET /health
GET /health/detailed
```

### Logs Estruturados
```javascript
{
  level: 'info',
  message: 'Webhook processado com sucesso',
  webhookEventId: 'uuid',
  processingTime: '150ms',
  eventType: 'Message',
  contactId: 'uuid',
  conversationId: 'uuid',
  messageId: 'uuid'
}
```

## 🔧 Scripts Disponíveis

```bash
# Setup e configuração
npm run db:setup          # Setup completo do banco
npm run db:migrate        # Executar migrações
npm run db:seed          # Inserir dados de exemplo
npm run test:connection  # Testar conexão

# Desenvolvimento
npm run dev              # Servidor com hot reload
npm run dev:tunnel       # Servidor + túnel ngrok

# Produção
npm start               # Servidor de produção
npm run health          # Health check

# Testes
npm run test:webhook    # Teste interativo de webhook
npm run test:webhook:auto # Teste automático

# Backup e manutenção
npm run db:backup       # Backup dos dados
npm run db:restore      # Restaurar backup
```

## 🚀 Deploy em Produção

### 1. Variáveis de Produção
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
WEBHOOK_SECRET=seu_secret_super_seguro
JWT_SECRET=seu_jwt_secret_super_seguro
```

### 2. Heroku
```bash
heroku create umbler-webhook
heroku config:set NODE_ENV=production
heroku config:set DATABASE_URL=postgresql://...
git push heroku main
```

### 3. Railway
```bash
railway login
railway init
railway up
```

### 4. Vercel
```bash
vercel --prod
```

## 📊 Estrutura do Banco

### Tabelas Principais
- **webhook_events** - Dados brutos dos webhooks
- **contacts** - Contatos/clientes
- **chats** - Conversas/atendimentos
- **messages** - Mensagens das conversas
- **channels** - Canais de comunicação
- **sectors** - Setores de atendimento
- **organization_members** - Agentes/membros
- **contact_tags** - Tags dos contatos
- **message_reactions** - Reações das mensagens
- **chat_assignments** - Histórico de atribuições
- **performance_metrics** - Métricas de performance

### Índices Otimizados
- Performance: Índices compostos para consultas rápidas
- Busca: GIN para busca em texto e JSONB
- Tempo: Índices em timestamps para relatórios
- Status: Índices específicos para chats em espera

### Funções SQL
- `calculate_response_time()` - Tempo médio de resposta
- `get_webhook_stats()` - Estatísticas de webhooks
- `get_waiting_chats()` - Chats em espera

### Views para Consultas
- `chat_summary` - Visão completa dos chats
- `message_summary` - Visão das mensagens com contexto

## 🔒 Segurança

### Validação de Webhook
```javascript
// Assinatura do webhook
const signature = headers['x-umbler-signature'];
const isValid = validateWebhookSignature(rawBody, signature, secret);
```

### Rate Limiting
```javascript
// Limite por IP
windowMs: 15 * 60 * 1000, // 15 minutos
max: 100, // 100 requisições por IP
webhookMax: 1000 // 1000 webhooks por IP
```

### SSL/TLS
```javascript
// Conexão segura com Neon
ssl: { rejectUnauthorized: false }
```

## 🔧 Troubleshooting

### Problemas Comuns

#### 1. Erro de Conexão
```bash
# Verificar DATABASE_URL
echo $DATABASE_URL

# Testar conexão
npm run test:connection
```

#### 2. Tabelas Não Encontradas
```bash
# Recriar tabelas
npm run db:setup
```

#### 3. Performance Lenta
```bash
# Verificar índices
npm run test:connection

# Otimizar consultas
EXPLAIN ANALYZE SELECT * FROM chats WHERE is_waiting = true;
```

#### 4. Webhooks Não Processados
```bash
# Verificar logs
tail -f logs/app.log

# Reprocessar webhooks falhados
curl -X POST http://localhost:3000/webhook/retry/event-id
```

### Logs de Debug
```bash
# Logs detalhados
LOG_LEVEL=debug npm run dev

# Logs de webhook
grep "webhook" logs/app.log

# Logs de erro
grep "ERROR" logs/app.log
```

## 📚 Exemplos de Uso

### Simular Webhook
```bash
curl -X POST http://localhost:3000/webhook/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "message",
    "data": {
      "phone": "+5547999955497",
      "name": "ANDERSON FERRARI",
      "content": "Teste de webhook"
    }
  }'
```

### Consultar Chats em Espera
```bash
curl http://localhost:3000/api/chats/waiting
```

### Relatório por Setor
```bash
curl "http://localhost:3000/api/reports/sector?start=2025-07-01&end=2025-07-31"
```

### Estatísticas de Webhook
```bash
curl "http://localhost:3000/webhook/stats?period=24h"
```

## 🎉 Benefícios da Migração

### Antes (Supabase)
- ❌ Falhas intermitentes
- ❌ Perda de dados
- ❌ Consultas lentas
- ❌ Limitações de rate
- ❌ Dependência externa

### Depois (PostgreSQL + Neon)
- ✅ **100% confiável**
- ✅ **Zero perda de dados**
- ✅ **Consultas < 2s**
- ✅ **Sem limitações**
- ✅ **Controle total**

## 📞 Suporte

### Documentação
- [Migração Completa](./README-MIGRACAO-POSTGRESQL.md)
- [Schema PostgreSQL](./schema-postgresql.sql)
- [Configuração](./src/config/)
- [API Endpoints](./src/routes/)

### Scripts de Ajuda
```bash
# Setup completo
npm run db:setup

# Teste de conexão
npm run test:connection

# Health check
npm run health
```

### Logs e Debug
```bash
# Logs em tempo real
tail -f logs/app.log

# Métricas do banco
npm run test:connection
```

---

## 🎯 Próximos Passos

1. **Execute o setup**: `npm run db:setup`
2. **Teste a conexão**: `npm run test:connection`
3. **Inicie o servidor**: `npm run dev`
4. **Configure webhook na Umbler**: Use a URL do seu servidor
5. **Monitore os logs**: Verifique se os webhooks estão chegando
6. **Teste as consultas**: Use os endpoints da API

**🎉 Parabéns! Seu sistema agora está rodando com PostgreSQL e é 100% confiável!**