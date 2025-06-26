// Background script for Gmail AI Assistant

chrome.runtime.onInstalled.addListener(() => {
    console.log('Gmail AI Assistant installed');
});

// Handle authorization flow
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getAuthToken') {
        chrome.identity.getAuthToken({
            interactive: true,
            scopes: [
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/gmail.compose'
            ]
        }, (token) => {
            if (chrome.runtime.lastError) {
                sendResponse({error: chrome.runtime.lastError.message});
            } else {
                sendResponse({token: token});
            }
        });
        return true; // Keep channel open for async response
    }
});

// Handle tab updates to inject content script
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('mail.google.com')) {
        chrome.tabs.sendMessage(tabId, {action: 'checkInitialization'}).catch(() => {
            // Content script not loaded, inject it
            chrome.scripting.executeScript({
                target: {tabId: tabId},
                files: ['content.js']
            });
        });
    }
});
