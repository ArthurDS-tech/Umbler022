# 🔧 Configuração do Supabase - Guia Completo

## ❌ Problema Identificado

O sistema não está conseguindo conectar com o Supabase porque as credenciais no arquivo `.env` são placeholders (valores de exemplo) e não as credenciais reais do seu projeto.

## 🔧 Como Resolver

### Passo 1: Obter as Credenciais do Supabase

1. **Acesse o Dashboard do Supabase**
   - Vá para: https://supabase.com/dashboard
   - Faça login na sua conta

2. **Selecione seu Projeto**
   - Clique no projeto que você quer usar
   - Se não tem projeto, crie um novo

3. **Obter as Credenciais**
   - No menu lateral, clique em **Settings** (Configurações)
   - Clique em **API**
   - Você verá as seguintes informações:

   ```
   Project URL: https://seuprojetoid.supabase.co
   anon public: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
   service_role: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
   ```

### Passo 2: Configurar o arquivo .env

1. **Abra o arquivo `.env`** na raiz do projeto
2. **Substitua os valores placeholder pelas suas credenciais reais:**

```env
# =============================================
# SUPABASE (OBRIGATÓRIO)
# =============================================
SUPABASE_URL=https://seuprojetoid.supabase.co
SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

⚠️ **IMPORTANTE**: 
- Substitua `https://seuprojetoid.supabase.co` pela URL real do seu projeto
- Substitua as chaves pelas chaves reais (são muito longas, começam com `eyJ`)
- NÃO compartilhe essas chaves publicamente

### Passo 3: Criar as Tabelas no Supabase

1. **Acesse o SQL Editor**
   - No dashboard do Supabase, clique em **SQL Editor**

2. **Execute o Schema**
   - Copie todo o conteúdo do arquivo `schema.sql`
   - Cole no SQL Editor
   - Clique em **Run** para executar

### Passo 4: Testar a Conexão

Execute o comando:
```bash
node test-supabase-connection.js
```

Se tudo estiver correto, você verá:
```
✅ Conexão estabelecida com sucesso!
✅ Tabela "contacts": OK
✅ Tabela "conversations": OK
✅ Tabela "messages": OK
✅ Tabela "webhook_events": OK
✅ Inserção de teste realizada com sucesso!
🎉 Seu Supabase está configurado corretamente!
```

## 🚨 Problemas Comuns

### 1. "Invalid API key"
- **Causa**: Chave incorreta ou copiada incorretamente
- **Solução**: Verifique se copiou as chaves completas do dashboard

### 2. "relation does not exist"
- **Causa**: Tabelas não foram criadas
- **Solução**: Execute o arquivo `schema.sql` no SQL Editor

### 3. "fetch failed"
- **Causa**: URL do Supabase incorreta
- **Solução**: Verifique se a URL está no formato correto

## 📝 Exemplo de .env Configurado

```env
# EXEMPLO - SUBSTITUA PELOS SEUS VALORES REAIS
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzOTY5ODY0MCwiZXhwIjoxOTU1Mjc0NjQwfQ.example
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjM5Njk4NjQwLCJleHAiOjE5NTUyNzQ2NDB9.example
```

## 🔄 Próximos Passos

Após configurar corretamente:

1. ✅ Teste a conexão com: `node test-supabase-connection.js`
2. ✅ Inicie o servidor: `npm run dev`
3. ✅ Teste o webhook: `POST http://localhost:3000/webhook/umbler`

## 📞 Ajuda Adicional

Se ainda tiver problemas:

1. Verifique se o projeto Supabase está ativo
2. Confirme se as chaves não expiraram
3. Teste a conexão diretamente no dashboard do Supabase
4. Verifique se não há firewall bloqueando a conexão

---

**⚠️ LEMBRE-SE**: Nunca commite o arquivo `.env` no Git. Ele já está no `.gitignore` para sua segurança.