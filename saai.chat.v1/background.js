// Background script for Sa.AI Inbox Assistant

// Simple, reliable logging for production
function debugLog(...args) {
  // Temporarily enabled for debugging
  console.log('[SaAI-BG]', ...args);
}
function debugError(...args) {
  console.error('[SaAI]', ...args); // Always show errors
}
function debugWarn(...args) {
  // Disabled for production - can enable for debugging
  // console.warn('[SaAI]', ...args);
}

// Robust network request wrapper with timeout and error handling
async function safeRequest(url, options = {}, timeout = 90000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      // Allow caller to handle non-2xx responses when explicitly requested
      if (options && options._allowErrorResponse === true) {
        return response;
      }
      // Try to get error details from response body
      let errorDetails = response.statusText;
      try {
        const errorBody = await response.text();
        if (errorBody) errorDetails = errorBody;
      } catch (e) {
        // Ignore if can't read body
      }
      throw new Error(`HTTP ${response.status}: ${errorDetails}`);
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    
    debugError('Network request failed:', error);
    throw error;
  }
}

// Feature flags
const FEATURES = {
    heartbeatEnabled: false
};

chrome.runtime.onInstalled.addListener((details) => {
    debugLog('Sa.AI Inbox Assistant installed/updated', details.reason);
    
    // Only clear storage on fresh install, not on updates
    if (details.reason === 'install') {
    chrome.storage.local.clear(() => {
            debugLog('Storage cleared on fresh installation');
        });
    } else if (details.reason === 'update') {
        debugLog('Extension updated - preserving existing user data');
        // Do not clear storage on updates
    }
});

// Check existing session on startup
chrome.runtime.onStartup.addListener(() => {
    debugLog('Extension startup - checking existing session');
    
    chrome.storage.local.get(['isConnected', 'jwtToken', 'userId'], (result) => {
        if (result.isConnected && result.jwtToken && result.userId) {
            debugLog('Existing session found');
        } else {
            debugLog('No existing session found');
        }
    });
});

// Periodic token refresh disabled - only refresh on 401/403 errors from n8n
function setupPeriodicTokenRefresh() {
    debugLog('Periodic token refresh disabled - will refresh only on auth errors');
    
    // No automatic refresh alarms
    // Token will be refreshed only when n8n returns 401/403
}

// heartbeat function to maintain active connection (disabled by default)
async function performHeartbeat() {
    if (!FEATURES.heartbeatEnabled) {
        debugLog('Heartbeat skipped (disabled)');
        return;
    }

    try {
        debugLog('Performing connection heartbeat');
        
        const token = await getJWTToken();
        const userId = await getStoredUserId();
        
        if (!token || !userId) {
            debugLog('Heartbeat: No token or userId, skipping');
            return;
        }
        
        // Call n8n heartbeat endpoint to maintain session
        const heartbeatResponse = await safeRequest('https://connector.saai.dev/webhook/oauth/heartbeat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                userId: userId,
                action: 'heartbeat',
                timestamp: Date.now(),
                source: 'chrome_extension'
            })
        });
        
        if (heartbeatResponse.ok) {
            const heartbeatData = await heartbeatResponse.json();
            debugLog('Heartbeat successful:', heartbeatData.success);
            
            // Update last activity
            await chrome.storage.local.set({
                lastHeartbeat: Date.now(),
                sessionActive: true
            });
            
            // If heartbeat returns a new refresh token, update it
            if (heartbeatData.refreshToken) {
                debugLog('Heartbeat provided new refresh token');
                await chrome.storage.local.set({
                    refreshToken: heartbeatData.refreshToken
                });
            }
        }
        
    } catch (error) {
        debugLog('Heartbeat failed:', error.message);
        
        // Mark session as potentially inactive
        await chrome.storage.local.set({
            sessionActive: false,
            lastHeartbeatFailed: Date.now()
        });
    }
}

