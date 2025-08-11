const { insertWithRetry, updateWithRetry, findWithCache } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Serviço para calcular e gerenciar tempo de resposta dos clientes
 */
class ResponseTimeService {
  
  /**
   * Processar evento de mensagem para calcular tempo de resposta
   */
  async processMessageForResponseTime(webhookData) {
    try {
      const { Payload } = webhookData;
      if (!Payload || !Payload.Content) {
        return null;
      }

      const { Content } = Payload;
      const { Contact, LastMessage, Id: chatId } = Content;

      // Verificar se é uma mensagem do cliente (não do membro da organização)
      if (!LastMessage || LastMessage.Source !== 'Contact') {
        return null;
      }

      const contactPhone = Contact.PhoneNumber;
      const contactName = Contact.Name;
      const messageTime = new Date(LastMessage.EventAtUTC);

      // Buscar a última mensagem do membro da organização para este chat
      const lastOrgMessage = await this.getLastOrganizationMessage(chatId);

      if (!lastOrgMessage) {
        // Primeira mensagem do cliente - marcar como início da conversa
        return await this.createResponseTimeEntry({
          chat_id: chatId,
          contact_phone: contactPhone,
          contact_name: contactName,
          customer_message_time: messageTime,
          is_first_message: true
        });
      }

      // Calcular tempo de resposta do cliente
      const orgMessageTime = new Date(lastOrgMessage.created_at_utc);
      const responseTimeMs = messageTime.getTime() - orgMessageTime.getTime();
      const responseTimeMinutes = Math.round(responseTimeMs / (1000 * 60));

      // Salvar o tempo de resposta
      return await this.createResponseTimeEntry({
        chat_id: chatId,
        contact_phone: contactPhone,
        contact_name: contactName,
        customer_message_time: messageTime,
        organization_message_time: orgMessageTime,
        response_time_minutes: responseTimeMinutes,
        response_time_ms: responseTimeMs,
        is_first_message: false
      });

    } catch (error) {
      logger.error('Erro ao processar tempo de resposta:', error);
      return null;
    }
  }

  /**
   * Buscar última mensagem da organização para um chat
   */
  async getLastOrganizationMessage(chatId) {
    try {
      const result = await findWithCache('messages', {
        chat_id: chatId,
        source: 'OrganizationMember'
      }, {
        orderBy: { column: 'created_at_utc', ascending: false },
        limit: 1
      });

      return result.data.length > 0 ? result.data[0] : null;
    } catch (error) {
      logger.error('Erro ao buscar última mensagem da organização:', error);
      return null;
    }
  }

  /**
   * Criar entrada de tempo de resposta
   */
  async createResponseTimeEntry(data) {
    try {
      const entry = {
        id: require('uuid').v4(),
        chat_id: data.chat_id,
        contact_phone: data.contact_phone,
        contact_name: data.contact_name,
        customer_message_time: data.customer_message_time,
        organization_message_time: data.organization_message_time,
        response_time_minutes: data.response_time_minutes || null,
        response_time_ms: data.response_time_ms || null,
        is_first_message: data.is_first_message || false,
        created_at: new Date(),
        metadata: {
          calculated_at: new Date().toISOString()
        }
      };

      const result = await insertWithRetry('customer_response_times', entry);
      
      logger.info('⏱️ Tempo de resposta registrado', {
        contact: data.contact_name,
        phone: data.contact_phone,
        responseTime: data.response_time_minutes ? `${data.response_time_minutes} min` : 'Primeira mensagem'
      });

      return result;
    } catch (error) {
      logger.error('Erro ao salvar tempo de resposta:', error);
      throw error;
    }
  }

