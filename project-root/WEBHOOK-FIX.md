# 🔧 Correção do Problema de Webhook

## ❌ Problema Identificado

O erro onde as informações recebidas via webhook não estavam sendo salvas nas tabelas do Supabase foi causado por:

1. **Falta de tratamento de erros robusto** no processamento dos webhooks
2. **Validação inadequada** dos dados recebidos
3. **Logs insuficientes** para debug
4. **Falta de verificação** se o banco de dados está configurado corretamente

## ✅ Correções Implementadas

### 1. Melhorado o Tratamento de Erros

**Arquivo:** `src/services/webhookService.js`

- ✅ Adicionado try/catch específico para cada etapa do processamento
- ✅ Logs detalhados para cada operação
- ✅ Validação robusta dos dados recebidos
- ✅ Tratamento diferenciado para desenvolvimento e produção

### 2. Melhorada a Validação de Payload

**Arquivo:** `src/services/webhookService.js`

- ✅ Verificação se os campos obrigatórios estão presentes
- ✅ Logs detalhados do payload recebido
- ✅ Inferência inteligente do tipo de evento
- ✅ Validação de estrutura dos dados

### 3. Corrigido o Processamento de Mensagens

**Arquivo:** `src/services/webhookService.js`

- ✅ Validação de dados do contato antes de processar
- ✅ Validação de dados da conversa antes de processar
- ✅ Validação de dados da mensagem antes de processar
- ✅ Logs específicos para cada etapa

### 4. Melhorado o Registro de Eventos

**Arquivo:** `src/services/webhookService.js`

- ✅ Logs detalhados do registro de eventos
- ✅ Tratamento diferenciado para desenvolvimento
- ✅ Melhor estruturação dos dados inseridos

## 🧪 Scripts de Teste Criados

### 1. Verificação do Banco de Dados
```bash
node check-database.js
```

Este script verifica:
- ✅ Conexão com o Supabase
- ✅ Existência das tabelas
- ✅ Permissões de leitura/escrita
- ✅ Inserção de dados de teste

### 2. Teste do Webhook
```bash
node test-webhook.js
```

Este script testa:
- ✅ Health check do servidor
- ✅ Envio de webhook simulado
- ✅ Verificação de estatísticas
- ✅ Validação da resposta

## 🚀 Como Usar

### 1. Verificar Configuração
```bash
# Verificar se o banco está configurado
node check-database.js
```

### 2. Iniciar o Servidor
```bash
# Instalar dependências (se necessário)
npm install

# Iniciar o servidor
npm start
```

### 3. Testar o Webhook
```bash
# Em outro terminal, testar o webhook
node test-webhook.js
```

### 4. Verificar os Dados
Após o teste, verifique se os dados foram salvos:

```bash
# Verificar contatos
curl http://localhost:3000/api/contacts

# Verificar conversas
curl http://localhost:3000/api/conversations

# Verificar mensagens
curl http://localhost:3000/api/messages
```

## 🔍 Logs Melhorados

Agora o sistema gera logs detalhados:

```
🔄 Iniciando processamento do webhook
📋 Tipo de evento determinado: message.received
💬 Processando evento de mensagem
🔄 Processando evento de mensagem
✅ Contato processado
✅ Conversa processada
✅ Mensagem processada
✅ Webhook processado com sucesso
```

## 🛠️ Troubleshooting

### Problema: "Falha na conexão com o banco de dados"

**Solução:**
1. Verifique se o arquivo `.env` existe e está configurado
2. Confirme se as variáveis do Supabase estão corretas
3. Execute: `node check-database.js`

### Problema: "Payload inválido"

**Solução:**
1. Verifique se o webhook está enviando dados no formato correto
2. Confirme se todos os campos obrigatórios estão presentes
3. Verifique os logs para ver qual campo está faltando

### Problema: "Erro ao processar contato/conversa/mensagem"

**Solução:**
1. Execute: `node check-database.js` para verificar o banco
2. Verifique se as tabelas existem no Supabase
3. Confirme se as permissões estão corretas

## 📋 Checklist de Verificação

- [ ] Arquivo `.env` configurado com as variáveis do Supabase
- [ ] Banco de dados acessível (`node check-database.js` passa)
- [ ] Servidor iniciado sem erros
- [ ] Webhook respondendo corretamente (`node test-webhook.js` passa)
- [ ] Dados sendo salvos nas tabelas
- [ ] Logs mostrando processamento correto

## 🔧 Configuração Mínima

Para que o webhook funcione, você precisa ter no arquivo `.env`:

```env
NODE_ENV=development
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anonima
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
JWT_SECRET=sua-chave-jwt-de-32-caracteres-minimo
```

## 📞 Suporte

Se ainda houver problemas:

1. Execute `node check-database.js` e verifique os erros
2. Execute `node test-webhook.js` e analise a resposta
3. Verifique os logs do servidor para identificar onde está falhando
4. Confirme se o schema do banco foi aplicado corretamente

## 🎯 Resultado Esperado

Após as correções, quando um webhook for recebido:

1. ✅ O evento será registrado na tabela `webhook_events`
2. ✅ O contato será criado/atualizado na tabela `contacts`
3. ✅ A conversa será criada/atualizada na tabela `conversations`
4. ✅ A mensagem será salva na tabela `messages`
5. ✅ Logs detalhados mostrarão todo o processo
6. ✅ Resposta de sucesso será enviada para a Umbler