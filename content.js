// Gmail AI Assistant Content Script
let chatWidget = null;
let taskDialog = null;
let isInitialized = false;

// Initialize the extension when Gmail loads
function initializeExtension() {
    if (isInitialized) return;
    
    // Wait for Gmail to fully load
    const checkGmailLoaded = setInterval(() => {
        if (document.querySelector('[data-test-id="main-content"]') || 
            document.querySelector('.nH') || 
            document.querySelector('#gb')) {
            clearInterval(checkGmailLoaded);
            createFloatingIcon();
            isInitialized = true;
        }
    }, 1000);
}

// Create floating AI assistant icon
function createFloatingIcon() {
    const floatingIcon = document.createElement('div');
    floatingIcon.id = 'gmail-ai-floating-icon';
    floatingIcon.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" stroke-width="2" stroke-linejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="white" stroke-width="2" stroke-linejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="white" stroke-width="2" stroke-linejoin="round"/>
        </svg>
    `;
    
    floatingIcon.style.cssText = `
        position: fixed;
        top: 50%;
        right: 20px;
        width: 50px;
        height: 50px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 10000;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        transition: all 0.3s ease;
        transform: translateY(-50%);
    `;
    
    floatingIcon.addEventListener('mouseenter', () => {
        floatingIcon.style.transform = 'translateY(-50%) scale(1.1)';
        floatingIcon.style.boxShadow = '0 6px 25px rgba(0,0,0,0.2)';
    });
    
    floatingIcon.addEventListener('mouseleave', () => {
        floatingIcon.style.transform = 'translateY(-50%) scale(1)';
        floatingIcon.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
    });
    
    floatingIcon.addEventListener('click', toggleChatWidget);
    
    document.body.appendChild(floatingIcon);
}

// Create chat widget
function createChatWidget() {
    const chatContainer = document.createElement('div');
    chatContainer.id = 'gmail-ai-chat-widget';
    chatContainer.innerHTML = `
        <div class="chat-header">
            <h3>AI Assistant</h3>
            <div class="chat-controls">
                <button id="task-list-btn" class="control-btn">Tasks</button>
                <button id="close-chat-btn" class="control-btn">×</button>
            </div>
        </div>
        <div class="chat-messages" id="chat-messages">
            <div class="message bot-message">
                <div class="message-content">
                    Hello! I'm your Gmail AI assistant. How can I help you today?
                </div>
            </div>
        </div>
        <div class="chat-input-container">
            <input type="text" id="chat-input" placeholder="Ask me anything about your emails..." />
            <button id="send-btn">Send</button>
        </div>
    `;
    
    chatContainer.style.cssText = `
        position: fixed;
        top: 50%;
        right: 80px;
        width: 350px;
        height: 500px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        z-index: 10001;
        display: flex;
        flex-direction: column;
        transform: translateY(-50%);
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;
    
    document.body.appendChild(chatContainer);
    
    // Add event listeners
    document.getElementById('close-chat-btn').addEventListener('click', toggleChatWidget);
    document.getElementById('task-list-btn').addEventListener('click', openTaskDialog);
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    return chatContainer;
}

// Toggle chat widget visibility
function toggleChatWidget() {
    if (!chatWidget) {
        chatWidget = createChatWidget();
    } else {
        chatWidget.style.display = chatWidget.style.display === 'none' ? 'flex' : 'none';
    }
}

// Send message to AI
async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addMessageToChat(message, 'user');
    input.value = '';
    
    // Show typing indicator
    const typingIndicator = addMessageToChat('AI is thinking...', 'bot', true);
    
    try {
        // Get Google token
        const result = await chrome.storage.local.get(['googleToken']);
        if (!result.googleToken) {
            throw new Error('Please authorize Google access first');
        }
        
        // Send to n8n webhook
        const response = await fetch('https://your-n8n-domain.com/webhook/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                token: result.googleToken,
                context: 'gmail'
            })
        });
        
        const data = await response.json();
        
        // Remove typing indicator
        typingIndicator.remove();
        
        // Add AI response
        addMessageToChat(data.response || 'I received your message!', 'bot');
        
    } catch (error) {
        // Remove typing indicator
        typingIndicator.remove();
        
        // Add error message
        addMessageToChat('Sorry, I encountered an error. Please try again.', 'bot');
        console.error('Chat error:', error);
    }
}

// Add message to chat
function addMessageToChat(message, sender, isTemporary = false) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    if (isTemporary) messageDiv.classList.add('temporary');
    
    messageDiv.innerHTML = `<div class="message-content">${message}</div>`;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return messageDiv;
}

// Open task dialog
function openTaskDialog() {
    if (taskDialog) {
        taskDialog.style.display = 'flex';
        return;
    }
    
    const dialog = document.createElement('div');
    dialog.id = 'task-dialog';
    dialog.innerHTML = `
        <div class="dialog-overlay">
            <div class="dialog-content">
                <div class="dialog-header">
                    <h3>Task List</h3>
                    <button id="close-task-dialog">×</button>
                </div>
                <div class="dialog-body">
                    <div class="task-input-container">
                        <input type="text" id="new-task-input" placeholder="Add a new task..." />
                        <button id="add-task-btn">Add</button>
                    </div>
                    <div id="task-list" class="task-list">
                        <div class="task-item">
                            <input type="checkbox" id="task-1" />
                            <label for="task-1">Review important emails</label>
                        </div>
                        <div class="task-item">
                            <input type="checkbox" id="task-2" />
                            <label for="task-2">Follow up with client</label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10002;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    document.body.appendChild(dialog);
    taskDialog = dialog;
    
    // Add event listeners
    document.getElementById('close-task-dialog').addEventListener('click', () => {
        taskDialog.style.display = 'none';
    });
    
    document.getElementById('add-task-btn').addEventListener('click', addNewTask);
    document.getElementById('new-task-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addNewTask();
    });
}

// Add new task
function addNewTask() {
    const input = document.getElementById('new-task-input');
    const taskText = input.value.trim();
    
    if (!taskText) return;
    
    const taskList = document.getElementById('task-list');
    const taskId = 'task-' + Date.now();
    
    const taskItem = document.createElement('div');
    taskItem.className = 'task-item';
    taskItem.innerHTML = `
        <input type="checkbox" id="${taskId}" />
        <label for="${taskId}">${taskText}</label>
    `;
    
    taskList.appendChild(taskItem);
    input.value = '';
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleChat') {
        toggleChatWidget();
    }
    return true;
});

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
    initializeExtension();
}

// Also initialize on navigation changes (Gmail is a SPA)
const observer = new MutationObserver(() => {
    if (!isInitialized && window.location.href.includes('mail.google.com')) {
        initializeExtension();
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
