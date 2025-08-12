# 🐉 Configuração Kali Linux - Usuário umbler_user

## ✅ **CONFIGURAÇÃO ATUALIZADA PARA SEU AMBIENTE**

### 📋 **Seu Setup:**
- **SO:** Kali Linux
- **Editor:** VS Code
- **Usuário PostgreSQL:** `umbler_user`
- **Terminal:** Kali Linux Terminal

---

## 🚀 **PASSOS RÁPIDOS:**

### 1. **Testar Conexão com seu Usuário**
```bash
cd project-root
node test-connection-umbler-user.js
```
Este script vai:
- ✅ Pedir sua senha do `umbler_user`
- ✅ Testar a conexão
- ✅ Verificar permissões
- ✅ Mostrar status do banco

### 2. **Configurar .env com sua Senha**
No VS Code, edite o arquivo `.env` e substitua `SUA_SENHA_AQUI`:

```bash
# ANTES:
DATABASE_PASSWORD=SUA_SENHA_AQUI
DATABASE_URL=postgresql://umbler_user:SUA_SENHA_AQUI@localhost:5432/umbler_webhook_db

# DEPOIS (exemplo):
DATABASE_PASSWORD=minhasenha123
DATABASE_URL=postgresql://umbler_user:minhasenha123@localhost:5432/umbler_webhook_db
```

### 3. **Configurar Script de Setup**
No arquivo `setup-postgresql-complete.js`, linha 7, substitua:
```javascript
// ANTES:
password: 'SUA_SENHA_AQUI',

// DEPOIS:
password: 'minhasenha123', // Sua senha real
```

### 4. **Executar Setup do Banco**
```bash
cd project-root
node setup-postgresql-complete.js
```

### 5. **Iniciar o Sistema**
```bash
# Terminal 1 - Backend
cd project-root
npm run dev

# Terminal 2 - Frontend (novo terminal)
cd frontend
npm run dev
```

---

## 🔧 **Comandos Específicos para Kali Linux:**

### Verificar PostgreSQL:
```bash
# Status do serviço
sudo systemctl status postgresql

# Iniciar se não estiver rodando
sudo systemctl start postgresql

# Ver usuários PostgreSQL
sudo -u postgres psql -c "\du"
```

### Se precisar dar mais permissões ao umbler_user:
```bash
sudo -u postgres psql
```
```sql
-- Dar permissão para criar bancos
GRANT CREATEDB TO umbler_user;

-- Dar permissão de superusuário (se necessário)
ALTER USER umbler_user WITH SUPERUSER;

-- Sair
\q
```

---

## 📁 **Arquivos Atualizados para Você:**

1. ✅ **`.env`** - Configurado para `umbler_user`
2. ✅ **`setup-postgresql-complete.js`** - Usando `umbler_user`
3. ✅ **`test-connection-umbler-user.js`** - Teste específico
4. ✅ **Este guia** - Específico para seu ambiente

---

## 🧪 **Teste Rápido da Configuração:**

### 1. **Teste de Conexão:**
```bash
node test-connection-umbler-user.js
# Digite sua senha quando solicitado
```

### 2. **Se der erro, verifique:**
```bash
# PostgreSQL rodando?
sudo systemctl status postgresql

# Usuário existe?
sudo -u postgres psql -c "\du" | grep umbler_user

# Conectar manualmente para testar
psql -U umbler_user -d postgres -h localhost
```

---

## 🎯 **Exemplo de .env Correto:**

```bash
NODE_ENV=development
PORT=3000

# CONFIGURAÇÃO PARA umbler_user
DATABASE_USER=umbler_user
DATABASE_PASSWORD=suasenharealaqui
DATABASE_URL=postgresql://umbler_user:suasenharealaqui@localhost:5432/umbler_webhook_db

# CORS
CORS_ORIGIN=http://localhost:3001
CORS_CREDENTIALS=true

# Controle de banco
USE_POSTGRESQL=true
SKIP_SUPABASE=true

# Resto já configurado...
```

---

## ✅ **Checklist Kali Linux:**

- [ ] PostgreSQL instalado e rodando no Kali
- [ ] Usuário `umbler_user` criado
- [ ] Teste de conexão passou: `node test-connection-umbler-user.js`
- [ ] Arquivo `.env` com senha real configurada
- [ ] Script `setup-postgresql-complete.js` com senha real
- [ ] Setup executado: `node setup-postgresql-complete.js`
- [ ] Backend iniciado sem erros: `npm run dev`
- [ ] Frontend carregando: `http://localhost:3001`

---

## 🚨 **Problemas Comuns no Kali:**

### ❌ "peer authentication failed"
```bash
# Editar configuração do PostgreSQL
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Mudar de 'peer' para 'md5' na linha:
local   all             all                                     md5

# Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

### ❌ "password authentication failed"
```bash
# Resetar senha do umbler_user
sudo -u postgres psql
ALTER USER umbler_user PASSWORD 'novasenha';
\q
```

### ❌ "connection refused"
```bash
# Verificar se PostgreSQL está escutando
sudo netstat -tlnp | grep 5432

# Iniciar se necessário
sudo systemctl start postgresql
```

---

## 🎉 **Pronto!**

Agora está tudo configurado especificamente para seu usuário `umbler_user` no Kali Linux! 

Execute os testes e qualquer erro me avise! 🚀