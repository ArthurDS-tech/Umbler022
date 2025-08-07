const { insertWithRetry, updateWithRetry, findWithCache } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Serviço para calcular e gerenciar tempo de resposta dos atendentes
 */
class AgentResponseTimeService {
  
  /**
   * Processar evento de mensagem para calcular tempo de resposta do atendente
   */
  async processMessageForAgentResponseTime(webhookData) {
    try {
      const { Payload } = webhookData;
      if (!Payload || !Payload.Content) {
        return null;
      }

      const { Content } = Payload;
      const { Contact, LastMessage, Id: chatId } = Content;

      if (!LastMessage || !Contact) {
        return null;
      }

      const contactPhone = Contact.PhoneNumber;
      const contactName = Contact.Name;
      const messageTime = new Date(LastMessage.EventAtUTC);
      const messageSource = LastMessage.Source; // 'Contact' ou 'OrganizationMember'

      // Se for mensagem do cliente, marcar como pendente de resposta
      if (messageSource === 'Contact') {
        await this.markCustomerMessagePending({
          chat_id: chatId,
          contact_phone: contactPhone,
          contact_name: contactName,
          customer_message_time: messageTime,
          customer_message_id: LastMessage.Id,
          customer_message_content: LastMessage.Content
        });
        
        logger.info('📩 Mensagem do cliente registrada - aguardando resposta do atendente', {
          contact: contactName,
          phone: contactPhone,
          time: messageTime.toISOString()
        });
      }
      
      // Se for mensagem do atendente, calcular tempo de resposta
      else if (messageSource === 'OrganizationMember') {
        const agentResponseTime = new Date(LastMessage.EventAtUTC);
        await this.calculateAgentResponseTime({
          chat_id: chatId,
          contact_phone: contactPhone,
          contact_name: contactName,
          agent_response_time: agentResponseTime,
          agent_message_id: LastMessage.Id,
          agent_message_content: LastMessage.Content
        });
      }

      return { processed: true };

    } catch (error) {
      logger.error('Erro ao processar tempo de resposta do atendente:', error);
      return null;
    }
  }

  /**
   * Marcar mensagem do cliente como pendente de resposta
   */
  async markCustomerMessagePending(data) {
    try {
      // Verificar se já existe uma mensagem pendente mais recente para este chat
      const existingPending = await findWithCache('agent_response_tracking', {
        chat_id: data.chat_id,
        contact_phone: data.contact_phone,
        is_pending: true
      }, {
        orderBy: { column: 'customer_message_time', ascending: false },
        limit: 1
      });

      // Se existe uma mensagem pendente mais antiga, atualizar para não pendente
      if (existingPending.data.length > 0) {
        const oldPending = existingPending.data[0];
        await updateWithRetry('agent_response_tracking', oldPending.id, {
          is_pending: false,
          updated_at: new Date()
        });
      }

      // Criar nova entrada pendente
      const entry = {
        id: require('uuid').v4(),
        chat_id: data.chat_id,
        contact_phone: data.contact_phone,
        contact_name: data.contact_name,
        customer_message_time: data.customer_message_time,
        customer_message_id: data.customer_message_id,
        customer_message_content: data.customer_message_content?.substring(0, 500) || '', // Limitar tamanho
        is_pending: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      await insertWithRetry('agent_response_tracking', entry);
      return entry;

    } catch (error) {
      logger.error('Erro ao marcar mensagem como pendente:', error);
      throw error;
    }
  }

  /**
   * Calcular tempo de resposta do atendente
   */
  async calculateAgentResponseTime(data) {
    try {
      // Buscar a mensagem do cliente mais recente que está pendente
      const pendingMessage = await findWithCache('agent_response_tracking', {
        chat_id: data.chat_id,
        contact_phone: data.contact_phone,
        is_pending: true
      }, {
        orderBy: { column: 'customer_message_time', ascending: false },
        limit: 1
      });

      if (pendingMessage.data.length === 0) {
        logger.warn('Nenhuma mensagem pendente encontrada para calcular tempo de resposta', {
          chat_id: data.chat_id,
          contact_phone: data.contact_phone
        });
        return null;
      }

      const pending = pendingMessage.data[0];
      const customerMessageTime = new Date(pending.customer_message_time);
      const agentResponseTime = data.agent_response_time;

      // Calcular tempo de resposta
      const responseTimeMs = agentResponseTime.getTime() - customerMessageTime.getTime();
      const responseTimeMinutes = Math.round(responseTimeMs / (1000 * 60));
      const responseTimeSeconds = Math.round(responseTimeMs / 1000);

      // Atualizar entrada com dados do atendente
      const updatedEntry = await updateWithRetry('agent_response_tracking', pending.id, {
        agent_response_time: agentResponseTime,
        agent_message_id: data.agent_message_id,
        agent_message_content: data.agent_message_content?.substring(0, 500) || '',
        response_time_ms: responseTimeMs,
        response_time_seconds: responseTimeSeconds,
        response_time_minutes: responseTimeMinutes,
        is_pending: false,
        updated_at: new Date()
      });

      logger.info('⏱️ Tempo de resposta do atendente calculado', {
        contact: data.contact_name,
        phone: data.contact_phone,
        responseTime: `${responseTimeMinutes} min (${responseTimeSeconds}s)`,
        customerMessageTime: customerMessageTime.toISOString(),
        agentResponseTime: agentResponseTime.toISOString()
      });

      return updatedEntry;

    } catch (error) {
      logger.error('Erro ao calcular tempo de resposta do atendente:', error);
      throw error;
    }
  }

  /**
   * Obter estatísticas de tempo de resposta dos atendentes
   */
  async getAgentResponseStats(days = 30) {
    try {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);

      const result = await findWithCache('agent_response_tracking', {
        is_pending: false
      }, {
        orderBy: { column: 'updated_at', ascending: false }
      });

      const responses = result.data.filter(r => 
        new Date(r.updated_at) >= sinceDate && r.response_time_minutes !== null
      );

      if (responses.length === 0) {
        return {
          total_responses: 0,
          average_response_time_minutes: 0,
          fastest_response_minutes: 0,
          slowest_response_minutes: 0,
          period_days: days
        };
      }

      const responseTimes = responses.map(r => r.response_time_minutes);
      const avgResponse = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
      const fastestResponse = Math.min(...responseTimes);
      const slowestResponse = Math.max(...responseTimes);

      // Calcular distribuição por faixas de tempo
      const distribution = {
        very_fast: responses.filter(r => r.response_time_minutes <= 2).length, // <= 2 min
        fast: responses.filter(r => r.response_time_minutes > 2 && r.response_time_minutes <= 5).length, // 2-5 min
        normal: responses.filter(r => r.response_time_minutes > 5 && r.response_time_minutes <= 15).length, // 5-15 min
        slow: responses.filter(r => r.response_time_minutes > 15 && r.response_time_minutes <= 60).length, // 15-60 min
        very_slow: responses.filter(r => r.response_time_minutes > 60).length // > 60 min
      };

      return {
        total_responses: responses.length,
        average_response_time_minutes: avgResponse,
        fastest_response_minutes: fastestResponse,
        slowest_response_minutes: slowestResponse,
        distribution,
        period_days: days
      };

    } catch (error) {
      logger.error('Erro ao obter estatísticas dos atendentes:', error);
      throw error;
    }
  }

