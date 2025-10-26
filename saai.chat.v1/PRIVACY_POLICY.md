# Privacy Policy for Sa.AI for Gmail

**Last Updated: October 26, 2024**  
**Version: 2.0**

## Overview

Sa.AI for Gmail ("the Extension") is a Chrome extension that provides AI-powered inbox assistance for Gmail users. This privacy policy explains how we collect, use, store, and protect your data.

**IMPORTANT**: This extension stores email data for context-aware AI assistance. Please read this policy carefully before using.

## Data Collection and Usage

### What Data We Collect

1. **Gmail Email Data** ⚠️
   - **Email Subject Lines** - To provide context and summaries
   - **Sender Email Addresses** - To track communication patterns
   - **Email Body Content** - To analyze and extract tasks/insights
   - **Email Labels/Categories** - To organize and prioritize
   - **Email Timestamps** - To provide chronological context
   - **Email Draft Creation** - To prepare AI-generated draft replies in threads

2. **User Identification**
   - Google Account email address (for authentication)
   - Unique user ID (generated during OAuth)
   - Connection status and session data

3. **Usage Data**
   - Chat messages you send to the AI assistant
   - Feature usage patterns (inbox summaries, task management)
   - Error logs for debugging and improvement

### ⚠️ IMPORTANT: Data Storage Duration

**We store your email data for context-aware AI assistance:**

- **Storage Period**: **30 days** from the date you first connect the extension
- **Storage Location**: Pinecone vector database (secure, encrypted)
- **What is Stored**: 
  - Email subjects
  - Sender email addresses
  - Email body content
  - Email labels
  - Timestamp metadata
- **Purpose**: To provide intelligent, context-aware responses and remember your email history for better assistance
- **Automatic Deletion**: All stored data is automatically deleted after 30 days

**Example**: If you install the extension on January 1st, we will store emails from December 2nd (30 days prior) to January 1st. This data will be retained for 30 days and then automatically deleted.

### How We Use Your Data

1. **AI Context & Intelligence**
   - Provide context-aware responses about your emails
   - Remember previous conversations and email threads
   - Track patterns and provide intelligent insights
   - Generate accurate summaries based on your email history

2. **Core Functionality**
   - Summarize your inbox and categorize emails by priority
   - Answer questions about your emails via AI chat
   - Extract tasks and action items from emails
   - Provide voice interaction with your inbox
   - Manage email-related tasks
   - **Generate AI-powered draft replies** in email threads

3. **AI Processing**
   - Email data is sent to our secure backend (connector.saai.dev)
   - Processed through AI models for analysis and vectorization
   - **Stored in Pinecone for 30 days for context awareness**
   - Used to improve response accuracy and relevance

4. **Authentication**
   - Google OAuth 2.0 for secure Gmail access
   - Tokens stored locally in your browser
   - We never see or store your Google password

### Data Storage Architecture

1. **Local Storage (Your Browser)**
   - OAuth tokens and authentication data
   - User preferences and settings
   - Chat history (optional, local only)

2. **Cloud Storage (Our Servers)**
   - **Pinecone Vector Database**:
     - Email subjects, senders, body content, labels
     - Vectorized for AI similarity search
     - Encrypted at rest and in transit
     - **Retention: 30 days, then auto-deleted**
   
   - **Backend Servers (connector.saai.dev)**:
     - Task management data
     - User session information
     - Usage analytics (anonymized)

3. **Temporary Processing**
   - Real-time AI analysis in memory
   - Discarded after generating response
   - No permanent storage beyond Pinecone retention

## Data Sharing

We do NOT:
- ❌ Sell your data to third parties
- ❌ Share your emails with anyone except as described below
- ❌ Use your data for advertising or marketing
- ❌ Provide access to other users

We MAY share data only:
- ✅ With AI service providers for processing (encrypted)
- ✅ When required by law or legal process
- ✅ To protect our rights, safety, or property
- ✅ With your explicit consent

## Third-Party Services

