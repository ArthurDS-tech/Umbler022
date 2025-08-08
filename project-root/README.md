# Umbler Webhook Backend

Backend para processamento de webhooks da Umbler com integração ao Supabase.

## 🚀 Configuração Rápida

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
Copie o arquivo `.env.example` para `.env` e configure:

```env
# Supabase (obrigatório)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Banco de dados (fallback)
DATABASE_URL=postgresql://user:password@localhost:5432/umbler_webhook

# Aplicação
NODE_ENV=development
PORT=3000
WEBHOOK_SECRET=your_webhook_secret_here
```

### 3. Testar conexão com Supabase
```bash
node test-supabase-connection.js
```

### 4. Iniciar servidor
```bash
npm start
```

## 📋 Endpoints

- `POST /webhook/umbler` - Receber webhooks da Umbler
- `GET /webhook/test` - Teste de conectividade
- `GET /api/health` - Health check
- `GET /api/stats` - Estatísticas

## 🔧 Desenvolvimento

```bash
# Modo desenvolvimento com auto-reload
npm run dev

# Testar webhook
curl -X POST http://localhost:3000/webhook/test
```

## 📊 Monitoramento

- Logs: `logs/app.log`
- Health check: `/api/health`
- Estatísticas: `/api/stats`

## 🛠️ Estrutura do Projeto

```
src/
├── config/          # Configurações
├── controllers/     # Controllers
├── middleware/      # Middlewares
├── routes/          # Rotas
├── services/        # Serviços
└── utils/           # Utilitários
```

## 🔒 Segurança

- Validação de assinatura de webhook
- Rate limiting
- CORS configurável
- Logs de auditoria

## 📈 Funcionalidades

- ✅ Processamento de webhooks da Umbler
- ✅ Integração com Supabase
- ✅ Cálculo de tempo de resposta
- ✅ Estatísticas em tempo real
- ✅ Sistema de retry automático
- ✅ Logs detalhados
- ✅ Health checks

## 🆘 Suporte

Para problemas com Supabase:
1. Verifique as credenciais no arquivo `.env`
2. Execute `node test-supabase-connection.js`
3. Verifique os logs em `logs/app.log`
