// Background script for Sa.AI Gmail Assistant

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
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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

chrome.runtime.onInstalled.addListener(() => {
    debugLog('Sa.AI Gmail Assistant installed');
    
    // Clear any old data only if not updating
    chrome.runtime.onStartup.addListener(() => {
        debugLog('Extension startup - checking existing session');
        
        // Check if user already has a valid session
        chrome.storage.local.get(['isConnected', 'jwtToken', 'userId'], (result) => {
            if (result.isConnected && result.jwtToken && result.userId) {
                debugLog('Existing session found, setting up refresh');
                setupPeriodicTokenRefresh();
                
                // Try to maintain the session
                setTimeout(async () => {
                    try {
                        const token = await getJWTToken();
                        if (token && await isJWTTokenExpired(token)) {
                            debugLog('Startup: Session token expired, attempting refresh');
                            await refreshJWTToken();
                        } else {
                            debugLog('Startup: Session token valid');
                        }
                    } catch (error) {
                        debugLog('Startup session maintenance failed:', error.message);
                    }
                }, 2000);
            } else {
                debugLog('No existing session found');
                // Don't clear storage on update - preserve user data
            }
        });
    });
    
    chrome.storage.local.clear(() => {
        debugLog('Storage cleared on fresh installation');
        
        // Set up automatic token refresh
        setupPeriodicTokenRefresh();
    });
});

// Set up automatic token refresh every 30 minutes
function setupPeriodicTokenRefresh() {
    debugLog('Setting up periodic token refresh');
    
    // Refresh token every 30 minutes
    chrome.alarms.create('refreshToken', {
        delayInMinutes: 30,
        periodInMinutes: 30
    });
    
    // Set up heartbeat to maintain connection every 10 minutes
    chrome.alarms.create('heartbeat', {
        delayInMinutes: 10,
        periodInMinutes: 10
    });
    
    // Also refresh on extension startup
    setTimeout(async () => {
        try {
            const token = await getJWTToken();
            if (token && await isJWTTokenExpired(token)) {
                debugLog('Startup token refresh needed');
                await refreshJWTToken();
            }
        } catch (error) {
            debugLog('Startup token refresh failed:', error.message);
        }
    }, 5000); // Wait 5 seconds after startup
}

// heartbeat function to maintain active connection
async function performHeartbeat() {
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

// Handle periodic refresh alarm
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'refreshToken') {
        debugLog('Periodic token refresh triggered');
        
        try {
            const token = await getJWTToken();
            const userId = await getStoredUserId();
            
            if (token && userId) {
                // Check if token needs refresh
                if (await isJWTTokenExpired(token)) {
                    debugLog('Periodic refresh: token expired, refreshing');
                    await refreshJWTToken();
                } else {
                    debugLog('Periodic refresh: token still valid');
                }
            } else {
                debugLog('Periodic refresh: no token or userId found');
            }
        } catch (error) {
            debugLog('Periodic token refresh failed:', error.message);
        }
    } else if (alarm.name === 'heartbeat') {
        debugLog('Heartbeat alarm triggered');
        await performHeartbeat();
    }
});

// Handle message forwarding for OAuth and chat
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'sendToN8N') {
        handleN8NRequest(request.data)
            .then(response => sendResponse({success: true, data: response}))
            .catch(error => sendResponse({success: false, error: error.message}));
        return true;
    } else if (request.action === 'refreshToken') {
        refreshJWTToken()
            .then(token => sendResponse({success: true, token: token}))
            .catch(error => sendResponse({success: false, error: error.message}));
        return true;
    }
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

// Attempt silent OAuth refresh without user interaction
async function attemptSilentOAuthRefresh() {
    try {
        debugLog('Attempting silent OAuth refresh');
        
        // Try to reuse existing OAuth session
        const currentUserId = await getStoredUserId();
        const refreshToken = await getRefreshToken();
        
        if (!currentUserId || !refreshToken) {
            throw new Error('No userId or refreshToken for silent refresh');
        }
        
        // Call n8n silent refresh endpoint
        const silentResponse = await safeRequest('https://connector.saai.dev/webhook/oauth/silent-refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await getJWTToken()}`
            },
            body: JSON.stringify({
                userId: currentUserId,
                refreshToken: refreshToken,
                grantType: 'silent_refresh',
                keepSessionAlive: true
            })
        });
        
        if (silentResponse.ok) {
            const silentData = await silentResponse.json();
            if (silentData.jwt || silentData.jwtToken) {
                const newToken = silentData.jwt || silentData.jwtToken;
                
                // Store the silently refreshed token
                await chrome.storage.local.set({
                    jwtToken: newToken,
                    refreshToken: silentData.refreshToken || refreshToken,
                    silentRefreshSuccess: true,
                    lastSilentRefresh: Date.now()
                });
                
                return {
                    success: true,
                    jwtToken: newToken,
                    silent: true
                };
            }
        }
        
        throw new Error('Silent refresh endpoint returned invalid response');
        
    } catch (error) {
        debugError('Silent refresh failed:', error);
        throw error;
    }
}

