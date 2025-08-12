# ⚡ Configuração Rápida - .env

## 🔧 **O QUE VOCÊ PRECISA CONFIGURAR NO .env**

### ✅ **OBRIGATÓRIO - Configure antes de iniciar:**

#### 1. **Senha do PostgreSQL**
```bash
# Linha 28 do .env - SUBSTITUA 'password' pela sua senha real!
DATABASE_PASSWORD=SUA_SENHA_POSTGRESQL_AQUI
DATABASE_URL=postgresql://postgres:SUA_SENHA_POSTGRESQL_AQUI@localhost:5432/umbler_webhook_db
```

#### 2. **Webhook Secret do Umbler** (quando tiver)
```bash
# Linha 12 do .env - Configure com a chave fornecida pelo Umbler
WEBHOOK_SECRET=sua_chave_webhook_do_umbler_aqui
```

### 🔧 **OPCIONAL - Já configurado, mas pode ajustar:**

#### 3. **Usuário PostgreSQL** (se não for 'postgres')
```bash
# Linhas 32-33 do .env
DATABASE_USER=seu_usuario_postgresql
DATABASE_URL=postgresql://seu_usuario_postgresql:senha@localhost:5432/umbler_webhook_db
```

#### 4. **Nome do Banco** (se quiser outro nome)
```bash
# Linha 31 do .env
DATABASE_NAME=seu_nome_de_banco_personalizado
```

#### 5. **Porta do Frontend** (se não for 3001)
```bash
# Linha 18 do .env
CORS_ORIGIN=http://localhost:SUA_PORTA_FRONTEND
```

---

## 🚀 **Exemplo de .env Configurado:**

```bash
# ⚠️ EXEMPLO - Substitua pelos seus valores reais!

NODE_ENV=development
PORT=3000

# CONFIGURE ESTES:
WEBHOOK_SECRET=minha_chave_secreta_do_umbler_123
DATABASE_PASSWORD=minhasenha123
DATABASE_URL=postgresql://postgres:minhasenha123@localhost:5432/umbler_webhook_db

# CORS (ajuste se necessário)
CORS_ORIGIN=http://localhost:3001
CORS_CREDENTIALS=true

# Resto já está configurado...
```

---

## ✅ **Checklist Rápido:**

- [ ] ✅ PostgreSQL instalado e rodando
- [ ] ✅ Senha do PostgreSQL configurada no `.env`
- [ ] ✅ Webhook secret configurado (quando tiver)
- [ ] ✅ CORS_ORIGIN aponta para porta do frontend
- [ ] ✅ `npm install` executado no backend
- [ ] ✅ `node setup-postgresql-complete.js` executado
- [ ] ✅ Backend iniciado sem erros
- [ ] ✅ Frontend conectando com backend

---

## 🔍 **Como Verificar se Está Funcionando:**

### 1. **Backend iniciado corretamente:**
```bash
cd project-root
npm run dev

# Deve mostrar:
# ✅ Banco de dados PostgreSQL inicializado com sucesso
# 🚀 Servidor iniciado em http://0.0.0.0:3000
```

### 2. **API funcionando:**
```bash
curl http://localhost:3000/api/contacts
# Deve retornar JSON com lista de contatos
```

### 3. **Frontend carregando dados:**
- Acesse `http://localhost:3001`
- Deve mostrar lista de contatos carregados do PostgreSQL
- Sem erros de CORS no console

---

## 🚨 **Erros Comuns:**

### ❌ "password authentication failed"
**Solução:** Senha errada no `.env`
```bash
DATABASE_PASSWORD=sua_senha_real_do_postgresql
```

### ❌ "database does not exist"
**Solução:** Execute o setup do banco
```bash
node setup-postgresql-complete.js
```

### ❌ "CORS error"
**Solução:** Verifique se CORS_ORIGIN está correto
```bash
CORS_ORIGIN=http://localhost:3001  # Porta do frontend
```

### ❌ "connection refused"
**Solução:** PostgreSQL não está rodando
```bash
# Linux/macOS
sudo systemctl start postgresql
# ou
brew services start postgresql
```

---

## 💡 **Dica:**

O arquivo `.env.example` tem um modelo comentado. Use como referência se precisar!