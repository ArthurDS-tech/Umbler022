# 🐘 Configuração PostgreSQL para Umbler Webhook

Este guia te ajudará a configurar o PostgreSQL como banco de dados principal para receber webhooks do Umbler.

## 📋 Pré-requisitos

1. **PostgreSQL instalado** (versão 12 ou superior)
2. **Node.js** (versão 18 ou superior)
3. **Credenciais do PostgreSQL**

## 🚀 Configuração Rápida

### 1. Instalar PostgreSQL

**Windows:**
```bash
# Baixe o installer oficial do PostgreSQL
# https://www.postgresql.org/download/windows/
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

### 2. Criar usuário e banco (se necessário)

```sql
-- Conectar como superusuário
sudo -u postgres psql

-- Criar usuário (se não existir)
CREATE USER umbler_user WITH ENCRYPTED PASSWORD 'sua_senha_aqui';

-- Dar privilégios
ALTER USER umbler_user CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE postgres TO umbler_user;

-- Sair
\q
```

### 3. Configurar Environment

Edite o arquivo `.env` no diretório `project-root`:

```bash
# Environment Configuration
NODE_ENV=development

# Server Configuration
PORT=3000
WEBHOOK_SECRET=your_webhook_secret_here

# CORS Configuration
CORS_ORIGIN=http://localhost:3001
CORS_CREDENTIALS=true

# PostgreSQL Configuration (Primary Database)
DATABASE_URL=postgresql://postgres:password@localhost:5432/umbler_webhook_db
DATABASE_SSL=false
DATABASE_MAX_CONNECTIONS=20
DATABASE_IDLE_TIMEOUT=30000

# Logging Configuration
LOG_LEVEL=info

# Development Mode - Use PostgreSQL directly
USE_POSTGRESQL=true
```

**⚠️ IMPORTANTE:** Substitua `password` pela sua senha real do PostgreSQL!

### 4. Executar Setup do Banco

```bash
cd project-root

# Instalar dependências (se não instalou ainda)
npm install

# Executar setup completo do PostgreSQL
node setup-postgresql-complete.js
```

### 5. Iniciar o Servidor

```bash
# Backend (porta 3000)
cd project-root
npm run dev

# Frontend (porta 3001) - em outro terminal
cd frontend
npm run dev
```

## 🗄️ Estrutura do Banco

O script de setup criará automaticamente:

### Tabelas Principais

1. **`webhook_events`** - Eventos recebidos do webhook
2. **`contacts`** - Contatos do WhatsApp
3. **`chats`** - Conversas/chats
4. **`messages`** - Mensagens individuais
5. **`message_reactions`** - Reações às mensagens

### Dados de Exemplo

O setup inclui dados de exemplo:
- 5 contatos com diferentes tags
- Chats correspondentes
- Mensagens de exemplo
- Relacionamentos completos

## 🔧 Configurações Avançadas

### Customizar Credenciais do Banco

Se você tem credenciais diferentes, edite no script `setup-postgresql-complete.js`:

```javascript
const dbConfig = {
  host: 'localhost',        // Seu host
  port: 5432,              // Sua porta
  database: 'postgres',    // Banco padrão para criação
  user: 'seu_usuario',     // Seu usuário
  password: 'sua_senha',   // Sua senha
};
```

### Configurações de Performance

No arquivo `.env`, você pode ajustar:

```bash
DATABASE_MAX_CONNECTIONS=50     # Máximo de conexões
DATABASE_IDLE_TIMEOUT=60000    # Timeout de idle (60s)
DATABASE_SSL=true              # Para produção
```

## 🧪 Testar a Configuração

### 1. Verificar Conexão

```bash
cd project-root
node -e "
const { testConnection } = require('./src/config/database');
testConnection().then(success => {
  console.log(success ? '✅ Conexão OK' : '❌ Falha na conexão');
  process.exit(success ? 0 : 1);
});
"
```

### 2. Testar API

```bash
# Testar endpoint de contatos
curl http://localhost:3000/api/contacts

# Testar estatísticas
curl http://localhost:3000/api/stats
```

### 3. Verificar Frontend

Acesse `http://localhost:3001` e verifique se:
- ✅ Lista de contatos carrega
- ✅ Mensagens aparecem quando selecionar um contato
- ✅ Sem erros de CORS
- ✅ Sem erros 404/500

## 📊 Monitoramento

### Logs do Banco

O sistema gera logs detalhados:

```bash
# Ver logs em tempo real
tail -f logs/app.log

# Filtrar apenas logs do banco
grep "PostgreSQL" logs/app.log
```

### Queries Úteis

```sql
-- Verificar dados inseridos
SELECT COUNT(*) FROM contacts;
SELECT COUNT(*) FROM messages;
SELECT COUNT(*) FROM webhook_events;

-- Ver últimos webhooks processados
SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 5;

-- Ver contatos com mais mensagens
SELECT c.name, COUNT(m.id) as total_messages 
FROM contacts c 
LEFT JOIN messages m ON m.contact_id = c.id 
GROUP BY c.id, c.name 
ORDER BY total_messages DESC;
```

## 🚨 Solução de Problemas

### Erro de Conexão

```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql    # Linux
brew services list | grep postgres  # macOS

# Verificar porta
sudo netstat -tlnp | grep 5432
```

### Erro de Autenticação

```sql
-- Verificar usuários
\du

-- Resetar senha
ALTER USER postgres PASSWORD 'nova_senha';
```

### Banco Não Encontrado

```sql
-- Listar bancos
\l

-- Criar manualmente se necessário
CREATE DATABASE umbler_webhook_db;
```

### Permissões

```sql
-- Dar todas as permissões
GRANT ALL PRIVILEGES ON DATABASE umbler_webhook_db TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
```

## 🔄 Migração do Supabase

Se você estava usando Supabase antes:

1. **Backup dos dados** (se houver)
2. **Execute o setup do PostgreSQL**
3. **Importe dados** (se necessário)
4. **Teste a aplicação**

## 📈 Performance

Para melhor performance em produção:

```sql
-- Otimizar configurações
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET max_connections = '100';

-- Recarregar configurações
SELECT pg_reload_conf();
```

## ✅ Checklist de Verificação

- [ ] PostgreSQL instalado e rodando
- [ ] Arquivo `.env` configurado com credenciais corretas
- [ ] Script `setup-postgresql-complete.js` executado com sucesso
- [ ] Backend iniciado sem erros
- [ ] Frontend conectando com backend
- [ ] API retornando dados do PostgreSQL
- [ ] Logs mostrando "PostgreSQL direto como backend"

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs: `tail -f logs/app.log`
2. Teste a conexão: `node setup-postgresql-complete.js`
3. Verifique as credenciais no `.env`
4. Confirme que PostgreSQL está rodando

---

✅ **Pronto!** Agora seu sistema está configurado para receber webhooks do Umbler diretamente no PostgreSQL!