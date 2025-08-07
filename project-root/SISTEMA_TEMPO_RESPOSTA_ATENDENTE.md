# 🕒 Sistema de Tempo de Resposta dos Atendentes

## 📋 Visão Geral

Este sistema rastreia e analisa o tempo que os atendentes levam para responder às mensagens dos clientes. Ele funciona processando webhooks da Umbler e calculando automaticamente os tempos de resposta.

## 🎯 Funcionalidades Principais

### 1. Rastreamento Automático
- **Mensagem do Cliente**: Quando um cliente envia uma mensagem, ela é marcada como "pendente de resposta"
- **Resposta do Atendente**: Quando o atendente responde, o tempo é calculado automaticamente
- **Múltiplas Mensagens**: Se o cliente enviar várias mensagens, apenas a última fica pendente

### 2. Métricas Calculadas
- ⏱️ **Tempo em milissegundos, segundos e minutos**
- 📊 **Tempo médio de resposta**
- 🏃 **Resposta mais rápida**
- 🐌 **Resposta mais lenta**
- 📈 **Distribuição por faixas de tempo**

### 3. Categorização de Performance
- **Muito Rápido**: ≤ 2 minutos
- **Rápido**: 2-5 minutos  
- **Normal**: 5-15 minutos
- **Lento**: 15-60 minutos
- **Muito Lento**: > 60 minutos

### 4. Alertas e Monitoramento
- 🟡 **Urgente**: Mensagens aguardando > 30 minutos
- 🔴 **Crítico**: Mensagens aguardando > 2 horas
- 📋 **Lista de mensagens pendentes**

## 🗄️ Estrutura do Banco de Dados

### Tabela: `agent_response_tracking`
```sql
- id (UUID)
- chat_id (VARCHAR) - ID da conversa
- contact_phone (VARCHAR) - Telefone do cliente  
- contact_name (VARCHAR) - Nome do cliente
- customer_message_time (TIMESTAMP) - Quando cliente enviou
- customer_message_id (VARCHAR)
- customer_message_content (TEXT)
- agent_response_time (TIMESTAMP) - Quando atendente respondeu
- agent_message_id (VARCHAR)
- agent_message_content (TEXT)
- response_time_ms (BIGINT) - Tempo em milissegundos
- response_time_seconds (INTEGER) - Tempo em segundos
- response_time_minutes (INTEGER) - Tempo em minutos
- is_pending (BOOLEAN) - Se ainda aguarda resposta
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## 🔌 APIs Disponíveis

### 1. Estatísticas Gerais
```
GET /api/agent-response-time/stats?days=30
```
Retorna estatísticas gerais dos atendentes.

### 2. Estatísticas por Contato
```
GET /api/agent-response-time/contact/{phone}?days=30
```
Retorna estatísticas para um cliente específico.

### 3. Mensagens Pendentes
```
GET /api/agent-response-time/pending?limit=50
```
Lista mensagens aguardando resposta dos atendentes.

### 4. Ranking de Clientes
```
GET /api/agent-response-time/ranking?limit=20&days=30
```
Ranking de clientes por tempo médio de resposta.

### 5. Dashboard Completo
```
GET /api/agent-response-time/dashboard?days=30
```
Dashboard com visão geral completa.

### 6. Alertas
```
GET /api/agent-response-time/alerts?urgentThreshold=30&criticalThreshold=120
```
Alertas de mensagens que precisam atenção.

### 7. Relatório de Performance
```
GET /api/agent-response-time/performance-report?days=30
```
Relatório detalhado com análise de tendências.

## 🚀 Como Usar

### 1. Criar a Tabela no Banco
```bash
# Execute o SQL no seu banco de dados
psql -d seu_banco < create-agent-response-table.sql
```

### 2. Testar o Sistema
```bash
# Teste básico
node testar-tempo-resposta-atendente.js

# Teste completo
node testar-tempo-resposta-atendente.js --completo
```

### 3. Consultar APIs
```bash
# Estatísticas gerais
curl http://localhost:3000/api/agent-response-time/stats

# Mensagens pendentes
curl http://localhost:3000/api/agent-response-time/pending

