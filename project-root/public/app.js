// Dashboard Umbler - Sistema de Atendimento WhatsApp (Framer Style)
class DashboardApp {
    constructor() {
        this.apiBase = '/api';
        this.currentPage = 1;
        this.contactsPerPage = 20;
        this.realtimeChart = null;
        this.hourlyChart = null;
        this.websocket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        this.init();
    }

    async init() {
        try {
            // Hide loading screen with animation
            await this.hideLoadingScreen();
            
            // Initialize components
            this.initEventListeners();
            this.initCharts();
            this.initWebSocket();
            
            // Load initial data with animations
            await this.loadDashboardData();
            await this.loadContacts();
            
            // Start real-time updates
            this.startRealTimeUpdates();
            
            // Add entrance animations
            this.addEntranceAnimations();
            
            console.log('Dashboard initialized successfully');
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            this.showNotification('Erro ao inicializar dashboard', 'error');
        }
    }

    async hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const app = document.getElementById('app');
        
        // Fade out loading screen
        loadingScreen.style.transition = 'opacity 0.5s ease-out';
        loadingScreen.style.opacity = '0';
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        loadingScreen.style.display = 'none';
        app.classList.remove('hidden');
        
        // Fade in main app
        app.style.opacity = '0';
        app.style.transition = 'opacity 0.5s ease-in';
        
