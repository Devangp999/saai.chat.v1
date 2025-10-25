// Simple, reliable logging for production
function debugLog(...args) {
  // Temporarily enabled for debugging
  console.log('[SaAI]', ...args);
}
function debugError(...args) {
  console.error('[SaAI]', ...args); // Always show errors
}
function debugWarn(...args) {
  // Disabled for production - can enable for debugging
  // console.warn('[SaAI]', ...args);
}

document.addEventListener('DOMContentLoaded', function() {
    const authorizeBtn = document.getElementById('authorize');
    const testBtn = document.getElementById('test-connection');
    const statusDiv = document.getElementById('status');

    chrome.storage.local.get(['userId', 'isConnected'], function(result) {
        debugLog('Popup loaded, storage result:', result);
        if (result.userId) {
            // If userId is present, ensure isConnected is set
            chrome.storage.local.set({ isConnected: true });
            debugLog('Found userId, setting isConnected and showing test button');
            showStatus('Connected to Sa.AI Inbox Assistant', 'success');
            authorizeBtn.style.display = 'none';
            testBtn.style.display = 'block';
        } else if (result.isConnected) {
            // Fallback for legacy state
            debugLog('Found legacy isConnected, showing test button');
            showStatus('Connected to Sa.AI Inbox Assistant', 'success');
            authorizeBtn.style.display = 'none';
            testBtn.style.display = 'block';
        } else {
            debugLog('No connection found, showing authorize button');
        }
    });

    authorizeBtn.addEventListener('click', function() {
        showStatus('Connecting to Google...', 'info');
        
        // Send message to background script to handle OAuth
        chrome.runtime.sendMessage({
            action: 'sendToN8N',
            data: {
                endpoint: 'oauth',
                payload: { context: 'PopupConnectClicked' }
            }
        }, (response) => {
            if (response?.success) {
                debugLog('OAuth success response from background:', response.data);
                showStatus('✅ Connected to Sa.AI!', 'success');
                authorizeBtn.style.display = 'none';
                testBtn.style.display = 'block';
                debugLog('UI updated - authorizeBtn hidden, testBtn shown');
            } else {
                debugError('OAuth via background failed:', response?.error);
                showStatus('❌ Connection failed: ' + (response?.error || 'Unknown error'), 'error');
            }
        });
    });

    testBtn.addEventListener('click', function() {
        debugLog('Test button clicked');
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            debugLog('Current tab:', tabs[0]);
            if (tabs[0].url.includes('mail.google.com')) {
                debugLog('Attempting to communicate with tab:', tabs[0].id);
                
                // Ping first to check if content script is already loaded
                chrome.tabs.sendMessage(tabs[0].id, {action: 'ping'}, function(pingResponse) {
                    if (chrome.runtime.lastError) {
                        // Content script not loaded - inject it first
                        debugLog('Content script not found, injecting...');
                        chrome.scripting.executeScript({
                            target: { tabId: tabs[0].id },
                            files: ['content.js']
                        }, function() {
                            if (chrome.runtime.lastError) {
                                debugError('Script injection error:', chrome.runtime.lastError);
                                showStatus('Error injecting script: ' + chrome.runtime.lastError.message, 'error');
                                return;
                            }
                            
                            // Wait for script to initialize, then send message
                            setTimeout(() => {
                                sendOpenSaaiMessage(tabs[0].id);
                            }, 500);
                        });
                    } else {
                        // Content script already loaded - send message directly
                        debugLog('Content script ready, sending message directly');
                        sendOpenSaaiMessage(tabs[0].id);
                    }
                });
            } else {
                debugLog('Not on Gmail, current URL:', tabs[0].url);
                showStatus('Please open Gmail first to use the assistant', 'error');
            }
        });
    });

    // Helper function to show status messages
    function showStatus(message, type) {
        statusDiv.innerHTML = `<div class="status ${type}">${message}</div>`;
        if (type !== 'info') {
            setTimeout(() => {
                statusDiv.innerHTML = '';
            }, 3000);
        }
    }
});

// Helper function to send the open_saai message
function sendOpenSaaiMessage(tabId) {
    chrome.tabs.sendMessage(tabId, {action: 'open_saai'}, function(response) {
        debugLog('Message response:', response);
        if (chrome.runtime.lastError) {
            debugError('Message error:', chrome.runtime.lastError);
            showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
        } else {
            debugLog('Sa.AI Assistant opened successfully');
            window.close();
        }
    });
}