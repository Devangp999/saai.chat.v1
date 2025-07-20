// Sa.AI Gmail Assistant Content Script
// Complete rewrite for seamless Gmail integration

const SIDEBAR_WIDTH = 320;
const SIDEBAR_ID = 'saai-gmail-sidebar';
const CHAT_AREA_ID = 'saai-chat-area';

let isInitialized = false;
let isSidebarOpen = false;
let sidebarElement = null;

// === CORE INITIALIZATION ===

async function initialize() {
  if (isInitialized) return;
  
  console.log('[SaAI] Initializing Sa.AI Gmail Assistant');
  
  try {
    // Wait for Gmail to be fully loaded
    await waitForGmailReady();
    
    // Set up message listeners
    setupMessageListeners();
    
    // Set up storage change listeners
    setupStorageListeners();
    
    // Check if sidebar should be open from previous session
    const { sidebarOpen } = await chrome.storage.local.get(['sidebarOpen']);
    if (sidebarOpen) {
      await openSidebar();
    }
    
    isInitialized = true;
    console.log('[SaAI] Initialization complete');
    
  } catch (error) {
    console.error('[SaAI] Initialization failed:', error);
  }
}

async function waitForGmailReady() {
  return new Promise((resolve) => {
    const checkGmail = () => {
      // Check if Gmail's main containers are present
      const gmailContainer = document.querySelector('.nH, .AO, [role="main"]');
      if (gmailContainer) {
        resolve();
      } else {
        setTimeout(checkGmail, 100);
      }
    };
    checkGmail();
  });
}

function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[SaAI] Message received:', request);
    
    switch (request.action) {
      case 'ping':
        sendResponse({ status: 'ready' });
        break;
        
      case 'open_saai':
        toggleSidebar().then(() => {
          sendResponse({ success: true });
        }).catch(error => {
          sendResponse({ success: false, error: error.message });
        });
        return true; // Keep message channel open for async response
        
      case 'checkInitialization':
        sendResponse({ initialized: isInitialized });
        break;
    }
  });
}

function setupStorageListeners() {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      if (changes.isConnected) {
        console.log('[SaAI] Connection status changed:', changes.isConnected.newValue);
        if (isSidebarOpen) {
          updateSidebarContent();
        }
      }
    }
  });
}

// === SIDEBAR MANAGEMENT ===

async function toggleSidebar() {
  console.log('[SaAI] Toggle sidebar called, current state:', isSidebarOpen);
  
  if (isSidebarOpen) {
    await closeSidebar();
  } else {
    await openSidebar();
  }
}

async function openSidebar() {
  if (isSidebarOpen) return;
  
  console.log('[SaAI] Opening sidebar');
  
  try {
    // Create and inject sidebar
    await createSidebar();
    
    // Adjust Gmail layout
    adjustGmailLayout(true);
    
    // Update state
    isSidebarOpen = true;
    await chrome.storage.local.set({ sidebarOpen: true });
    
    console.log('[SaAI] Sidebar opened successfully');
    
  } catch (error) {
    console.error('[SaAI] Failed to open sidebar:', error);
    throw error;
  }
}

async function closeSidebar() {
  if (!isSidebarOpen) return;
  
  console.log('[SaAI] Closing sidebar');
  
  try {
    // Remove sidebar element
    if (sidebarElement) {
      sidebarElement.remove();
      sidebarElement = null;
    }
    
    // Restore Gmail layout
    adjustGmailLayout(false);
    
    // Clean up flex container if no sidebar is open
    const flexContainer = document.querySelector('.saai-flex-container');
    if (flexContainer) {
      // Move all children back to .nH
      const gmailMainWrapper = document.querySelector('.nH');
      if (gmailMainWrapper) {
        while (flexContainer.firstChild) {
          gmailMainWrapper.appendChild(flexContainer.firstChild);
        }
        flexContainer.remove();
      }
    }
    
    // Update state
    isSidebarOpen = false;
    await chrome.storage.local.set({ sidebarOpen: false });
    
    console.log('[SaAI] Sidebar closed successfully');
    
  } catch (error) {
    console.error('[SaAI] Failed to close sidebar:', error);
    throw error;
  }
}

