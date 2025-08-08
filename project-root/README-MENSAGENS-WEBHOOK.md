# Sistema de Mensagens Webhook - Umbler

Este sistema implementa o processamento de mensagens webhook da Umbler com cálculo automático de tempo de resposta do atendente.

## 🎯 Funcionalidades

### ✅ Implementado

1. **Tabelas Customizadas**:
   - `mensagens_webhook`: Armazena todas as mensagens recebidas via webhook
   - `respostas`: Calcula e armazena tempos de resposta do atendente

2. **Processamento Automático**:
   - Extrai dados do payload da Umbler
   - Identifica autor (cliente/atendente) automaticamente
   - Calcula tempo de resposta quando atendente responde
   - Evita múltiplas respostas para mesma mensagem do cliente

3. **APIs de Consulta**:
   - Listar mensagens com filtros
   - Estatísticas de tempo de resposta
   - Debug e simulação (desenvolvimento)

4. **Segurança**:
   - Validação HMAC SHA-256 para webhooks
   - Rate limiting
   - Logs detalhados

## 🚀 Configuração

### 1. Configurar Tabelas

```bash
# Executar script de configuração
node setup-mensagens-webhook.js
```

### 2. Testar Sistema

```bash
# Executar testes
node test-mensagens-webhook.js
```

### 3. Iniciar Servidor

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## 📊 Estrutura das Tabelas

### `mensagens_webhook`
```sql
CREATE TABLE mensagens_webhook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone TEXT NOT NULL,
  autor TEXT NOT NULL CHECK (autor IN ('cliente', 'atendente')),
  mensagem TEXT NOT NULL,
  data_envio TIMESTAMPTZ NOT NULL,
  criado_em TIMESTAMP DEFAULT NOW()
);
```

### `respostas`
```sql
CREATE TABLE respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone TEXT NOT NULL,
  data_cliente TIMESTAMP NOT NULL,
  data_atendente TIMESTAMP NOT NULL,
  tempo_resposta_segundos FLOAT NOT NULL
);
```

## 🔗 Endpoints

### Webhook Principal
- **POST** `/webhook/umbler` - Recebe webhooks da Umbler

### APIs de Consulta
- **GET** `/api/mensagens-webhook` - Listar mensagens
- **GET** `/api/mensagens-webhook/stats` - Estatísticas de tempo de resposta

### APIs de Desenvolvimento
- **POST** `/api/mensagens-webhook/simulate` - Simular mensagem
- **GET** `/api/mensagens-webhook/debug` - Informações de debug

## 📱 Exemplo de Uso

### 1. Receber Webhook da Umbler

O sistema processa automaticamente webhooks no formato:

```json
{
  "Type": "Message",
  "EventDate": "2024-01-15T10:30:00Z",
  "Payload": {
    "Content": {
      "Contact": {
        "Id": "contact_123",
        "PhoneNumber": "+5511999999999",
        "Name": "João Silva"
      },
      "LastMessage": {
        "Id": "msg_456",
        "Content": "Olá! Preciso de ajuda.",
        "Source": "Contact",
        "EventAtUTC": "2024-01-15T10:30:00Z",
        "MessageType": "text"
      }
    }
  }
}
```

### 2. Consultar Mensagens

```bash
# Listar mensagens
curl "http://localhost:3000/api/mensagens-webhook?telefone=+5511999999999&autor=cliente"

# Estatísticas
curl "http://localhost:3000/api/mensagens-webhook/stats"
```

### 3. Simular Mensagem (Desenvolvimento)

```bash
curl -X POST "http://localhost:3000/api/mensagens-webhook/simulate" \
  -H "Content-Type: application/json" \
  -d '{
    "telefone": "+5511999999999",
    "autor": "cliente",
    "mensagem": "Olá! Preciso de ajuda."
  }'
```

## 🔧 Configuração de Ambiente

### Variáveis de Ambiente

```env
# Supabase
SUPABASE_URL=sua_url_do_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role

# Webhook Security
WEBHOOK_SECRET=seu_segredo_para_validacao_hmac

# Ambiente
NODE_ENV=development
```

### Configuração do Webhook na Umbler

1. URL: `https://seu-dominio.com/webhook/umbler`
2. Método: `POST`
3. Headers: `Content-Type: application/json`
4. Assinatura: `x-umbler-signature` (se configurado)

## 📈 Monitoramento

### Logs

O sistema gera logs detalhados:

```
🔄 Processando mensagem webhook
✅ Mensagem salva na tabela mensagens_webhook
⏱️ Calculando tempo de resposta para atendente
✅ Tempo de resposta calculado e salvo
```

### Métricas

- Total de mensagens processadas
- Tempo médio de resposta
- Taxa de sucesso do processamento
- Erros e exceções

## 🛠️ Desenvolvimento

### Estrutura de Arquivos

```
src/
├── services/
│   └── mensagensWebhookService.js    # Lógica principal
├── controllers/
│   └── mensagensWebhookController.js  # Controllers da API
├── routes/
│   └── mensagensWebhook.js           # Rotas da API
└── config/
    └── database.js                   # Conexão com banco
```

### Scripts Úteis

```bash
# Configurar tabelas
node setup-mensagens-webhook.js

# Testar funcionalidade
node test-mensagens-webhook.js

# Verificar logs
tail -f logs/app.log
```

## 🔍 Debug

### Verificar Dados

```bash
# Debug geral
curl "http://localhost:3000/api/mensagens-webhook/debug"

# Verificar mensagens
curl "http://localhost:3000/api/mensagens-webhook?limit=5"

# Verificar estatísticas
curl "http://localhost:3000/api/mensagens-webhook/stats"
```

### Logs de Erro

```bash
# Ver logs de erro
grep "ERROR" logs/app.log

# Ver logs de webhook
grep "webhook" logs/app.log
```

## 🚨 Troubleshooting

### Problemas Comuns

1. **Webhook não está salvando dados**:
   - Verificar se as tabelas foram criadas
   - Verificar logs de erro
   - Testar com script de simulação

2. **Tempo de resposta não calculado**:
   - Verificar se mensagem anterior do cliente existe
   - Verificar se autor está sendo identificado corretamente
   - Verificar logs de processamento

3. **Erro de conexão com banco**:
   - Verificar variáveis de ambiente
   - Verificar conectividade com Supabase
   - Verificar permissões das tabelas

### Comandos de Diagnóstico

```bash
# Verificar estrutura das tabelas
node -e "
const { executeQuery } = require('./src/config/database');
executeQuery('SELECT * FROM mensagens_webhook LIMIT 1')
  .then(r => console.log('Mensagens:', r))
  .catch(e => console.error('Erro:', e));
"

# Verificar estatísticas
node -e "
const mensagensWebhookService = require('./src/services/mensagensWebhookService');
mensagensWebhookService.obterEstatisticasTempoResposta()
  .then(r => console.log('Stats:', r))
  .catch(e => console.error('Erro:', e));
"
```

## 📝 Changelog

### v1.0.0
- ✅ Implementação inicial
- ✅ Tabelas mensagens_webhook e respostas
- ✅ Processamento automático de webhooks
- ✅ Cálculo de tempo de resposta
- ✅ APIs de consulta e estatísticas
- ✅ Sistema de logs e debug

## 🤝 Contribuição

Para contribuir com o projeto:

1. Fork o repositório
2. Crie uma branch para sua feature
3. Implemente as mudanças
4. Adicione testes
5. Faça commit e push
6. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.

