// Tipos para Contatos
export interface Contact {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  profile_pic_url?: string;
  status: 'active' | 'blocked' | 'archived';
  tags: string[];
  created_at: string;
  updated_at: string;
  last_interaction?: string;
  metadata: Record<string, any>;
}

// Tipos para Conversas
export interface Conversation {
  id: string;
  contact_id: string;
  umbler_conversation_id?: string;
  channel: string;
  status: 'open' | 'closed' | 'pending' | 'resolved';
  assigned_agent_id?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  closed_at?: string;
  last_message_at?: string;
  message_count: number;
  metadata: Record<string, any>;
  contact?: Contact;
  messages?: Message[];
}

// Tipos para Mensagens
export interface Message {
  id: string;
  conversation_id: string;
  contact_id: string;
  umbler_message_id?: string;
  direction: 'inbound' | 'outbound';
  message_type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contact' | 'sticker';
  content?: string;
  media_url?: string;
  media_filename?: string;
  media_mime_type?: string;
  media_size?: number;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  created_at: string;
  metadata: Record<string, any>;
  contact?: Contact;
  conversation?: Conversation;
}

// Tipos para Eventos de Webhook
export interface WebhookEvent {
  id: string;
  event_type: string;
  event_data: Record<string, any>;
  processed: boolean;
  created_at: string;
  processed_at?: string;
  source_ip?: string;
  user_agent?: string;
  error_message?: string;
}

// Tipos para Tags/Etiquetas
export interface Tag {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description?: string;
  count?: number;
}

// Tags predefinidas do sistema
export const SYSTEM_TAGS: Tag[] = [
  { id: 'maju', name: 'Maju', emoji: '🐨', color: 'amber', description: 'Contatos da Maju' },
  { id: 'bmw-veiculos', name: 'BMW VEICULOS', emoji: '✨', color: 'blue', description: 'BMW Veículos' },
  { id: 'bmw-motos', name: 'BMW MOTOS', emoji: '✨', color: 'blue', description: 'BMW Motos' },
  { id: 'bmw-mini', name: 'BMW MINI COOPER', emoji: '✨', color: 'blue', description: 'BMW Mini Cooper' },
  { id: 'repecon-fiat', name: 'REPECON FIAT', emoji: '✨', color: 'blue', description: 'Repecon Fiat' },
  { id: 'automega', name: 'AUTOMEGA', emoji: '✨', color: 'blue', description: 'Automega' },
  { id: 'lojista', name: 'LOJISTA', emoji: '🐨', color: 'purple', description: 'Lojistas' },
  { id: 'dicas', name: 'DICAS', emoji: '🐨', color: 'green', description: 'Dicas' },
  { id: 'pix-vistoria', name: 'PIX VISTORIA', emoji: '🐨', color: 'indigo', description: 'PIX Vistoria' },
  { id: 'cliente-balcao', name: 'CLIENTE BALCAO', emoji: '🐨', color: 'orange', description: 'Cliente Balcão' },
  { id: 'pv', name: 'PV', emoji: '🥳', color: 'pink', description: 'PV' },
  { id: 'troca', name: 'Troca', emoji: '💗', color: 'red', description: 'Troca' },
  { id: 'zero', name: 'Zero', emoji: '💛', color: 'yellow', description: 'Zero KM' },
  { id: 'zero-fora', name: 'zero fora', emoji: '🤎', color: 'yellow', description: 'Zero fora' },
  { id: 'seminovo', name: 'seminovo', emoji: '💚', color: 'emerald', description: 'Seminovo' },
  { id: 'site-af-ph', name: 'Site AF PH', emoji: '🐨', color: 'cyan', description: 'Site AF PH' },
  { id: 'realizado', name: 'Realizado', emoji: '🐨', color: 'lime', description: 'Realizado' },
  { id: 'nao-realizado', name: 'Não realizado', emoji: '🐨', color: 'slate', description: 'Não realizado' },
  { id: 'qualificacao', name: 'Qualificação', emoji: '🐨', color: 'violet', description: 'Qualificação' },
  { id: 'pendente', name: 'Pendente', emoji: '🐨', color: 'slate', description: 'Pendente' },
  { id: 'orcamento-enviado', name: 'Orçamento Enviado', emoji: '🐨', color: 'violet', description: 'Orçamento Enviado' },
  { id: 'pgto', name: 'PGTO', emoji: '🐨', color: 'teal', description: 'Pagamento' },
  { id: 'grupos', name: 'Grupos', emoji: '🐨', color: 'gray', description: 'Grupos' },
  { id: 'aviso', name: 'AVISO', emoji: '🐨', color: 'red', description: 'Aviso' },
  { id: 'particular-sj', name: 'Particular SJ', emoji: '💙', color: 'sky', description: 'Particular SJ' },
  { id: 'zero-tudo', name: 'ZERO TUDO', emoji: '😆', color: 'yellow', description: 'Zero Tudo' },
  { id: 'zero-escolha', name: 'ZERO ESCOLHA', emoji: '🚘', color: 'yellow', description: 'Zero Escolha' },
  { id: 'troca-escolha', name: 'TROCA ESCOLHA', emoji: '🥰', color: 'red', description: 'Troca Escolha' },
  { id: 'troca-tudo', name: 'TROCA TUDO', emoji: '🤢', color: 'red', description: 'Troca Tudo' },
  { id: 'ana', name: 'Ana', emoji: '🤍', color: 'gray', description: 'Ana' },
  { id: 'aguardando-verificacao', name: 'Aguardando Verificação', emoji: '⏳', color: 'gray', description: 'Aguardando Verificação' },
  { id: 'blumenau', name: 'Blumenau', emoji: '🥖', color: 'amber', description: 'Blumenau' },
  { id: 'recall', name: 'RECALL', emoji: '🛑', color: 'rose', description: 'Recall' },
  { id: 'resolvendo-coo', name: 'Resolvendo com COO', emoji: '🐨', color: 'orange', description: 'Resolvendo com COO' },
  { id: 'blumenau-black', name: 'BLUMENAU', emoji: '🖤', color: 'gray', description: 'Blumenau Black' },
  { id: 'negociando', name: 'Negociando', emoji: '🕗', color: 'fuchsia', description: 'Negociando' },
  { id: 'parceiro', name: 'Parceiro', emoji: '🐨', color: 'blue', description: 'Parceiro' },
];

