# Guia de Deploy - Sistema de Webhooks Umbler

Este guia explica como fazer o deploy do sistema completo (frontend + backend) para produção.

## 📋 Pré-requisitos

- Conta no Vercel (para frontend)
- Conta no Supabase (para banco de dados)
- Conta no ngrok (para túnel público)
- Node.js 18+ instalado

## 🚀 Deploy do Frontend (Vercel)

### 1. Preparar o Frontend

```bash
# Navegar para o diretório do frontend
cd google-ads-zenith

# Instalar dependências
npm install

# Configurar variáveis de ambiente
```

### 2. Configurar Variáveis de Ambiente no Vercel

No painel do Vercel, adicione as seguintes variáveis de ambiente:

```env
# API URL (será configurada após o deploy do backend)
VITE_API_URL=https://seu-backend-url.com

# Configurações da aplicação
VITE_APP_NAME=Google Ads Zenith
VITE_APP_VERSION=1.0.0

# Configurações de desenvolvimento
VITE_DEV_MODE=false
VITE_ENABLE_LOGS=true

# Webhook Configuration
VITE_WEBHOOK_URL=https://seu-ngrok-url.ngrok.io/webhook
VITE_WEBHOOK_SECRET=seu_webhook_secret

# Feature Flags
VITE_ENABLE_REAL_TIME=true
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_ANALYTICS=false
```

### 3. Deploy no Vercel

```bash
# Instalar Vercel CLI
npm install -g vercel

# Fazer login no Vercel
vercel login

# Deploy
vercel --prod
```

## 🐳 Deploy do Backend (Docker)

### Opção 1: Docker + VPS/Cloud

#### 1. Criar Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Mudar propriedade dos arquivos
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Comando de inicialização
CMD ["npm", "start"]
```

#### 2. Criar docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOST=0.0.0.0
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - DATABASE_URL=${DATABASE_URL}
      - WEBHOOK_SECRET=${WEBHOOK_SECRET}
      - CORS_ORIGIN=${CORS_ORIGIN}
    restart: unless-stopped
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

#### 3. Configurar Nginx

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:3000;
    }

    server {
        listen 80;
        server_name seu-dominio.com;

        location / {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

#### 4. Deploy

```bash
# Construir e iniciar containers
docker-compose up -d

# Verificar logs
docker-compose logs -f
```

### Opção 2: Vercel (Backend como Serverless)

#### 1. Criar vercel.json

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/app.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/webhook/(.*)",
      "dest": "src/app.js"
    },
    {
      "src": "/api/(.*)",
      "dest": "src/app.js"
    },
    {
      "src": "/health",
      "dest": "src/app.js"
    },
    {
      "src": "/(.*)",
      "dest": "src/app.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

#### 2. Configurar Variáveis de Ambiente no Vercel

```env
SUPABASE_URL=sua_url_do_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_chave_do_supabase
DATABASE_URL=sua_url_do_banco
WEBHOOK_SECRET=seu_webhook_secret
CORS_ORIGIN=https://seu-frontend-url.vercel.app
```

#### 3. Deploy

```bash
# Deploy no Vercel
vercel --prod
```

## 🔧 Configuração do Ngrok

### 1. Instalar ngrok

```bash
# Via npm
npm install -g ngrok

# Ou baixar de https://ngrok.com/download
```

### 2. Configurar autenticação

```bash
# Obter token em https://dashboard.ngrok.com/get-started/your-authtoken
ngrok config add-authtoken seu_token_aqui
```

### 3. Iniciar túnel

```bash
# Para desenvolvimento local
ngrok http 3000

# Para produção (se backend estiver em VPS)
ngrok http 80
```

### 4. Configurar webhook na Umbler

Use a URL do ngrok (ex: `https://abc123.ngrok.io/webhook/umbler`) na configuração de webhooks da Umbler.

## 🔗 Configuração Final

### 1. Atualizar URLs

Após o deploy, atualize as URLs no frontend:

```env
# No Vercel (frontend)
VITE_API_URL=https://seu-backend-url.com
VITE_WEBHOOK_URL=https://seu-ngrok-url.ngrok.io/webhook
```

### 2. Testar Conexão

```bash
# Testar backend
curl https://seu-backend-url.com/health

# Testar webhook
curl -X POST https://seu-backend-url.com/webhook/umbler \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### 3. Monitorar Logs

```bash
# Vercel
vercel logs

# Docker
docker-compose logs -f backend

# Local
npm run dev
```

## 🚨 Troubleshooting

### Problemas Comuns

1. **CORS Errors**
   - Verificar se `CORS_ORIGIN` está configurado corretamente
   - Incluir domínio do frontend na lista de origens permitidas

2. **Webhook não recebido**
   - Verificar se ngrok está rodando
   - Verificar se URL está correta na Umbler
   - Verificar logs do backend

3. **Erro de conexão com Supabase**
   - Verificar credenciais do Supabase
   - Verificar se tabelas foram criadas
   - Verificar conectividade de rede

4. **Frontend não carrega dados**
   - Verificar se API_URL está correto
   - Verificar se backend está respondendo
   - Verificar console do navegador para erros

### Comandos Úteis

```bash
# Verificar status do backend
curl http://localhost:3000/health

# Testar webhook local
node test-webhook-local.js

# Ver logs em tempo real
tail -f logs/app.log

# Reiniciar serviços
docker-compose restart
```

## 📊 Monitoramento

### 1. Health Checks

- Backend: `GET /health`
- Frontend: Verificar console do navegador
- Database: Verificar conexão Supabase

### 2. Logs

- Backend: `logs/app.log`
- Vercel: Dashboard do Vercel
- Docker: `docker-compose logs`

### 3. Métricas

- Webhook events: `/api/webhook/stats`
- Dashboard stats: `/api/dashboard/stats`
- Database: Supabase Dashboard

## 🔐 Segurança

### 1. Variáveis de Ambiente

- Nunca commitar credenciais no código
- Usar variáveis de ambiente em produção
- Rotacionar secrets regularmente

### 2. CORS

- Configurar apenas origens necessárias
- Não usar `*` em produção
- Verificar headers de segurança

### 3. Rate Limiting

- Configurar limites apropriados
- Monitorar abuso
- Implementar blacklist se necessário

## 📈 Escalabilidade

### 1. Backend

- Usar load balancer para múltiplas instâncias
- Implementar cache (Redis)
- Otimizar queries do banco

### 2. Frontend

- Implementar lazy loading
- Otimizar bundle size
- Usar CDN para assets

### 3. Database

- Configurar connection pooling
- Implementar índices adequados
- Monitorar performance

## 🆘 Suporte

Para problemas específicos:

1. Verificar logs detalhados
2. Testar endpoints individualmente
3. Verificar configurações de ambiente
4. Consultar documentação do Supabase/Vercel
5. Verificar status dos serviços externos
