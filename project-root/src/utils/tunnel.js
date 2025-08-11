const ngrok = require('ngrok');
const logger = require('./logger');
const { environment } = require('../config/environment');

/**
 * Gerenciador de túnel público para webhooks
 */
class TunnelManager {
  constructor() {
    this.tunnelUrl = null;
    this.isConnected = false;
  }

  /**
   * Iniciar túnel público
   */
  async startTunnel() {
    try {
      // Só criar túnel em desenvolvimento
      if (!environment.isDevelopment()) {
        logger.warn('Túnel público só é criado em ambiente de desenvolvimento');
        return null;
      }

      logger.info('🔄 Iniciando túnel público ngrok...');
      
      // Configurações do ngrok
      const options = {
        addr: environment.port,
        region: 'sa', // South America para melhor latência no Brasil
        subdomain: process.env.NGROK_SUBDOMAIN || undefined,
        authtoken: process.env.NGROK_AUTHTOKEN || undefined
      };

      // Remover opções undefined
      Object.keys(options).forEach(key => {
        if (options[key] === undefined) {
          delete options[key];
        }
      });

      this.tunnelUrl = await ngrok.connect(options);
      this.isConnected = true;

      logger.info('✅ Túnel público criado com sucesso!', {
        tunnelUrl: this.tunnelUrl,
        localPort: environment.port
      });

      // Atualizar a configuração do webhook
      this.updateWebhookConfig();

      return this.tunnelUrl;
    } catch (error) {
      logger.error('❌ Erro ao criar túnel público:', error);
      this.isConnected = false;
      return null;
    }
  }

  /**
   * Parar túnel público
   */
  async stopTunnel() {
    try {
      if (this.isConnected) {
        await ngrok.disconnect();
        await ngrok.kill();
        this.tunnelUrl = null;
        this.isConnected = false;
        logger.info('🛑 Túnel público encerrado');
      }
    } catch (error) {
      logger.error('❌ Erro ao encerrar túnel:', error);
    }
  }

  /**
   * Obter URL do túnel
   */
  getTunnelUrl() {
    return this.tunnelUrl;
  }

  /**
   * Verificar se está conectado
   */
  isActive() {
    return this.isConnected && this.tunnelUrl !== null;
  }

  /**
   * Atualizar configuração do webhook com a URL pública
   */
  updateWebhookConfig() {
    if (this.tunnelUrl) {
      // Atualizar a configuração do ambiente temporariamente
      environment.webhook.baseUrl = this.tunnelUrl;
      logger.info('🔧 Configuração do webhook atualizada', {
        newWebhookUrl: `${this.tunnelUrl}/webhook/umbler`
      });
    }
  }

  /**
   * Obter informações completas do túnel
   */
  getTunnelInfo() {
    return {
      isActive: this.isActive(),
      tunnelUrl: this.tunnelUrl,
      webhookUrl: this.tunnelUrl ? `${this.tunnelUrl}/webhook/umbler` : null,
      localUrl: `http://localhost:${environment.port}`,
      region: 'sa',
      status: this.isConnected ? 'connected' : 'disconnected'
    };
  }

  /**
   * Inicialização automática baseada em variáveis de ambiente
   */
  async autoStart() {
    // Só iniciar automaticamente se habilitado
    if (process.env.AUTO_START_TUNNEL === 'true' && environment.isDevelopment()) {
      logger.info('🚀 Iniciando túnel público automaticamente...');
      await this.startTunnel();
    }
  }
}

// Instância singleton
const tunnelManager = new TunnelManager();

// Configurar handlers para encerramento gracioso
process.on('SIGINT', async () => {
  logger.info('🛑 Encerrando túnel público...');
  await tunnelManager.stopTunnel();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('🛑 Encerrando túnel público...');
  await tunnelManager.stopTunnel();
  process.exit(0);
});

module.exports = tunnelManager;