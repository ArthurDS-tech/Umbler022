const express = require('express');
const agentResponseTimeService = require('../services/agentResponseTimeService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/agent-response-time/stats
 * @desc    Obter estatísticas gerais de tempo de resposta dos atendentes
 * @access  Private
 */
router.get('/stats', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const stats = await agentResponseTimeService.getAgentResponseStats(parseInt(days));

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Erro ao obter estatísticas dos atendentes:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route   GET /api/agent-response-time/contact/:phone
 * @desc    Obter estatísticas de tempo de resposta para um contato específico
 * @access  Private
 */
router.get('/contact/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const { days = 30 } = req.query;

    const stats = await agentResponseTimeService.getContactAgentResponseStats(
      phone, 
      parseInt(days)
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Erro ao obter estatísticas do contato:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route   GET /api/agent-response-time/pending
 * @desc    Obter mensagens pendentes de resposta dos atendentes
 * @access  Private
 */
router.get('/pending', async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const pending = await agentResponseTimeService.getPendingCustomerMessages(parseInt(limit));

    res.json({
      success: true,
      data: pending
    });
  } catch (error) {
    logger.error('Erro ao obter mensagens pendentes:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route   GET /api/agent-response-time/ranking
 * @desc    Obter ranking de clientes por tempo médio de resposta dos atendentes
 * @access  Private
 */
router.get('/ranking', async (req, res) => {
  try {
    const { limit = 20, days = 30 } = req.query;

    const ranking = await agentResponseTimeService.getCustomerResponseRanking(
      parseInt(limit), 
      parseInt(days)
    );

    res.json({
      success: true,
      data: ranking
    });
  } catch (error) {
    logger.error('Erro ao obter ranking de tempo de resposta:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route   GET /api/agent-response-time/dashboard
 * @desc    Obter dashboard completo com estatísticas dos atendentes
 * @access  Private
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysInt = parseInt(days);

    // Buscar dados em paralelo
    const [generalStats, pending, ranking] = await Promise.all([
      agentResponseTimeService.getAgentResponseStats(daysInt),
      agentResponseTimeService.getPendingCustomerMessages(20),
      agentResponseTimeService.getCustomerResponseRanking(10, daysInt)
    ]);

    const dashboard = {
      summary: {
        total_responses: generalStats.total_responses,
        average_response_time_minutes: generalStats.average_response_time_minutes,
        fastest_response_minutes: generalStats.fastest_response_minutes,
        slowest_response_minutes: generalStats.slowest_response_minutes,
        pending_messages: pending.total_pending,
        urgent_pending: pending.urgent_count,
        critical_pending: pending.critical_count,
        period_days: daysInt
      },
      distribution: generalStats.distribution,
      pending_messages: pending.pending_messages.slice(0, 10), // Top 10 mais urgentes
      worst_response_times: ranking.ranking.slice(0, 5), // 5 piores tempos
      insights: {
        performance_level: generalStats.average_response_time_minutes <= 5 ? 'excellent' : 
                          generalStats.average_response_time_minutes <= 15 ? 'good' : 
                          generalStats.average_response_time_minutes <= 30 ? 'fair' : 'needs_improvement',
        needs_attention: pending.critical_count > 0,
        total_contacts_served: ranking.total_contacts
      }
    };

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    logger.error('Erro ao obter dashboard dos atendentes:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route   GET /api/agent-response-time/alerts
 * @desc    Obter alertas de mensagens que precisam de atenção urgente
 * @access  Private
 */
router.get('/alerts', async (req, res) => {
  try {
    const { urgentThreshold = 30, criticalThreshold = 120 } = req.query;

    const pending = await agentResponseTimeService.getPendingCustomerMessages(100);
    
    const alerts = {
      urgent: pending.pending_messages.filter(p => 
        p.waiting_time_minutes >= parseInt(urgentThreshold) && 
        p.waiting_time_minutes < parseInt(criticalThreshold)
      ),
      critical: pending.pending_messages.filter(p => 
        p.waiting_time_minutes >= parseInt(criticalThreshold)
      ),
      total_alerts: pending.urgent_count + pending.critical_count,
      thresholds: {
        urgent_minutes: parseInt(urgentThreshold),
        critical_minutes: parseInt(criticalThreshold)
      }
    };

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    logger.error('Erro ao obter alertas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route   GET /api/agent-response-time/performance-report
 * @desc    Obter relatório de performance detalhado dos atendentes
 * @access  Private
 */
router.get('/performance-report', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysInt = parseInt(days);

    // Buscar dados para diferentes períodos para comparação
    const [currentPeriod, previousPeriod] = await Promise.all([
      agentResponseTimeService.getAgentResponseStats(daysInt),
      agentResponseTimeService.getAgentResponseStats(daysInt * 2) // Período anterior
    ]);

    // Calcular tendência (melhoria ou piora)
    const trend = {
      response_time_change: currentPeriod.average_response_time_minutes - previousPeriod.average_response_time_minutes,
      is_improving: currentPeriod.average_response_time_minutes < previousPeriod.average_response_time_minutes,
      improvement_percentage: previousPeriod.average_response_time_minutes > 0 ? 
        Math.round(((previousPeriod.average_response_time_minutes - currentPeriod.average_response_time_minutes) / previousPeriod.average_response_time_minutes) * 100) : 0
    };

    const report = {
      current_period: currentPeriod,
      trend_analysis: trend,
      performance_metrics: {
        efficiency_score: Math.max(0, 100 - (currentPeriod.average_response_time_minutes * 2)), // Score baseado no tempo
        consistency_score: currentPeriod.total_responses > 0 ? 
          Math.max(0, 100 - ((currentPeriod.slowest_response_minutes - currentPeriod.fastest_response_minutes) / 10)) : 0,
        volume_handled: currentPeriod.total_responses
      },
      recommendations: generateRecommendations(currentPeriod, trend)
    };

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Erro ao gerar relatório de performance:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Gerar recomendações baseadas nas estatísticas
 */
function generateRecommendations(stats, trend) {
  const recommendations = [];

  if (stats.average_response_time_minutes > 30) {
    recommendations.push({
      type: 'critical',
      message: 'Tempo médio de resposta muito alto (>30 min). Considere aumentar equipe ou otimizar processos.',
      priority: 'high'
    });
  } else if (stats.average_response_time_minutes > 15) {
    recommendations.push({
      type: 'warning',
      message: 'Tempo médio de resposta acima do ideal (>15 min). Monitore de perto.',
      priority: 'medium'
    });
  }

  if (!trend.is_improving && Math.abs(trend.response_time_change) > 5) {
    recommendations.push({
      type: 'trend',
      message: `Tempo de resposta piorando (${Math.abs(trend.response_time_change)} min). Investigar causas.`,
      priority: 'high'
    });
  }

  if (stats.distribution.very_slow > stats.total_responses * 0.2) {
    recommendations.push({
      type: 'distribution',
      message: 'Muitas respostas lentas (>60 min). Revisar processos de atendimento.',
      priority: 'medium'
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'positive',
      message: 'Performance está dentro dos padrões esperados. Continue monitorando.',
      priority: 'low'
    });
  }

  return recommendations;
}

module.exports = router;