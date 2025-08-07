const { supabaseAdmin, insertWithRetry, updateWithRetry } = require('../config/database');
const logger = require('../utils/logger');
const { formatPhoneNumber, validateEmail } = require('../utils/helpers');

/**
 * Serviço responsável por gerenciar contatos
 */
class ContactService {
  
  /**
   * Criar ou atualizar contato
   */
  async createOrUpdateContact(contactData) {
    try {
      // Validar e formatar dados
      const formattedData = this._formatContactData(contactData);
      
      // Verificar se contato já existe
      const existingContact = await this.findContactByPhone(formattedData.phone);
      
      if (existingContact) {
        // Atualizar contato existente
        return await this.updateContact(existingContact.id, formattedData);
      } else {
        // Criar novo contato
        return await this.createContact(formattedData);
      }
    } catch (error) {
      logger.error('Erro ao criar/atualizar contato:', error);
      throw error;
    }
  }
  
  /**
   * Criar novo contato
   */
  async createContact(contactData) {
    try {
      const formattedData = this._formatContactData(contactData);
      
      console.log('🔍 DEBUG: Tentando criar contato no Supabase...');
      console.log('📋 DEBUG: Dados do contato:', {
        phone: formattedData.phone,
        name: formattedData.name,
        email: formattedData.email
      });
      
      logger.info('Criando novo contato', { phone: formattedData.phone });
      
      const contactToInsert = {
        phone: formattedData.phone,
        name: formattedData.name,
        email: formattedData.email,
        profile_pic_url: formattedData.profilePicUrl,
        status: formattedData.status || 'active',
        tags: formattedData.tags || [],
        metadata: formattedData.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_interaction: new Date().toISOString()
      };
      
      console.log('💾 DEBUG: Dados para inserção no Supabase:', contactToInsert);
      
      const result = await insertWithRetry('contacts', contactToInsert);
      
      console.log('✅ DEBUG: Contato criado no Supabase com sucesso:', {
        id: result.id,
        phone: result.phone,
        name: result.name
      });
      
      logger.info('✅ Contato criado com sucesso', { 
        id: result.id, 
        phone: result.phone 
      });
      
      return result;
    } catch (error) {
      console.error('❌ DEBUG: ERRO ao criar contato no Supabase:', {
        error: error.message,
        stack: error.stack,
        contactData: {
          phone: contactData.phone,
          name: contactData.name,
          email: contactData.email
        }
      });
      
      logger.error('Erro ao criar contato:', error);
      throw error;
    }
  }
  
  /**
   * Atualizar contato existente
   */
  async updateContact(contactId, updateData) {
    try {
      const formattedData = this._formatContactData(updateData);
      
      logger.info('Atualizando contato', { contactId });
      
      const updateFields = {
        updated_at: new Date().toISOString(),
        last_interaction: new Date().toISOString()
      };
      
      // Apenas atualizar campos que foram fornecidos
      if (formattedData.name !== undefined) updateFields.name = formattedData.name;
      if (formattedData.email !== undefined) updateFields.email = formattedData.email;
      if (formattedData.profilePicUrl !== undefined) updateFields.profile_pic_url = formattedData.profilePicUrl;
      if (formattedData.status !== undefined) updateFields.status = formattedData.status;
      if (formattedData.tags !== undefined) updateFields.tags = formattedData.tags;
      
      // Merge metadata
      if (formattedData.metadata) {
        const { data: existingContact } = await supabaseAdmin
          .from('contacts')
          .select('metadata')
          .eq('id', contactId)
          .single();
        
        updateFields.metadata = {
          ...(existingContact?.metadata || {}),
          ...formattedData.metadata
        };
      }
      
      const result = await updateWithRetry('contacts', updateFields, { id: contactId });
      
      logger.info('✅ Contato atualizado com sucesso', { 
        id: result.id, 
        phone: result.phone 
      });
      
      return result;
    } catch (error) {
      logger.error('Erro ao atualizar contato:', error);
      throw error;
    }
  }
  