// Alarm handler disabled - no periodic refresh
chrome.alarms.onAlarm.addListener(async (alarm) => {
    debugLog('Alarm triggered but periodic refresh is disabled:', alarm.name);
    // No automatic token refresh - only refresh on 401/403 errors
});

// Handle message forwarding for OAuth and chat
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[SaAI-BG] Message received:', request);
    debugLog('Message received:', request);
    
    if (request.action === 'sendToN8N') {
        console.log('[SaAI-BG] Processing sendToN8N request:', request.data);
        debugLog('Processing sendToN8N request:', request.data);
        
        if (request.data.endpoint === 'oauth') {
            console.log('[SaAI-BG] OAuth endpoint detected - calling handleOAuthFlow()');
            debugLog('OAuth endpoint detected - calling handleOAuthFlow()');
        }
        
        handleN8NRequest(request.data)
            .then(response => {
                console.log('[SaAI-BG] sendToN8N success response:', response);
                debugLog('sendToN8N success response:', response);
                sendResponse({success: true, data: response});
            })
            .catch(error => {
                console.error('[SaAI-BG] sendToN8N error:', error);
                debugError('sendToN8N error:', error);
                sendResponse({success: false, error: error.message});
            });
        return true;
    } else if (request.action === 'trackCredits') {
        console.log('[SaAI-BG] Processing trackCredits request:', request.data);
        debugLog('Processing trackCredits request:', request.data);
        
        handleCreditTracking(request.data)
            .then(response => {
                console.log('[SaAI-BG] trackCredits success response:', response);
                debugLog('trackCredits success response:', response);
                sendResponse({success: true, data: response});
            })
            .catch(error => {
                console.error('[SaAI-BG] trackCredits error:', error);
                debugError('trackCredits error:', error);
                sendResponse({success: false, error: error.message});
            });
        return true;
    } else if (request.action === 'refreshToken') {
        console.log('[SaAI-BG] Processing refreshToken request');
        debugLog('Processing refreshToken request');
        refreshJWTToken()
            .then(token => {
                console.log('[SaAI-BG] refreshToken success:', token ? 'Token received' : 'No token');
                debugLog('refreshToken success:', token ? 'Token received' : 'No token');
                sendResponse({success: true, token: token});
            })
            .catch(error => {
                console.error('[SaAI-BG] refreshToken error:', error);
                debugError('refreshToken error:', error);
                sendResponse({success: false, error: error.message});
            });
        return true;
    }
    
    console.log('[SaAI-BG] Unknown message action:', request.action);
    debugLog('Unknown message action:', request.action);
    sendResponse({success: false, error: 'Unknown action'});
});

// Handle tab updates to inject content script only if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('mail.google.com')) {
        // Ping first - only inject if content script is missing
        chrome.tabs.sendMessage(tabId, {action: 'checkInitialization'}).then((response) => {
            // Content script responded - already loaded, no injection needed
            debugLog('Content script already loaded on tab', tabId);
        }).catch((error) => {
            // Content script not responding - safe to inject
            debugLog('Content script missing, injecting on tab', tabId);
            chrome.scripting.executeScript({
                target: {tabId: tabId},
                files: ['content.js']
            }).catch((injectError) => {
                debugError('Failed to inject content script:', injectError);
            });
        });
    }
});

// Get JWT token from storage
async function getJWTToken() {
    const { jwtToken } = await chrome.storage.local.get(['jwtToken']);
    return jwtToken;
}

// Get stored user ID from storage
async function getStoredUserId() {
    const { userId } = await chrome.storage.local.get(['userId']);
    return userId;
}

// Get refresh token from storage
async function getRefreshToken() {
    const { refreshToken } = await chrome.storage.local.get(['refreshToken']);
    return refreshToken;
}

// Get token refresh count for tracking
async function getTokenRefreshCount() {
    const { tokenRefreshCount } = await chrome.storage.local.get(['tokenRefreshCount']);
    return tokenRefreshCount || 0;
}

