document.addEventListener('DOMContentLoaded', function() {
    const authorizeBtn = document.getElementById('authorize');
    const testBtn = document.getElementById('test-connection');
    const statusDiv = document.getElementById('status');

    // Check if user is already authorized
    chrome.storage.local.get(['googleToken'], function(result) {
        if (result.googleToken) {
            showStatus('Connected to Google', 'success');
            authorizeBtn.style.display = 'none';
            testBtn.style.display = 'block';
        }
    });

    authorizeBtn.addEventListener('click', function() {
        chrome.identity.getAuthToken({
            interactive: true,
            scopes: [
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/gmail.compose'
            ]
        }, function(token) {
            if (chrome.runtime.lastError || !token) {
                showStatus('Authorization failed', 'error');
                return;
            }

            // Store token
            chrome.storage.local.set({googleToken: token}, function() {
                showStatus('Successfully connected to Google!', 'success');
                authorizeBtn.style.display = 'none';
                testBtn.style.display = 'block';
                
                // Send token to n8n webhook
                sendTokenToN8N(token);
            });
        });
    });

    testBtn.addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0].url.includes('mail.google.com')) {
                chrome.tabs.sendMessage(tabs[0].id, {action: 'toggleChat'});
                window.close();
            } else {
                showStatus('Please open Gmail first', 'error');
            }
        });
    });

    function showStatus(message, type) {
        statusDiv.innerHTML = `<div class="status ${type}">${message}</div>`;
        setTimeout(() => {
            statusDiv.innerHTML = '';
        }, 3000);
    }

    function sendTokenToN8N(token) {
        // Replace with your n8n webhook URL
        const n8nWebhook = 'https://saaidev99.app.n8n.cloud/webhook-test/NB_Summarization_Phase1';
        
        fetch(n8nWebhook, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: token,
                userId: 'user_' + Date.now() // Generate unique user ID
            })
        }).catch(error => {
            console.log('N8N webhook error:', error);
        });
    }
});