  /**
   * Buscar contato por telefone
   */
  async findContactByPhone(phone) {
    try {
      const formattedPhone = formatPhoneNumber(phone);
      
      const { data, error } = await supabaseAdmin
        .from('contacts')
        .select('*')
        .eq('phone', formattedPhone)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = não encontrado
        throw error;
      }
      
      return data;
    } catch (error) {
      logger.error('Erro ao buscar contato por telefone:', error);
      throw error;
    }
  }
  
  /**
   * Buscar contato por ID
   */
  async findContactById(contactId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data;
    } catch (error) {
      logger.error('Erro ao buscar contato por ID:', error);
      throw error;
    }
  }
  
  /**
   * Listar contatos com filtros e paginação
   */
  async listContacts({ page = 1, limit = 50, filters = {}, orderBy = 'created_at' }) {
    try {
      let query = supabaseAdmin
        .from('contacts')
        .select('*', { count: 'exact' });
      
      // Aplicar filtros
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters.name) {
        query = query.ilike('name', `%${filters.name}%`);
      }
      
      if (filters.phone) {
        query = query.ilike('phone', `%${filters.phone}%`);
      }
      
      if (filters.email) {
        query = query.ilike('email', `%${filters.email}%`);
      }
      
      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }
      
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      
      // Ordenação
      const orderDirection = filters.orderDirection === 'asc' ? { ascending: true } : { ascending: false };
      query = query.order(orderBy, orderDirection);
      
      // Paginação
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) {
        throw error;
      }
      
      return {
        contacts: data,
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit)
      };
    } catch (error) {
      logger.error('Erro ao listar contatos:', error);
      throw error;
    }
  }
  
  /**
   * Buscar contatos com conversas ativas
   */
  async findContactsWithActiveConversations() {
    try {
      const { data, error } = await supabaseAdmin
        .from('contacts')
        .select(`
          *,
          conversations!inner (
            id,
            status,
            last_message_at,
            message_count
          )
        `)
        .eq('conversations.status', 'open')
        .order('conversations.last_message_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      logger.error('Erro ao buscar contatos com conversas ativas:', error);
      throw error;
    }
  }
  
  /**
   * Adicionar tags a um contato
   */
  async addTagsToContact(contactId, tags) {
    try {
      if (!Array.isArray(tags) || tags.length === 0) {
        throw new Error('Tags devem ser um array não vazio');
      }
      
      const contact = await this.findContactById(contactId);
      if (!contact) {
        throw new Error('Contato não encontrado');
      }
      
      const existingTags = contact.tags || [];
      const newTags = [...new Set([...existingTags, ...tags])]; // Remove duplicatas
      
      const result = await updateWithRetry('contacts', 
        { 
          tags: newTags,
          updated_at: new Date().toISOString()
        }, 
        { id: contactId }
      );
      
      logger.info('Tags adicionadas ao contato', { contactId, newTags });
      return result;
    } catch (error) {
      logger.error('Erro ao adicionar tags:', error);
      throw error;
    }
  }
  
  /**
   * Remover tags de um contato
   */
  async removeTagsFromContact(contactId, tags) {
    try {
      if (!Array.isArray(tags) || tags.length === 0) {
        throw new Error('Tags devem ser um array não vazio');
      }
      
      const contact = await this.findContactById(contactId);
      if (!contact) {
        throw new Error('Contato não encontrado');
      }
      
      const existingTags = contact.tags || [];
      const newTags = existingTags.filter(tag => !tags.includes(tag));
      
      const result = await updateWithRetry('contacts', 
        { 
          tags: newTags,
          updated_at: new Date().toISOString()
        }, 
        { id: contactId }
      );
      
      logger.info('Tags removidas do contato', { contactId, removedTags: tags });
      return result;
    } catch (error) {
      logger.error('Erro ao remover tags:', error);
      throw error;
    }
  }
  
  /**
   * Bloquear contato
   */
  async blockContact(contactId, reason = null) {
    try {
      const updateData = {
        status: 'blocked',
        updated_at: new Date().toISOString(),
        metadata: {}
      };
      
      // Adicionar razão aos metadados se fornecida
      if (reason) {
        const contact = await this.findContactById(contactId);
        updateData.metadata = {
          ...(contact?.metadata || {}),
          blockedAt: new Date().toISOString(),
          blockReason: reason
        };
      }
      
      const result = await updateWithRetry('contacts', updateData, { id: contactId });
      
      logger.info('Contato bloqueado', { contactId, reason });
      return result;
    } catch (error) {
      logger.error('Erro ao bloquear contato:', error);
      throw error;
    }
  }
  
  /**
   * Desbloquear contato
   */
  async unblockContact(contactId) {
    try {
      const contact = await this.findContactById(contactId);
      if (!contact) {
        throw new Error('Contato não encontrado');
      }
      
      const metadata = { ...(contact.metadata || {}) };
      delete metadata.blockedAt;
      delete metadata.blockReason;
      metadata.unblockedAt = new Date().toISOString();
      
      const result = await updateWithRetry('contacts', 
        { 
          status: 'active',
          metadata,
          updated_at: new Date().toISOString()
        }, 
        { id: contactId }
      );
      
      logger.info('Contato desbloqueado', { contactId });
      return result;
    } catch (error) {
      logger.error('Erro ao desbloquear contato:', error);
      throw error;
    }
  }
  
  /**
   * Arquivar contato
   */
  async archiveContact(contactId) {
    try {
      const result = await updateWithRetry('contacts', 
        { 
          status: 'archived',
          updated_at: new Date().toISOString()
        }, 
        { id: contactId }
      );
      
      logger.info('Contato arquivado', { contactId });
      return result;
    } catch (error) {
      logger.error('Erro ao arquivar contato:', error);
      throw error;
    }
  }
  
  /**
   * Obter estatísticas de contatos
   */
  async getContactStats(period = '30d') {
    try {
      const periodMap = {
        '24h': '24 hours',
        '7d': '7 days',
        '30d': '30 days',
        '90d': '90 days'
      };
      
      const since = new Date(
        Date.now() - (
          period === '24h' ? 24 * 60 * 60 * 1000 :
          period === '7d' ? 7 * 24 * 60 * 60 * 1000 :
          period === '30d' ? 30 * 24 * 60 * 60 * 1000 :
          90 * 24 * 60 * 60 * 1000
        )
      ).toISOString();
      
      // Contagem total por status
      const { data: statusCounts, error: statusError } = await supabaseAdmin
        .from('contacts')
        .select('status, count(*)', { count: 'exact' })
        .gte('created_at', since);
      
      if (statusError) throw statusError;
      
      // Novos contatos no período
      const { count: newContactsCount, error: newError } = await supabaseAdmin
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', since);
      
      if (newError) throw newError;
      
      // Contatos ativos (com interação recente)
      const { count: activeContactsCount, error: activeError } = await supabaseAdmin
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .gte('last_interaction', since);
      
      if (activeError) throw activeError;
      
      return {
        period,
        total_contacts: statusCounts.length,
        new_contacts: newContactsCount,
        active_contacts: activeContactsCount,
        by_status: statusCounts.reduce((acc, item) => {
          acc[item.status] = item.count;
          return acc;
        }, {}),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Erro ao obter estatísticas de contatos:', error);
      throw error;
    }
  }
  
  /**
   * Buscar contatos duplicados
   */
  async findDuplicateContacts() {
    try {
      const { data, error } = await supabaseAdmin
        .rpc('find_duplicate_contacts');
      
      if (error) {
        // Se a função não existir, fazer busca manual
        const { data: contacts, error: contactsError } = await supabaseAdmin
          .from('contacts')
          .select('phone, count(*)')
          .group('phone')
          .having('count(*) > 1');
        
        if (contactsError) throw contactsError;
        return contacts;
      }
      
      return data;
    } catch (error) {
      logger.error('Erro ao buscar duplicatas:', error);
      throw error;
    }
  }
  
  /**
   * Mesclar contatos duplicados
   */
  async mergeContacts(primaryContactId, duplicateContactIds) {
    try {
      if (!Array.isArray(duplicateContactIds) || duplicateContactIds.length === 0) {
        throw new Error('IDs de contatos duplicados devem ser um array não vazio');
      }
      
      const primaryContact = await this.findContactById(primaryContactId);
      if (!primaryContact) {
        throw new Error('Contato principal não encontrado');
      }
      
      // Atualizar conversas e mensagens dos duplicados para o contato principal
      for (const duplicateId of duplicateContactIds) {
        // Atualizar conversas
        await supabaseAdmin
          .from('conversations')
          .update({ contact_id: primaryContactId })
          .eq('contact_id', duplicateId);
        
        // Atualizar mensagens
        await supabaseAdmin
          .from('messages')
          .update({ contact_id: primaryContactId })
          .eq('contact_id', duplicateId);
        
        // Remover contato duplicado
        await supabaseAdmin
          .from('contacts')
          .delete()
          .eq('id', duplicateId);
      }
      
      logger.info('Contatos mesclados com sucesso', { 
        primaryContactId, 
        mergedCount: duplicateContactIds.length 
      });
      
      return primaryContact;
    } catch (error) {
      logger.error('Erro ao mesclar contatos:', error);
      throw error;
    }
  }
  
  /**
   * Formatar e validar dados do contato
   */
  _formatContactData(contactData) {
    const formatted = {};
    
    // Telefone (obrigatório)
    if (!contactData.phone) {
      throw new Error('Telefone é obrigatório');
    }
    formatted.phone = formatPhoneNumber(contactData.phone);
    
    // Nome (opcional)
    if (contactData.name) {
      formatted.name = contactData.name.trim();
    }
    
    // Email (opcional, mas deve ser válido se fornecido)
    if (contactData.email) {
      if (!validateEmail(contactData.email)) {
        throw new Error('Email inválido');
      }
      formatted.email = contactData.email.toLowerCase().trim();
    }
    
    // URL da foto de perfil
    if (contactData.profilePicUrl) {
      formatted.profilePicUrl = contactData.profilePicUrl;
    }
    
    // Status
    if (contactData.status) {
      const validStatuses = ['active', 'blocked', 'archived'];
      if (!validStatuses.includes(contactData.status)) {
        throw new Error(`Status inválido. Deve ser: ${validStatuses.join(', ')}`);
      }
      formatted.status = contactData.status;
    }
    
    // Tags
    if (contactData.tags) {
      if (!Array.isArray(contactData.tags)) {
        throw new Error('Tags devem ser um array');
      }
      formatted.tags = contactData.tags.filter(tag => tag && tag.trim());
    }
    
    // Metadata
    if (contactData.metadata) {
      if (typeof contactData.metadata !== 'object') {
        throw new Error('Metadata deve ser um objeto');
      }
      formatted.metadata = contactData.metadata;
    }
    
    return formatted;
  }
}

module.exports = new ContactService();