const { executeQuery, insertWithRetry, findWithCache } = require('../config/database');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Serviço responsável por processar mensagens webhook e calcular tempos de resposta
 */
class MensagensWebhookService {
  
  /**
   * Processar mensagem recebida via webhook
   */
  async processarMensagemWebhook(payload) {
    // Verificar se Supabase está configurado
    const { supabase } = require('../config/supabase');
    if (!supabase) {
      logger.warn('⚠️ Supabase não configurado, pulando processamento de mensagem webhook');
      return null;
    }

    try {
      logger.info('🔄 Processando mensagem webhook', { 
        payloadType: payload.Type,
        hasPayload: !!payload.Payload 
      });
      
      // Extrair dados do payload da Umbler
      const dadosMensagem = this._extrairDadosMensagem(payload);
      
      if (!dadosMensagem) {
        logger.warn('Não foi possível extrair dados da mensagem', { payload });
        return null;
      }
      
      // Salvar mensagem na tabela mensagens_webhook
      const mensagemSalva = await this._salvarMensagemWebhook(dadosMensagem);
      
      // Se for mensagem de atendente, calcular tempo de resposta
      if (dadosMensagem.autor === 'atendente') {
        await this._processarTempoResposta(dadosMensagem);
      }
      
      logger.info('✅ Mensagem webhook processada com sucesso', {
        mensagemId: mensagemSalva?.id,
        telefone: dadosMensagem.telefone,
        autor: dadosMensagem.autor
      });
      
      return mensagemSalva;
      
    } catch (error) {
      logger.error('❌ Erro ao processar mensagem webhook:', error);
      throw error;
    }
  }
  
  /**
   * Extrair dados da mensagem do payload da Umbler
   */
  _extrairDadosMensagem(payload) {
    try {
      const { Payload } = payload;
      
      if (!Payload || !Payload.Content) {
        logger.warn('Payload inválido ou vazio', { payload });
        return null;
      }
      
      const { Contact, LastMessage, OrganizationMember } = Payload.Content;
      
      if (!Contact || !LastMessage) {
        logger.warn('Dados de contato ou mensagem não encontrados', { Payload });
        return null;
      }
      
      // Determinar autor da mensagem
      let autor = 'cliente';
      if (LastMessage.Source === 'Member' || LastMessage.Source === 'OrganizationMember') {
        autor = 'atendente';
      }
      
      // Extrair telefone
      const telefone = Contact.PhoneNumber || Contact.Phone || '';
      
      // Extrair mensagem
      const mensagem = LastMessage.Content || '';
      
      // Extrair timestamp
      const dataEnvio = LastMessage.EventAtUTC || LastMessage.CreatedAtUTC || new Date().toISOString();
      
      return {
        telefone,
        autor,
        mensagem,
        data_envio: dataEnvio,
        // Dados adicionais para debug
        umbler_message_id: LastMessage.Id,
        umbler_contact_id: Contact.Id,
        umbler_member_id: OrganizationMember?.Id,
        source: LastMessage.Source,
        message_type: LastMessage.MessageType
      };
      
    } catch (error) {
      logger.error('Erro ao extrair dados da mensagem:', error);
      return null;
    }
  }
  
  /**
   * Salvar mensagem na tabela mensagens_webhook
   */
  async _salvarMensagemWebhook(dadosMensagem) {
    try {
      const dadosParaSalvar = {
        telefone: dadosMensagem.telefone,
        autor: dadosMensagem.autor,
        mensagem: dadosMensagem.mensagem,
        data_envio: dadosMensagem.data_envio
      };
      
      const resultado = await insertWithRetry('mensagens_webhook', dadosParaSalvar);
      
      logger.info('Mensagem salva na tabela mensagens_webhook', {
        id: resultado.id,
        telefone: dadosMensagem.telefone,
        autor: dadosMensagem.autor
      });
      
      return resultado;
      
    } catch (error) {
      logger.error('Erro ao salvar mensagem webhook:', error);
      throw error;
    }
  }
  
