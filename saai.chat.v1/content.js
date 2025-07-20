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
    sidebarElement.innerHTML = createChatInterfaceHTML();
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
      <span class="saai-title">Hi boss 👋</span>
      <div class="saai-header-actions">
        <button id="task-list-btn" class="saai-task-btn">📋 Task List</button>
        <button id="close-sidebar" class="saai-close-btn" title="Close">×</button>
      </div>
    </div>
    <div id="${CHAT_AREA_ID}" class="chat-area">
      <div class="message bot-message">
        <div class="message-content">
          Hi boss, how may I help you?
        </div>
      </div>
    </div>
    <div class="chat-input-container">
      <input type="text" id="chat-input" placeholder="Type your message..." />
      <button id="send-btn">Send</button>
    </div>
  `;
}

function createConnectPromptHTML() {
  return `
    <div class="saai-header">
      <span class="saai-title saai-connect-title">Connect Gmail</span>
      <div class="saai-header-actions">
        <button id="saai-debug-btn" class="saai-task-btn" style="background: rgba(255, 0, 0, 0.1); color: #ff0000;">SaAI Debug (Click)</button>
        <button id="close-sidebar" class="saai-close-btn" title="Close">×</button>
      </div>
    </div>
    <div class="saai-connect-content">
      <div class="saai-connect-icon">📧</div>
      <h2 class="saai-connect-heading">Connect Your Gmail</h2>
      <p class="saai-connect-description">To use Sa.AI Gmail Assistant, you need to connect your Gmail account first.</p>
      <button id="saai-connect-btn" class="saai-connect-button">Connect Gmail</button>
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

async function updateSidebarContent() {
  if (!sidebarElement) return;
  
  const isConnected = await isGmailConnected();
  
  if (isConnected) {
    sidebarElement.innerHTML = createChatInterfaceHTML();
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
      const aiResponse = response.data?.message || 'I received your message but couldn\'t process it properly.';
      appendMessage('bot', aiResponse, chatArea);
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
  
  const suggestions = [
    'Summarize my inbox',
    'Find important emails',
    'Show my tasks',
    'Help me compose an email'
  ];
  
  const suggestionsDiv = document.createElement('div');
  suggestionsDiv.id = 'saai-suggestions';
  suggestionsDiv.className = 'saai-suggestions';
  
  suggestions.forEach(suggestion => {
    const button = document.createElement('button');
    button.className = 'saai-suggestion';
    button.textContent = suggestion;
    button.addEventListener('click', () => {
      const input = document.getElementById('chat-input');
      if (input) {
        input.value = suggestion;
        handleSendMessage();
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
        <h3 class="task-modal-title">Task List</h3>
        <button class="task-modal-close-btn">×</button>
      </div>
      <div class="task-modal-body">
        <div class="task-list">
          ${tasks.length === 0 ? '<div class="no-tasks">No tasks yet</div>' : ''}
          ${tasks.map(task => `
            <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
              <div class="task-content">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <span class="task-text">${task.text}</span>
                <span class="task-priority ${task.priority}">${task.priority}</span>
                <button class="task-delete-btn">×</button>
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
          <button class="add-task-btn">Add</button>
        </div>
        <button class="task-modal-ok-btn">OK</button>
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
