# 🔧 Guia de Solução de Problemas - Webhooks Umbler

Este guia ajuda a identificar e resolver problemas com os webhooks da Umbler que estão causando pausas após 100 erros.

## 📋 Problemas Comuns e Soluções

### 1. **Webhooks sendo pausados pela Umbler**

**Sintomas:**
- Umbler para de enviar webhooks
- Logs mostram "webhook paused" ou similar
- Erro 429 (Too Many Requests) da Umbler

**Causas:**
- Muitos erros 4xx/5xx retornados para a Umbler
- Timeout nas requisições
- Rate limiting muito agressivo
- Validação muito restritiva

**Soluções:**
```bash
# 1. Verificar estatísticas dos webhooks
node webhook-monitor.js --stats

# 2. Verificar webhooks com erro
node webhook-monitor.js --check-errors

# 3. Reprocessar webhooks com erro
node webhook-monitor.js --fix-webhooks

# 4. Testar as correções
node test-webhook-fixes.js
```

### 2. **Erros de Validação**

**Sintomas:**
- Erro 400 (Bad Request)
- Mensagem "Payload do webhook inválido"
- Campos obrigatórios faltando

**Soluções:**
- ✅ **Corrigido**: Schema de validação mais flexível
- ✅ **Corrigido**: Modo desenvolvimento tolera erros
- ✅ **Corrigido**: Melhor logging de erros

### 3. **Erros de Banco de Dados**

**Sintomas:**
- Erro 503 (Service Unavailable)
- Timeout nas operações de banco
- Violação de constraints

**Soluções:**
- ✅ **Corrigido**: Retry automático com backoff exponencial
- ✅ **Corrigido**: Tratamento específico para constraints
- ✅ **Corrigido**: Timeout de 30 segundos

### 4. **Rate Limiting Muito Agressivo**

**Sintomas:**
- Erro 429 (Too Many Requests)
- Webhooks sendo rejeitados

**Soluções:**
- ✅ **Corrigido**: Limite aumentado de 100 para 200 por minuto
- ✅ **Corrigido**: Retry-after headers adicionados
- ✅ **Corrigido**: Skip em desenvolvimento

### 5. **Timeouts**

**Sintomas:**
- Erro 408 (Request Timeout)
- Processamento muito lento

**Soluções:**
- ✅ **Corrigido**: Timeout de 30 segundos no processamento
- ✅ **Corrigido**: Retry automático para timeouts
- ✅ **Corrigido**: Logging detalhado de performance

## 🛠️ Ferramentas de Diagnóstico

### Monitor de Webhooks
```bash
# Diagnóstico completo
node webhook-monitor.js

# Verificar apenas erros
node webhook-monitor.js --check-errors

# Corrigir automaticamente
node webhook-monitor.js --fix-webhooks

# Verificar saúde do sistema
node webhook-monitor.js --health

# Verificar estatísticas
node webhook-monitor.js --stats
```

### Testador de Webhooks
```bash
# Executar todos os testes
node test-webhook-fixes.js
```

## 📊 Monitoramento em Tempo Real

### Logs Importantes
```bash
# Ver logs do servidor
tail -f logs/app.log

# Ver logs de erro
tail -f logs/error.log

# Ver logs de webhook
tail -f logs/webhook.log
```

### Métricas a Monitorar
- Taxa de sucesso dos webhooks (>95%)
- Tempo médio de processamento (<5s)
- Número de retries (<3 por webhook)
- Erros por tipo

## 🔍 Verificações Rápidas

### 1. Verificar Configuração
```bash
# Verificar variáveis de ambiente
echo $WEBHOOK_SECRET
echo $NODE_ENV
echo $SUPABASE_URL

# Verificar se o servidor está rodando
curl http://localhost:3000/health
```

### 2. Verificar Banco de Dados
```bash
# Testar conexão
node -e "require('./src/config/database').testConnection().then(console.log)"

# Verificar tabelas
node -e "require('./src/config/database').executeQuery('SELECT COUNT(*) FROM webhook_events').then(console.log)"
```

### 3. Testar Webhook Manualmente
```bash
# Teste simples
curl -X POST http://localhost:3000/webhook/umbler \
  -H "Content-Type: application/json" \
  -d '{"Type":"Message","EventDate":"2024-02-07T18:44:01.3135533Z","EventId":"test123","Payload":{"Type":"Chat","Content":{"Id":"chat123","Contact":{"Id":"contact123","PhoneNumber":"+5511999999999","Name":"Test"}}}}'
```

## 🚨 Alertas e Ações

### Alerta: Taxa de Sucesso < 90%
**Ação:**
1. Verificar logs de erro
2. Executar `node webhook-monitor.js --check-errors`
3. Verificar configuração do banco
4. Verificar rate limiting

### Alerta: Muitos Timeouts
**Ação:**
1. Verificar performance do banco
2. Verificar conexões simultâneas
3. Aumentar timeout se necessário
4. Verificar se há processamento lento

### Alerta: Umbler Pausou Webhooks
**Ação:**
1. Verificar se o servidor está respondendo
2. Verificar se não há muitos erros 4xx/5xx
3. Contatar suporte da Umbler se necessário
4. Verificar configuração do webhook na Umbler

## 📈 Melhorias Implementadas

### 1. **Validação Mais Flexível**
- ✅ Schema compatível com formato real da Umbler
- ✅ Modo desenvolvimento tolera erros
- ✅ Melhor logging de problemas de validação

### 2. **Retry Automático**
- ✅ 3 tentativas com backoff exponencial
- ✅ Tratamento específico por tipo de erro
- ✅ Timeout de 30 segundos

### 3. **Rate Limiting Melhorado**
- ✅ Limite aumentado para 200/minuto
- ✅ Skip em desenvolvimento
- ✅ Retry-after headers

### 4. **Melhor Tratamento de Erros**
- ✅ Logging detalhado
- ✅ Status codes apropriados
- ✅ Mensagens de erro claras

### 5. **Monitoramento**
- ✅ Script de diagnóstico
- ✅ Estatísticas em tempo real
- ✅ Correção automática

## 🔧 Configurações Recomendadas

### Variáveis de Ambiente
```bash
# Produção
NODE_ENV=production
WEBHOOK_SECRET=sua_chave_secreta_aqui
SUPABASE_URL=sua_url_do_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_chave_do_supabase

# Desenvolvimento
NODE_ENV=development
WEBHOOK_SECRET=chave_teste
```

### Configurações do Servidor
```javascript
// Rate limiting
webhookMax: 200, // Aumentado de 100
windowMs: 60 * 1000, // 1 minuto

// Timeout
timeout: 30000, // 30 segundos

// Retry
maxRetries: 5, // Aumentado de 3
```

## 📞 Suporte

Se os problemas persistirem:

1. **Coletar Logs:**
   ```bash
   node webhook-monitor.js > diagnostico.log 2>&1
   ```

2. **Verificar Configuração da Umbler:**
   - URL do webhook correta
   - Secret configurado
   - Eventos habilitados

3. **Contatar Suporte:**
   - Enviar logs de erro
   - Enviar estatísticas do monitor
   - Descrever sintomas específicos

## ✅ Checklist de Verificação

- [ ] Servidor respondendo em `/health`
- [ ] Banco de dados conectado
- [ ] Webhook URL acessível
- [ ] Rate limiting não muito agressivo
- [ ] Timeout adequado
- [ ] Retry funcionando
- [ ] Logs sendo gerados
- [ ] Monitor executando
- [ ] Testes passando

---

**Última atualização:** $(date)
**Versão:** 1.0.0
**Status:** ✅ Correções implementadas