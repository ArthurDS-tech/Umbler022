# ⚡ Guia Rápido - Sistema Webhook Umbler + Supabase

## 🚀 Configuração em 5 minutos

### 1. Configure o Supabase

1. Acesse: https://supabase.com/dashboard
2. Crie/selecione um projeto
3. Vá em **Settings** → **API**
4. Copie: **Project URL** e **service_role key**

### 2. Configure o arquivo .env

```bash
# Edite o arquivo .env e substitua:
SUPABASE_URL=https://sua-url-real.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_real
```

### 3. Execute a configuração

```bash
npm install
npm run supabase:setup
```

### 4. Inicie o sistema

```bash
npm run dev
```

### 5. Teste o sistema

```bash
npm run supabase:test
```

## ✅ Pronto!

- **Webhook URL**: http://localhost:3000/webhook/umbler
- **Health Check**: http://localhost:3000/health
- **Dados salvos no Supabase**: Acesse o Table Editor no dashboard

## 🔧 Problemas?

1. **Credenciais erradas**: Verifique o .env
2. **Tabelas não criadas**: Execute `npm run supabase:setup`
3. **Teste falha**: Execute `npm run supabase:test` para diagnosticar

## 📚 Documentação Completa

Veja: [README-SUPABASE-SETUP.md](./README-SUPABASE-SETUP.md)