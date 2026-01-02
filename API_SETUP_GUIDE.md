# API Setup Instructions for Blura Hub

## YouTube Data API v3

### How to Get YouTube API Key:

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create a New Project** (if you don't have one)
   - Click "Select a project" → "New Project"
   - Name it "Blura Hub" or any name you prefer
   - Click "Create"

3. **Enable YouTube Data API v3**
   - In the left sidebar, go to "APIs & Services" → "Library"
   - Search for "YouTube Data API v3"
   - Click on it and press "Enable"

4. **Create API Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "+ CREATE CREDENTIALS" → "API key"
   - Copy the generated API key
   - (Optional but recommended) Click "Restrict Key" and limit it to YouTube Data API v3

5. **Add to Blura Hub Settings**
   - Log into Blura Hub dashboard
   - Go to Settings page
   - Paste your YouTube API key in the "YouTube API Key" field
   - Click "Save Settings"

---

## X (Twitter) API v2

### How to Get X Bearer Token:

1. **Apply for X Developer Account**
   - Visit: https://developer.x.com/
   - Click "Sign up" or "Apply" for developer access
   - Fill out the application form explaining your use case (social media monitoring for security)
   - Wait for approval (usually takes 1-2 days)

2. **Create a New App**
   - Once approved, go to X Developer Portal: https://developer.x.com/en/portal/dashboard
   - Click "Create Project" → "Create App"
   - Name your app (e.g., "Blura Hub Monitor")

3. **Get Bearer Token**
   - In your app dashboard, go to "Keys and tokens" tab
   - Under "Bearer Token" section, click "Generate"
   - Copy the Bearer Token (starts with "AAAA...")
   - ⚠️ **Save it securely** - you won't be able to see it again!

4. **Set API Access Level**
   - Make sure your app has "Read" permissions
   - For monitoring, you need at least "Read" access to tweets

5. **Add to Blura Hub Settings**
   - Log into Blura Hub dashboard
   - Go to Settings page
   - Paste your X Bearer Token in the "X Bearer Token" field
   - Click "Save Settings"

---

## Gmail SMTP Configuration (for Email Alerts)

### How to Setup Gmail for Alerts:

1. **Enable 2-Factor Authentication**
   - Go to Google Account: https://myaccount.google.com/
   - Security → 2-Step Verification → Turn On

2. **Generate App Password**
   - After enabling 2FA, go to Security
   - Scroll to "App passwords" (or visit: https://myaccount.google.com/apppasswords)
   - Select app: "Mail"
   - Select device: "Other" and name it "Blura Hub"
   - Click "Generate"
   - Copy the 16-character password (remove spaces)

3. **Add to Blura Hub Settings**
   - SMTP Host: `smtp.gmail.com`
   - SMTP Port: `587`
   - SMTP Username: Your Gmail address (e.g., `your-email@gmail.com`)
   - SMTP Password: The app password you just generated
   - Click "Save Settings"

---

## Alternative SMTP Providers

If you don't want to use Gmail, you can use:

- **SendGrid**: https://sendgrid.com/ (Free tier: 100 emails/day)
- **Mailgun**: https://www.mailgun.com/ (Free tier: 5,000 emails/month)
- **AWS SES**: https://aws.amazon.com/ses/ (Pay as you go)

---

## Rate Limits & Quotas

### YouTube Data API v3:
- **Free Quota**: 10,000 units per day
- **Cost per search**: ~100 units
- **Monitoring frequency**: Every 15-30 minutes recommended
- **Estimated capacity**: ~100 checks per day for free

### X API v2 (Free Tier):
- **Tweet cap**: 500,000 tweets/month (read)
- **Rate limit**: 180 requests per 15 minutes
- **Monitoring frequency**: Every 15 minutes recommended
- **Enough for**: ~25-50 accounts monitoring

---

## Important Notes:

1. **Never commit API keys to version control**
2. **Store keys only in Blura Hub Settings (database encrypted)**
3. **Monitor your quota usage regularly**
4. **YouTube**: Check quota at https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas
5. **X**: Check usage at https://developer.x.com/en/portal/dashboard

---

## Troubleshooting:

### YouTube API Issues:
- Error 403: API not enabled → Enable YouTube Data API v3 in Cloud Console
- Error 400: Invalid key → Regenerate and check restrictions
- Quota exceeded: Wait 24 hours or upgrade to paid tier

### X API Issues:
- Error 401: Invalid bearer token → Regenerate token
- Error 429: Rate limit → Reduce monitoring frequency
- Error 403: Forbidden → Check app permissions

### Email Issues:
- "Authentication failed": Check app password is correct
- "Connection refused": Check SMTP host and port
- Gmail blocking: Enable "Less secure app access" or use app password

---

## Support:

For more help:
- YouTube API Docs: https://developers.google.com/youtube/v3
- X API Docs: https://developer.x.com/en/docs/twitter-api
- Contact: support@blurahub.com