// Check if JWT token is expired (parse JWT payload for exp claim)
async function isJWTTokenExpired(jwtToken) {
    try {
        if (!jwtToken) return true;
        
        // Decode JWT payload (base64url decode)
        const parts = jwtToken.split('.');
        if (parts.length !== 3) return true;
        
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        const exp = payload.exp;
        
        if (!exp) return false; // No expiration claim, assume valid
        
        // Check if token expires within next 5 minutes (buffer for refresh)
        const currentTime = Math.floor(Date.now() / 1000);
        const bufferTime = 5 * 60; // 5 minutes
        
        return (exp - currentTime) < bufferTime;
    } catch (error) {
        debugError('Error checking JWT expiration:', error);
        return true; // If we can't parse it, assume expired
    }
}

// Get JWT token without proactive refresh - only check if it exists
async function ensureValidJWTToken() {
    const jwtToken = await getJWTToken();
    
    if (!jwtToken) {
        throw new Error('No JWT token found. Please authenticate first.');
    }
    
    // Don't check expiry or refresh proactively
    // Let n8n return 401 if token is expired, then we refresh
    return jwtToken;
}

// Refresh JWT token using n8n refresh endpoint
async function refreshJWTToken() {
    try {
        debugLog('JWT token expired, attempting refresh via n8n');
        
        const currentUserId = await getStoredUserId();
        if (!currentUserId) {
            throw new Error('No userId found. Please re-authenticate.');
        }
        
        const refreshResponse = await safeRequest('https://connector.saai.dev/webhook/session/renew', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await getJWTToken()}`
            },
            body: JSON.stringify({
                userId: currentUserId,
                refreshToken: await getRefreshToken(),
                grantType: 'refresh_token',
                extendLifetime: true
            })
        });
        
        if (!refreshResponse.ok) {
            const errorText = await refreshResponse.text();
            debugError('Token refresh failed:', errorText);
            throw new Error(`Token refresh failed: ${refreshResponse.status} ${refreshResponse.statusText}`);
        }
        
        let refreshData = await refreshResponse.json();
        
        // Handle array response from n8n (extract first element)
        if (Array.isArray(refreshData) && refreshData.length > 0) {
            debugLog('Refresh response is array, extracting first element');
            refreshData = refreshData[0];
        }
        
        // Check for JWT token in various field names
        const newJwtToken = refreshData.jwt || refreshData.jwtToken || refreshData.token;
        
        if (!newJwtToken) {
            debugError('No JWT in refresh response:', refreshData);
            throw new Error('Token refresh response missing JWT token');
        }
        
        debugLog('JWT token refreshed successfully');
        
        // Store the new token
        await chrome.storage.local.set({
            jwtToken: newJwtToken,
            refreshToken: refreshData.refreshToken || await getRefreshToken(),
            userId: refreshData.userId || currentUserId,
            tokenIssuedAt: Date.now(),
            tokenRefreshCount: (await getTokenRefreshCount()) + 1,
            lastSuccessfulRefresh: Date.now()
        });
        
        return newJwtToken;
        
    } catch (error) {
        debugError('Token refresh failed:', error);
        console.error('[SaAI-BG] Token refresh error - check if webhook/session/renew is active and returning jwt field');
        throw new Error('Unable to refresh authentication. Please re-authenticate.');
    }
}

// Handle credit tracking webhook requests
async function handleCreditTracking(data) {
    const { userId, prompt, creditsUsed } = data;
    
    console.log('[SaAI-BG] Credit tracking data received:', { userId, prompt, creditsUsed });
    debugLog('Sending credit tracking to n8n:', { userId, prompt, creditsUsed });
    
    // Validate data
    if (!userId || !prompt || !creditsUsed) {
        console.error('[SaAI-BG] Invalid credit tracking data:', data);
        throw new Error('Missing required credit tracking parameters');
    }
    
    // Get and validate JWT token
    const jwtToken = await ensureValidJWTToken();
    if (!jwtToken) {
        throw new Error('No JWT token found. Please authenticate first.');
    }
    
    const url = 'https://connector.saai.dev/webhook/Credit-Tracking';
    
    const payload = {
        userId: userId,
        prompt: prompt,
        creditsUsed: creditsUsed
    };
    
    console.log('[SaAI-BG] Sending credit tracking payload:', payload);
    console.log('[SaAI-BG] JWT token:', jwtToken ? 'Present' : 'Missing');
    
    const response = await safeRequest(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify(payload)
    });
    
    console.log('[SaAI-BG] Credit tracking response status:', response.status);
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('[SaAI-BG] Credit tracking error response:', errorText);
        throw new Error(`Credit tracking failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('[SaAI-BG] Credit tracking response data:', result);
    debugLog('Credit tracking response:', result);
    
    return result;
}

// Handle N8N webhook requests
async function handleN8NRequest(data) {
    const { endpoint, payload } = data;
    
    if (endpoint === 'oauth') {
        // For OAuth, we need to launch the Google OAuth flow first
        return await handleOAuthFlow();
    }
    
    // Determine URL first
    let url;
    switch (endpoint) {
        case 'chat':
            // Check if this is a thread summarization request
            if (payload.action === 'summarize_thread' && payload.threadId) {
                console.log('[Background] Thread summarization request detected:', {
                    threadId: payload.threadId,
                    subjectLine: payload.subjectLine || 'Not provided',
                    query: payload.query
                });
                // Use the same webhook but with thread context
                url = 'https://connector.saai.dev/webhook/Chatbot-Nishant';
            } else {
                url = 'https://connector.saai.dev/webhook/Chatbot-Nishant';
            }
            break;
        case 'task':
            url = 'https://connector.saai.dev/webhook/Task-Management';
            break;
        case 'feedback':
            url = 'https://connector.saai.dev/webhook-test/Feedback_error';
            break;
        default:
            throw new Error('Invalid endpoint');
    }
    
    console.log('[Background] Sending request to n8n:', { url, payload, endpoint });
    
    // For feedback, no authentication required - send directly
    if (endpoint === 'feedback') {
        try {
            const response = await safeRequest(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload),
                _allowErrorResponse: true
            });
            
            console.log('[Background] Feedback response status:', response.status);
            console.log('[Background] Feedback response URL:', response.url);
            
            if (response.ok) {
                const result = await response.json();
                console.log('[Background] Feedback sent successfully:', result);
                return result;
            } else {
                const errorText = await response.text();
                console.error('[Background] Feedback error response:', {
                    status: response.status,
                    statusText: response.statusText,
                    url: response.url,
                    body: errorText
                });
                throw new Error(`Feedback submission failed: ${response.status} - ${errorText || response.statusText}`);
            }
        } catch (error) {
            console.error('[Background] Feedback request failed:', error);
            throw error;
        }
    }
    
    // For other endpoints, get and validate JWT token for authenticated requests (auto-refresh if needed)
    const jwtToken = await ensureValidJWTToken();
    if (!jwtToken) {
        throw new Error('No JWT token found. Please authenticate first.');
    }
    
    console.log('[Background] Sending authenticated request to n8n:', { url, payload });
    
    try {
    const response = await safeRequest(url, {
        method: 'POST',
        headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify(payload),
        _allowErrorResponse: true
    });
        
        console.log('[Background] n8n response status:', response.status);
        console.log('[Background] n8n response headers:', response.headers);
    
    if (!response.ok) {
            // Handle specific error cases
            if (response.status === 401 || response.status === 402 || response.status === 403) {
                console.log('[Background] JWT token issue (401/402/403), attempting automatic refresh and retry');
                
                try {
                    // Automatically refresh the token
                    const newJwtToken = await refreshJWTToken();
                    debugLog('Token refreshed successfully, retrying original request');
                    
                    // Retry the original request with new token
                    const retryResponse = await safeRequest(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'Authorization': `Bearer ${newJwtToken}`
                        },
                        body: JSON.stringify(payload)
                    });
                    
                    if (retryResponse.ok) {
                        const retryResult = await retryResponse.json();
                        debugLog('Request retry successful after token refresh');
                        return retryResult;
                    } else {
                        // If retry still fails, try one more time with fresh token
                        debugLog('First retry failed, attempting second retry');
                        const finalJwtToken = await ensureValidJWTToken();
                        const finalRetryResponse = await safeRequest(url, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                                'Authorization': `Bearer ${finalJwtToken}`
                            },
                            body: JSON.stringify(payload)
                        });
                        
                        if (finalRetryResponse.ok) {
                            const finalResult = await finalRetryResponse.json();
                            debugLog('Second retry successful');
                            return finalResult;
                        } else {
                            throw new Error(`Request failed after token refresh attempts: ${finalRetryResponse.status}`);
                        }
                    }
                } catch (refreshError) {
                    debugError('Automatic token refresh failed:', refreshError);
                    // Don't expose JWT errors to user - return a generic message
                    throw new Error('Service temporarily unavailable. Please try again.');
                }
            } else if (response.status === 404) {
                console.error('[Background] n8n webhook not found (404)');
                // Return a fallback response instead of throwing error
                return await handleFallbackResponse(endpoint, payload);
            } else if (response.status === 500) {
                console.error('[Background] n8n 500 error for endpoint:', endpoint, 'URL:', url);
                throw new Error(`n8n server error (500) - webhook ${endpoint} crashed. Check n8n execution logs.`);
            } else {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(`n8n webhook error (${response.status}): ${errorText}`);
            }
        }
        
        // Try to parse JSON response
        const responseText = await response.text();
        console.log('[Background] n8n raw response:', responseText);
        
        let result;
        try {
            result = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
            console.warn('[Background] Failed to parse JSON response:', parseError);
            // If response is not JSON, treat it as text
            result = { message: responseText || 'Response received but not in expected format' };
        }
        
        console.log('[Background] n8n parsed response:', result);
        return result;
        
    } catch (error) {
        console.error('[Background] Network error:', error);
        
        // If it's a network error (not a 404), try fallback
        if (error.name === 'TypeError' || error.message.includes('fetch')) {
            console.log('[Background] Network error detected, using fallback response');
            return await handleFallbackResponse(endpoint, payload);
        }
        
        throw error;
    }
}

