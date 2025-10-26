# Chrome Web Store Listing Content

## Extension Name
**Sa.AI for Gmail**

## Short Description (132 characters max)
AI inbox assistant with context memory. Stores emails 30 days for smart insights. Auto-deletes. Boost productivity effortlessly.

## Detailed Description

Transform your Gmail experience with Sa.AI - your intelligent inbox assistant powered by advanced AI.

### 🚀 Key Features

**Smart Inbox Summarization**
Get instant overviews of your inbox with AI-powered categorization. Sa.AI automatically prioritizes your emails and highlights what needs attention.

**Conversational AI Assistant**
Chat naturally with your inbox. Ask questions like "What are my urgent emails?" or "Summarize emails from my boss" and get instant, intelligent responses.

**Automatic Task Extraction**
Never miss an action item again. Sa.AI automatically identifies tasks and to-dos from your emails and helps you manage them efficiently.

**Voice Interaction**
Use voice commands to interact with your inbox hands-free. Perfect for busy professionals on the go.

**Task Management**
Keep track of email-related tasks with our built-in task manager. Add, edit, and complete tasks directly from your inbox.

**Real-time Email Analysis**
Get insights about your emails instantly - priority levels, sentiment analysis, and smart categorization.

### ✨ Why Choose Sa.AI?

- **Transparent**: 30-day data retention clearly disclosed; automatic deletion
- **Non-Intrusive**: Clean sidebar design that integrates seamlessly with Gmail
- **Productivity Boost**: Save hours every week with AI-powered email management
- **Always Learning**: Our AI continuously improves to serve you better

### 🔒 Privacy & Security

⚠️ **Data Storage Notice**: This extension stores email data (subject, sender, body, labels) in our secure Pinecone database for 30 days to provide context-aware AI assistance. Data is automatically deleted after 30 days.

- Enterprise-grade encryption (TLS 1.3, AES-256)
- OAuth 2.0 secure authentication
- **30-day data retention** for context awareness
- Automatic deletion after 30 days
- Manual deletion available anytime
- Full GDPR & CCPA compliance
- Read our comprehensive privacy policy

### 📊 Perfect For

- Busy professionals managing high email volumes
- Teams needing quick email insights
- Anyone looking to improve email productivity
- Users who want AI assistance without complexity

### 🎯 How It Works

1. Install the extension
2. Connect your Gmail account securely
3. Open Gmail and see Sa.AI sidebar
4. Start chatting with your AI assistant!

### 💡 Use Cases

- Quickly catch up on emails after vacation
- Find specific information across email threads
- Extract meeting notes and action items
- Prioritize emails during busy days
- Get smart email summaries before meetings

### 🆘 Support

Need help? Contact us at devang@saai.dev or use the in-app feedback feature.

### 📝 Note

Sa.AI requires a Gmail account and internet connection. Some features may require account setup with our secure backend service.

---

**Start transforming your inbox today with Sa.AI!**

## Category
**Productivity**

## Language
English

## Privacy Policy URL
https://saai.dev/privacy-policy

(Host your PRIVACY_POLICY.md at this URL before submission)

## Screenshots Required (1280x800 or 640x400)

### Screenshot 1: Main Interface
**Title**: "AI-Powered Inbox Assistant"
**Description**: "Chat naturally with your AI assistant about your emails"

### Screenshot 2: Inbox Summary
**Title**: "Smart Email Categorization"
**Description**: "Get instant insights with priority-based email summaries"

### Screenshot 3: Task Management
**Title**: "Never Miss Important Tasks"
**Description**: "Automatically extract and manage email-related tasks"

### Screenshot 4: Voice Mode
**Title**: "Hands-Free Email Management"
**Description**: "Use voice commands to interact with your inbox"

### Screenshot 5: Settings
**Title**: "Full Control & Privacy"
**Description**: "Manage your data and preferences with ease"

## Promotional Tile (440x280 PNG)
Create a tile featuring:
- Sa.AI logo
- "AI Inbox Assistant" text
- Clean, professional design
- Gmail integration visual

