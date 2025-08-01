# 🚀 Guia Completo de Deploy - Backend e Frontend

## 📋 Índice
1. [Preparação](#preparação)
2. [Deploy do Backend](#deploy-do-backend)
3. [Deploy do Frontend](#deploy-do-frontend)
4. [Configuração de Domínios](#configuração-de-domínios)
5. [Monitoramento](#monitoramento)
6. [Troubleshooting](#troubleshooting)

---

## 🔧 Preparação

### 1. **Verificar se tudo está funcionando localmente**

```bash
# No diretório do backend
cd project-root
npm install
node setup-completo.js  # Configurar Supabase
npm run dev

# Em outro terminal, no diretório do frontend
cd frontend
npm install
npm run dev
```

### 2. **Configurar variáveis de ambiente**

**Backend (.env):**
```env
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
JWT_SECRET=sua_chave_jwt_muito_segura
WEBHOOK_SECRET=sua_chave_webhook_segura
CORS_ORIGIN=https://seu-frontend.vercel.app
```

---

## 🖥️ Deploy do Backend

### **Opção 1: Railway (Recomendado - Mais Simples)**

#### **Passo 1: Preparar o projeto**
```bash
cd project-root

# Criar arquivo railway.json
echo '{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}' > railway.json
```

#### **Passo 2: Deploy no Railway**
1. Acesse: https://railway.app
2. Faça login com GitHub
3. Clique em "New Project"
4. Selecione "Deploy from GitHub repo"
5. Conecte seu repositório
6. Selecione a pasta `project-root`
7. Configure as variáveis de ambiente:

```
NODE_ENV=production
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
JWT_SECRET=sua_chave_jwt_muito_segura
WEBHOOK_SECRET=sua_chave_webhook_segura
CORS_ORIGIN=https://seu-frontend.vercel.app
PORT=3000
```

8. Clique em "Deploy"

#### **Passo 3: Configurar domínio personalizado (opcional)**
1. No painel do Railway, vá em "Settings"
2. Em "Domains", clique em "Generate Domain"
3. Ou adicione um domínio personalizado

---

### **Opção 2: Render**

#### **Passo 1: Preparar o projeto**
```bash
cd project-root

# Criar arquivo render.yaml
echo 'services:
  - type: web
    name: umbler-backend
    env: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_ANON_KEY
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: WEBHOOK_SECRET
        generateValue: true' > render.yaml
```

#### **Passo 2: Deploy no Render**
1. Acesse: https://render.com
2. Faça login com GitHub
3. Clique em "New Web Service"
4. Conecte seu repositório
5. Configure:
   - **Name**: umbler-backend
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (ou pago para melhor performance)

6. Adicione as variáveis de ambiente
7. Clique em "Create Web Service"

---

### **Opção 3: Heroku**

#### **Passo 1: Preparar o projeto**
```bash
cd project-root

# Criar Procfile
echo 'web: npm start' > Procfile

# Instalar Heroku CLI se não tiver
# Windows: https://devcenter.heroku.com/articles/heroku-cli
# Mac: brew tap heroku/brew && brew install heroku
# Linux: curl https://cli-assets.heroku.com/install.sh | sh
```

#### **Passo 2: Deploy no Heroku**
```bash
# Login no Heroku
heroku login

# Criar app
heroku create seu-app-name

# Configurar variáveis de ambiente
heroku config:set NODE_ENV=production
heroku config:set SUPABASE_URL=https://seu-projeto.supabase.co
heroku config:set SUPABASE_ANON_KEY=sua_chave_anonima
heroku config:set SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
heroku config:set JWT_SECRET=sua_chave_jwt_muito_segura
heroku config:set WEBHOOK_SECRET=sua_chave_webhook_segura

# Deploy
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

---

## 🌐 Deploy do Frontend

### **Vercel (Recomendado)**

#### **Passo 1: Preparar o projeto**
```bash
cd frontend

# Criar arquivo .env.local
echo 'NEXT_PUBLIC_API_URL=https://seu-backend.railway.app
NEXT_PUBLIC_APP_NAME=Umbler Dashboard
NEXT_PUBLIC_APP_VERSION=1.0.0' > .env.local
```

#### **Passo 2: Deploy na Vercel**
1. Acesse: https://vercel.com
2. Faça login com GitHub
3. Clique em "New Project"
4. Selecione seu repositório
5. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

6. Adicione as variáveis de ambiente:
```
NEXT_PUBLIC_API_URL=https://seu-backend.railway.app
NEXT_PUBLIC_APP_NAME=Umbler Dashboard
NEXT_PUBLIC_APP_VERSION=1.0.0
```

7. Clique em "Deploy"

#### **Passo 3: Configurar domínio personalizado (opcional)**
1. No painel da Vercel, vá em "Settings"
2. Em "Domains", adicione seu domínio
3. Configure o DNS conforme instruções

---

### **Netlify (Alternativa)**

#### **Passo 1: Build local**
```bash
cd frontend
npm run build
```

#### **Passo 2: Deploy no Netlify**
1. Acesse: https://netlify.com
2. Faça login
3. Arraste a pasta `frontend/.next` para o deploy
4. Ou conecte com GitHub para deploy automático

---

## 🔗 Configuração de Domínios

### **1. Configurar CORS no Backend**
Após deploy, atualize a variável `CORS_ORIGIN` no backend:

```env
CORS_ORIGIN=https://seu-frontend.vercel.app,https://seudominio.com
```

### **2. Atualizar URL da API no Frontend**
```env
NEXT_PUBLIC_API_URL=https://seu-backend.railway.app
```

### **3. Configurar Webhook da Umbler**
1. Acesse o painel da Umbler
2. Configure o webhook para: `https://seu-backend.railway.app/webhook/umbler`

---

## 📊 Monitoramento

### **1. Health Check**
Teste se tudo está funcionando:
```bash
# Backend
curl https://seu-backend.railway.app/health

# Frontend
curl https://seu-frontend.vercel.app
```

### **2. Logs do Backend**
```bash
# Railway
railway logs

# Render
# Acesse o painel e vá em "Logs"

# Heroku
heroku logs --tail
```

### **3. Monitoramento Contínuo**
- **Uptime Robot**: https://uptimerobot.com (gratuito)
- **Pingdom**: https://pingdom.com
- **StatusCake**: https://statuscake.com

---

## 🛠️ Troubleshooting

### **Problemas Comuns do Backend**

#### **1. Erro de CORS**
```
Access to fetch at 'API_URL' from origin 'FRONTEND_URL' has been blocked by CORS policy
```

**Solução:**
```bash
# Atualizar CORS_ORIGIN no backend
CORS_ORIGIN=https://seu-frontend.vercel.app,https://localhost:3000
```

#### **2. Erro de Conexão com Supabase**
```
Invalid API key
```

**Solução:**
1. Verifique se as variáveis estão corretas
2. Execute o teste: `node test-supabase-connection.js`

#### **3. Erro de Build**
```
Module not found
```

**Solução:**
```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
```

### **Problemas Comuns do Frontend**

#### **1. API não encontrada**
```
Failed to fetch
```

**Solução:**
1. Verifique se `NEXT_PUBLIC_API_URL` está correto
2. Teste a URL da API no navegador

#### **2. Erro de Build**
```
Type error: Cannot find module
```

**Solução:**
```bash
# Verificar tipos TypeScript
npm run type-check
```

---

## ✅ Checklist Final

### **Backend:**
- [ ] Deploy realizado com sucesso
- [ ] Variáveis de ambiente configuradas
- [ ] Health check respondendo
- [ ] Webhook endpoint acessível
- [ ] Conexão com Supabase funcionando
- [ ] CORS configurado para o frontend

### **Frontend:**
- [ ] Deploy realizado com sucesso
- [ ] Variáveis de ambiente configuradas
- [ ] Conectando com a API do backend
- [ ] Dashboard carregando dados
- [ ] Sistema de etiquetas funcionando
- [ ] Responsivo em mobile

### **Integração:**
- [ ] Frontend consegue buscar dados do backend
- [ ] Sistema de etiquetas funcionando
- [ ] Gráficos exibindo dados reais
- [ ] Webhook da Umbler configurado
- [ ] Domínios personalizados (se aplicável)

---

## 🎯 URLs Finais

Após completar o deploy, você terá:

- **Backend**: `https://seu-backend.railway.app`
- **Frontend**: `https://seu-frontend.vercel.app`
- **Webhook**: `https://seu-backend.railway.app/webhook/umbler`
- **Health Check**: `https://seu-backend.railway.app/health`
- **API Docs**: `https://seu-backend.railway.app/api/docs` (se implementado)

---

## 📞 Suporte

Se tiver problemas:
1. Verifique os logs dos serviços
2. Teste as URLs individualmente
3. Confirme as variáveis de ambiente
4. Verifique a conectividade entre frontend e backend

🎉 **Seu sistema estará funcionando 24/7 na nuvem!**