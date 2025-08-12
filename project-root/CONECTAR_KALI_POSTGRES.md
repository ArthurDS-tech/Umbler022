# 🐧➡️🪟 Conectar Windows ao PostgreSQL do Kali Linux

## 🎯 **SITUAÇÃO:**
- PostgreSQL instalado no **Kali Linux**
- Projeto rodando no **Windows** 
- Precisa conectar do Windows ao PostgreSQL do Kali

---

## 🚀 **CONFIGURAÇÃO NO KALI LINUX:**

### 1. **Iniciar PostgreSQL no Kali:**
```bash
# No terminal do Kali Linux:
sudo systemctl start postgresql
sudo systemctl enable postgresql  # Para iniciar automaticamente

# Verificar se está rodando:
sudo systemctl status postgresql
```

### 2. **Configurar PostgreSQL para aceitar conexões remotas:**

#### A. **Editar postgresql.conf:**
```bash
sudo nano /etc/postgresql/*/main/postgresql.conf
```

**Encontre e mude:**
```bash
# ANTES:
#listen_addresses = 'localhost'

# DEPOIS:
listen_addresses = '*'
```

#### B. **Editar pg_hba.conf:**
```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

**Adicione no final do arquivo:**
```bash
# Permitir conexões do Windows
host    all             all             192.168.0.0/16          md5
host    all             all             10.0.0.0/8              md5
host    all             all             172.16.0.0/12           md5
```

#### C. **Reiniciar PostgreSQL:**
```bash
sudo systemctl restart postgresql
```

### 3. **Descobrir IP do Kali Linux:**
```bash
# Ver o IP do Kali:
ip addr show | grep inet

# Ou apenas:
hostname -I
```

**Anote o IP!** (ex: `192.168.1.100`)

### 4. **Verificar se está escutando:**
```bash
# Verificar se PostgreSQL está escutando na rede:
sudo netstat -tlnp | grep 5432

# Deve mostrar algo como:
# 0.0.0.0:5432
```

---

## 🪟 **CONFIGURAÇÃO NO WINDOWS:**

### 1. **Atualizar .env com IP do Kali:**

**No arquivo `.env`**, substitua `localhost` pelo IP do Kali:

```bash
# ANTES:
DATABASE_URL=postgresql://umbler_user:SUA_SENHA@localhost:5432/umbler_webhook_db
DATABASE_HOST=localhost

# DEPOIS (exemplo com IP 192.168.1.100):
DATABASE_URL=postgresql://umbler_user:SUA_SENHA@192.168.1.100:5432/umbler_webhook_db
DATABASE_HOST=192.168.1.100
```

### 2. **Criar script de setup atualizado:**
```