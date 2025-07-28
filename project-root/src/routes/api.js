const express = require('express');
const router = express.Router();
const { environment } = require('../config/environment');
const logger = require('../utils/logger');
const tunnelManager = require('../utils/tunnel');

/**
 * @route GET /api/webhook/info
 * @desc Obter informações do webhook incluindo URL pública
 * @access Public
 */
router.get('/webhook/info', (req, res) => {
  try {
    const tunnelInfo = tunnelManager.getTunnelInfo();
    const baseWebhookUrl = tunnelInfo.isActive ? tunnelInfo.tunnelUrl : `http://localhost:${environment.port}`;
    
    res.json({
      success: true,
      webhookUrl: `${baseWebhookUrl}/webhook/umbler`,
      tunnelInfo,
      environment: environment.nodeEnv,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Erro ao obter informações do webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/logs/recent
 * @desc Obter logs recentes para o frontend
 * @access Public
 */
router.get('/logs/recent', (req, res) => {
  try {
    // Simular logs recentes (em produção viria do sistema de logs)
    const recentLogs = [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: '📡 Sistema funcionando normalmente'
      }
    ];
    
    res.json(recentLogs);
  } catch (error) {
    logger.error('Erro ao obter logs recentes:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/status
 * @desc Status detalhado do sistema
 * @access Public
 */
router.get('/status', (req, res) => {
  try {
    const tunnelInfo = tunnelManager.getTunnelInfo();
    
    const status = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: environment.nodeEnv,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      webhookUrl: tunnelInfo.webhookUrl || `http://localhost:${environment.port}/webhook/umbler`,
      tunnel: tunnelInfo,
      features: {
        database: environment.isDevelopment() ? 'mocked' : 'connected',
        redis: environment.redis.url ? 'configured' : 'not_configured',
        email: environment.email.smtp.host ? 'configured' : 'not_configured',
        tunnel: tunnelInfo.isActive ? 'active' : 'inactive'
      }
    };
    
    res.json(status);
  } catch (error) {
    logger.error('Erro ao obter status:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route POST /api/tunnel/start
 * @desc Iniciar túnel público
 * @access Public
 */
router.post('/tunnel/start', async (req, res) => {
  try {
    if (!environment.isDevelopment()) {
      return res.status(400).json({
        success: false,
        error: 'Túnel só pode ser iniciado em ambiente de desenvolvimento'
      });
    }

    if (tunnelManager.isActive()) {
      return res.json({
        success: true,
        message: 'Túnel já está ativo',
        tunnelInfo: tunnelManager.getTunnelInfo()
      });
    }

    const tunnelUrl = await tunnelManager.startTunnel();
    
    if (tunnelUrl) {
      res.json({
        success: true,
        message: 'Túnel iniciado com sucesso',
        tunnelInfo: tunnelManager.getTunnelInfo()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Falha ao iniciar túnel'
      });
    }
  } catch (error) {
    logger.error('Erro ao iniciar túnel:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route POST /api/tunnel/stop
 * @desc Parar túnel público
 * @access Public
 */
router.post('/tunnel/stop', async (req, res) => {
  try {
    await tunnelManager.stopTunnel();
    
    res.json({
      success: true,
      message: 'Túnel encerrado com sucesso',
      tunnelInfo: tunnelManager.getTunnelInfo()
    });
  } catch (error) {
    logger.error('Erro ao encerrar túnel:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/tunnel/info
 * @desc Obter informações do túnel
 * @access Public
 */
router.get('/tunnel/info', (req, res) => {
  try {
    res.json({
      success: true,
      tunnelInfo: tunnelManager.getTunnelInfo()
    });
  } catch (error) {
    logger.error('Erro ao obter informações do túnel:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

module.exports = router;