  /**
   * Processar tempo de resposta quando mensagem é de atendente
   */
  async _processarTempoResposta(dadosMensagem) {
    try {
      logger.info('Calculando tempo de resposta para atendente', {
        telefone: dadosMensagem.telefone,
        data_envio: dadosMensagem.data_envio
      });
      
      // Buscar última mensagem do cliente com mesmo telefone
      const ultimaMensagemCliente = await this._buscarUltimaMensagemCliente(
        dadosMensagem.telefone, 
        dadosMensagem.data_envio
      );
      
      if (!ultimaMensagemCliente) {
        logger.warn('Nenhuma mensagem anterior do cliente encontrada', {
          telefone: dadosMensagem.telefone
        });
        return;
      }
      
      // Verificar se já existe resposta para esta mensagem do cliente
      const respostaExistente = await this._verificarRespostaExistente(
        dadosMensagem.telefone,
        ultimaMensagemCliente.data_envio
      );
      
      if (respostaExistente) {
        logger.info('Resposta já registrada para esta mensagem do cliente', {
          telefone: dadosMensagem.telefone,
          data_cliente: ultimaMensagemCliente.data_envio
        });
        return;
      }
      
      // Calcular tempo de resposta
      const tempoResposta = this._calcularTempoResposta(
        ultimaMensagemCliente.data_envio,
        dadosMensagem.data_envio
      );
      
      // Salvar na tabela respostas
      await this._salvarResposta({
        telefone: dadosMensagem.telefone,
        data_cliente: ultimaMensagemCliente.data_envio,
        data_atendente: dadosMensagem.data_envio,
        tempo_resposta_segundos: tempoResposta
      });
      
      logger.info('Tempo de resposta calculado e salvo', {
        telefone: dadosMensagem.telefone,
        tempo_segundos: tempoResposta,
        data_cliente: ultimaMensagemCliente.data_envio,
        data_atendente: dadosMensagem.data_envio
      });
      
    } catch (error) {
      logger.error('Erro ao processar tempo de resposta:', error);
      // Não propagar erro para não interromper o processamento da mensagem
    }
  }
  
  /**
   * Buscar última mensagem do cliente com mesmo telefone
   */
  async _buscarUltimaMensagemCliente(telefone, dataAtual) {
    try {
      const query = `
        SELECT id, telefone, autor, mensagem, data_envio, criado_em
        FROM mensagens_webhook
        WHERE telefone = $1 
          AND autor = 'cliente'
          AND data_envio < $2
        ORDER BY data_envio DESC
        LIMIT 1
      `;
      
      const resultado = await executeQuery(query, [telefone, dataAtual]);
      
      if (resultado.length === 0) {
        return null;
      }
      
      return resultado[0];
      
    } catch (error) {
      logger.error('Erro ao buscar última mensagem do cliente:', error);
      return null;
    }
  }
  
  /**
   * Verificar se já existe resposta para uma mensagem do cliente
   */
  async _verificarRespostaExistente(telefone, dataCliente) {
    try {
      const query = `
        SELECT id
        FROM respostas
        WHERE telefone = $1 AND data_cliente = $2
        LIMIT 1
      `;
      
      const resultado = await executeQuery(query, [telefone, dataCliente]);
      
      return resultado.length > 0;
      
    } catch (error) {
      logger.error('Erro ao verificar resposta existente:', error);
      return false;
    }
  }
  
  /**
   * Calcular tempo de resposta em segundos
   */
  _calcularTempoResposta(dataCliente, dataAtendente) {
    try {
      const dataClienteObj = new Date(dataCliente);
      const dataAtendenteObj = new Date(dataAtendente);
      
      const diferencaMs = dataAtendenteObj.getTime() - dataClienteObj.getTime();
      const diferencaSegundos = diferencaMs / 1000;
      
      return Math.max(0, diferencaSegundos); // Não permitir valores negativos
      
    } catch (error) {
      logger.error('Erro ao calcular tempo de resposta:', error);
      return 0;
    }
  }
  
