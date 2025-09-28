// Demo functionality for Sa.AI Gmail Assistant

class SaAIDemo {
    constructor() {
        this.isConnected = false;
        this.sidebarOpen = false;
        this.isTyping = false;
        this.messageHistory = [];
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadInitialState();
    }

    bindEvents() {
        // FAB button
        const fabBtn = document.getElementById('fabBtn');
        fabBtn?.addEventListener('click', () => this.showPopup());

        // Popup events
        const popupClose = document.getElementById('popupClose');
        popupClose?.addEventListener('click', () => this.hidePopup());

        const connectBtn = document.getElementById('connectBtn');
        connectBtn?.addEventListener('click', () => this.handleConnect());

        const openAssistantBtn = document.getElementById('openAssistantBtn');
        openAssistantBtn?.addEventListener('click', () => this.openAssistant());

        // Sidebar events
        const closeSidebar = document.getElementById('closeSidebar');
        closeSidebar?.addEventListener('click', () => this.closeSidebar());

        // Chat events
        const chatInput = document.getElementById('chatInput');
        const sendBtn = document.getElementById('sendBtn');
        const voiceBtn = document.getElementById('voiceBtn');

        chatInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        sendBtn?.addEventListener('click', () => this.sendMessage());
        voiceBtn?.addEventListener('click', () => this.toggleVoice());

        // Quick actions
        const quickActionBtns = document.querySelectorAll('.quick-action-btn');
        quickActionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.handleQuickAction(action);
            });
        });

        // Suggestion chips
        const suggestionChips = document.querySelectorAll('.suggestion-chip');
        suggestionChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const suggestion = chip.dataset.suggestion;
                this.sendSuggestion(suggestion);
            });
        });

        // Close popup on overlay click
        const popupOverlay = document.getElementById('popupOverlay');
        popupOverlay?.addEventListener('click', (e) => {
            if (e.target === popupOverlay) {
                this.hidePopup();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'k':
                        e.preventDefault();
                        this.showPopup();
                        break;
                    case 'j':
                        e.preventDefault();
                        if (this.isConnected) {
                            this.toggleSidebar();
                        }
                        break;
                }
            }
            
            if (e.key === 'Escape') {
                if (this.sidebarOpen) {
                    this.closeSidebar();
                } else {
                    this.hidePopup();
                }
            }
        });
    }

    loadInitialState() {
        // Simulate checking connection status
        const stored = localStorage.getItem('saai-connected');
        if (stored === 'true') {
            this.isConnected = true;
            this.updateConnectionStatus();
        }
    }

    showPopup() {
        const popup = document.getElementById('popupOverlay');
        popup?.classList.add('show');
        
        // Focus management
        setTimeout(() => {
            const connectBtn = document.getElementById('connectBtn');
            connectBtn?.focus();
        }, 300);
    }

    hidePopup() {
        const popup = document.getElementById('popupOverlay');
        popup?.classList.remove('show');
    }

    async handleConnect() {
        const connectBtn = document.getElementById('connectBtn');
        const connectionStep = document.getElementById('connectionStep');
        const successStep = document.getElementById('successStep');

        // Show loading state
        connectBtn.innerHTML = '<div class="loading"></div> Connecting...';
        connectBtn.disabled = true;

        // Simulate OAuth flow
        await this.simulateDelay(2000);

        // Show success
        connectionStep.style.display = 'none';
        successStep.style.display = 'block';
        successStep.classList.add('bounce-in');

        // Update connection status
        this.isConnected = true;
        localStorage.setItem('saai-connected', 'true');
        this.updateConnectionStatus();

        // Auto-close popup after success
        setTimeout(() => {
            this.hidePopup();
        }, 2000);
    }

    updateConnectionStatus() {
        const statusIndicator = document.querySelector('.status-indicator');
        if (this.isConnected) {
            statusIndicator?.classList.add('connected');
            statusIndicator.innerHTML = '<i class="fas fa-check-circle"></i><span>Connected to Gmail</span>';
        }
    }

    openAssistant() {
        this.hidePopup();
        setTimeout(() => {
            this.openSidebar();
        }, 300);
    }

    openSidebar() {
        const sidebar = document.getElementById('saaiSidebar');
        const gmailContent = document.querySelector('.gmail-content');
        
        sidebar?.classList.add('open');
        this.sidebarOpen = true;
        
        // Adjust Gmail content width
        if (gmailContent) {
            gmailContent.style.marginRight = '400px';
        }

        // Focus chat input
        setTimeout(() => {
            const chatInput = document.getElementById('chatInput');
            chatInput?.focus();
        }, 400);

        // Add welcome message if first time
        if (this.messageHistory.length === 0) {
            this.addWelcomeMessage();
        }
    }

    closeSidebar() {
        const sidebar = document.getElementById('saaiSidebar');
        const gmailContent = document.querySelector('.gmail-content');
        
        sidebar?.classList.remove('open');
        this.sidebarOpen = false;
        
        // Reset Gmail content width
        if (gmailContent) {
            gmailContent.style.marginRight = '0';
        }
    }

    toggleSidebar() {
        if (this.sidebarOpen) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    addWelcomeMessage() {
        const welcomeMsg = {
            type: 'ai',
            text: 'Hello! I\'m your Sa.AI assistant. I can help you summarize your inbox, find important emails, extract tasks, and answer questions about your emails. How can I assist you today?',
            timestamp: new Date()
        };
        
        this.messageHistory.push(welcomeMsg);
        this.renderMessage(welcomeMsg);
    }

    async sendMessage() {
        const chatInput = document.getElementById('chatInput');
        const message = chatInput?.value.trim();
        
        if (!message) return;

        // Clear input
        chatInput.value = '';

        // Add user message
        const userMsg = {
            type: 'user',
            text: message,
            timestamp: new Date()
        };
        
        this.messageHistory.push(userMsg);
        this.renderMessage(userMsg);

        // Show typing indicator
        this.showTypingIndicator();

        // Simulate AI response
        await this.simulateDelay(1500);
        this.hideTypingIndicator();

        const aiResponse = this.generateAIResponse(message);
        const aiMsg = {
            type: 'ai',
            text: aiResponse,
            timestamp: new Date()
        };
        
        this.messageHistory.push(aiMsg);
        this.renderMessage(aiMsg);
    }

    sendSuggestion(suggestion) {
        const chatInput = document.getElementById('chatInput');
        chatInput.value = suggestion;
        this.sendMessage();
    }

    renderMessage(message) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.type}-message fade-in`;
        
        const avatarIcon = message.type === 'ai' ? 'fas fa-robot' : 'fas fa-user';
        
        messageEl.innerHTML = `
            <div class="message-avatar">
                <i class="${avatarIcon}"></i>
            </div>
            <div class="message-content">
                <div class="message-text">${message.text}</div>
                <div class="message-time">${this.formatTime(message.timestamp)}</div>
            </div>
        `;

        chatMessages.appendChild(messageEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    showTypingIndicator() {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        const typingEl = document.createElement('div');
        typingEl.className = 'message ai-message typing-message';
        typingEl.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;

        chatMessages.appendChild(typingEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        this.isTyping = true;
    }

    hideTypingIndicator() {
        const typingMessage = document.querySelector('.typing-message');
        typingMessage?.remove();
        this.isTyping = false;
    }

    generateAIResponse(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        
        // Predefined responses based on keywords
        const responses = {
            'hello': 'Hi there! How can I help you with your Gmail today?',
            'hi': 'Hello! I\'m here to assist you with your emails. What would you like to know?',
            'summarize': 'I can see you have 3 unread emails:\n\n📧 **John Smith** - Quarterly Report Review (High Priority)\n📧 **Marketing Team** - New Campaign Performance Data\n📧 **Sarah Johnson** - Meeting Notes from Client Call\n\nWould you like me to provide more details about any of these emails?',
            'inbox': 'Your inbox currently has:\n• 3 unread emails\n• 2 starred messages\n• 1 important email requiring action\n\nThe most recent email is from John Smith about the quarterly report review.',
            'important': 'Here are your most important emails:\n\n⭐ **John Smith** - Quarterly Report Review\n*Action required by Friday*\n\n⭐ **Client Meeting** - Follow-up needed\n*Deadline: Tomorrow*',
            'tasks': 'I found these tasks in your emails:\n\n✅ **Due Friday**: Review Q3 report (John Smith)\n✅ **Due Tomorrow**: Follow up on client meeting\n✅ **This Week**: Respond to campaign performance data\n\nWould you like me to help you prioritize these?',
            'help': 'I can help you with:\n\n📊 **Summarize** your inbox or specific emails\n⭐ **Find important** emails and priorities\n📝 **Extract tasks** and deadlines\n🔍 **Search** for specific emails or topics\n📧 **Compose** email responses\n\nJust ask me anything about your emails!',
            'thread': 'To summarize a specific email thread, please open the thread first, then ask me to summarize it. I can provide detailed summaries including key points, action items, and participant responses.',
            'voice': 'Voice mode is now available! Click the microphone button to speak your questions, and I can also read my responses aloud to you.',
            'settings': 'You can customize my behavior in the settings:\n• Response length (brief/detailed)\n• Notification preferences\n• Voice settings\n• Privacy controls\n\nWould you like me to help you adjust any settings?'
        };

        // Find matching response
        for (const [keyword, response] of Object.entries(responses)) {
            if (lowerMessage.includes(keyword)) {
                return response;
            }
        }

        // Default response
        return `I understand you're asking about "${userMessage}". I'm here to help you manage your Gmail more efficiently! I can summarize emails, find important messages, extract tasks, and much more. What specific aspect of your email management would you like assistance with?`;
    }

    async handleQuickAction(action) {
        const actionMessages = {
            'summarize': 'Let me summarize your inbox for you...',
            'important': 'Finding your most important emails...',
            'tasks': 'Extracting tasks from your emails...'
        };

        // Add user message for the action
        const userMsg = {
            type: 'user',
            text: actionMessages[action],
            timestamp: new Date()
        };
        
        this.messageHistory.push(userMsg);
        this.renderMessage(userMsg);

        // Show typing and generate response
        this.showTypingIndicator();
        await this.simulateDelay(1500);
        this.hideTypingIndicator();

        const response = this.generateAIResponse(action);
        const aiMsg = {
            type: 'ai',
            text: response,
            timestamp: new Date()
        };
        
        this.messageHistory.push(aiMsg);
        this.renderMessage(aiMsg);
    }

    toggleVoice() {
        const voiceBtn = document.getElementById('voiceBtn');
        const isListening = voiceBtn?.classList.contains('listening');
        
        if (isListening) {
            voiceBtn.classList.remove('listening');
            voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            this.stopVoiceRecognition();
        } else {
            voiceBtn?.classList.add('listening');
            voiceBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
            this.startVoiceRecognition();
        }
    }

    startVoiceRecognition() {
        // Simulate voice recognition
        const chatInput = document.getElementById('chatInput');
        chatInput.placeholder = 'Listening... Speak now';
        
        setTimeout(() => {
            chatInput.value = 'Summarize my inbox';
            chatInput.placeholder = 'Ask me about your emails...';
            this.toggleVoice();
        }, 3000);
    }

    stopVoiceRecognition() {
        const chatInput = document.getElementById('chatInput');
        chatInput.placeholder = 'Ask me about your emails...';
    }

    formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    simulateDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the demo when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SaAIDemo();
    
    // Add some demo interactions
    setTimeout(() => {
        console.log('Sa.AI Gmail Assistant Demo loaded successfully!');
        console.log('Try these keyboard shortcuts:');
        console.log('• Ctrl/Cmd + K: Open connection popup');
        console.log('• Ctrl/Cmd + J: Toggle assistant sidebar');
        console.log('• Escape: Close sidebar or popup');
    }, 1000);
});

// Add some demo email interactions
document.addEventListener('DOMContentLoaded', () => {
    const emailItems = document.querySelectorAll('.email-item');
    
    emailItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all items
            emailItems.forEach(i => i.classList.remove('active'));
            // Add active class to clicked item
            item.classList.add('active');
            
            // Simulate opening email thread
            const sender = item.querySelector('.email-sender').textContent;
            const subject = item.querySelector('.subject-text').textContent;
            
            console.log(`Opened email from ${sender}: ${subject}`);
            
            // If sidebar is open, suggest thread summarization
            const sidebar = document.getElementById('saaiSidebar');
            if (sidebar?.classList.contains('open')) {
                setTimeout(() => {
                    const suggestion = `Summarize the email thread: "${subject}"`;
                    const chatInput = document.getElementById('chatInput');
                    if (chatInput) {
                        chatInput.placeholder = `Try: "${suggestion}"`;
                    }
                }, 500);
            }
        });
    });
});

// Add CSS for active email state
const style = document.createElement('style');
style.textContent = `
    .email-item.active {
        background: #eff6ff !important;
        border-left: 4px solid #3b82f6 !important;
    }
    
    .voice-btn.listening {
        background: #ef4444 !important;
        animation: pulse 1s infinite;
    }
    
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);