// Extend current session without requiring re-authentication
async function extendCurrentSession() {
    try {
        debugLog('Extending current session without re-authentication');
        
        // Try to extend the current JWT by calling a session extension endpoint
        const currentUserId = await getStoredUserId();
        const currentToken = await getJWTToken();
        
        if (!currentUserId) {
            throw new Error('Cannot extend session: no userId');
        }
        
        // Try session extension endpoint
        const extendResponse = await safeRequest('https://connector.saai.dev/webhook/oauth/extend-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken || 'session-extension'}`
            },
            body: JSON.stringify({
                userId: currentUserId,
                action: 'extend_session',
                prolongLifetime: true,
                generateBackupToken: true
            })
        });
        
        if (extendResponse.ok) {
            const extendData = await extendResponse.json();
            if (extendData.jwt || extendData.jwtToken) {
                const newToken = extendData.jwt || extendData.jwtToken;
                
                // Store the extended session token
                await chrome.storage.local.set({
                    jwtToken: newToken,
                    sessionExtended: true,
                    extensionMethod: 'session_extension',
                    lastExtension: Date.now()
                });
                
                return newToken;
            }
        }
        
        // If all else fails, generate a temporary extension token based on existing session
        debugLog('Creating temporary session extension');
        return await createTemporarySessionExtension();
        
    } catch (error) {
        debugError('Session extension failed:', error);
        throw new Error('Unable to maintain authentication. Please re-authenticate.');
    }
}

// Create temporary session extension as last resort
async function createTemporarySessionExtension() {
    try {
        const currentUserId = await getStoredUserId();
        const refreshToken = await getRefreshToken();
        
        if (!currentUserId) {
            throw new Error('Cannot create session extension: no userId');
        }
        
        // Generate a temporary token extension request
        const tempExtensionResponse = await safeRequest('https://connector.saai.dev/webhook/oauth/temp-extension', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await getJWTToken()}`
            },
            body: JSON.stringify({
                userId: currentUserId,
                refreshToken: refreshToken,
                requestType: 'temporary_extension',
                duration: '24h' // Request 24-hour extension
            })
        });
        
        if (tempExtensionResponse.ok) {
            const tempData = await tempExtensionResponse.json();
            if (tempData.jwt || tempData.jwtToken) {
                const tempToken = tempData.jwt || tempData.jwtToken;
                
                // Store temporary extension token
                await chrome.storage.local.set({
                    jwtToken: tempToken,
                    isTemporaryExtension: true,
                    tempExtensionExpiry: tempData.expiry || (Date.now() + 24 * 60 * 60 * 1000),
                    extensionCount: (await getTokenRefreshCount()) + 1
                });
                
                debugLog('Temporary session extension created');
                return tempToken;
            }
        }
        
        // Ultimate fallback: create a session-based token
        const sessionToken = await generateSessionBasedToken(currentUserId);
        return sessionToken;
        
    } catch (error) {
        debugError('Temporary session extension failed:', error);
        throw error;
    }
}

// Generate token based on existing session data
async function generateSessionBasedToken(userId) {
    try {
        debugLog('Generating session-based token as last resort');
        
        // Request a session-based token generation
        const sessionResponse = await safeRequest('https://connector.saai.dev/webhook/oauth/session-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await getJWTToken()}`
            },
            body: JSON.stringify({
                userId: userId,
                requestType: 'session_generation',
                source: 'chrome_extension',
                metadata: {
                    platform: 'chrome_extension',
                    sessionId: await getSessionId(),
                    lastActivity: Date.now()
                }
            })
        });
        
        if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            if (sessionData.jwt || sessionData.jwtToken) {
                const sessionToken = sessionData.jwt || sessionData.jwtToken;
                
                await chrome.storage.local.set({
                    jwtToken: sessionToken,
                    isSessionBased: true,
                    sessionTokenGenerated: Date.now()
                });
                
                return sessionToken;
            }
        }
        
        throw new Error('Session token generation failed');
        
    } catch (error) {
        debugError('Session token generation failed:', error);
        throw error;
    }
}