## Small Tile (128x128 PNG)
- Sa.AI logo centered
- High contrast
- Recognizable at small size

## Marquee (1400x560 PNG)
Feature showcase with:
- Main interface screenshot
- Key features highlighted
- "Transform Your Inbox" tagline
- Professional design

## Justification for Permissions

### storage
**Justification**: Required to save user preferences, authentication tokens, and chat history locally in the browser for seamless user experience across sessions.

### identity (optional)
**Justification**: Used for secure Google OAuth authentication to access Gmail data with user consent.

### host_permissions: mail.google.com
**Justification**: Essential for the extension to function - injects the AI assistant sidebar directly into Gmail interface.

### host_permissions: googleapis.com (optional)
**Justification**: Required for Gmail API access to read email metadata and content when user requests summaries or analysis.

### host_permissions: connector.saai.dev (optional)
**Justification**: Our secure backend service that processes AI requests. Email data is sent here for analysis and immediately discarded after processing.

### host_permissions: accounts.google.com (optional)
**Justification**: Required for Google OAuth authentication flow to securely connect Gmail accounts.

## Single Purpose Description
Sa.AI is a Gmail productivity tool that provides AI-powered inbox summarization, email analysis, and task management through a conversational interface.

## Remote Code Statement
This extension does NOT use remote code. All code is included in the extension package. The extension communicates with our backend API only for AI processing of user requests.

## Data Usage Disclosure

⚠️ **IMPORTANT**: This extension stores email data for context-aware AI assistance.

### Gmail Messages
**Purpose**: Email analysis, summarization, and context-aware AI assistance
**Usage**: Read email content (subject, sender, body, labels) to provide intelligent responses
**Transfer**: Sent to our secure backend (connector.saai.dev) for AI processing
**Storage**: ⚠️ **STORED in Pinecone vector database for 30 DAYS** for context awareness, then automatically deleted

**What We Store**:
- Email subjects
- Sender email addresses  
- Email body content
- Email labels/categories
- Timestamp metadata

**Why We Store It**:
- To provide intelligent, context-aware responses
- To remember your email history for better assistance
- To track patterns and provide personalized insights

**How Long**:
- **30 days** from first connection
- Includes 30 days of historical emails (prior to installation)
- **Automatically deleted** after 30 days

**Deletion**:
- Automatic after 30 days
- Manual deletion via Settings → Clear All Data
- Request immediate deletion: devang@saai.dev

### User Account Info
**Purpose**: Authentication and personalization
**Usage**: Identify user and maintain session
**Transfer**: Used for OAuth authentication
**Storage**: 
- User ID stored locally in browser
- Session data on backend servers
- Deleted on logout or data clearing

### Usage Patterns
**Purpose**: Product improvement and debugging
**Usage**: Understand feature usage and errors
**Transfer**: Anonymized analytics to backend
**Storage**: 
- 90 days (anonymized)
- Error logs: 7 days
- Aggregated, non-identifiable data

## Certification

I certify that:
- ✅ This extension complies with Chrome Web Store policies
- ✅ Privacy policy is comprehensive and accessible
- ✅ Extension only requests necessary permissions
- ✅ No misleading functionality
- ✅ Complies with Google API Services User Data Policy
- ✅ All data handling is transparent
- ✅ User can delete all data at any time
- ✅ No data selling or advertising use

---

## Pre-Submission Checklist

- [ ] Privacy policy hosted at public URL
- [ ] All 5 screenshots created (1280x800)
- [ ] Promotional tile created (440x280)
- [ ] Small tile created (128x128)
- [ ] Marquee image created (1400x560)
- [ ] Tested on latest Chrome version
- [ ] All permissions justified
- [ ] No console errors in production
- [ ] Icons are all PNG format
- [ ] Manifest version follows semver (X.Y.Z)
- [ ] Description is clear and accurate
- [ ] No debug/test code in production
- [ ] OAuth client ID configured
- [ ] Backend URLs are production-ready
- [ ] Support email is active