### Google APIs
- Used for Gmail authentication, reading, and composing
- **Gmail Compose Scope**: Allows creation of draft replies
- Subject to [Google's Privacy Policy](https://policies.google.com/privacy)
- Complies with [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy)

### Pinecone Vector Database
- Secure vector database for AI context storage
- Industry-standard encryption (TLS 1.3)
- Data isolated per user
- Automatic 30-day deletion
- Located in secure data centers

### AI Processing Services
- OpenAI, Anthropic, or similar AI providers
- Data encrypted in transit
- Used only for generating responses
- Subject to their respective privacy policies

## Your Rights

You have the right to:

### Access
- Request what data we have stored about you
- View your stored email metadata through support request

### Deletion
- **Immediate Deletion**: Use "Clear All Data" in Settings to delete all local data
- **Cloud Deletion**: Email devang@saai.dev to request deletion of all Pinecone stored data
- **Automatic Deletion**: All data auto-deletes after 30 days

### Revoke Access
- Disconnect Gmail in extension settings
- Revoke permissions in Google Account settings
- Uninstall extension to stop all data collection

### Data Portability
- Export your task list from Task Management
- Request email metadata export via support

### Opt-Out
- Uninstall the extension to completely stop data collection
- All cloud data will be deleted within 30 days

## Security Measures

We implement comprehensive security:

### Encryption
- **In Transit**: HTTPS/TLS 1.3 for all communications
- **At Rest**: AES-256 encryption for stored data
- **End-to-End**: Secure OAuth 2.0 flow

### Access Control
- User-isolated data storage
- No cross-user data access
- Role-based access control (RBAC)
- Multi-factor authentication for admin access

### Monitoring
- Real-time security monitoring
- Automated threat detection
- Regular security audits
- Penetration testing

### Data Handling
- Principle of least privilege
- Regular security training for team
- Incident response procedures
- Data breach notification protocol

## Data Retention Schedule

| Data Type | Storage Location | Retention Period | Deletion Method |
|-----------|------------------|------------------|-----------------|
| Email content, subjects, senders, labels | Pinecone | 30 days | Automatic |
| OAuth tokens | Browser local storage | Until logout | Manual/Auto |
| Task list | Backend database | Until deleted by user | Manual |
| Chat history | Browser local storage | Until cleared | Manual |
| Usage analytics | Analytics service | 90 days (anonymized) | Automatic |
| Error logs | Backend logs | 7 days | Automatic |

## Children's Privacy

This extension is not intended for users under 13 years of age. We do not knowingly collect data from children under 13.

## Compliance

### Google API Services User Data Policy

Sa.AI's use and transfer of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

**Specifically**:
- ✅ We only access Gmail data necessary for our features
- ✅ We disclose all data usage in this policy
- ✅ We do not use Gmail data for advertising
- ✅ We do not allow humans to read your emails except for security, legal, or with explicit consent
- ✅ All data access is transparent and with your consent
- ✅ We use secure storage with defined retention periods

### GDPR Compliance (EU Users)

For users in the European Economic Area:

- **Legal Basis**: Consent (you explicitly connect Gmail)
- **Data Controller**: Sa.AI Team, devang@saai.dev
- **Data Processor**: Pinecone, OpenAI (AI processing)
- **Data Location**: United States (with EU-US Data Privacy Framework compliance)
- **Rights**: Access, rectification, erasure, restriction, portability, objection
- **Supervisory Authority**: Right to lodge complaint with your local data protection authority

### CCPA Compliance (California Users)

California residents have additional rights:
- Right to know what personal information is collected
- Right to know if personal information is sold (we do NOT sell)
- Right to delete personal information
- Right to opt-out of sale (not applicable - we don't sell)
- Right to non-discrimination

## Changes to This Policy

We may update this privacy policy periodically. You will be notified of significant changes through:

1. Extension update notifications
2. Email notification (if we have your contact)
3. Updated "Last Updated" date at the top
4. Prominent notice in the extension

**Major changes** (e.g., new data collection, longer retention) will require your explicit re-consent.

## Contact Us

For privacy concerns, questions, or data requests:

**Email**: devang@saai.dev  
**Subject Line**: "Privacy Request - Sa.AI for Gmail"  
**Response Time**: Within 5 business days

**For Data Deletion Requests**:
1. Include your Gmail address (for verification)
2. Specify what data you want deleted
3. We will confirm deletion within 48 hours

## Data Deletion Instructions

### Delete All Local Data
1. Open the Sa.AI extension
2. Click Settings (⚙️ icon)
3. Select "Clear All Data"
4. Confirm deletion
5. All browser data is immediately deleted

### Delete Cloud Data (Pinecone)
**Option 1: Wait for Auto-Deletion**
- All data automatically deletes after 30 days

**Option 2: Request Immediate Deletion**
1. Email devang@saai.dev with subject "Delete My Data"
2. Include your Gmail address
3. We will delete within 48 hours
4. You will receive confirmation

### Revoke Gmail Access
1. Go to [Google Account Permissions](https://myaccount.google.com/permissions)
2. Find "Sa.AI for Gmail"
3. Click "Remove Access"
4. Extension will stop accessing your Gmail

### Complete Removal
1. Uninstall the extension: `chrome://extensions/`
2. Find "Sa.AI for Gmail" → Click "Remove"
3. Revoke Gmail permissions (steps above)
4. Email us to request data deletion
5. All data will be removed within 48 hours

## Consent

By installing and using Sa.AI for Gmail, you explicitly consent to:

- ✅ Collection of email data (subject, sender, body, labels)
- ✅ Storage in Pinecone vector database for 30 days
- ✅ AI processing for context-aware assistance
- ✅ Data practices described in this policy

**You can withdraw consent at any time** by:
- Uninstalling the extension
- Revoking Gmail permissions
- Requesting data deletion

---

## Summary (TL;DR)

**What We Store**:
- Email subjects, senders, body content, labels
- Stored in encrypted Pinecone database
- **Kept for 30 days**, then auto-deleted

**Why We Store It**:
- To provide intelligent, context-aware AI assistance
- To remember your email history for better responses

**Your Control**:
- Clear all data anytime in Settings
- Request deletion by emailing devang@saai.dev
- Automatic deletion after 30 days
- Uninstall extension to stop all collection

**Security**:
- Encrypted in transit (HTTPS) and at rest (AES-256)
- User-isolated data
- Regular security audits
- No data selling, ever

---

**Effective Date**: October 26, 2024  
**Version**: 2.0

This privacy policy is subject to change. Continued use after changes constitutes acceptance of the updated policy.

**Questions?** Email devang@saai.dev