async function createSidebar() {
  // Check connection status
  const isConnected = await isGmailConnected();
  
  // Find Gmail's main wrapper container (.nH)
  const gmailMainWrapper = document.querySelector('.nH');
  
  if (!gmailMainWrapper) {
    console.error('[SaAI] Could not find Gmail main wrapper (.nH)');
    return;
  }
  
  // Check if we already have a flex container
  let flexContainer = gmailMainWrapper.querySelector('.saai-flex-container');
  
  if (!flexContainer) {
    // Create flex container to hold Gmail content and sidebar
    flexContainer = document.createElement('div');
    flexContainer.className = 'saai-flex-container';
    flexContainer.style.cssText = `
      display: flex !important;
      width: 100% !important;
      height: 100vh !important;
      position: relative !important;
      box-sizing: border-box !important;
      margin: 0 !important;
      padding: 0 !important;
      gap: 0 !important;
    `;
    
    // Move all existing children of .nH into the flex container
    while (gmailMainWrapper.firstChild) {
      flexContainer.appendChild(gmailMainWrapper.firstChild);
    }
    
    // Add flex container back to .nH
    gmailMainWrapper.appendChild(flexContainer);
  }
  
  // Create sidebar container
  sidebarElement = document.createElement('div');
  sidebarElement.id = SIDEBAR_ID;
  sidebarElement.className = 'saai-sidebar';
  
  // Set content based on connection status
  if (isConnected) {
    sidebarElement.innerHTML = createWelcomePageHTML();
  } else {
    sidebarElement.innerHTML = createConnectPromptHTML();
  }
  
  // Add sidebar to flex container
  flexContainer.appendChild(sidebarElement);
  
  // Add event listeners
  addSidebarEventListeners(sidebarElement, isConnected);
  
  // Add CSS class to body
  document.body.classList.add('saai-sidebar-open');
}

function adjustGmailLayout(sidebarOpen) {
  console.log('[SaAI] Adjusting Gmail layout, sidebar open:', sidebarOpen);
  
  // Find the flex container
  const flexContainer = document.querySelector('.saai-flex-container');
  if (!flexContainer) {
    console.log('[SaAI] No flex container found, layout adjustment not needed');
    return;
  }
  
  // Get all direct children of the flex container (Gmail content + sidebar)
  const flexChildren = Array.from(flexContainer.children);
  
  flexChildren.forEach(child => {
    if (child.id === SIDEBAR_ID) {
      // This is our sidebar - keep it as is
      return;
    }
    
    // This is Gmail content - adjust its flex properties
    if (sidebarOpen) {
      // When sidebar is open, make Gmail content take remaining space
      child.style.flex = `1 1 calc(100vw - ${SIDEBAR_WIDTH}px) !important`;
      child.style.width = `calc(100vw - ${SIDEBAR_WIDTH}px) !important`;
      child.style.maxWidth = `calc(100vw - ${SIDEBAR_WIDTH}px) !important`;
      child.style.minWidth = `calc(100vw - ${SIDEBAR_WIDTH}px) !important`;
      child.style.boxSizing = 'border-box !important';
      child.style.overflow = 'hidden !important';
    } else {
      // When sidebar is closed, restore full width
      child.style.flex = '1 1 100vw !important';
      child.style.width = '100vw !important';
      child.style.maxWidth = '100vw !important';
      child.style.minWidth = '100vw !important';
      child.style.boxSizing = 'border-box !important';
      child.style.overflow = 'auto !important';
    }
  });
  
  // Prevent horizontal scrolling when sidebar is open
  if (sidebarOpen) {
    document.body.style.overflowX = 'hidden !important';
    document.documentElement.style.overflowX = 'hidden !important';
  } else {
    document.body.style.overflowX = 'auto !important';
    document.documentElement.style.overflowX = 'auto !important';
  }
}

// === UI COMPONENTS ===

function createChatInterfaceHTML() {
  return `
    <div class="saai-header">
      <span class="saai-title">Sa.AI Assistant</span>
      <div class="saai-header-actions">
        <button id="task-list-btn" class="saai-task-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9,11 12,14 22,4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          Tasks
        </button>
        <button id="close-sidebar" class="saai-close-btn" title="Close">×</button>
      </div>
    </div>
    <div id="${CHAT_AREA_ID}" class="chat-area">
      <div class="chat-welcome">
        <div class="chat-welcome-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <h3 class="chat-welcome-title">Hi! I'm your Gmail assistant</h3>
        <p class="chat-welcome-subtitle">How can I help you today?</p>
      </div>
    </div>
    <div class="chat-input-container">
      <input type="text" id="chat-input" placeholder="Ask me anything about your emails..." />
      <button id="send-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22,2 15,22 11,13 2,9 22,2"/>
        </svg>
      </button>
    </div>
  `;
}

