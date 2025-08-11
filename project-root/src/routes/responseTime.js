const express = require('express');
const responseTimeService = require('../services/responseTimeService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/response-time/stats/:phone
 * @desc    Obter estatísticas de tempo de resposta de um contato
 * @access  Private
 */
router.get('/stats/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const { days = 30 } = req.query;

    const stats = await responseTimeService.getContactResponseStats(phone, parseInt(days));

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Erro ao obter estatísticas de tempo de resposta:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route   GET /api/response-time/ranking
 * @desc    Obter ranking de clientes por tempo de resposta
 * @access  Private
 */
router.get('/ranking', async (req, res) => {
  try {
    const { limit = 20, days = 30 } = req.query;

    const ranking = await responseTimeService.getResponseTimeRanking(
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
 * @route   GET /api/response-time/alerts
 * @desc    Obter alertas de tempo de resposta lento
 * @access  Private
 */
router.get('/alerts', async (req, res) => {
  try {
    const { threshold = 60, days = 7 } = req.query;

    const alerts = await responseTimeService.getSlowResponseAlerts(
      parseInt(threshold), 
      parseInt(days)
    );

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    logger.error('Erro ao obter alertas de tempo de resposta:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route   GET /api/response-time/category/:phone
 * @desc    Obter categoria de resposta de um cliente
 * @access  Private
 */
router.get('/category/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const { days = 30 } = req.query;

    const category = await responseTimeService.categorizeCustomerByResponseTime(
      phone, 
      parseInt(days)
    );

    res.json({
      success: true,
      data: {
        contact_phone: phone,
        category: category.category,
        description: category.description,
        period_days: parseInt(days)
      }
    });
  } catch (error) {
    logger.error('Erro ao categorizar cliente:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route   GET /api/response-time/dashboard
 * @desc    Obter dados do dashboard de tempo de resposta
 * @access  Private
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysInt = parseInt(days);

    // Buscar dados em paralelo
    const [ranking, alerts] = await Promise.all([
      responseTimeService.getResponseTimeRanking(10, daysInt),
      responseTimeService.getSlowResponseAlerts(60, daysInt)
    ]);

    // Calcular estatísticas gerais
    const totalContacts = ranking.total_contacts;
    const fastResponders = ranking.ranking.filter(r => r.average_response_time_minutes <= 15).length;
    const slowResponders = ranking.ranking.filter(r => r.average_response_time_minutes > 60).length;

    const dashboard = {
      summary: {
        total_contacts: totalContacts,
        fast_responders: fastResponders,
        slow_responders: slowResponders,
        total_alerts: alerts.total_alerts,
        period_days: daysInt
      },
      top_fast_responders: ranking.ranking.slice(0, 5),
      slow_response_alerts: alerts.alerts.slice(0, 5),
      categories: {
        very_fast: ranking.ranking.filter(r => r.average_response_time_minutes <= 5).length,
        fast: ranking.ranking.filter(r => r.average_response_time_minutes > 5 && r.average_response_time_minutes <= 15).length,
        normal: ranking.ranking.filter(r => r.average_response_time_minutes > 15 && r.average_response_time_minutes <= 60).length,
        slow: ranking.ranking.filter(r => r.average_response_time_minutes > 60 && r.average_response_time_minutes <= 240).length,
        very_slow: ranking.ranking.filter(r => r.average_response_time_minutes > 240).length
      }
    };

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    logger.error('Erro ao obter dashboard de tempo de resposta:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route   GET /api/response-time/contact-details/:phone
 * @desc    Obter detalhes completos de tempo de resposta de um contato
 * @access  Private
 */
router.get('/contact-details/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const { days = 30 } = req.query;
    const daysInt = parseInt(days);

    // Buscar dados em paralelo
    const [stats, category] = await Promise.all([
      responseTimeService.getContactResponseStats(phone, daysInt),
      responseTimeService.categorizeCustomerByResponseTime(phone, daysInt)
    ]);

    const details = {
      contact_phone: phone,
      contact_name: stats.contact_name,
      statistics: stats,
      category: category,
      insights: {
        is_fast_responder: stats.average_response_time_minutes <= 15,
        is_slow_responder: stats.average_response_time_minutes > 60,
        consistency: stats.slowest_response_minutes - stats.fastest_response_minutes,
        engagement_level: stats.total_responses > 10 ? 'high' : 
                         stats.total_responses > 5 ? 'medium' : 'low'
      }
    };

    res.json({
      success: true,
      data: details
    });
  } catch (error) {
    logger.error('Erro ao obter detalhes do contato:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

module.exports = router;