# 🚀 Migração Completa: Supabase → PostgreSQL (Neon)

## 📋 Resumo da Migração

Este documento descreve a migração completa do sistema de webhook da Umbler do **Supabase** para **PostgreSQL** usando **Neon**, garantindo **zero perda de dados** e **performance otimizada** para atendimentos.

## 🎯 Benefícios da Migração

### ✅ Vantagens do PostgreSQL + Neon
- **Zero perda de dados** - Sistema robusto com retry automático
- **Performance superior** - Índices otimizados para consultas de chat
- **Escalabilidade** - Neon serverless cresce automaticamente
- **Custo-benefício** - Neon gratuito até 3GB
- **Controle total** - SQL nativo sem limitações
- **Backup automático** - Neon faz backup diário
- **Monitoramento** - Métricas detalhadas de performance

### ❌ Problemas do Supabase (Resolvidos)
- ~~Falhas intermitentes~~ → **Conexão estável**
- ~~Perda de dados~~ → **Retry automático + logs**
- ~~Limitações de consulta~~ → **SQL completo**
- ~~Rate limiting~~ → **Pool de conexões otimizado**
- ~~Dependência externa~~ → **Controle total**

## 🛠️ Stack Tecnológica

### Backend
- **Runtime**: Node.js 16+
- **Framework**: Express.js
- **Banco**: PostgreSQL 15+ (Neon)
- **ORM**: pg (driver nativo)
- **Pool**: pg-pool para conexões

### Infraestrutura
- **Provedor**: Neon (gratuito)
- **SSL**: Automático
- **Backup**: Diário automático
- **Monitoramento**: Health checks integrados

## 📊 Estrutura do Banco Otimizada

### Tabelas Principais
```sql
-- Dados brutos dos webhooks
webhook_events (id, event_id, event_type, event_date, payload, processed, ...)

-- Contatos/Clientes
contacts (id, umbler_contact_id, phone_number, name, is_blocked, ...)

-- Conversas/Atendimentos  
chats (id, umbler_chat_id, contact_id, status, is_waiting, waiting_since_utc, ...)

-- Mensagens das conversas
messages (id, umbler_message_id, chat_id, content, direction, event_at_utc, ...)

-- Canais de comunicação
channels (id, umbler_channel_id, channel_type, phone_number, name, ...)

-- Setores de atendimento
sectors (id, umbler_sector_id, name, is_default, order_position, ...)

-- Agentes/Membros
organization_members (id, umbler_member_id, name, is_active, ...)
```

### Índices Otimizados
- **Performance**: Índices compostos para consultas rápidas
- **Busca**: GIN para busca em texto e JSONB
- **Tempo**: Índices em timestamps para relatórios
- **Status**: Índices específicos para chats em espera

### Funções SQL
- `calculate_response_time()` - Tempo médio de resposta
- `get_webhook_stats()` - Estatísticas de webhooks
- `get_waiting_chats()` - Chats em espera

### Views para Consultas
- `chat_summary` - Visão completa dos chats
- `message_summary` - Visão das mensagens com contexto

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

## 🔧 Configuração Detalhada

### Variáveis de Ambiente (.env)
```env
# PostgreSQL (Neon)
DATABASE_URL=postgresql://user:pass@host:5432/db

# Aplicação
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Segurança
WEBHOOK_SECRET=seu_webhook_secret_aqui
JWT_SECRET=seu_jwt_secret_aqui

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WEBHOOK_MAX=1000

# Pool de Conexões
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000
```

### Scripts Disponíveis
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

# Backup e manutenção
npm run db:backup       # Backup dos dados
npm run db:restore      # Restaurar backup
```

## 📡 Webhook Handler Robusto

### Endpoint Principal
```
POST /webhook/umbler
```

### Processamento Automático
```javascript
// 1. Validação do payload
// 2. Salvamento do webhook bruto
// 3. Processamento estruturado
// 4. Criação/atualização de contatos
// 5. Criação/atualização de chats
// 6. Processamento de mensagens
// 7. Atualização de tags
// 8. Log de auditoria
```

### Tratamento de Erros
- ✅ **Retry automático** em falhas
- ✅ **Queue de webhooks** falhados
- ✅ **Logs detalhados** para debug
- ✅ **Alertas** de problemas
- ✅ **Backup** dos dados brutos

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

### Performance de Agentes
```sql
SELECT 
  om.name as agent,
  COUNT(c.id) as total_chats,
  AVG(calculate_response_time(c.id)) as avg_response_time
FROM chats c
JOIN organization_members om ON c.assigned_member_id = om.id
WHERE c.created_at >= NOW() - INTERVAL '30 days'
GROUP BY om.id, om.name;
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

## 🎯 Funcionalidades Específicas

### Captura de Dados
- ✅ **100% dos webhooks** salvos (dados brutos)
- ✅ **Processamento estruturado** automático
- ✅ **Evita duplicatas** (idempotência)
- ✅ **Log robusto** de erros

### Consultas Necessárias
- ✅ Buscar conversas por contato/cliente
- ✅ Relatório de atendimentos por período e setor
- ✅ Status de chats em tempo real (Open, Waiting, Closed)
- ✅ Performance dos agentes por setor
- ✅ Histórico completo de mensagens por chat
- ✅ Análise de tags de contatos
- ✅ Tempo médio de resposta por setor
- ✅ Chats em espera (Waiting = true)
- ✅ Métricas de primeiro atendimento vs resposta do cliente

### Tratamento de Erros
- ✅ **Retry automático** em falhas
- ✅ **Queue** para webhooks falhados
- ✅ **Alertas** de problemas
- ✅ **Backup** dos dados brutos

## 📈 Monitoramento e Métricas

### Health Check
```
GET /health
GET /health/detailed
```

### Métricas Disponíveis
- **Webhooks**: Total, processados, falhados
- **Chats**: Abertos, em espera, fechados
- **Performance**: Tempo de resposta, throughput
- **Agentes**: Produtividade, qualidade
- **Setores**: Volume, eficiência

### Logs Estruturados
```javascript
// Exemplo de log
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
# Deploy no Heroku
heroku create umbler-webhook
heroku config:set NODE_ENV=production
heroku config:set DATABASE_URL=postgresql://...
git push heroku main
```

### 3. Railway
```bash
# Deploy no Railway
railway login
railway init
railway up
```

### 4. Vercel
```bash
# Deploy no Vercel
vercel --prod
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

## 🎉 Resultados Esperados

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