function createConnectPromptHTML() {
  return `
    <div class="saai-header">
      <span class="saai-title">Sa.AI Assistant</span>
      <button id="close-sidebar" class="saai-close-btn" title="Close">×</button>
    </div>
    <div class="saai-connect-content">
      <div class="saai-connect-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3l1.912 5.813a2 2 0 0 0 1.088 1.088L21 12l-5.813 1.912a2 2 0 0 0-1.088 1.088L12 21l-1.912-5.813a2 2 0 0 0-1.088-1.088L3 12l5.813-1.912a2 2 0 0 0 1.088-1.088L12 3z"/>
        </svg>
      </div>
      
      <h2 class="saai-connect-heading">Welcome to Sa.AI</h2>
      
      <p class="saai-connect-description">
        Your intelligent Gmail assistant is ready to help you manage your inbox more efficiently.
      </p>

      <div class="saai-features">
        <div class="saai-feature-card">
          <div class="saai-feature-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <div class="saai-feature-content">
            <h4 class="saai-feature-title">Inbox Summarization</h4>
            <p class="saai-feature-description">Get instant summaries of your important emails</p>
          </div>
        </div>
        
        <div class="saai-feature-card">
          <div class="saai-feature-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3l1.912 5.813a2 2 0 0 0 1.088 1.088L21 12l-5.813 1.912a2 2 0 0 0-1.088 1.088L12 21l-1.912-5.813a2 2 0 0 0-1.088-1.088L3 12l5.813-1.912a2 2 0 0 0 1.088-1.088L12 3z"/>
            </svg>
          </div>
          <div class="saai-feature-content">
            <h4 class="saai-feature-title">Task Extraction</h4>
            <p class="saai-feature-description">Automatically extract tasks and action items</p>
          </div>
        </div>
        
        <div class="saai-feature-card">
          <div class="saai-feature-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </div>
          <div class="saai-feature-content">
            <h4 class="saai-feature-title">Smart Drafting</h4>
            <p class="saai-feature-description">AI-powered email composition assistance</p>
          </div>
        </div>
      </div>

      <button id="saai-connect-btn" class="saai-connect-button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
        Connect Gmail Account
      </button>
      
      <p class="saai-disclaimer">
        We'll need access to your Gmail to provide personalized assistance
      </p>
    </div>
  `;
}

function createWelcomePageHTML() {
  return `
    <div class="saai-header">
      <span class="saai-title">Sa.AI Assistant</span>
      <button id="close-sidebar" class="saai-close-btn" title="Close">×</button>
    </div>
    <div class="saai-welcome-content">
      <div class="saai-welcome-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3l1.912 5.813a2 2 0 0 0 1.088 1.088L21 12l-5.813 1.912a2 2 0 0 0-1.088 1.088L12 21l-1.912-5.813a2 2 0 0 0-1.088-1.088L3 12l5.813-1.912a2 2 0 0 0 1.088-1.088L12 3z"/>
        </svg>
      </div>
      
      <h2 class="saai-welcome-heading">Let's start!</h2>
      
      <p class="saai-welcome-description">
        Your Gmail is now connected. I'm ready to help you manage your inbox more efficiently.
      </p>

      <div class="saai-welcome-features">
        <div class="saai-welcome-feature">
          <div class="saai-welcome-feature-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <span>Get instant inbox summaries</span>
        </div>
        
        <div class="saai-welcome-feature">
          <div class="saai-welcome-feature-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9,11 12,14 22,4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          <span>Extract tasks automatically</span>
        </div>
        
        <div class="saai-welcome-feature">
          <div class="saai-welcome-feature-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <span>Smart email assistance</span>
        </div>
      </div>

      <button id="saai-start-btn" class="saai-start-button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        Start Chatting
      </button>
    </div>
  `;
}

function addSidebarEventListeners(sidebar, isConnected) {
  // Close button
  const closeBtn = sidebar.querySelector('#close-sidebar');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      console.log('[SaAI] Close button clicked');
      closeSidebar();
    });
  }
  
  if (isConnected) {
    // Check if this is the welcome page or chat interface
    const startBtn = sidebar.querySelector('#saai-start-btn');
    if (startBtn) {
      // This is the welcome page - add start button listener
      startBtn.addEventListener('click', () => {
        console.log('[SaAI] Start button clicked');
        showChatInterface();
      });
    } else {
      // This is the chat interface - add chat listeners
      // Send button
      const sendBtn = sidebar.querySelector('#send-btn');
      if (sendBtn) {
        sendBtn.addEventListener('click', handleSendMessage);
      }
      
      // Chat input
      const chatInput = sidebar.querySelector('#chat-input');
      if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            handleSendMessage();
          }
        });
        chatInput.focus();
      }
      
      // Task list button
      const taskListBtn = sidebar.querySelector('#task-list-btn');
      if (taskListBtn) {
        taskListBtn.addEventListener('click', () => {
          showTaskModal();
        });
      }
      
      // Inject suggestions
      setTimeout(() => {
        injectSuggestions();
      }, 100);
    }
  } else {
    // Connect button
    const connectBtn = sidebar.querySelector('#saai-connect-btn');
    if (connectBtn) {
      connectBtn.addEventListener('click', () => {
        console.log('[SaAI] Connect Gmail button clicked');
        startOAuthFlow();
      });
    }
    
    // Debug button
    const debugBtn = sidebar.querySelector('#saai-debug-btn');
    if (debugBtn) {
      debugBtn.addEventListener('click', async () => {
        console.log('[SaAI] Debug button clicked');
        const debugInfo = await debugConnectionStatus();
        
        alert(`Connection Debug Info:
- userId: ${debugInfo.userId || 'null'}
- isConnected: ${debugInfo.isConnected || 'null'}
- hasUserId: ${!!debugInfo.userId}
- hasIsConnected: ${!!debugInfo.isConnected}
- connectionCheck: ${!!(debugInfo.userId || debugInfo.isConnected)}

Check console for more details.`);
      });
    }
  }
}