// Tipos para Estatísticas
export interface DashboardStats {
  totalContacts: number;
  totalConversations: number;
  totalMessages: number;
  activeConversations: number;
  messagesLast24h: number;
  responseTime: number;
  contactsGrowth: number;
  conversationsGrowth: number;
  messagesGrowth: number;
}

// Tipos para Gráficos
export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export interface TimeSeriesData {
  date: string;
  messages: number;
  conversations: number;
  contacts: number;
}

// Tipos para Filtros
export interface ContactFilters {
  search?: string;
  status?: Contact['status'];
  tags?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  page?: number;
  limit?: number;
}

export interface ConversationFilters {
  search?: string;
  status?: Conversation['status'];
  priority?: Conversation['priority'];
  channel?: string;
  tags?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  page?: number;
  limit?: number;
}

export interface MessageFilters {
  search?: string;
  direction?: Message['direction'];
  messageType?: Message['message_type'];
  status?: Message['status'];
  dateRange?: {
    start: string;
    end: string;
  };
  page?: number;
  limit?: number;
}

// Tipos para API Response
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Tipos para Paginação
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Tipos para Notificações
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

// Tipos para Configurações
export interface AppConfig {
  apiUrl: string;
  wsUrl?: string;
  refreshInterval: number;
  theme: 'light' | 'dark';
  language: 'pt' | 'en';
}

// Tipos para Estados de Loading
export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

// Tipos para Modais
export interface ModalState {
  isOpen: boolean;
  type?: string;
  data?: any;
}

// Utilitários de tipo
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;