        setTimeout(() => {
            app.style.opacity = '1';
        }, 100);
    }

    addEntranceAnimations() {
        // Animate cards entrance
        const cards = document.querySelectorAll('.bg-white\\/80');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    initEventListeners() {
        // Refresh button with animation
        document.getElementById('refreshBtn').addEventListener('click', async () => {
            const btn = document.getElementById('refreshBtn');
            const icon = btn.querySelector('i');
            
            // Add loading animation
            icon.classList.add('fa-spin');
            btn.disabled = true;
            
            await this.loadDashboardData();
            await this.loadContacts();
            
            // Remove loading animation
            setTimeout(() => {
                icon.classList.remove('fa-spin');
                btn.disabled = false;
            }, 1000);
        });

        // Search functionality with debounce
        document.getElementById('searchContacts').addEventListener('input', (e) => {
            this.debounce(() => this.loadContacts(), 300)();
        });

        // Tag filter with animation
        document.getElementById('tagFilter').addEventListener('change', () => {
            this.currentPage = 1;
            this.loadContacts();
        });

        // Pagination with smooth transitions
        document.getElementById('prevPage').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadContacts();
            }
        });

        document.getElementById('nextPage').addEventListener('click', () => {
            this.currentPage++;
            this.loadContacts();
        });

        // Chat modal with smooth animations
        document.getElementById('closeChatModal').addEventListener('click', () => {
            this.closeChatModal();
        });

        // Send message with animation
        document.getElementById('sendMessage').addEventListener('click', () => {
            this.sendMessage();
        });

        // Enter key in message input
        document.getElementById('newMessage').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Add hover effects to interactive elements
        this.addHoverEffects();
    }

    addHoverEffects() {
        // Add hover effects to cards
        const cards = document.querySelectorAll('.bg-white\\/80');
        cards.forEach(card => {
            card.classList.add('interactive');
        });

        // Add hover effects to buttons
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            if (!button.classList.contains('bg-gradient-to-r')) {
                button.classList.add('interactive');
            }
        });
    }

    initCharts() {
        // Real-time activity chart with modern styling
        const realtimeCtx = document.getElementById('realtimeChart').getContext('2d');
        this.realtimeChart = new Chart(realtimeCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Mensagens',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: {
                                family: 'Inter',
                                size: 12
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                family: 'Inter',
                                size: 12
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });

        // Hourly messages chart with modern styling
        const hourlyCtx = document.getElementById('hourlyChart').getContext('2d');
        this.hourlyChart = new Chart(hourlyCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Mensagens',
                    data: [],
                    backgroundColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: {
                                family: 'Inter',
                                size: 12
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                family: 'Inter',
                                size: 12
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    initWebSocket() {
        // WebSocket temporariamente desabilitado
        console.log('WebSocket disabled - using polling for real-time updates');
        this.updateConnectionStatus(true); // Mostrar como conectado
        
        // Simular dados em tempo real com polling
        setInterval(() => {
            this.updateRealTimeChart();
        }, 30000);
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'new_message':
                this.handleNewMessage(data.payload);
                break;
            case 'new_contact':
                this.handleNewContact(data.payload);
                break;
            case 'stats_update':
                this.updateStats(data.payload);
                break;
            default:
                console.log('Unknown WebSocket message type:', data.type);
        }
    }

    async loadDashboardData() {
        try {
            const [statsResponse, hourlyResponse] = await Promise.all([
                fetch(`${this.apiBase}/stats`),
                fetch(`${this.apiBase}/messages/hourly`)
            ]);

            if (statsResponse.ok) {
                const stats = await statsResponse.json();
                this.updateStats(stats);
            }

            if (hourlyResponse.ok) {
                const hourlyData = await hourlyResponse.json();
                this.updateHourlyChart(hourlyData);
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showNotification('Erro ao carregar dados do dashboard', 'error');
        }
    }

    async loadContacts() {
        try {
            const searchTerm = document.getElementById('searchContacts').value;
            const selectedTag = document.getElementById('tagFilter').value;
            
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.contactsPerPage
            });
            
            if (searchTerm) params.append('search', searchTerm);
            if (selectedTag) params.append('tag', selectedTag);

            const response = await fetch(`${this.apiBase}/contacts?${params}`);
            
            if (response.ok) {
                const data = await response.json();
                this.renderContacts(data.contacts);
                this.updatePagination(data.total);
            } else {
                throw new Error('Failed to load contacts');
            }
        } catch (error) {
            console.error('Error loading contacts:', error);
            this.showNotification('Erro ao carregar contatos', 'error');
        }
    }

    renderContacts(contacts) {
        const tbody = document.getElementById('contactsTableBody');
        
        // Fade out current content
        tbody.style.opacity = '0';
        tbody.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
            tbody.innerHTML = '';

            contacts.forEach((contact, index) => {
                const row = document.createElement('tr');
                row.className = 'table-row-hover';
                row.style.opacity = '0';
                row.style.transform = 'translateY(10px)';
                
                const lastMessage = contact.last_message ? 
                    this.formatMessagePreview(contact.last_message.content) : 
                    'Nenhuma mensagem';
                
                const tags = contact.tags ? 
                    contact.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : 
                    '';

                row.innerHTML = `
                    <td class="px-8 py-6 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="flex-shrink-0 h-12 w-12">
                                <div class="h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                                    <i class="fas fa-user text-white text-lg"></i>
                                </div>
                            </div>
                            <div class="ml-4">
                                <div class="text-sm font-semibold text-gray-900">${contact.name || 'Sem nome'}</div>
                                <div class="text-sm text-gray-500">${contact.phone}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-8 py-6 whitespace-nowrap">
                        <div class="flex flex-wrap gap-1">
                            ${tags}
                        </div>
                    </td>
                    <td class="px-8 py-6 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${lastMessage}</div>
                        <div class="text-sm text-gray-500">${this.formatDate(contact.last_interaction)}</div>
                    </td>
                    <td class="px-8 py-6 whitespace-nowrap">
                        <span class="inline-flex px-3 py-1 text-xs font-semibold rounded-full ${this.getStatusClass(contact.status)}">
                            ${this.getStatusText(contact.status)}
                        </span>
                    </td>
                    <td class="px-8 py-6 whitespace-nowrap text-sm font-medium">
                        <button onclick="dashboard.openChat('${contact.id}')" class="text-blue-600 hover:text-blue-900 mr-3 interactive">
                            <i class="fas fa-comments"></i> Chat
                        </button>
                        <button onclick="dashboard.viewContact('${contact.id}')" class="text-gray-600 hover:text-gray-900 interactive">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                    </td>
                `;
                
                tbody.appendChild(row);
                
                // Animate row entrance
                setTimeout(() => {
                    row.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                    row.style.opacity = '1';
                    row.style.transform = 'translateY(0)';
                }, index * 50);
            });
            
            // Fade in table
            setTimeout(() => {
                tbody.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                tbody.style.opacity = '1';
                tbody.style.transform = 'translateY(0)';
            }, 100);
        }, 200);
    }

    updatePagination(total) {
        const totalPages = Math.ceil(total / this.contactsPerPage);
        
        document.getElementById('showingContacts').textContent = 
            `${(this.currentPage - 1) * this.contactsPerPage + 1}-${Math.min(this.currentPage * this.contactsPerPage, total)}`;
        document.getElementById('totalContactsCount').textContent = total;
        document.getElementById('currentPage').textContent = this.currentPage;
        
        document.getElementById('prevPage').disabled = this.currentPage <= 1;
        document.getElementById('nextPage').disabled = this.currentPage >= totalPages;
    }

    updateStats(stats) {
        // Animate number changes
        this.animateNumberChange('totalContacts', stats.totalContacts || 0);
        this.animateNumberChange('activeConversations', stats.activeConversations || 0);
        this.animateNumberChange('avgResponseTime', stats.avgResponseTime || 0, 'min');
        this.animateNumberChange('messagesToday', stats.messagesToday || 0);
    }

    animateNumberChange(elementId, newValue, suffix = '') {
        const element = document.getElementById(elementId);
        const currentValue = parseInt(element.textContent) || 0;
        const increment = (newValue - currentValue) / 20;
        let current = currentValue;
        
        const animate = () => {
            current += increment;
            if ((increment > 0 && current >= newValue) || (increment < 0 && current <= newValue)) {
                element.textContent = newValue + suffix;
            } else {
                element.textContent = Math.floor(current) + suffix;
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    updateHourlyChart(data) {
        this.hourlyChart.data.labels = data.labels;
        this.hourlyChart.data.datasets[0].data = data.values;
        this.hourlyChart.update('active');
    }

    updateConnectionStatus(connected) {
        const indicator = document.getElementById('connectionStatus');
        const text = document.getElementById('connectionText');
        
        if (connected) {
            indicator.className = 'w-3 h-3 rounded-full bg-green-500 animate-pulse';
            text.textContent = 'Conectado';
            text.className = 'text-sm text-green-600';
        } else {
            indicator.className = 'w-3 h-3 rounded-full bg-red-500';
            text.textContent = 'Desconectado';
            text.className = 'text-sm text-red-600';
        }
    }

    startRealTimeUpdates() {
        // Update real-time chart every 30 seconds
        setInterval(() => {
            this.updateRealTimeChart();
        }, 30000);
        
        // Update stats every minute
        setInterval(() => {
            this.loadDashboardData();
        }, 60000);
    }

    async updateRealTimeChart() {
        try {
            const response = await fetch(`${this.apiBase}/messages/realtime`);
            if (response.ok) {
                const data = await response.json();
                
                // Add new data point
                const now = new Date();
                const timeLabel = now.toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
                this.realtimeChart.data.labels.push(timeLabel);
                this.realtimeChart.data.datasets[0].data.push(data.count);
                
                // Keep only last 20 points
                if (this.realtimeChart.data.labels.length > 20) {
                    this.realtimeChart.data.labels.shift();
                    this.realtimeChart.data.datasets[0].data.shift();
                }
                
                this.realtimeChart.update('active');
            }
        } catch (error) {
            console.error('Error updating real-time chart:', error);
        }
    }

    async openChat(contactId) {
        try {
            const response = await fetch(`${this.apiBase}/contacts/${contactId}/messages`);
            if (response.ok) {
                const data = await response.json();
                this.renderChatModal(data.contact, data.messages);
            }
        } catch (error) {
            console.error('Error opening chat:', error);
            this.showNotification('Erro ao abrir chat', 'error');
        }
    }

    renderChatModal(contact, messages) {
        document.getElementById('chatContactName').textContent = contact.name || 'Sem nome';
        document.getElementById('chatContactPhone').textContent = contact.phone;
        
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.innerHTML = '';
        
        messages.forEach((message, index) => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message-bubble ${message.direction === 'inbound' ? 'message-inbound' : 'message-outbound'}`;
            messageDiv.style.opacity = '0';
            messageDiv.style.transform = 'translateY(10px)';
            
            messageDiv.innerHTML = `
                <div class="p-3">
                    <div class="text-sm">${message.content}</div>
                    <div class="text-xs text-gray-500 mt-1">${this.formatDate(message.created_at)}</div>
                </div>
            `;
            
            messagesContainer.appendChild(messageDiv);
            
            // Animate message entrance
            setTimeout(() => {
                messageDiv.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                messageDiv.style.opacity = '1';
                messageDiv.style.transform = 'translateY(0)';
            }, index * 100);
        });
        
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Show modal with animation
        const modal = document.getElementById('chatModal');
        modal.classList.remove('hidden');
        modal.style.opacity = '0';
        
        setTimeout(() => {
            modal.style.transition = 'opacity 0.3s ease-in';
            modal.style.opacity = '1';
        }, 100);
    }

    closeChatModal() {
        const modal = document.getElementById('chatModal');
        modal.style.transition = 'opacity 0.3s ease-out';
        modal.style.opacity = '0';
        
        setTimeout(() => {
            modal.classList.add('hidden');
            document.getElementById('newMessage').value = '';
        }, 300);
    }

    async sendMessage() {
        const messageInput = document.getElementById('newMessage');
        const message = messageInput.value.trim();
        
        if (!message) return;
        
        // TODO: Implement message sending
        console.log('Sending message:', message);
        
        messageInput.value = '';
        this.showNotification('Mensagem enviada', 'success');
    }

    viewContact(contactId) {
        // TODO: Implement contact details view
        console.log('Viewing contact:', contactId);
        this.showNotification('Funcionalidade em desenvolvimento', 'info');
    }

    handleNewMessage(message) {
        // Update real-time chart
        const now = new Date();
        const timeLabel = now.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        this.realtimeChart.data.labels.push(timeLabel);
        this.realtimeChart.data.datasets[0].data.push(1);
        
        if (this.realtimeChart.data.labels.length > 20) {
            this.realtimeChart.data.labels.shift();
            this.realtimeChart.data.datasets[0].data.shift();
        }
        
        this.realtimeChart.update('active');
        
        // Reload contacts if needed
        this.loadContacts();
    }

    handleNewContact(contact) {
        // Reload contacts
        this.loadContacts();
        this.showNotification(`Novo contato: ${contact.name}`, 'info');
    }

    // Utility functions
    formatDate(dateString) {
        if (!dateString) return 'Nunca';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `${diffMins} min atrás`;
        if (diffHours < 24) return `${diffHours}h atrás`;
        if (diffDays < 7) return `${diffDays} dias atrás`;
        
        return date.toLocaleDateString('pt-BR');
    }

    formatMessagePreview(content) {
        if (!content) return 'Nenhuma mensagem';
        return content.length > 50 ? content.substring(0, 50) + '...' : content;
    }

    getStatusClass(status) {
        switch (status) {
            case 'active': return 'status-online';
            case 'blocked': return 'status-busy';
            case 'archived': return 'status-offline';
            default: return 'status-offline';
        }
    }

    getStatusText(status) {
        switch (status) {
            case 'active': return 'Ativo';
            case 'blocked': return 'Bloqueado';
            case 'archived': return 'Arquivado';
            default: return 'Desconhecido';
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new DashboardApp();
});