  /**
   * Obter estatísticas de tempo de resposta para um contato
   */
  async getContactResponseStats(contactPhone, days = 30) {
    try {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);

      const result = await findWithCache('customer_response_times', {
        contact_phone: contactPhone
      }, {
        orderBy: { column: 'created_at', ascending: false }
      });

      const responses = result.data.filter(r => 
        new Date(r.created_at) >= sinceDate && !r.is_first_message
      );

      if (responses.length === 0) {
        return {
          contact_phone: contactPhone,
          total_responses: 0,
          average_response_time_minutes: 0,
          fastest_response_minutes: 0,
          slowest_response_minutes: 0
        };
      }

      const responseTimes = responses.map(r => r.response_time_minutes);
      const avgResponse = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
      const fastestResponse = Math.min(...responseTimes);
      const slowestResponse = Math.max(...responseTimes);

      return {
        contact_phone: contactPhone,
        contact_name: responses[0].contact_name,
        total_responses: responses.length,
        average_response_time_minutes: avgResponse,
        fastest_response_minutes: fastestResponse,
        slowest_response_minutes: slowestResponse,
        last_response_time: responses[0].response_time_minutes,
        period_days: days
      };

    } catch (error) {
      logger.error('Erro ao obter estatísticas de resposta:', error);
      throw error;
    }
  }

  /**
   * Obter ranking de clientes por tempo de resposta
   */
  async getResponseTimeRanking(limit = 20, days = 30) {
    try {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);

      // Buscar todos os tempos de resposta do período
      const result = await findWithCache('customer_response_times', {}, {
        orderBy: { column: 'created_at', ascending: false }
      });

      const responses = result.data.filter(r => 
        new Date(r.created_at) >= sinceDate && !r.is_first_message
      );

      // Agrupar por contato
      const contactStats = {};
      responses.forEach(response => {
        const phone = response.contact_phone;
        if (!contactStats[phone]) {
          contactStats[phone] = {
            contact_phone: phone,
            contact_name: response.contact_name,
            response_times: [],
            total_messages: 0
          };
        }
        contactStats[phone].response_times.push(response.response_time_minutes);
        contactStats[phone].total_messages++;
      });

      // Calcular estatísticas e ordenar
      const ranking = Object.values(contactStats)
        .map(contact => {
          const times = contact.response_times;
          const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
          
          return {
            contact_phone: contact.contact_phone,
            contact_name: contact.contact_name,
            average_response_time_minutes: avgTime,
            total_messages: contact.total_messages,
            fastest_response: Math.min(...times),
            slowest_response: Math.max(...times)
          };
        })
        .sort((a, b) => a.average_response_time_minutes - b.average_response_time_minutes)
        .slice(0, limit);

      return {
        ranking,
        period_days: days,
        total_contacts: ranking.length
      };

    } catch (error) {
      logger.error('Erro ao obter ranking de tempo de resposta:', error);
      throw error;
    }
  }

  /**
   * Obter alertas de tempo de resposta lento
   */
  async getSlowResponseAlerts(thresholdMinutes = 60, days = 7) {
    try {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);

      const result = await findWithCache('customer_response_times', {}, {
        orderBy: { column: 'created_at', ascending: false }
      });

      const slowResponses = result.data.filter(r => 
        new Date(r.created_at) >= sinceDate && 
        !r.is_first_message &&
        r.response_time_minutes > thresholdMinutes
      );

      return {
        alerts: slowResponses.map(response => ({
          contact_phone: response.contact_phone,
          contact_name: response.contact_name,
          response_time_minutes: response.response_time_minutes,
          message_time: response.customer_message_time,
          chat_id: response.chat_id
        })),
        threshold_minutes: thresholdMinutes,
        period_days: days,
        total_alerts: slowResponses.length
      };

    } catch (error) {
      logger.error('Erro ao obter alertas de tempo de resposta:', error);
      throw error;
    }
  }

  /**
   * Marcar cliente como "resposta rápida" ou "resposta lenta"
   */
  async categorizeCustomerByResponseTime(contactPhone, days = 30) {
    try {
      const stats = await this.getContactResponseStats(contactPhone, days);
      
      if (stats.total_responses === 0) {
        return { category: 'new', description: 'Cliente novo' };
      }

      const avgTime = stats.average_response_time_minutes;
      
      if (avgTime <= 5) {
        return { category: 'very_fast', description: 'Resposta muito rápida (≤ 5 min)' };
      } else if (avgTime <= 15) {
        return { category: 'fast', description: 'Resposta rápida (≤ 15 min)' };
      } else if (avgTime <= 60) {
        return { category: 'normal', description: 'Resposta normal (≤ 1 hora)' };
      } else if (avgTime <= 240) {
        return { category: 'slow', description: 'Resposta lenta (≤ 4 horas)' };
      } else {
        return { category: 'very_slow', description: 'Resposta muito lenta (> 4 horas)' };
      }

    } catch (error) {
      logger.error('Erro ao categorizar cliente:', error);
      return { category: 'unknown', description: 'Erro ao calcular' };
    }
  }
}

module.exports = new ResponseTimeService();