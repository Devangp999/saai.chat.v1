# Sa.AI for Gmail

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue)](https://chrome.google.com/webstore)
[![Version](https://img.shields.io/badge/version-2.1.0-green)]()
[![License](https://img.shields.io/badge/license-Proprietary-red)]()

**Your AI-Powered Inbox Assistant**

Transform your Gmail experience with Sa.AI - an intelligent assistant that helps you summarize emails, extract tasks, and chat naturally about your inbox.

## ✨ Features

### 🤖 Conversational AI Assistant
Chat naturally with your inbox. Ask questions, get summaries, and receive intelligent insights about your emails.

### 📊 Smart Inbox Summarization
Automatically categorize and prioritize your emails with AI-powered analysis.

### ✅ Automatic Task Extraction
Never miss an action item. Sa.AI identifies tasks from your emails and helps you manage them.

### 🎤 Voice Interaction
Use voice commands to interact with your inbox hands-free.

### 🎯 Task Management
Built-in task manager to track email-related to-dos.

### 🔒 Privacy-Focused
Your emails are processed securely and never stored permanently. Full GDPR compliance.

## 🚀 Installation

### From Chrome Web Store (Recommended)
1. Visit [Sa.AI on Chrome Web Store](#) (coming soon)
2. Click "Add to Chrome"
3. Follow the installation prompts

### Manual Installation (Development)
1. Clone this repository
```bash
git clone https://github.com/Devangp999/saai.chat.v1.git
cd saai.chat.v1
```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" (toggle in top right)

4. Click "Load unpacked" and select the extension folder

5. The Sa.AI icon will appear in your Chrome toolbar

## 📖 Usage

### Initial Setup
1. Click the Sa.AI icon in your Chrome toolbar
2. Click "Connect to Google & Sa.AI" to authorize Gmail access
3. Complete the Google OAuth flow
4. Open Gmail and start using your AI assistant!

### Basic Operations

**Summarize Your Inbox**
- Open Gmail with Sa.AI enabled
- The sidebar appears automatically
- Click "Summarize my inbox" or ask the AI directly

**Chat with AI**
- Type your questions in the chat input
- Examples:
  - "What are my urgent emails?"
  - "Summarize emails from today"
  - "Show me tasks from my inbox"

**Voice Commands**
- Click the microphone icon
- Speak your request naturally
- AI processes your voice input

**Task Management**
- View extracted tasks in the task modal
- Add manual tasks
- Mark tasks as complete

## 🔐 Privacy & Security

Sa.AI takes your privacy seriously:

- ✅ **Secure OAuth**: Industry-standard Google OAuth 2.0
- ✅ **No Permanent Storage**: Emails processed in real-time only
- ✅ **Encrypted Communication**: All data transfers use HTTPS/TLS
- ✅ **GDPR Compliant**: Full compliance with data protection regulations
- ✅ **Transparent**: Clear privacy policy and data handling

[Read Full Privacy Policy](PRIVACY_POLICY.md)

## 🛠️ Technical Details

### Technology Stack
- **Manifest Version**: 3 (latest Chrome extension standard)
- **Frontend**: Vanilla JavaScript, CSS3
- **Authentication**: Google OAuth 2.0
- **AI Backend**: Secure API (connector.saai.dev)
- **Storage**: Chrome Storage API (local only)

### Permissions Explained

| Permission | Purpose |
|------------|---------|
| `storage` | Save preferences and chat history locally |
| `identity` | Secure Google OAuth authentication |
| `mail.google.com` | Inject AI assistant into Gmail interface |
| `googleapis.com` | Access Gmail API for email data |
| `connector.saai.dev` | Send requests to AI processing backend |

## 📊 Browser Compatibility

- **Chrome**: Version 88+ (Fully supported)
- **Edge**: Version 88+ (Chromium-based, supported)
- **Opera**: Latest version (Chromium-based, supported)
- **Brave**: Latest version (Supported with privacy shields adjusted)

## 🆘 Support

### Getting Help
- **Email**: devang@saai.dev
- **In-App**: Use the "Send Feedback" or "Report Issue" feature
- **Response Time**: Within 24-48 hours

### Troubleshooting

**Extension not loading?**
- Refresh Gmail page
- Check Chrome console for errors
- Try reinstalling the extension

**OAuth issues?**
- Clear extension storage: Settings → Clear All Data
- Disconnect and reconnect your account
- Check browser privacy settings

**AI not responding?**
- Check internet connection
- Verify Gmail is fully loaded
- Look for error messages in chat

## 🔄 Updates & Changelog

### Version 2.1.0 (Current)
- ✅ Elegant toast notification system
- ✅ Enhanced feedback and issue reporting
- ✅ Improved confirmation modals
- ✅ Text updates: "Inbox assistant" branding
- ✅ Better task management with sender info
- ✅ Voice mode improvements

### Version 2.0.0
- Complete UI redesign with modern aesthetics
- Unified OAuth flow
- Enhanced error handling
- SPA compatibility improvements

[View Full Changelog](CHANGELOG.md)

## 🤝 Contributing

This is a proprietary project. For business inquiries or partnership opportunities, contact devang@saai.dev.

## 📜 License

Copyright © 2024 Sa.AI Team. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, modification, distribution, or use of this software, via any medium, is strictly prohibited.

## 🙏 Acknowledgments

- Google Gmail team for excellent API documentation
- Chrome Extensions team for Manifest V3
- Our beta testers for valuable feedback

## 📞 Contact

- **Website**: https://saai.dev
- **Email**: devang@saai.dev
- **Support**: Through in-app feedback form

---

**Made with ❤️ by the Sa.AI Team**

*Transform your inbox today with AI-powered intelligence.*
