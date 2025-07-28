const webhookService = require('../services/webhookService');
const logger = require('../utils/logger');
const { validateWebhookSignature } = require('../utils/helpers');

/**
 * Controller responsável por receber e processar webhooks da Umbler
 */
class WebhookController {
  
  /**
   * Receber webhook da Umbler
   * POST /webhook/umbler
   */
  async receiveUmblerWebhook(req, res) {
    const startTime = Date.now();
    let webhookEventId = null;
    
    try {
      const { body, headers, ip } = req;
      const userAgent = headers['user-agent'] || '';
      
      // Log da requisição recebida
      logger.info('📥 Webhook recebido da Umbler', {
        ip,
        userAgent,
        bodySize: JSON.stringify(body).length,
        headers: {
          'content-type': headers['content-type'],
          'x-umbler-signature': headers['x-umbler-signature'] || 'não informado'
        }
      });
      
      // Validar se o body não está vazio
      if (!body || Object.keys(body).length === 0) {
        logger.warn('❌ Webhook recebido com body vazio');
        return res.status(400).json({
          success: false,
          error: 'Body do webhook não pode estar vazio',
          code: 'EMPTY_WEBHOOK_BODY'
        });
      }
      
      // Validar assinatura do webhook (se configurada)
      const signature = headers['x-umbler-signature'];
      if (process.env.WEBHOOK_SECRET) {
        const isValidSignature = validateWebhookSignature(
          req.rawBody, 
          signature, 
          process.env.WEBHOOK_SECRET
        );
        
        if (!isValidSignature) {
          logger.warn('❌ Assinatura do webhook inválida', { signature, ip });
          return res.status(401).json({
            success: false,
            error: 'Assinatura do webhook inválida',
            code: 'INVALID_WEBHOOK_SIGNATURE'
          });
        }
      }
      
      // Registrar evento do webhook para auditoria
      webhookEventId = await webhookService.logWebhookEvent({
        eventType: this._determineEventType(body),
        eventData: body,
        sourceIp: ip,
        userAgent
      });
      
      // Processar o webhook de forma assíncrona
      const result = await webhookService.processWebhook(body, webhookEventId);
      
      const processingTime = Date.now() - startTime;
      
      // Log de sucesso
      logger.info('✅ Webhook processado com sucesso', {
        webhookEventId,
        processingTime: `${processingTime}ms`,
        eventType: result.eventType,
        contactId: result.contactId,
        conversationId: result.conversationId,
        messageId: result.messageId
      });
      
      // Marcar evento como processado
      await webhookService.markEventAsProcessed(webhookEventId);
      
      // Resposta de sucesso para a Umbler
      return res.status(200).json({
        success: true,
        message: 'Webhook processado com sucesso',
        data: {
          eventId: webhookEventId,
          processingTime: `${processingTime}ms`,
          eventType: result.eventType
        }
      });
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('❌ Erro ao processar webhook', {
        error: error.message,
        stack: error.stack,
        webhookEventId,
        processingTime: `${processingTime}ms`,
        body: req.body
      });
      
      // Marcar evento com erro se foi criado
      if (webhookEventId) {
        await webhookService.markEventAsError(webhookEventId, error.message);
      }
      
      // Determinar status code baseado no tipo de erro
      let statusCode = 500;
      let errorCode = 'WEBHOOK_PROCESSING_ERROR';
      
      if (error.message.includes('validation')) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
      } else if (error.message.includes('database') || error.message.includes('supabase')) {
        statusCode = 503;
        errorCode = 'DATABASE_ERROR';
      }
      
      return res.status(statusCode).json({
        success: false,
        error: 'Erro interno ao processar webhook',
        code: errorCode,
        eventId: webhookEventId,
        processingTime: `${processingTime}ms`
      });
    }
  }
  
  /**
   * Webhook de teste para validar configuração
   * GET /webhook/test
   */
  async testWebhook(req, res) {
    try {
      logger.info('🧪 Teste de webhook solicitado', {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(200).json({
        success: true,
        message: 'Webhook funcionando corretamente',
        timestamp: new Date().toISOString(),
        server: {
          uptime: process.uptime(),
          environment: process.env.NODE_ENV,
          version: process.env.npm_package_version || '1.0.0'
        }
      });
    } catch (error) {
      logger.error('Erro no teste de webhook:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno no teste'
      });
    }
  }
  
  /**
   * Reprocessar webhook que falhou
   * POST /webhook/retry/:eventId
   */
  async retryWebhookEvent(req, res) {
    try {
      const { eventId } = req.params;
      
      if (!eventId) {
        return res.status(400).json({
          success: false,
          error: 'ID do evento é obrigatório',
          code: 'MISSING_EVENT_ID'
        });
      }
      
      logger.info('🔄 Tentativa de reprocessamento de webhook', { eventId });
      
      const result = await webhookService.retryWebhookEvent(eventId);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'Evento não encontrado ou já processado',
          code: 'EVENT_NOT_FOUND'
        });
      }
      
      logger.info('✅ Webhook reprocessado com sucesso', { eventId });
      
      return res.status(200).json({
        success: true,
        message: 'Webhook reprocessado com sucesso',
        data: result
      });
      
    } catch (error) {
      logger.error('Erro ao reprocessar webhook:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao reprocessar webhook'
      });
    }
  }
  
  /**
   * Listar eventos de webhook com filtros
   * GET /webhook/events
   */
  async listWebhookEvents(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        eventType,
        processed,
        startDate,
        endDate
      } = req.query;
      
      const filters = {};
      
      if (eventType) filters.eventType = eventType;
      if (processed !== undefined) filters.processed = processed === 'true';
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      
      const result = await webhookService.getWebhookEvents({
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100), // Máximo 100 por página
        filters
      });
      
      return res.status(200).json({
        success: true,
        data: result.events,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.total,
          pages: Math.ceil(result.total / limit)
        }
      });
      
    } catch (error) {
      logger.error('Erro ao listar eventos de webhook:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao listar eventos'
      });
    }
  }
  
  /**
   * Obter estatísticas dos webhooks
   * GET /webhook/stats
   */
  async getWebhookStats(req, res) {
    try {
      const { period = '24h' } = req.query;
      
      const stats = await webhookService.getWebhookStats(period);
      
      return res.status(200).json({
        success: true,
        data: stats,
        period
      });
      
    } catch (error) {
      logger.error('Erro ao obter estatísticas:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao obter estatísticas'
      });
    }
  }
  
  /**
   * Simular webhook para testes
   * POST /webhook/simulate
   */
  async simulateWebhook(req, res) {
    try {
      // Apenas em desenvolvimento
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          error: 'Simulação não permitida em produção',
          code: 'SIMULATION_FORBIDDEN'
        });
      }
      
      const { type = 'message', data = {} } = req.body;
      
      // Dados de exemplo baseados no tipo
      const simulatedData = this._generateSimulatedWebhookData(type, data);
      
      logger.info('🎭 Simulando webhook', { type, data: simulatedData });
      
      // Processar como um webhook real
      const result = await webhookService.processWebhook(simulatedData);
      
      return res.status(200).json({
        success: true,
        message: 'Webhook simulado processado',
        data: {
          simulated: true,
          type,
          result
        }
      });
      
    } catch (error) {
      logger.error('Erro na simulação de webhook:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno na simulação'
      });
    }
  }
  
  /**
   * Determinar tipo do evento baseado no payload
   */
  _determineEventType(payload) {
    if (payload.message) return 'message';
    if (payload.conversation) return 'conversation';
    if (payload.contact) return 'contact';
    if (payload.event) return payload.event;
    return 'unknown';
  }
  
  /**
   * Gerar dados simulados para teste
   */
  _generateSimulatedWebhookData(type, customData = {}) {
    const baseData = {
      timestamp: new Date().toISOString(),
      webhook_id: `sim_${Date.now()}`,
      ...customData
    };
    
    switch (type) {
      case 'message':
        return {
          ...baseData,
          event: 'message.received',
          message: {
            id: `msg_${Date.now()}`,
            type: 'text',
            content: customData.content || 'Mensagem de teste simulada',
            direction: 'inbound',
            timestamp: new Date().toISOString()
          },
          contact: {
            phone: customData.phone || '+5511999999999',
            name: customData.name || 'Contato Teste',
            profile_pic: null
          },
          conversation: {
            id: `conv_${Date.now()}`,
            status: 'open'
          }
        };
        
      case 'conversation':
        return {
          ...baseData,
          event: 'conversation.created',
          conversation: {
            id: `conv_${Date.now()}`,
            status: 'open',
            created_at: new Date().toISOString()
          },
          contact: {
            phone: customData.phone || '+5511999999999',
            name: customData.name || 'Contato Teste'
          }
        };
        
      default:
        return {
          ...baseData,
          event: 'test.event',
          data: customData
        };
    }
  }
}

module.exports = new WebhookController();