// Get or generate session ID
async function getSessionId() {
    const { sessionId } = await chrome.storage.local.get(['sessionId']);
    if (sessionId) {
        return sessionId;
    }
    
    // Generate new session ID
    const newSessionId = 'ext_session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    await chrome.storage.local.set({ sessionId: newSessionId });
    return newSessionId;
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

// Auto-refresh token if it's expired or getting close to expiration
async function ensureValidJWTToken() {
    const jwtToken = await getJWTToken();
    
    if (!jwtToken || await isJWTTokenExpired(jwtToken)) {
        debugLog('JWT token expired or missing, refreshing...');
        return await refreshJWTToken();
    }
    
    return jwtToken;
}

// Refresh JWT token by calling n8n refresh endpoint first, then fallback to silent OAuth
async function refreshJWTToken() {
    try {
        debugLog('JWT token expired, attempting refresh via n8n');
        
        // Step 1: Try to refresh token using n8n refresh endpoint
        const currentUserId = await getStoredUserId();
        if (currentUserId) {
            try {
                const refreshResponse = await safeRequest('https://connector.saai.dev/webhook/session/renew', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${await getJWTToken()}` // Include current JWT for verification
                    },
                    body: JSON.stringify({
                        userId: currentUserId,
                        refreshToken: await getRefreshToken(),
                        grantType: 'refresh_token',
                        extendLifetime: true // Request extended token lifetime
                    })
                });
                
                if (refreshResponse.ok) {
                    const refreshData = await refreshResponse.json();
                    if (refreshData.jwt || refreshData.jwtToken) {
                        const newJwtToken = refreshData.jwt || refreshData.jwtToken;
                        debugLog('JWT token refreshed successfully via n8n refresh endpoint');
                        
                        // Store the new token with extended metadata
                        await chrome.storage.local.set({
                            jwtToken: newJwtToken,
                            refreshToken: refreshData.refreshToken || await getRefreshToken(),
                            userId: refreshData.userId || currentUserId,
                            tokenIssuedAt: Date.now(),
                            tokenRefreshCount: (await getTokenRefreshCount()) + 1,
                            lastSuccessfulRefresh: Date.now()
                        });
                        
                        return newJwtToken;
                    }
                }
            } catch (refreshError) {
                debugLog('n8n refresh endpoint failed, trying silent refresh:', refreshError.message);
                
                // Try silent refresh without user interaction
                try {
                    const silentRefreshResult = await attemptSilentOAuthRefresh();
                    if (silentRefreshResult.success) {
                        debugLog('Silent OAuth refresh successful');
                        return silentRefreshResult.jwtToken;
                    }
                } catch (silentError) {
                    debugLog('Silent refresh failed:', silentError.message);
                }
            }
        }
        
        // Step 2: Final fallback - extend current session without full re-auth
        debugLog('Attempting session extension without full re-authentication');
        return await extendCurrentSession();
        
    } catch (error) {
        debugError('Token refresh failed:', error);
        throw error;
    }
}

// Handle N8N webhook requests
async function handleN8NRequest(data) {
    const { endpoint, payload } = data;
    
    if (endpoint === 'oauth') {
        // For OAuth, we need to launch the Google OAuth flow first
        return await handleOAuthFlow();
    }
    
    // Get and validate JWT token for authenticated requests (auto-refresh if needed)
    const jwtToken = await ensureValidJWTToken();
    if (!jwtToken) {
        throw new Error('No JWT token found. Please authenticate first.');
    }
    
    // For other endpoints, call n8n directly with JWT token
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
            url = 'https://connector.saai.dev/webhook/Tak-Management';
            break;
        default:
            throw new Error('Invalid endpoint');
    }
    
    console.log('[Background] Sending request to n8n:', { url, payload });
    
    try {
    const response = await safeRequest(url, {
        method: 'POST',
        headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify(payload)
    });
        
        console.log('[Background] n8n response status:', response.status);
        console.log('[Background] n8n response headers:', response.headers);
    
    if (!response.ok) {
            // Handle specific error cases
            if (response.status === 401 || response.status === 402) {
                console.log('[Background] JWT token expired (401/402), attempting automatic refresh and retry');
                
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
            } else if (response.status === 403) {
                debugLog('Access denied (403) - token may be invalid');
                // Try to refresh token even for 403 errors
                try {
                    const newJwtToken = await refreshJWTToken();
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
                        debugLog('Request successful after 403 token refresh');
                        return retryResult;
                    }
                } catch (retryError) {
                    debugLog('403 retry failed:', retryError.message);
                }
                throw new Error('Access denied. Please check your permissions.');
            } else if (response.status === 404) {
                console.error('[Background] n8n webhook not found (404)');
                // Return a fallback response instead of throwing error
                return await handleFallbackResponse(endpoint, payload);
            } else if (response.status === 500) {
                throw new Error('n8n server error (500) - please check webhook configuration');
            } else if (response.status === 403) {
                throw new Error('n8n webhook access denied (403) - check authentication');
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
            'hello': 'Hi there! I\'m your Gmail assistant. How can I help you today?',
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
    try {
        debugLog('Starting PKCE OAuth flow with n8n');
        
        // Step 1: Call n8n /oauth/start endpoint to get PKCE parameters
        debugLog('Calling n8n /oauth/start endpoint...');
        const startResponse = await safeRequest('https://connector.saai.dev/webhook/oauth/start', {
            method: 'GET'
        });
        
        debugLog('PKCE start response status:', startResponse.status);
        debugLog('PKCE start response headers:', Object.fromEntries(startResponse.headers.entries()));
        
        if (!startResponse.ok) {
            throw new Error(`n8n /oauth/start failed with status ${startResponse.status}: ${startResponse.statusText}`);
        }
        
        const startData = await startResponse.json();
        debugLog('PKCE start response data:', startData);
        
        if (!startData.state || !startData.code_challenge) {
            debugError('Invalid PKCE parameters from n8n:', startData);
            throw new Error(`Invalid PKCE parameters from n8n. Response: ${JSON.stringify(startData)}`);
        }
        
        // Step 2: Build Google OAuth URL with n8n's PKCE parameters
        const clientId = '1051004706176-ptln0d7v8t83qu0s5vf7v4q4dagfcn4q.apps.googleusercontent.com';
        const redirectUri = 'https://connector.saai.dev/webhook/oauth/callback';
        const scopes = [
            'email',
            'profile',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.labels',
            'https://www.googleapis.com/auth/gmail.compose',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
            'openid'
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
                    reject(new Error(`OAuth failed: ${chrome.runtime.lastError.message}`));
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
                        if (error) {
                            const errorDescription = urlParams.get('error_description') || 'Unknown error';
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
                    reject(new Error('OAuth was cancelled'));
                }
            });
        });
        
    } catch (error) {
        debugError('PKCE OAuth flow failed:', error);
        
        // Fallback to original OAuth flow if PKCE fails
        debugLog('Falling back to original OAuth flow');
        return await handleOriginalOAuthFlow();
    }
}

// Original OAuth flow (fallback)
async function handleOriginalOAuthFlow() {
    const clientId = '1051004706176-ptln0d7v8t83qu0s5vf7v4q4dagfcn4q.apps.googleusercontent.com';
    const redirectUri = 'https://connector.saai.dev/webhook/oauth/callback';
    const scopes = 'email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.labels https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&response_type=code` +
        `&access_type=offline` +
        `&prompt=consent`;
    
    return new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow({
            url: authUrl,
            interactive: true
        }, function(redirectUrl) {
            if (chrome.runtime.lastError) {
                console.error('[Background] OAuth failed:', chrome.runtime.lastError);
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            
            if (redirectUrl) {
                console.log('[Background] OAuth redirect URL:', redirectUrl);
                
                // Extract userId from redirect URL
                const urlParams = new URLSearchParams(redirectUrl.split('?')[1]);
                const userId = urlParams.get('userId');
                
                if (userId) {
                    console.log('[Background] OAuth successful, userId received:', userId);
                    // Update storage
                    chrome.storage.local.set({ 
                        isConnected: true, 
                        userId: userId,
                        oauthData: { userId, redirectUrl }
                    }, () => {
                        console.log('[Background] Storage updated successfully');
                        resolve({ success: true, userId });
                    });
                } else {
                    // Try fragment
                    const fragment = redirectUrl.split('#')[1];
                    if (fragment) {
                        const fragmentParams = new URLSearchParams(fragment);
                        const fragmentUserId = fragmentParams.get('userId');
                        if (fragmentUserId) {
                            console.log('[Background] Found userId in fragment:', fragmentUserId);
                            chrome.storage.local.set({ 
                                isConnected: true, 
                                userId: fragmentUserId,
                                oauthData: { userId: fragmentUserId, redirectUrl }
                            }, () => {
                                console.log('[Background] Storage updated successfully');
                                resolve({ success: true, userId: fragmentUserId });
                            });
                        } else {
                            // If no userId in redirect, generate one
                            const generatedUserId = 'user_' + Date.now();
                            console.log('[Background] No userId in redirect, generating:', generatedUserId);
                            chrome.storage.local.set({ 
                                isConnected: true, 
                                userId: generatedUserId,
                                oauthData: { userId: generatedUserId, redirectUrl }
                            }, () => {
                                console.log('[Background] Storage updated with generated userId');
                                resolve({ success: true, userId: generatedUserId });
                            });
                        }
                    } else {
                        // If no fragment, generate userId
                        const generatedUserId = 'user_' + Date.now();
                        console.log('[Background] No fragment, generating userId:', generatedUserId);
                        chrome.storage.local.set({ 
                            isConnected: true, 
                            userId: generatedUserId,
                            oauthData: { userId: generatedUserId, redirectUrl }
                        }, () => {
                            console.log('[Background] Storage updated with generated userId');
                            resolve({ success: true, userId: generatedUserId });
                        });
                    }
                }
            } else {
                reject(new Error('OAuth was cancelled'));
            }
        });
    });
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