// Handle fallback responses when n8n is unavailable
async function handleFallbackResponse(endpoint, payload) {
    console.log('[Background] Using fallback response for:', endpoint);
    
    if (endpoint === 'chat') {
        const userMessage = payload.query || payload.message || 'Hello';
        
        // Check if this is a thread summarization request
        if (payload.action === 'summarize_thread' && payload.threadId) {
            console.log('[Background] Thread summarization fallback for threadId:', payload.threadId);
            const subjectInfo = payload.subjectLine ? ` (Subject: "${payload.subjectLine}")` : '';
            return {
                message: `I can see you want me to summarize the email thread (ID: ${payload.threadId})${subjectInfo}. However, the n8n webhook is currently unavailable, so I cannot access the thread content to provide a summary. Please check your webhook configuration and try again.`,
                fallback: true,
                webhookStatus: 'unavailable',
                suggestion: 'Please verify your n8n webhook is deployed and accessible',
                threadId: payload.threadId,
                subjectLine: payload.subjectLine,
                action: 'summarize_thread'
            };
        }
        
        // Generate a mock response based on the user's message
        const mockResponses = {
            'hello': 'Hi there! I\'m your Inbox assistant. How can I help you today?',
            'help': 'I can help you with:\n• Summarizing your inbox\n• Finding important emails\n• Managing your tasks\n• Answering questions about your emails\n• Summarizing specific email threads (open the thread first)',
            'summarize': 'I\'d be happy to summarize your inbox! However, the n8n webhook is currently unavailable. Please check your webhook configuration.',
            'inbox': 'I can help you with your inbox! The n8n integration needs to be configured to access your Gmail data.',
            'email': 'I\'m here to help with your emails! Please ensure the n8n webhook is properly set up to process your requests.',
            'thread': 'To summarize a specific email thread, please open the thread first, then ask me to summarize it.'
        };
        
        // Find the best matching response
        const lowerMessage = userMessage.toLowerCase();
        let response = 'I understand you\'re asking about "' + userMessage + '". The n8n webhook is currently unavailable. Please check your webhook configuration at: https://connector.saai.dev/webhook/Chatbot-Nishant';
        
        for (const [key, value] of Object.entries(mockResponses)) {
            if (lowerMessage.includes(key)) {
                response = value;
                break;
            }
        }
        
        return {
            message: response,
            fallback: true,
            webhookStatus: 'unavailable',
            suggestion: 'Please verify your n8n webhook is deployed and accessible'
        };
    }
    
    return {
        message: 'Service temporarily unavailable. Please check your n8n webhook configuration.',
        fallback: true,
        webhookStatus: 'unavailable'
    };
}