async function showChatInterface() {
  if (!sidebarElement) return;
  
  sidebarElement.innerHTML = createChatInterfaceHTML();
  addSidebarEventListeners(sidebarElement, true);
}

async function updateSidebarContent() {
  if (!sidebarElement) return;
  
  const isConnected = await isGmailConnected();
  
  if (isConnected) {
    sidebarElement.innerHTML = createWelcomePageHTML();
  } else {
    sidebarElement.innerHTML = createConnectPromptHTML();
  }
  
  addSidebarEventListeners(sidebarElement, isConnected);
}

// === CHAT FUNCTIONALITY ===

async function handleSendMessage() {
  const input = document.getElementById('chat-input');
  if (!input) {
    console.error('[SaAI] Chat input not found');
    return;
  }
  
  const message = input.value.trim();
  if (!message) return;
  
  const chatArea = document.getElementById(CHAT_AREA_ID);
  if (!chatArea) {
    console.error('[SaAI] Chat area not found');
    return;
  }
  
  // Add user message
  appendMessage('user', message, chatArea);
  input.value = '';
  
  // Show typing indicator
  const typingIndicator = appendMessage('bot', 'AI is thinking...', chatArea, true);
  
  try {
    // Get userId from storage
    const { userId } = await chrome.storage.local.get(['userId']);
    
    if (!userId) {
      throw new Error('Please connect your Gmail first');
    }
    
    console.log('[SaAI] Sending message to n8n:', message);
    
    // Send message to background script
    const response = await chrome.runtime.sendMessage({
      action: 'sendToN8N',
      data: {
        endpoint: 'chat',
        payload: {
          query: message,
          userId: userId,
          context: 'GmailChat'
        }
      }
    });
    
    // Remove typing indicator
    if (typingIndicator) {
      typingIndicator.remove();
    }
    
    if (response?.success) {
      console.log('[SaAI] Response received:', response.data);
      
      // Check if this is a fallback response
      if (response.data?.fallback) {
        console.log('[SaAI] Using fallback response - n8n webhook unavailable');
        
        // Create a special message for fallback responses
        const fallbackDiv = document.createElement('div');
        fallbackDiv.className = 'message bot-message';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = `
          <div style="margin-bottom: 8px;">${response.data.message}</div>
          <div style="font-size: 12px; opacity: 0.8; border-top: 1px solid rgba(0,0,0,0.1); padding-top: 8px; margin-top: 8px;">
            <strong>Webhook Status:</strong> ${response.data.webhookStatus}<br>
            <strong>Suggestion:</strong> ${response.data.suggestion || 'Check n8n configuration'}
          </div>
        `;
        
        fallbackDiv.appendChild(messageContent);
        chatArea.appendChild(fallbackDiv);
        chatArea.scrollTop = chatArea.scrollHeight;
        return;
      }
      
      // Handle normal response
      if (response.data && (response.data.high_priority_emails || response.data.medium_priority || response.data.already_replied_closed_threads || response.data.missed_or_ignored_emails)) {
        // Email summary data
        appendTableMessage('bot', response.data, chatArea);
      } else if (response.data && response.data.reply) {
        // Try to parse JSON reply
        try {
          const parsedReply = JSON.parse(response.data.reply);
          appendTableMessage('bot', parsedReply, chatArea);
        } catch (parseError) {
          // Raw text reply
          appendMessage('bot', response.data.reply, chatArea);
        }
      } else if (response.data && response.data.message) {
        // Direct message response
        appendMessage('bot', response.data.message, chatArea);
      } else {
        // Fallback
        appendMessage('bot', 'I received your message!', chatArea);
      }
    } else {
      throw new Error(response?.error || 'Failed to get response from AI');
    }
    
  } catch (error) {
    console.error('[SaAI] Chat error:', error);
    
    // Remove typing indicator
    if (typingIndicator) {
      typingIndicator.remove();
    }
    
    appendMessage('bot', `Error: ${error.message}`, chatArea);
  }
}