# Dashboard
curl http://localhost:3000/api/agent-response-time/dashboard
```

## 📊 Exemplo de Resposta da API

### Dashboard
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_responses": 45,
      "average_response_time_minutes": 8,
      "fastest_response_minutes": 1,
      "slowest_response_minutes": 35,
      "pending_messages": 3,
      "urgent_pending": 1,
      "critical_pending": 0
    },
    "distribution": {
      "very_fast": 12,
      "fast": 18,
      "normal": 10,
      "slow": 4,
      "very_slow": 1
    },
    "insights": {
      "performance_level": "good",
      "needs_attention": true,
      "total_contacts_served": 23
    }
  }
}
```

## 🔄 Como Funciona o Fluxo

### 1. Cliente Envia Mensagem
```json
{
  "Type": "Message",
  "Payload": {
    "Content": {
      "Contact": {
        "PhoneNumber": "+5548996620779",
        "Name": "João Silva"
      },
      "LastMessage": {
        "Source": "Contact",
        "Content": "Preciso de ajuda",
        "EventAtUTC": "2025-01-07T15:30:00Z"
      }
    }
  }
}
```

**Sistema registra**: Mensagem pendente de resposta

### 2. Atendente Responde
```json
{
  "Type": "Message", 
  "Payload": {
    "Content": {
      "Contact": {
        "PhoneNumber": "+5548996620779",
        "Name": "João Silva"
      },
      "LastMessage": {
        "Source": "OrganizationMember",
        "Content": "Olá! Como posso ajudar?",
        "EventAtUTC": "2025-01-07T15:32:00Z"
      }
    }
  }
}
```

**Sistema calcula**: Tempo de resposta = 2 minutos

### 3. Cliente Envia Outra Mensagem
```json
{
  "LastMessage": {
    "Source": "Contact",
    "Content": "Meu pedido não chegou",
    "EventAtUTC": "2025-01-07T15:35:00Z"
  }
}
```

**Sistema atualiza**: Nova mensagem pendente (a anterior é marcada como respondida)

## 🎨 Visualizações Possíveis

### 1. Gráfico de Tempo Médio
- Linha temporal mostrando evolução do tempo de resposta
- Comparação entre períodos

### 2. Distribuição por Categorias
- Pizza chart com % de respostas por velocidade
- Barras mostrando quantidade por categoria

### 3. Ranking de Clientes
- Lista dos clientes com pior tempo de resposta
- Identificar quem precisa mais atenção

### 4. Alertas em Tempo Real
- Notificações de mensagens pendentes há muito tempo
- Dashboard de mensagens críticas

## ⚙️ Configurações

### Limites de Alerta (em minutos)
- **Urgente**: 30 minutos (padrão)
- **Crítico**: 120 minutos (padrão)

### Categorias de Performance
- **Muito Rápido**: ≤ 2 min
- **Rápido**: 2-5 min
- **Normal**: 5-15 min
- **Lento**: 15-60 min
- **Muito Lento**: > 60 min

### Limpeza Automática
```sql
-- Remove dados antigos (executar periodicamente)
SELECT cleanup_old_agent_response_data(90); -- 90 dias
```

## 🔍 Monitoramento

### Logs Importantes
- `📩 Mensagem do cliente registrada - aguardando resposta do atendente`
- `⏱️ Tempo de resposta do atendente calculado`

### Métricas de Sistema
- Quantidade de mensagens processadas
- Tempo médio de processamento dos webhooks
- Erros na calculação de tempo de resposta

## 🎯 Casos de Uso

### 1. Gestão de Equipe
- Identificar atendentes com melhor performance
- Detectar sobrecarga de trabalho
- Planejar turnos e escalas

### 2. Melhoria de Processos
- Identificar gargalos no atendimento
- Otimizar fluxos de trabalho
- Definir metas de tempo de resposta

### 3. Satisfação do Cliente
- Monitorar clientes que aguardam há muito tempo
- Priorizar atendimentos urgentes
- Melhorar experiência geral

## 🚨 Alertas e Notificações

### Mensagens Urgentes (> 30 min)
- Notificação para supervisores
- Destaque na lista de pendentes

### Mensagens Críticas (> 2 horas)  
- Alerta vermelho
- Escalonamento automático
- Log de segurança

### Performance Ruim
- Tempo médio > 30 minutos
- Muitas mensagens na categoria "lento"
- Tendência de piora

---

✅ **Sistema implementado e funcionando!**

Para começar a usar:
1. Execute o SQL para criar a tabela
2. Configure suas credenciais do Supabase
3. Teste com o script fornecido
4. Acesse as APIs para obter relatórios