import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  Contact, 
  Conversation, 
  Message, 
  WebhookEvent, 
  DashboardStats,
  ApiResponse,
  PaginatedResponse,
  ContactFilters,
  ConversationFilters,
  MessageFilters,
  TimeSeriesData
} from '@/types';

// Configuração da API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para requests
    this.client.interceptors.request.use(
      (config) => {
        // Adicionar timestamp para evitar cache
        config.params = {
          ...config.params,
          _t: Date.now(),
        };
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Interceptor para responses
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        
        // Tratamento de erros específicos
        if (error.response?.status === 401) {
          // Redirecionar para login se necessário
        } else if (error.response?.status >= 500) {
          // Erro do servidor
          throw new Error('Erro interno do servidor. Tente novamente.');
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Método auxiliar para extrair dados da resposta
  private extractData<T>(response: AxiosResponse<ApiResponse<T>>): T {
    return response.data.data;
  }

  // ==========================================
  // ENDPOINTS DE CONTATOS
  // ==========================================

  async getContacts(filters?: ContactFilters): Promise<PaginatedResponse<Contact>> {
    const response = await this.client.get<ApiResponse<PaginatedResponse<Contact>>>('/api/contacts', {
      params: filters,
    });
    return this.extractData(response);
  }

  async getContact(id: string): Promise<Contact> {
    const response = await this.client.get<ApiResponse<Contact>>(`/api/contacts/${id}`);
    return this.extractData(response);
  }

  async createContact(data: Partial<Contact>): Promise<Contact> {
    const response = await this.client.post<ApiResponse<Contact>>('/api/contacts', data);
    return this.extractData(response);
  }

  async updateContact(id: string, data: Partial<Contact>): Promise<Contact> {
    const response = await this.client.put<ApiResponse<Contact>>(`/api/contacts/${id}`, data);
    return this.extractData(response);
  }

  async deleteContact(id: string): Promise<void> {
    await this.client.delete(`/api/contacts/${id}`);
  }

  async addTagsToContact(id: string, tags: string[]): Promise<Contact> {
    const response = await this.client.post<ApiResponse<Contact>>(`/api/contacts/${id}/tags`, { tags });
    return this.extractData(response);
  }

  async removeTagsFromContact(id: string, tags: string[]): Promise<Contact> {
    const response = await this.client.delete<ApiResponse<Contact>>(`/api/contacts/${id}/tags`, { 
      data: { tags } 
    });
    return this.extractData(response);
  }

  // ==========================================
  // ENDPOINTS DE CONVERSAS
  // ==========================================

  async getConversations(filters?: ConversationFilters): Promise<PaginatedResponse<Conversation>> {
    const response = await this.client.get<ApiResponse<PaginatedResponse<Conversation>>>('/api/conversations', {
      params: filters,
    });
    return this.extractData(response);
  }

  async getConversation(id: string): Promise<Conversation> {
    const response = await this.client.get<ApiResponse<Conversation>>(`/api/conversations/${id}`);
    return this.extractData(response);
  }

  async updateConversation(id: string, data: Partial<Conversation>): Promise<Conversation> {
    const response = await this.client.put<ApiResponse<Conversation>>(`/api/conversations/${id}`, data);
    return this.extractData(response);
  }

  async closeConversation(id: string): Promise<Conversation> {
    const response = await this.client.post<ApiResponse<Conversation>>(`/api/conversations/${id}/close`);
    return this.extractData(response);
  }

  async assignConversation(id: string, agentId: string): Promise<Conversation> {
    const response = await this.client.post<ApiResponse<Conversation>>(`/api/conversations/${id}/assign`, {
      agentId,
    });
    return this.extractData(response);
  }

  // ==========================================
  // ENDPOINTS DE MENSAGENS
  // ==========================================

  async getMessages(filters?: MessageFilters): Promise<PaginatedResponse<Message>> {
    const response = await this.client.get<ApiResponse<PaginatedResponse<Message>>>('/api/messages', {
      params: filters,
    });
    return this.extractData(response);
  }

  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    const response = await this.client.get<ApiResponse<Message[]>>(`/api/conversations/${conversationId}/messages`);
    return this.extractData(response);
  }

  async getMessage(id: string): Promise<Message> {
    const response = await this.client.get<ApiResponse<Message>>(`/api/messages/${id}`);
    return this.extractData(response);
  }

  async sendMessage(data: {
    conversationId: string;
    content: string;
    messageType?: string;
  }): Promise<Message> {
    const response = await this.client.post<ApiResponse<Message>>('/api/messages', data);
    return this.extractData(response);
  }

  // ==========================================
  // ENDPOINTS DE WEBHOOK
  // ==========================================

  async getWebhookEvents(page = 1, limit = 50): Promise<PaginatedResponse<WebhookEvent>> {
    const response = await this.client.get<ApiResponse<PaginatedResponse<WebhookEvent>>>('/api/webhook/events', {
      params: { page, limit },
    });
    return this.extractData(response);
  }

  async retryWebhookEvent(eventId: string): Promise<void> {
    await this.client.post(`/api/webhook/retry/${eventId}`);
  }

  async getWebhookStats(): Promise<any> {
    const response = await this.client.get<ApiResponse<any>>('/api/webhook/stats');
    return this.extractData(response);
  }

  // ==========================================
  // ENDPOINTS DE DASHBOARD
  // ==========================================

  async getDashboardStats(): Promise<DashboardStats> {
    const response = await this.client.get<ApiResponse<DashboardStats>>('/api/dashboard/stats');
    return this.extractData(response);
  }

  async getTimeSeriesData(period: 'day' | 'week' | 'month' = 'week'): Promise<TimeSeriesData[]> {
    const response = await this.client.get<ApiResponse<TimeSeriesData[]>>(`/api/dashboard/timeseries`, {
      params: { period },
    });
    return this.extractData(response);
  }

  async getTagsStats(): Promise<Array<{ tag: string; count: number; percentage: number }>> {
    const response = await this.client.get<ApiResponse<Array<{ tag: string; count: number; percentage: number }>>>('/api/dashboard/tags');
    return this.extractData(response);
  }

  async getChannelStats(): Promise<Array<{ channel: string; count: number; percentage: number }>> {
    const response = await this.client.get<ApiResponse<Array<{ channel: string; count: number; percentage: number }>>>('/api/dashboard/channels');
    return this.extractData(response);
  }

  async getConversationStatusStats(): Promise<Array<{ status: string; count: number; percentage: number }>> {
    const response = await this.client.get<ApiResponse<Array<{ status: string; count: number; percentage: number }>>>('/api/dashboard/conversation-status');
    return this.extractData(response);
  }

  // ==========================================
  // ENDPOINTS DE SAÚDE E SISTEMA
  // ==========================================

  async healthCheck(): Promise<{ status: string; timestamp: string; uptime: number }> {
    const response = await this.client.get<ApiResponse<{ status: string; timestamp: string; uptime: number }>>('/health');
    return this.extractData(response);
  }

  async getSystemInfo(): Promise<any> {
    const response = await this.client.get<ApiResponse<any>>('/api/system/info');
    return this.extractData(response);
  }

  // ==========================================
  // MÉTODOS DE BUSCA
  // ==========================================

  async search(query: string, type?: 'contacts' | 'conversations' | 'messages'): Promise<{
    contacts: Contact[];
    conversations: Conversation[];
    messages: Message[];
  }> {
    const response = await this.client.get<ApiResponse<{
      contacts: Contact[];
      conversations: Conversation[];
      messages: Message[];
    }>>('/api/search', {
      params: { q: query, type },
    });
    return this.extractData(response);
  }

  // ==========================================
  // MÉTODOS DE EXPORTAÇÃO
  // ==========================================

  async exportContacts(filters?: ContactFilters): Promise<Blob> {
    const response = await this.client.get('/api/export/contacts', {
      params: filters,
      responseType: 'blob',
    });
    return response.data;
  }

  async exportConversations(filters?: ConversationFilters): Promise<Blob> {
    const response = await this.client.get('/api/export/conversations', {
      params: filters,
      responseType: 'blob',
    });
    return response.data;
  }

  async exportMessages(filters?: MessageFilters): Promise<Blob> {
    const response = await this.client.get('/api/export/messages', {
      params: filters,
      responseType: 'blob',
    });
    return response.data;
  }
}

// Instância singleton da API
export const api = new ApiClient();

// Hooks personalizados para usar com SWR
export const apiKeys = {
  contacts: (filters?: ContactFilters) => ['contacts', filters],
  contact: (id: string) => ['contact', id],
  conversations: (filters?: ConversationFilters) => ['conversations', filters],
  conversation: (id: string) => ['conversation', id],
  conversationMessages: (id: string) => ['conversation-messages', id],
  messages: (filters?: MessageFilters) => ['messages', filters],
  message: (id: string) => ['message', id],
  webhookEvents: (page: number, limit: number) => ['webhook-events', page, limit],
  webhookStats: () => ['webhook-stats'],
  dashboardStats: () => ['dashboard-stats'],
  timeSeriesData: (period: string) => ['timeseries', period],
  tagsStats: () => ['tags-stats'],
  channelStats: () => ['channel-stats'],
  conversationStatusStats: () => ['conversation-status-stats'],
  search: (query: string, type?: string) => ['search', query, type],
};

export default api;