  /**
   * Obter estatísticas por contato (cliente)
   */
  async getContactAgentResponseStats(contactPhone, days = 30) {
    try {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);

      const result = await findWithCache('agent_response_tracking', {
        contact_phone: contactPhone,
        is_pending: false
      }, {
        orderBy: { column: 'updated_at', ascending: false }
      });

      const responses = result.data.filter(r => 
        new Date(r.updated_at) >= sinceDate && r.response_time_minutes !== null
      );

      if (responses.length === 0) {
        return {
          contact_phone: contactPhone,
          contact_name: null,
          total_responses: 0,
          average_response_time_minutes: 0,
          fastest_response_minutes: 0,
          slowest_response_minutes: 0,
          period_days: days
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
      logger.error('Erro ao obter estatísticas do contato:', error);
      throw error;
    }
  }

  /**
   * Obter clientes com mensagens pendentes (sem resposta do atendente)
   */
  async getPendingCustomerMessages(limit = 50) {
    try {
      const result = await findWithCache('agent_response_tracking', {
        is_pending: true
      }, {
        orderBy: { column: 'customer_message_time', ascending: true }, // Mais antigos primeiro
        limit
      });

      const now = new Date();
      const pendingWithTime = result.data.map(pending => {
        const messageTime = new Date(pending.customer_message_time);
        const waitingTimeMs = now.getTime() - messageTime.getTime();
        const waitingTimeMinutes = Math.round(waitingTimeMs / (1000 * 60));

        return {
          ...pending,
          waiting_time_minutes: waitingTimeMinutes,
          waiting_time_ms: waitingTimeMs,
          is_urgent: waitingTimeMinutes > 30, // Mais de 30 min sem resposta
          is_critical: waitingTimeMinutes > 120 // Mais de 2 horas sem resposta
        };
      });

      return {
        pending_messages: pendingWithTime,
        total_pending: pendingWithTime.length,
        urgent_count: pendingWithTime.filter(p => p.is_urgent).length,
        critical_count: pendingWithTime.filter(p => p.is_critical).length
      };

    } catch (error) {
      logger.error('Erro ao obter mensagens pendentes:', error);
      throw error;
    }
  }

  /**
   * Obter ranking de clientes por tempo médio de resposta dos atendentes
   */
  async getCustomerResponseRanking(limit = 20, days = 30) {
    try {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);

      const result = await findWithCache('agent_response_tracking', {
        is_pending: false
      }, {
        orderBy: { column: 'updated_at', ascending: false }
      });

      const responses = result.data.filter(r => 
        new Date(r.updated_at) >= sinceDate && r.response_time_minutes !== null
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

      // Calcular estatísticas e ordenar por tempo médio de resposta (pior para melhor)
      const ranking = Object.values(contactStats)
        .map(contact => {
          const times = contact.response_times;
          const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
          
          return {
            contact_phone: contact.contact_phone,
            contact_name: contact.contact_name,
            average_agent_response_time_minutes: avgTime,
            total_messages: contact.total_messages,
            fastest_agent_response: Math.min(...times),
            slowest_agent_response: Math.max(...times)
          };
        })
        .sort((a, b) => b.average_agent_response_time_minutes - a.average_agent_response_time_minutes) // Pior primeiro
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
}

module.exports = new AgentResponseTimeService();