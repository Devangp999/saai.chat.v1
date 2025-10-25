# Chrome Web Store Submission Checklist

## ✅ COMPLETED

- [x] **Privacy Policy created** - See PRIVACY_POLICY.md
- [x] **Icons converted to PNG** - All icons now in PNG format (no JPG)
- [x] **Icon naming fixed** - Consistent naming (icon-16.png, icon-48.png, icon-128.png)
- [x] **Manifest.json updated** - All required fields added
- [x] **Permissions optimized** - Moved to optional where possible
- [x] **Debug files removed** - debug-403.md deleted
- [x] **README updated** - Professional public-facing documentation
- [x] **Store listing content created** - See STORE_LISTING.md
- [x] **Version format fixed** - Now using semver (2.1.0)
- [x] **Branding updated** - "Inbox assistant" throughout

## ⚠️ REQUIRES YOUR ACTION

### 1. OAuth Client ID ⚠️⚠️⚠️
**File**: `manifest.json` line 65
**Current**: Placeholder value
**Action**: Replace with your actual Google OAuth Client ID

```json
"client_id": "YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com"
```

### 2. Extension Key ⚠️⚠️⚠️
**File**: `manifest.json` line 64
**Current**: Placeholder key
**Action**: Will be generated during first Chrome Web Store upload, OR generate manually

### 3. Privacy Policy Hosting ⚠️⚠️⚠️
**File**: `PRIVACY_POLICY.md`
**Action**: Host at https://saai.dev/privacy-policy (or similar public URL)
**Update**: Add URL to Chrome Web Store listing

### 4. Create Store Assets 🎨
**Required Images:**
- [ ] 5 Screenshots (1280x800 PNG each)
- [ ] Promotional tile (440x280 PNG)
- [ ] Small tile (128x128 PNG)
- [ ] Marquee (1400x560 PNG)

**Tool Recommendations:**
- Figma
- Adobe XD
- Canva Pro
- Photoshop

### 5. Backend URL Verification 🔧
**Action**: Verify all production URLs in:
- `background.js` - Webhook endpoints
- `content.js` - API endpoints

**Ensure:**
- No localhost references
- All HTTPS
- Production-ready
- Endpoints responding

### 6. Final Testing 🧪
**Test on fresh Chrome profile:**
```bash
# Create test profile
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --user-data-dir=/tmp/test-profile

# Test:
1. Install extension
2. Complete OAuth flow
3. Test all features
4. Check console (F12) for errors
5. Verify no broken functionality
```

## 📦 PACKAGING FOR SUBMISSION

### Files to Include:
- ✅ manifest.json
- ✅ background.js
- ✅ content.js
- ✅ popup.js
- ✅ popup.html
- ✅ styles.css
- ✅ icons/ (all PNG files)
- ✅ README.md
- ✅ PRIVACY_POLICY.md

### Files to EXCLUDE:
- ❌ .git/
- ❌ .DS_Store
- ❌ node_modules/
- ❌ debug-403.md (already removed)
- ❌ STORE_LISTING.md (internal use only)
- ❌ IMPORTANT_BEFORE_SUBMISSION.md (internal use only)
- ❌ SUBMISSION_CHECKLIST.md (this file)

### Create ZIP:
```bash
cd /Users/god99/Desktop/Saai-extension\ v.2/saai.chat.v1

# Create clean ZIP
zip -r saai-extension-v2.1.0.zip \
  manifest.json \
  background.js \
  content.js \
  popup.js \
  popup.html \
  styles.css \
  icons/*.png \
  README.md \
  PRIVACY_POLICY.md \
  -x "*.DS_Store" "*.git*" "*node_modules*"

# Verify ZIP contents
unzip -l saai-extension-v2.1.0.zip
```

## 🚀 SUBMISSION STEPS

### Step 1: Chrome Web Store Developer Account
1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Pay $5 one-time registration fee (if first time)
3. Verify your email

### Step 2: Upload Extension
1. Click "New Item"
2. Upload your ZIP file
3. Wait for upload to complete

### Step 3: Store Listing
Fill in all fields:

**Product Details:**
- Extension name: Sa.AI for Gmail
- Summary: (132 chars) See STORE_LISTING.md
- Description: (detailed) See STORE_LISTING.md
- Category: Productivity
- Language: English

**Privacy:**
- Privacy policy URL: https://saai.dev/privacy-policy
- Data usage disclosure: Complete all fields
- Permission justifications: See STORE_LISTING.md

**Visual Assets:**
- Upload all 5 screenshots
- Upload promotional tile (440x280)
- Upload small tile (128x128)
- Upload marquee (1400x560)

**Support:**
- Email: devang@saai.dev
- Website: https://saai.dev

### Step 4: Submit for Review
1. Review all information
2. Click "Submit for Review"
3. Wait for review (typically 1-3 business days)

## 🎯 REVIEW TIMELINE

- **Upload**: Instant
- **Review**: 1-3 business days
- **Revisions** (if needed): 1-3 business days per revision
- **Total**: 1-7 business days typically

## ⚡ QUICK VALIDATION

Run these before submission:

```bash
cd /Users/god99/Desktop/Saai-extension\ v.2/saai.chat.v1

# 1. Verify no localhost
grep -r "localhost" . --include="*.js" --include="*.json"
# Should return: ZERO results

# 2. Check icons exist
ls -la icons/*.png
# Should show: icon-16.png, icon-48.png, icon-128.png

# 3. Validate manifest
cat manifest.json | python -m json.tool > /dev/null && echo "✅ Valid JSON"

# 4. Check version format
grep "version" manifest.json
# Should show: "version": "2.1.0"
```

## 📞 SUPPORT CONTACTS

**Chrome Web Store Support:**
- Forum: https://support.google.com/chrome_webstore
- Email: developer-support@google.com

**Extension Developer:**
- Email: devang@saai.dev
- Response: 24-48 hours

## ✅ FINAL CHECKLIST

Before clicking "Submit for Review":

- [ ] OAuth Client ID configured
- [ ] Extension key generated/set
- [ ] Privacy policy hosted and URL added
- [ ] All store assets created and uploaded
- [ ] Backend URLs verified (production)
- [ ] Tested on fresh profile
- [ ] No console errors
- [ ] All features working
- [ ] ZIP file created correctly
- [ ] Store listing complete
- [ ] Permission justifications written
- [ ] Data usage disclosed
- [ ] Support email active (devang@saai.dev)

## 🎉 POST-APPROVAL

Once approved:
1. Extension goes live in 30-60 minutes
2. Share the Chrome Web Store URL
3. Monitor reviews and ratings
4. Respond to user feedback
5. Plan updates and improvements

---

**ESTIMATED TIME TO COMPLETION: 2-4 hours of work + 1-3 days review**

**Good luck with your submission! 🚀**