function appendMessage(sender, text, chatArea, temporary = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}-message${temporary ? ' temporary' : ''}`;
  
  messageDiv.innerHTML = `
    <div class="message-content">
      ${text}
    </div>
  `;
  
  chatArea.appendChild(messageDiv);
  chatArea.scrollTop = chatArea.scrollHeight;
  
  return temporary ? messageDiv : null;
}

function appendTableMessage(sender, emailData, chatArea) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}-message`;
  
  const tableContainer = document.createElement('div');
  tableContainer.className = 'email-summary-table';
  
  const title = document.createElement('h3');
  title.textContent = '📧 Gmail Summary';
  tableContainer.appendChild(title);
  
  // Helper function to clean and format email addresses
  function formatEmailAddress(emailString) {
    if (!emailString) return 'Unknown Sender';
    
    // Remove angle brackets and extract email
    let cleanEmail = emailString.replace(/[<>]/g, '').trim();
    
    // If it's a very long string (like the one in the image), try to extract a readable part
    if (cleanEmail.length > 50) {
      // Try to find an @ symbol and extract domain
      const atIndex = cleanEmail.indexOf('@');
      if (atIndex > 0) {
        const domain = cleanEmail.substring(atIndex + 1);
        // Extract a readable domain name
        const domainParts = domain.split('.');
        if (domainParts.length >= 2) {
          return `${domainParts[0]}.${domainParts[1]}`;
        }
        return domain;
      }
      
      // If no @ symbol, try to extract a readable part
      const readablePart = cleanEmail.substring(0, 20);
      return readablePart + '...';
    }
    
    // For normal email addresses, just clean them up
    return cleanEmail;
  }
  
  // Helper function to truncate long subjects
  function truncateSubject(subject, maxLength = 50) {
    if (!subject) return 'No Subject';
    if (subject.length <= maxLength) return subject;
    return subject.substring(0, maxLength) + '...';
  }
  
  const priorities = [
    { key: 'high_priority_emails', label: '🔴 High Priority', color: '#ffebee', icon: '🔴' },
    { key: 'medium_priority', label: '🟡 Medium Priority', color: '#fff3e0', icon: '🟡' },
    { key: 'already_replied_closed_threads', label: '✅ Already Replied', color: '#e8f5e8', icon: '✅' },
    { key: 'missed_or_ignored_emails', label: '⏰ Missed/Ignored', color: '#f5f5f5', icon: '⏰' }
  ];
  
  let totalRows = 0;
  priorities.forEach(priority => {
    const emails = emailData[priority.key];
    if (emails && emails.length > 0) totalRows += emails.length;
  });
  
  // Show preview if large
  const PREVIEW_ROWS = 3;
  let previewMode = totalRows > 6;
  
  priorities.forEach(priority => {
    const emails = emailData[priority.key];
    if (emails && emails.length > 0) {
      const section = document.createElement('div');
      section.className = 'priority-section';
      
      const header = document.createElement('h4');
      header.innerHTML = `${priority.icon} ${priority.label} <span class="email-count">(${emails.length})</span>`;
      section.appendChild(header);
      
      const table = document.createElement('table');
      table.className = 'email-table';
      
      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr>
          <th>Subject</th>
          <th>From</th>
        </tr>
      `;
      table.appendChild(thead);
      
      const tbody = document.createElement('tbody');
      const emailsToShow = previewMode ? emails.slice(0, PREVIEW_ROWS) : emails;
      
      emailsToShow.forEach((email, idx) => {
        const row = document.createElement('tr');
        row.className = idx % 2 === 0 ? 'even-row' : 'odd-row';
        
        const subjectCell = document.createElement('td');
        subjectCell.className = 'subject-cell';
        subjectCell.textContent = truncateSubject(email.subject);
        subjectCell.title = email.subject; // Show full subject on hover
        
        const senderCell = document.createElement('td');
        senderCell.className = 'sender-cell';
        senderCell.textContent = formatEmailAddress(email.sender);
        senderCell.title = email.sender; // Show full email on hover
        
        row.appendChild(subjectCell);
        row.appendChild(senderCell);
        tbody.appendChild(row);
      });
      
      table.appendChild(tbody);
      section.appendChild(table);
      
      // Add "show more" indicator if in preview mode
      if (previewMode && emails.length > PREVIEW_ROWS) {
        const moreIndicator = document.createElement('div');
        moreIndicator.className = 'more-indicator';
        moreIndicator.textContent = `+${emails.length - PREVIEW_ROWS} more emails`;
        section.appendChild(moreIndicator);
      }
      
      tableContainer.appendChild(section);
    }
  });
  
  if (previewMode) {
    const viewFullBtn = document.createElement('button');
    viewFullBtn.textContent = '📋 View Full Summary';
    viewFullBtn.className = 'view-full-btn';
    viewFullBtn.onclick = () => openFullTable(emailData);
    tableContainer.appendChild(viewFullBtn);
  }
  
  // If no emails found
  if (!priorities.some(p => emailData[p.key] && emailData[p.key].length > 0)) {
    const noEmailsMsg = document.createElement('div');
    noEmailsMsg.className = 'no-emails';
    noEmailsMsg.innerHTML = `
      <div class="no-emails-icon">📭</div>
      <div class="no-emails-text">No emails found in your inbox.</div>
    `;
    tableContainer.appendChild(noEmailsMsg);
  }
  
  messageDiv.appendChild(tableContainer);
  chatArea.appendChild(messageDiv);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function openFullTable(emailData) {
  const tableWindow = window.open('', '_blank');
  
  // Helper function to clean and format email addresses (same as in appendTableMessage)
  function formatEmailAddress(emailString) {
    if (!emailString) return 'Unknown Sender';
    
    // Remove angle brackets and extract email
    let cleanEmail = emailString.replace(/[<>]/g, '').trim();
    
    // If it's a very long string, try to extract a readable part
    if (cleanEmail.length > 50) {
      // Try to find an @ symbol and extract domain
      const atIndex = cleanEmail.indexOf('@');
      if (atIndex > 0) {
        const domain = cleanEmail.substring(atIndex + 1);
        // Extract a readable domain name
        const domainParts = domain.split('.');
        if (domainParts.length >= 2) {
          return `${domainParts[0]}.${domainParts[1]}`;
        }
        return domain;
      }
      
      // If no @ symbol, try to extract a readable part
      const readablePart = cleanEmail.substring(0, 20);
      return readablePart + '...';
    }
    
    // For normal email addresses, just clean them up
    return cleanEmail;
  }
  
  // Helper function to truncate long subjects
  function truncateSubject(subject, maxLength = 80) {
    if (!subject) return 'No Subject';
    if (subject.length <= maxLength) return subject;
    return subject.substring(0, maxLength) + '...';
  }
  
  tableWindow.document.write(`
    <html>
      <head>
        <title>Gmail Summary</title>
        <style>
          body { 
            background: #ffffff; 
            color: #0f172a; 
            font-family: Inter, Segoe UI, Arial, sans-serif; 
            padding: 32px; 
            margin: 0;
          }
          h2 { 
            color: #0f172a; 
            text-align: center;
            margin-bottom: 32px;
            font-size: 24px;
            font-weight: 600;
          }
          .priority-section {
            margin-bottom: 32px;
            background: #f8fafc;
            border-radius: 12px;
            padding: 20px;
            border: 1px solid #e2e8f0;
          }
          .priority-header {
            color: #0f172a;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .email-count {
            font-size: 14px;
            color: #64748b;
            font-weight: 400;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 16px; 
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            table-layout: fixed;
          }
          th, td { 
            padding: 12px 16px; 
            text-align: left;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: top;
          }
          th { 
            background: #f1f5f9; 
            color: #0f172a; 
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-size: 12px;
          }
          th:first-child { width: 60%; }
          th:last-child { width: 40%; }
          tr:nth-child(even) { 
            background: #ffffff; 
          }
          tr:nth-child(odd) { 
            background: #f8fafc; 
          }
          tr:hover {
            background: #f1f5f9;
            transition: background 0.2s ease;
          }
          .subject-cell {
            font-weight: 500;
            max-width: 100%;
            word-wrap: break-word;
            line-height: 1.4;
            color: #0f172a;
            padding-right: 8px;
          }
          .sender-cell {
            font-size: 13px;
            color: #64748b;
            max-width: 100%;
            word-wrap: break-word;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            padding-left: 8px;
          }
          button { 
            padding: 12px 24px; 
            border-radius: 8px; 
            border: none; 
            background: #0f172a; 
            color: #ffffff; 
            font-weight: 600; 
            font-size: 14px; 
            cursor: pointer; 
            margin-top: 24px;
            transition: all 0.2s ease;
          }
          button:hover {
            background: #1e293b;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
          button:active {
            transform: translateY(0);
          }
          @media(max-width: 600px) { 
            body { padding: 16px; } 
            table, th, td { font-size: 12px; padding: 8px 12px; }
            th:first-child { width: 50%; }
            th:last-child { width: 50%; }
          }
        </style>
      </head>
      <body>
        <h2>📧 Gmail Summary (Full Table)</h2>
        ${[
          { key: 'high_priority_emails', label: '🔴 High Priority', icon: '🔴' },
          { key: 'medium_priority', label: '🟡 Medium Priority', icon: '🟡' },
          { key: 'already_replied_closed_threads', label: '✅ Already Replied', icon: '✅' },
          { key: 'missed_or_ignored_emails', label: '⏰ Missed/Ignored', icon: '⏰' }
        ].map(priority => {
          const emails = emailData[priority.key];
          if (emails && emails.length > 0) {
            return `
              <div class="priority-section">
                <div class="priority-header">
                  ${priority.icon} ${priority.label} 
                  <span class="email-count">(${emails.length} emails)</span>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>From</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${emails.map(email => `
                      <tr>
                        <td class="subject-cell" title="${email.subject}">${truncateSubject(email.subject)}</td>
                        <td class="sender-cell" title="${email.sender}">${formatEmailAddress(email.sender)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `;
          }
          return '';
        }).join('')}
        <div style="text-align: center;">
          <button onclick="window.close()">Close</button>
        </div>
        <script>
          // Ensure close button works
          document.querySelector('button').addEventListener('click', function() {
            window.close();
          });
        </script>
      </body>
    </html>
  `);
  tableWindow.document.close();
}

// === OAuth & Connection ===

function startOAuthFlow() {
  console.log('[SaAI] Starting OAuth flow');
  
  // Show OAuth loader
  showOAuthLoader();
  
  // Send message to background script
  chrome.runtime.sendMessage({
    action: 'sendToN8N',
    data: {
      endpoint: 'oauth',
      payload: { context: 'GmailConnectClicked' }
    }
  }, (response) => {
    if (response?.success) {
      console.log('[SaAI] OAuth success response:', response.data);
      showOAuthSuccess();
    } else {
      console.error('[SaAI] OAuth failed:', response?.error);
      showStatus('OAuth failed. Please try again.', 'error');
    }
  });
}

async function isGmailConnected() {
  const { userId, isConnected } = await chrome.storage.local.get(['userId', 'isConnected']);
  return !!(userId || isConnected);
}

async function debugConnectionStatus() {
  const storage = await chrome.storage.local.get(['userId', 'isConnected', 'oauthData']);
  console.log('[SaAI] Debug connection status:', storage);
  return storage;
}

// === UI Helpers ===

function showOAuthLoader() {
  const connectContent = document.querySelector('.saai-connect-content');
  if (connectContent) {
    connectContent.innerHTML = `
      <div class="loader">Connecting to Google...</div>
    `;
  }
}

function showOAuthSuccess() {
  const connectContent = document.querySelector('.saai-connect-content');
  if (connectContent) {
    connectContent.innerHTML = `
      <div class="saai-connect-icon">✅</div>
      <h2 class="saai-connect-heading">Connected Successfully!</h2>
      <p class="saai-connect-description">Your Gmail is now connected to Sa.AI Assistant.</p>
    `;
  }
  
  // Update sidebar content after a delay
  setTimeout(() => {
    updateSidebarContent();
  }, 2000);
}

function showStatus(message, type) {
  // Create status element
  const statusDiv = document.createElement('div');
  statusDiv.className = `saai-status status ${type}`;
  statusDiv.textContent = message;
  
  // Add to sidebar
  if (sidebarElement) {
    sidebarElement.appendChild(statusDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (statusDiv.parentNode) {
        statusDiv.remove();
      }
    }, 3000);
  }
}

function injectSuggestions() {
  const chatArea = document.getElementById(CHAT_AREA_ID);
  if (!chatArea) return;
  
  // Remove existing suggestions if any
  const existingSuggestions = chatArea.querySelector('#saai-suggestions');
  if (existingSuggestions) {
    existingSuggestions.remove();
  }
  
  const suggestions = [
    {
      text: 'Summarize my inbox',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>`
    },
    {
      text: 'Extract all tasks',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9,11 12,14 22,4"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>`
    },
    {
      text: 'Show follow-ups needed',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12,6 12,12 16,14"/>
      </svg>`
    },
    {
      text: 'Help me draft a reply',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        <path d="M13 8H7"/>
        <path d="M17 12H7"/>
      </svg>`
    }
  ];
  
  const suggestionsDiv = document.createElement('div');
  suggestionsDiv.id = 'saai-suggestions';
  suggestionsDiv.className = 'saai-suggestions';
  
  suggestions.forEach(suggestion => {
    const button = document.createElement('button');
    button.className = 'saai-suggestion';
    button.innerHTML = `
      <span class="saai-suggestion-icon">${suggestion.icon}</span>
      <span class="saai-suggestion-text">${suggestion.text}</span>
    `;
    button.addEventListener('click', () => {
      const input = document.getElementById('chat-input');
      if (input) {
        input.value = suggestion.text;
        input.focus();
      }
    });
    suggestionsDiv.appendChild(button);
  });
  
  chatArea.appendChild(suggestionsDiv);
}

// === Task Management ===

function showTaskModal() {
  const tasks = getTasks();
  
  const modal = document.createElement('div');
  modal.id = 'task-modal';
  modal.className = 'task-modal-overlay';
  
  modal.innerHTML = `
    <div class="task-modal-content">
      <div class="task-modal-header">
        <h3 class="task-modal-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9,11 12,14 22,4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          Task Management
        </h3>
        <button class="task-modal-close-btn">×</button>
      </div>
      <div class="task-modal-body">
        <div class="task-list">
          ${tasks.length === 0 ? `
            <div class="no-tasks">
              <div class="no-tasks-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9,11 12,14 22,4"/>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
              </div>
              <div class="no-tasks-text">No tasks yet</div>
              <p style="color: var(--saai-text-secondary); font-size: 12px; margin-top: 8px;">
                Add your first task to get started
              </p>
            </div>
          ` : ''}
          ${tasks.map(task => `
            <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
              <div class="task-content">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <span class="task-text">${task.text}</span>
                <span class="task-priority ${task.priority}">${task.priority}</span>
                <button class="task-delete-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="add-task-section">
          <input type="text" class="new-task-input" placeholder="Add new task...">
          <select class="task-priority-select">
            <option value="low">Low</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High</option>
          </select>
          <button class="add-task-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
        <button class="task-modal-ok-btn">Done</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  addTaskModalEventListeners(modal);
}

function addTaskModalEventListeners(modal) {
  const closeBtn = modal.querySelector('.task-modal-close-btn');
  const okBtn = modal.querySelector('.task-modal-ok-btn');
  const addBtn = modal.querySelector('.add-task-btn');
  const input = modal.querySelector('.new-task-input');
  const prioritySelect = modal.querySelector('.task-priority-select');
  
  // Close buttons
  [closeBtn, okBtn].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => closeTaskModal(modal));
    }
  });
  
  // Add task
  if (addBtn && input && prioritySelect) {
    addBtn.addEventListener('click', () => {
      const text = input.value.trim();
      if (text) {
        addTask(text, prioritySelect.value);
        input.value = '';
        // Refresh modal
        closeTaskModal(modal);
        showTaskModal();
      }
    });
    
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addBtn.click();
      }
    });
  }
  
  // Task interactions
  const taskItems = modal.querySelectorAll('.task-item');
  taskItems.forEach(item => {
    const checkbox = item.querySelector('.task-checkbox');
    const deleteBtn = item.querySelector('.task-delete-btn');
    
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        const taskId = item.dataset.id;
        toggleTaskComplete(taskId);
      });
    }
    
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        const taskId = item.dataset.id;
        removeTask(taskId);
        closeTaskModal(modal);
        showTaskModal();
      });
    }
  });
}

