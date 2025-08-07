#!/usr/bin/env node

/**
 * Script para monitorar e diagnosticar problemas dos webhooks da Umbler
 * 
 * Uso:
 * node webhook-monitor.js
 * node webhook-monitor.js --check-errors
 * node webhook-monitor.js --fix-webhooks
 */

const { executeQuery } = require('./src/config/database');
const logger = require('./src/utils/logger');

class WebhookMonitor {
  constructor() {
    this.stats = {
      total: 0,
      processed: 0,
      failed: 0,
      retryCount: 0,
      avgProcessingTime: 0
    };
  }

  /**
   * Verificar estatísticas dos webhooks
   */
  async checkWebhookStats() {
    try {
      console.log('\n📊 ===== ESTATÍSTICAS DOS WEBHOOKS =====');
      
      // Estatísticas gerais
      const generalStats = await executeQuery(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE processed = true) as processed,
          COUNT(*) FILTER (WHERE processed = false) as failed,
          AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_time
        FROM webhook_events 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `);
      
      if (generalStats.length > 0) {
        const stats = generalStats[0];
        console.log(`📈 Total de eventos (24h): ${stats.total}`);
        console.log(`✅ Processados: ${stats.processed}`);
        console.log(`❌ Falharam: ${stats.failed}`);
        console.log(`⏱️ Tempo médio de processamento: ${Math.round(stats.avg_processing_time || 0)}s`);
        
        const successRate = stats.total > 0 ? ((stats.processed / stats.total) * 100).toFixed(2) : 0;
        console.log(`📊 Taxa de sucesso: ${successRate}%`);
      }
      
      // Erros mais comuns
      const commonErrors = await executeQuery(`
        SELECT 
          error_message,
          COUNT(*) as count
        FROM webhook_events 
        WHERE processed = false 
        AND created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY error_message
        ORDER BY count DESC
        LIMIT 5
      `);
      
      if (commonErrors.length > 0) {
        console.log('\n🚨 ERROS MAIS COMUNS:');
        commonErrors.forEach((error, index) => {
          console.log(`${index + 1}. ${error.error_message} (${error.count} ocorrências)`);
        });
      }
      
      // Eventos por tipo
      const eventsByType = await executeQuery(`
        SELECT 
          event_type,
          COUNT(*) as count
        FROM webhook_events 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY event_type
        ORDER BY count DESC
      `);
      
      if (eventsByType.length > 0) {
        console.log('\n📝 EVENTOS POR TIPO:');
        eventsByType.forEach(event => {
          console.log(`- ${event.event_type}: ${event.count}`);
        });
      }
      
      console.log('\n=====================================\n');
      
    } catch (error) {
      console.error('❌ Erro ao verificar estatísticas:', error.message);
    }
  }

  /**
   * Verificar webhooks com erro
   */
  async checkFailedWebhooks() {
    try {
      console.log('\n🔍 ===== WEBHOOKS COM ERRO =====');
      
      const failedWebhooks = await executeQuery(`
        SELECT 
          id,
          event_id,
          event_type,
          error_message,
          retry_count,
          created_at,
          processed_at
        FROM webhook_events 
        WHERE processed = false 
        AND created_at >= NOW() - INTERVAL '24 hours'
        ORDER BY created_at DESC
        LIMIT 10
      `);
      
      if (failedWebhooks.length === 0) {
        console.log('✅ Nenhum webhook com erro encontrado nas últimas 24h');
        return;
      }
      
      console.log(`❌ Encontrados ${failedWebhooks.length} webhooks com erro:`);
      
      failedWebhooks.forEach((webhook, index) => {
        console.log(`\n${index + 1}. ID: ${webhook.id}`);
        console.log(`   Event ID: ${webhook.event_id}`);
        console.log(`   Tipo: ${webhook.event_type}`);
        console.log(`   Erro: ${webhook.error_message}`);
        console.log(`   Tentativas: ${webhook.retry_count}`);
        console.log(`   Criado: ${webhook.created_at}`);
      });
      
      console.log('\n=====================================\n');
      
    } catch (error) {
      console.error('❌ Erro ao verificar webhooks com erro:', error.message);
    }
  }

  /**
   * Tentar reprocessar webhooks com erro
   */
  async retryFailedWebhooks() {
    try {
      console.log('\n🔄 ===== REPROCESSANDO WEBHOOKS COM ERRO =====');
      
      // Buscar webhooks que falharam e ainda não excederam o limite de tentativas
      const failedWebhooks = await executeQuery(`
        SELECT 
          id,
          event_id,
          event_type,
          error_message,
          retry_count,
          payload
        FROM webhook_events 
        WHERE processed = false 
        AND retry_count < 3
        AND created_at >= NOW() - INTERVAL '24 hours'
        ORDER BY created_at ASC
        LIMIT 5
      `);
      
      if (failedWebhooks.length === 0) {
        console.log('✅ Nenhum webhook para reprocessar');
        return;
      }
      
      console.log(`🔄 Tentando reprocessar ${failedWebhooks.length} webhooks...`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const webhook of failedWebhooks) {
        try {
          console.log(`\n📝 Reprocessando webhook ${webhook.id} (${webhook.event_type})...`);
          
          // Importar o serviço de webhook
          const webhookService = require('./src/services/webhookService');
          
          // Tentar reprocessar
          const result = await webhookService.processWebhook(webhook.payload, webhook.id);
          
          if (result.processed) {
            // Marcar como processado
            await executeQuery(`
              UPDATE webhook_events 
              SET processed = true, processed_at = NOW(), retry_count = retry_count + 1
              WHERE id = $1
            `, [webhook.id]);
            
            console.log(`✅ Webhook ${webhook.id} reprocessado com sucesso`);
            successCount++;
          } else {
            console.log(`❌ Webhook ${webhook.id} falhou no reprocessamento`);
            errorCount++;
          }
          
          // Aguardar um pouco entre as tentativas
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`❌ Erro ao reprocessar webhook ${webhook.id}:`, error.message);
          errorCount++;
          
          // Atualizar contador de tentativas
          await executeQuery(`
            UPDATE webhook_events 
            SET retry_count = retry_count + 1, error_message = $1
            WHERE id = $2
          `, [error.message, webhook.id]);
        }
      }
      
      console.log(`\n📊 Resultado do reprocessamento:`);
      console.log(`✅ Sucessos: ${successCount}`);
      console.log(`❌ Falhas: ${errorCount}`);
      
      console.log('\n=====================================\n');
      
    } catch (error) {
      console.error('❌ Erro ao reprocessar webhooks:', error.message);
    }
  }

  /**
   * Verificar saúde do sistema
   */
  async checkSystemHealth() {
    try {
      console.log('\n🏥 ===== VERIFICAÇÃO DE SAÚDE DO SISTEMA =====');
      
      // Verificar conexão com banco
      const dbCheck = await executeQuery('SELECT NOW() as current_time');
      console.log(`✅ Banco de dados: Conectado (${dbCheck[0].current_time})`);
      
      // Verificar tabelas principais
      const tablesCheck = await executeQuery(`
        SELECT 
          table_name,
          (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns
        FROM information_schema.tables t
        WHERE table_schema = 'public' 
        AND table_name IN ('webhook_events', 'contacts', 'chats', 'messages')
        ORDER BY table_name
      `);
      
      console.log('\n📋 Tabelas principais:');
      tablesCheck.forEach(table => {
        console.log(`- ${table.table_name}: ${table.columns} colunas`);
      });
      
      // Verificar configurações
      console.log('\n⚙️ Configurações:');
      console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'não definido'}`);
      console.log(`- WEBHOOK_SECRET: ${process.env.WEBHOOK_SECRET ? 'configurado' : 'não configurado'}`);
      console.log(`- SUPABASE_URL: ${process.env.SUPABASE_URL ? 'configurado' : 'não configurado'}`);
      
      // Verificar uso de memória
      const memUsage = process.memoryUsage();
      console.log('\n💾 Uso de memória:');
      console.log(`- RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
      console.log(`- Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
      console.log(`- Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
      
      console.log('\n=====================================\n');
      
    } catch (error) {
      console.error('❌ Erro na verificação de saúde:', error.message);
    }
  }

  /**
   * Executar diagnóstico completo
   */
  async runDiagnostic() {
    console.log('🔍 INICIANDO DIAGNÓSTICO DOS WEBHOOKS...\n');
    
    await this.checkSystemHealth();
    await this.checkWebhookStats();
    await this.checkFailedWebhooks();
    
    console.log('✅ Diagnóstico concluído!');
  }

  /**
   * Executar correção automática
   */
  async runAutoFix() {
    console.log('🔧 INICIANDO CORREÇÃO AUTOMÁTICA...\n');
    
    await this.retryFailedWebhooks();
    await this.checkWebhookStats();
    
    console.log('✅ Correção automática concluída!');
  }
}

// Executar baseado nos argumentos
async function main() {
  const monitor = new WebhookMonitor();
  const args = process.argv.slice(2);
  
  try {
    if (args.includes('--check-errors')) {
      await monitor.checkFailedWebhooks();
    } else if (args.includes('--fix-webhooks')) {
      await monitor.runAutoFix();
    } else if (args.includes('--health')) {
      await monitor.checkSystemHealth();
    } else if (args.includes('--stats')) {
      await monitor.checkWebhookStats();
    } else {
      await monitor.runDiagnostic();
    }
  } catch (error) {
    console.error('❌ Erro no monitor:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = WebhookMonitor;