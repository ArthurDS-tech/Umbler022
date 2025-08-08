const mensagensWebhookService = require('../services/mensagensWebhookService');
const logger = require('../utils/logger');

/**
 * Controller responsável por gerenciar mensagens webhook e respostas
 */
class MensagensWebhookController {
  
  /**
   * Listar mensagens webhook
   * GET /mensagens-webhook
   */
  async listarMensagens(req, res) {
    try {
      const {
        telefone,
        autor,
        dataInicio,
        dataFim,
        page = 1,
        limit = 50
      } = req.query;
      
      const filtros = {};
      
      if (telefone) filtros.telefone = telefone;
      if (autor) filtros.autor = autor;
      if (dataInicio) filtros.dataInicio = dataInicio;
      if (dataFim) filtros.dataFim = dataFim;
      if (page) filtros.page = parseInt(page);
      if (limit) filtros.limit = parseInt(limit);
      
      const resultado = await mensagensWebhookService.listarMensagensWebhook(filtros);
      
      return res.status(200).json({
        success: true,
        data: resultado.mensagens,
        pagination: {
          page: resultado.pagina,
          limit: resultado.limite,
          total: resultado.total,
          pages: Math.ceil(resultado.total / resultado.limite)
        }
      });
      
    } catch (error) {
      logger.error('Erro ao listar mensagens webhook:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao listar mensagens'
      });
    }
  }
  
  /**
   * Obter estatísticas de tempo de resposta
   * GET /mensagens-webhook/stats
   */
  async obterEstatisticas(req, res) {
    try {
      const {
        telefone,
        dataInicio,
        dataFim
      } = req.query;
      
      const filtros = {};
      
      if (telefone) filtros.telefone = telefone;
      if (dataInicio) filtros.dataInicio = dataInicio;
      if (dataFim) filtros.dataFim = dataFim;
      
      const estatisticas = await mensagensWebhookService.obterEstatisticasTempoResposta(filtros);
      
      // Converter segundos para formato mais legível
      const formatarTempo = (segundos) => {
        if (segundos < 60) {
          return `${Math.round(segundos)}s`;
        } else if (segundos < 3600) {
          const minutos = Math.floor(segundos / 60);
          const segs = Math.round(segundos % 60);
          return `${minutos}m ${segs}s`;
        } else {
          const horas = Math.floor(segundos / 3600);
          const minutos = Math.floor((segundos % 3600) / 60);
          return `${horas}h ${minutos}m`;
        }
      };
      
      const resultado = {
        ...estatisticas,
        tempo_medio_formatado: formatarTempo(estatisticas.tempo_medio_segundos || 0),
        tempo_minimo_formatado: formatarTempo(estatisticas.tempo_minimo_segundos || 0),
        tempo_maximo_formatado: formatarTempo(estatisticas.tempo_maximo_segundos || 0),
        mediana_formatado: formatarTempo(estatisticas.mediana_segundos || 0)
      };
      
      return res.status(200).json({
        success: true,
        data: resultado
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
   * Simular mensagem webhook para testes
   * POST /mensagens-webhook/simulate
   */
  async simularMensagem(req, res) {
    try {
      // Apenas em desenvolvimento
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          error: 'Simulação não permitida em produção',
          code: 'SIMULATION_FORBIDDEN'
        });
      }
      
      const { 
        telefone = '+5511999999999',
        autor = 'cliente',
        mensagem = 'Mensagem de teste',
        data_envio = new Date().toISOString()
      } = req.body;
      
      // Criar payload simulado
      const payloadSimulado = {
        Type: 'Message',
        EventDate: new Date().toISOString(),
        Payload: {
          Content: {
            Contact: {
              Id: 'test_contact_id',
              PhoneNumber: telefone,
              Name: 'Contato Teste'
            },
            LastMessage: {
              Id: `test_msg_${Date.now()}`,
              Content: mensagem,
              Source: autor === 'atendente' ? 'Member' : 'Contact',
              EventAtUTC: data_envio,
              CreatedAtUTC: data_envio,
              MessageType: 'text'
            },
            OrganizationMember: autor === 'atendente' ? {
              Id: 'test_member_id',
              Name: 'Atendente Teste'
            } : null
          }
        }
      };
      
      logger.info('🎭 Simulando mensagem webhook', { 
        telefone, 
        autor, 
        mensagem 
      });
      
      // Processar mensagem
      const resultado = await mensagensWebhookService.processarMensagemWebhook(payloadSimulado);
      
      return res.status(200).json({
        success: true,
        message: 'Mensagem simulada processada',
        data: {
          simulated: true,
          mensagem: resultado,
          payload: payloadSimulado
        }
      });
      
    } catch (error) {
      logger.error('Erro na simulação de mensagem:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno na simulação'
      });
    }
  }
  
  /**
   * Obter informações de debug
   * GET /mensagens-webhook/debug
   */
  async debug(req, res) {
    try {
      // Apenas em desenvolvimento
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          error: 'Debug não permitido em produção',
          code: 'DEBUG_FORBIDDEN'
        });
      }
      
      // Contar mensagens por autor
      const queryMensagens = `
        SELECT autor, COUNT(*) as total
        FROM mensagens_webhook
        GROUP BY autor
      `;
      
      const mensagensPorAutor = await require('../config/database').executeQuery(queryMensagens);
      
      // Contar respostas
      const queryRespostas = `
        SELECT COUNT(*) as total_respostas,
               AVG(tempo_resposta_segundos) as tempo_medio
        FROM respostas
      `;
      
      const estatisticasRespostas = await require('../config/database').executeQuery(queryRespostas);
      
      return res.status(200).json({
        success: true,
        data: {
          mensagens_por_autor: mensagensPorAutor,
          estatisticas_respostas: estatisticasRespostas[0],
          environment: process.env.NODE_ENV,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('Erro no debug:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno no debug'
      });
    }
  }
}

module.exports = new MensagensWebhookController();