function closeTaskModal(modal) {
  if (modal && modal.parentNode) {
    modal.remove();
  }
}

function getTasks() {
  const tasks = localStorage.getItem('saai-tasks');
  return tasks ? JSON.parse(tasks) : [];
}

function saveTasks(tasks) {
  localStorage.setItem('saai-tasks', JSON.stringify(tasks));
}

function addTask(taskText, priority = 'medium', dueDate = null) {
  const tasks = getTasks();
  const newTask = {
    id: Date.now().toString(),
    text: taskText,
    priority: priority,
    dueDate: dueDate,
    completed: false,
    createdAt: new Date().toISOString()
  };
  tasks.push(newTask);
  saveTasks(tasks);
}

function removeTask(taskId) {
  const tasks = getTasks();
  const filteredTasks = tasks.filter(task => task.id !== taskId);
  saveTasks(filteredTasks);
}

function toggleTaskComplete(taskId) {
  const tasks = getTasks();
  const task = tasks.find(t => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    saveTasks(tasks);
  }
}

// === Cleanup ===

function cleanup() {
  if (isSidebarOpen) {
    closeSidebar();
  }
  document.body.classList.remove('saai-sidebar-open');
}

// === Page Lifecycle ===

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);

// Handle Gmail navigation
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('[SaAI] Gmail navigation detected');
    // Re-initialize if needed
    if (!isInitialized) {
      initialize();
    }
  }
}).observe(document, { subtree: true, childList: true });
