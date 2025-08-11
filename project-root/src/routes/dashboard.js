const express = require('express');
const { supabaseAdmin } = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/dashboard/stats
 * @desc    Obter estatísticas gerais do dashboard
 * @access  Public
 */
router.get('/stats', async (req, res) => {
  try {
    // Estatísticas básicas
    const [
      { count: totalContacts },
      { count: totalConversations },
      { count: totalMessages },
      { count: activeConversations },
    ] = await Promise.all([
      supabaseAdmin.from('contacts').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('conversations').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('messages').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('conversations').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    ]);

    // Mensagens nas últimas 24h
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: messagesLast24h } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday);

    // Crescimento de contatos (últimos 7 dias vs 7 dias anteriores)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: contactsThisWeek },
      { count: contactsLastWeek }
    ] = await Promise.all([
      supabaseAdmin.from('contacts').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabaseAdmin.from('contacts').select('*', { count: 'exact', head: true }).gte('created_at', twoWeeksAgo).lt('created_at', weekAgo),
    ]);

    const contactsGrowth = contactsLastWeek > 0 
      ? ((contactsThisWeek - contactsLastWeek) / contactsLastWeek * 100).toFixed(1)
      : 0;

    // Crescimento de conversas
    const [
      { count: conversationsThisWeek },
      { count: conversationsLastWeek }
    ] = await Promise.all([
      supabaseAdmin.from('conversations').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabaseAdmin.from('conversations').select('*', { count: 'exact', head: true }).gte('created_at', twoWeeksAgo).lt('created_at', weekAgo),
    ]);

    const conversationsGrowth = conversationsLastWeek > 0 
      ? ((conversationsThisWeek - conversationsLastWeek) / conversationsLastWeek * 100).toFixed(1)
      : 0;

    // Crescimento de mensagens
    const [
      { count: messagesThisWeek },
      { count: messagesLastWeek }
    ] = await Promise.all([
      supabaseAdmin.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabaseAdmin.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', twoWeeksAgo).lt('created_at', weekAgo),
    ]);

    const messagesGrowth = messagesLastWeek > 0 
      ? ((messagesThisWeek - messagesLastWeek) / messagesLastWeek * 100).toFixed(1)
      : 0;

    // Tempo médio de resposta (simulado - você pode implementar a lógica real)
    const responseTime = 2.5; // em minutos

    const stats = {
      totalContacts: totalContacts || 0,
      totalConversations: totalConversations || 0,
      totalMessages: totalMessages || 0,
      activeConversations: activeConversations || 0,
      messagesLast24h: messagesLast24h || 0,
      responseTime,
      contactsGrowth: parseFloat(contactsGrowth),
      conversationsGrowth: parseFloat(conversationsGrowth),
      messagesGrowth: parseFloat(messagesGrowth),
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Erro ao obter estatísticas do dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route   GET /api/dashboard/timeseries
 * @desc    Obter dados de série temporal para gráficos
 * @access  Public
 */
router.get('/timeseries', async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    
    let days = 7;
    if (period === 'day') days = 1;
    if (period === 'month') days = 30;

    const timeSeriesData = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(date.setHours(23, 59, 59, 999)).toISOString();
      
      const [
        { count: messages },
        { count: conversations },
        { count: contacts }
      ] = await Promise.all([
        supabaseAdmin.from('messages').select('*', { count: 'exact', head: true })
          .gte('created_at', startOfDay).lte('created_at', endOfDay),
        supabaseAdmin.from('conversations').select('*', { count: 'exact', head: true })
          .gte('created_at', startOfDay).lte('created_at', endOfDay),
        supabaseAdmin.from('contacts').select('*', { count: 'exact', head: true })
          .gte('created_at', startOfDay).lte('created_at', endOfDay),
      ]);

      timeSeriesData.push({
        date: startOfDay.split('T')[0],
        messages: messages || 0,
        conversations: conversations || 0,
        contacts: contacts || 0,
      });
    }

    res.json({
      success: true,
      data: timeSeriesData
    });

  } catch (error) {
    logger.error('Erro ao obter dados de série temporal:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route   GET /api/dashboard/tags
 * @desc    Obter estatísticas de tags/etiquetas
 * @access  Public
 */
router.get('/tags', async (req, res) => {
  try {
    // Buscar todos os contatos com suas tags
    const { data: contacts, error } = await supabaseAdmin
      .from('contacts')
      .select('tags');

    if (error) throw error;

    // Contar tags
    const tagCounts = {};
    let totalTags = 0;

    contacts.forEach(contact => {
      if (contact.tags && Array.isArray(contact.tags)) {
        contact.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          totalTags++;
        });
      }
    });

    // Converter para array e calcular percentuais
    const tagsStats = Object.entries(tagCounts)
      .map(([tag, count]) => ({
        tag,
        count,
        percentage: totalTags > 0 ? ((count / totalTags) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 tags

    res.json({
      success: true,
      data: tagsStats
    });

  } catch (error) {
    logger.error('Erro ao obter estatísticas de tags:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route   GET /api/dashboard/channels
 * @desc    Obter estatísticas de canais
 * @access  Public
 */
router.get('/channels', async (req, res) => {
  try {
    // Buscar conversas agrupadas por canal
    const { data: conversations, error } = await supabaseAdmin
      .from('conversations')
      .select('channel');

    if (error) throw error;

    // Contar canais
    const channelCounts = {};
    let totalConversations = conversations.length;

    conversations.forEach(conversation => {
      const channel = conversation.channel || 'whatsapp';
      channelCounts[channel] = (channelCounts[channel] || 0) + 1;
    });

    // Converter para array e calcular percentuais
    const channelsStats = Object.entries(channelCounts)
      .map(([channel, count]) => ({
        channel,
        count,
        percentage: totalConversations > 0 ? ((count / totalConversations) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: channelsStats
    });

  } catch (error) {
    logger.error('Erro ao obter estatísticas de canais:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @route   GET /api/dashboard/conversation-status
 * @desc    Obter estatísticas de status de conversas
 * @access  Public
 */
router.get('/conversation-status', async (req, res) => {
  try {
    // Buscar conversas agrupadas por status
    const { data: conversations, error } = await supabaseAdmin
      .from('conversations')
      .select('status');

    if (error) throw error;

    // Contar status
    const statusCounts = {};
    let totalConversations = conversations.length;

    conversations.forEach(conversation => {
      const status = conversation.status || 'open';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    // Converter para array e calcular percentuais
    const statusStats = Object.entries(statusCounts)
      .map(([status, count]) => ({
        status,
        count,
        percentage: totalConversations > 0 ? ((count / totalConversations) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: statusStats
    });

  } catch (error) {
    logger.error('Erro ao obter estatísticas de status:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

module.exports = router;