// PKCE OAuth flow with n8n webhook
async function handleOAuthFlow() {
    console.log('[SaAI-BG] ===== handleOAuthFlow() called =====');
    try {
        console.log('[SaAI-BG] Starting PKCE OAuth flow with n8n');
        debugLog('Starting PKCE OAuth flow with n8n');
        
        // Step 1: Call n8n /oauth/start endpoint to get PKCE parameters
        debugLog('Calling n8n /oauth/start endpoint...');
        
        let startData;
        try {
            const startResponse = await safeRequest('https://connector.saai.dev/webhook/oauth/start', {
                method: 'GET'
            });
            
            debugLog('PKCE start response status:', startResponse.status);
            debugLog('PKCE start response headers:', Object.fromEntries(startResponse.headers.entries()));
            
            if (!startResponse.ok) {
                throw new Error(`n8n /oauth/start failed with status ${startResponse.status}: ${startResponse.statusText}`);
            }
            
            startData = await startResponse.json();
            debugLog('PKCE start response data:', startData);
            
            if (!startData.state || !startData.code_challenge) {
                debugError('Invalid PKCE parameters from n8n:', startData);
                throw new Error(`Invalid PKCE parameters from n8n. Response: ${JSON.stringify(startData)}`);
            }
            
            debugLog('PKCE parameters received successfully:', {
                state: startData.state,
                code_challenge: startData.code_challenge,
                code_challenge_method: startData.code_challenge_method
            });
            
        } catch (startError) {
            debugError('Failed to get PKCE parameters from /oauth/start:', startError);
            console.error('[SaAI-BG] OAuth start error:', startError.message);
            throw new Error(`Failed to get OAuth parameters: ${startError.message}`);
        }
        
        // Step 2: Build Google OAuth URL with n8n's PKCE parameters
        // Use client ID from manifest.json to ensure consistency
    const clientId = '1051004706176-ptln0d7v8t83qu0s5vf7v4q4dagfcn4q.apps.googleusercontent.com';
        const redirectUri = 'https://connector.saai.dev/webhook/oauth/callback';
        const scopes = [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.compose',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ];
        
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&scope=${encodeURIComponent(scopes.join(' '))}` +
        `&response_type=code` +
        `&access_type=offline` +
            `&prompt=consent` +
            `&code_challenge=${encodeURIComponent(startData.code_challenge)}` +
            `&code_challenge_method=${startData.code_challenge_method || 'S256'}` +
            `&state=${encodeURIComponent(startData.state)}`;
        
        debugLog('Launching OAuth flow with PKCE, redirect URI:', redirectUri);
        debugLog('Using n8n state:', startData.state);
        debugLog('Google OAuth URL:', authUrl);
        
        // Step 3: Launch OAuth flow
    return new Promise((resolve, reject) => {
            debugLog('Launching Chrome identity web auth flow...');
        chrome.identity.launchWebAuthFlow({
            url: authUrl,
            interactive: true
            }, async function(redirectUrl) {
            if (chrome.runtime.lastError) {
                    debugError('OAuth failed:', chrome.runtime.lastError);
                    
                    // Handle user cancellation specifically
                    const errorMessage = chrome.runtime.lastError.message || '';
                    if (errorMessage.includes('user did not approve') || errorMessage.includes('cancelled')) {
                        reject(new Error('OAUTH_CANCELLED: User cancelled the authentication process'));
                    } else {
                        reject(new Error(`OAuth failed: ${errorMessage}`));
                    }
                return;
            }
            
            if (redirectUrl) {
                    debugLog('OAuth redirect URL received:', redirectUrl);
                
                    try {
                        // Step 4: n8n redirects back to extension with JWT token
                        // Extract JWT token, refresh token, and user ID from redirect URL
                const urlParams = new URLSearchParams(redirectUrl.split('?')[1]);
                        const jwtToken = urlParams.get('jwt_token');
                        const userId = urlParams.get('user_id');
                        const refreshToken = urlParams.get('refresh_token');
                        const returnedState = urlParams.get('state');
                        
                        // Check if this is an error response
                        const error = urlParams.get('error');
                        const errorCode = urlParams.get('error_code');
                        if (error) {
                            const errorDescription = urlParams.get('error_description') || 'Unknown error';
                            
                            // Handle user not in whitelist (HTTP 408)
                            if (errorCode === '408' || error === 'user_not_whitelisted') {
                                debugError('User not whitelisted:', errorDescription);
                                throw new Error(`NOT_WHITELISTED: ${errorDescription}`);
                            }
                            
                            // Handle access denied specifically
                            if (error === 'access_denied') {
                                debugError('Access denied:', errorDescription);
                                throw new Error(`Access Denied: ${errorDescription}`);
                            }
                            
                            throw new Error(`OAuth error: ${error} - ${errorDescription}`);
                        }
                        
                        if (!jwtToken || !userId) {
                            throw new Error('No JWT token or user ID in redirect URL');
                        }
                        
                        if (returnedState !== startData.state) {
                            throw new Error('State mismatch in OAuth response');
                        }
                        
                        debugLog('JWT token extracted:', jwtToken.substring(0, 20) + '...');
                        debugLog('User ID extracted:', userId);
                        debugLog('Refresh token extracted:', refreshToken ? 'Present' : 'Not provided');
                        debugLog('State verified:', returnedState);
                        
                        // Step 5: Store JWT token, refresh token, and user ID
                        const storageData = {
                        isConnected: true, 
                        userId: userId,
                            jwtToken: jwtToken,
                            oauthData: {
                                userId: userId,
                                jwtToken: jwtToken,
                                redirectUrl: redirectUrl
                            }
                        };
                        
                        // Store refresh token if available
                        if (refreshToken) {
                            storageData.refreshToken = refreshToken;
                            storageData.oauthData.refreshToken = refreshToken;
                        }
                        
                        await chrome.storage.local.set(storageData);
                        
                        debugLog('PKCE OAuth flow completed successfully');
                        resolve({ 
                            success: true, 
                            userId: userId,
                            jwtToken: jwtToken
                        });
                        
                    } catch (error) {
                        debugError('Error in PKCE OAuth flow:', error);
                        reject(error);
                }
            } else {
                reject(new Error('OAUTH_CANCELLED: User cancelled the authentication process'));
            }
        });
    });
        
    } catch (error) {
        debugError('PKCE OAuth flow failed:', error);
        debugError('PKCE error details:', {
            message: error.message,
            stack: error.stack
        });
        
        // No fallback - let the OAuth flow fail completely
        throw error;
    }
}

// Handle extension icon click - opens popup for Gmail connection
chrome.action.onClicked.addListener((tab) => {
    // The popup will handle the connection flow
    // This ensures users connect their Gmail first
    console.log('Extension icon clicked - popup will handle connection');
});

// Handle storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        if (changes.isConnected) {
            console.log('Connection status updated:', changes.isConnected.newValue);
        }
        if (changes.userId) {
            console.log('User ID updated:', changes.userId.newValue);
        }
        if (changes.jwtToken) {
            console.log('JWT token updated:', changes.jwtToken.newValue ? 'Token present' : 'Token removed');
        }
    }
});