  /**
   * Salvar resposta na tabela respostas
   */
  async _salvarResposta(dadosResposta) {
    try {
      const resultado = await insertWithRetry('respostas', {
        telefone: dadosResposta.telefone,
        data_cliente: dadosResposta.data_cliente,
        data_atendente: dadosResposta.data_atendente,
        tempo_resposta_segundos: dadosResposta.tempo_resposta_segundos
      });
      
      logger.info('Resposta salva na tabela respostas', {
        id: resultado.id,
        telefone: dadosResposta.telefone,
        tempo_segundos: dadosResposta.tempo_resposta_segundos
      });
      
      return resultado;
      
    } catch (error) {
      logger.error('Erro ao salvar resposta:', error);
      throw error;
    }
  }
  
  /**
   * Obter estatísticas de tempo de resposta
   */
  async obterEstatisticasTempoResposta(filtros = {}) {
    try {
      let whereConditions = [];
      let params = [];
      let paramIndex = 1;
      
      if (filtros.telefone) {
        whereConditions.push(`telefone = $${paramIndex++}`);
        params.push(filtros.telefone);
      }
      
      if (filtros.dataInicio) {
        whereConditions.push(`data_cliente >= $${paramIndex++}`);
        params.push(filtros.dataInicio);
      }
      
      if (filtros.dataFim) {
        whereConditions.push(`data_cliente <= $${paramIndex++}`);
        params.push(filtros.dataFim);
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      const query = `
        SELECT 
          COUNT(*) as total_respostas,
          AVG(tempo_resposta_segundos) as tempo_medio_segundos,
          MIN(tempo_resposta_segundos) as tempo_minimo_segundos,
          MAX(tempo_resposta_segundos) as tempo_maximo_segundos,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY tempo_resposta_segundos) as mediana_segundos
        FROM respostas
        ${whereClause}
      `;
      
      const resultado = await executeQuery(query, params);
      
      return resultado[0] || {
        total_respostas: 0,
        tempo_medio_segundos: 0,
        tempo_minimo_segundos: 0,
        tempo_maximo_segundos: 0,
        mediana_segundos: 0
      };
      
    } catch (error) {
      logger.error('Erro ao obter estatísticas de tempo de resposta:', error);
      throw error;
    }
  }
  
  /**
   * Listar mensagens webhook com filtros
   */
  async listarMensagensWebhook(filtros = {}) {
    try {
      let whereConditions = [];
      let params = [];
      let paramIndex = 1;
      
      if (filtros.telefone) {
        whereConditions.push(`telefone = $${paramIndex++}`);
        params.push(filtros.telefone);
      }
      
      if (filtros.autor) {
        whereConditions.push(`autor = $${paramIndex++}`);
        params.push(filtros.autor);
      }
      
      if (filtros.dataInicio) {
        whereConditions.push(`data_envio >= $${paramIndex++}`);
        params.push(filtros.dataInicio);
      }
      
      if (filtros.dataFim) {
        whereConditions.push(`data_envio <= $${paramIndex++}`);
        params.push(filtros.dataFim);
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      const limit = filtros.limit || 50;
      const offset = (filtros.page - 1) * limit || 0;
      
      const query = `
        SELECT *
        FROM mensagens_webhook
        ${whereClause}
        ORDER BY data_envio DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      
      const resultado = await executeQuery(query, [...params, limit, offset]);
      
      // Contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM mensagens_webhook
        ${whereClause}
      `;
      
      const countResult = await executeQuery(countQuery, params);
      const total = parseInt(countResult[0].total);
      
      return {
        mensagens: resultado,
        total,
        pagina: filtros.page || 1,
        limite: limit
      };
      
    } catch (error) {
      logger.error('Erro ao listar mensagens webhook:', error);
      throw error;
    }
  }
}

module.exports = new MensagensWebhookService();

