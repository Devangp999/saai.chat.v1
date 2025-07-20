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
    return true;
  }
});

// Keep service worker alive (add this)
let keepAlive = setInterval(chrome.runtime.getPlatformInfo, 20000);
chrome.runtime.onSuspend.addListener(() => clearInterval(keepAlive));