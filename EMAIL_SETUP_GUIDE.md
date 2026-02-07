# 📧 Email Service Setup Guide

## ✅ What's Already Done

The email service is **fully implemented** and ready to use! Here's what's been set up:

1. **✅ Email Service** (`emailService.js`)
   - Beautiful HTML email templates
   - Individual employee monthly reports
   - Consolidated reports for HR/Founder
   - Professional styling with statistics

2. **✅ API Endpoint** (`/api/send-monthly-attendance`)
   - Send to individual employee
   - Send to all employees
   - Automatic consolidated reports to HR

3. **✅ Automated Scheduler**
   - Runs automatically at 11:59 PM on the last day of every month
   - IST timezone configured
   - Sends to all employees + HR/Founder

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Get Email Credentials

#### Option A: Gmail (Recommended)

1. Go to your Google Account: https://myaccount.google.com/
2. Click **Security** → **2-Step Verification** (enable if not already)
3. Scroll down to **App passwords**
4. Click **App passwords**
5. Select app: **Mail**, Select device: **Other** (type "Visitor Management")
6. Click **Generate**
7. **Copy the 16-character password** (you'll need this!)

#### Option B: Outlook/Hotmail

1. Go to: https://account.microsoft.com/security
2. Enable **Two-step verification**
3. Go to **App passwords**
4. Create new app password
5. Copy the generated password

#### Option C: Custom SMTP

Use your company's SMTP server credentials.

---

### Step 2: Create `.env` File

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-16-char-app-password
   EMAIL_FROM=noreply@yourcompany.com
   ```

   **Important:** 
   - For Gmail, use the **16-character App Password**, NOT your regular password
   - Don't add spaces in the app password
   - Keep EMAIL_PORT as 587 (TLS)

---

### Step 3: Restart the Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run server
```

You should see:
```
✅ Email configuration is valid
📧 Email service configured and ready
⏰ Automated monthly email scheduler activated (IST timezone)
```

---

## 🧪 Testing the Email Service

### Test 1: Send to Specific Employee

Use Postman or curl:

```bash
curl -X POST http://localhost:3000/api/send-monthly-attendance \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "EMP001",
    "month": "01",
    "year": "2026"
  }'
```

### Test 2: Send to All Employees

```bash
curl -X POST http://localhost:3000/api/send-monthly-attendance \
  -H "Content-Type: application/json" \
  -d '{
    "sendToAll": true,
    "month": "01",
    "year": "2026"
  }'
```

---

## 📊 What the Emails Look Like

### Individual Employee Report

**Subject:** Monthly Attendance Report - January 2026

**Contains:**
- Employee details (name, ID, department)
- Statistics cards:
  - Days Present
  - Days Absent
  - Total Hours Worked
- Daily attendance table with:
  - Date
  - Check-in time
  - Check-out time
  - Hours worked
  - Status (Present/Absent)
- Professional purple gradient design

### Consolidated HR Report

**Subject:** Consolidated Attendance Report - January 2026

**Contains:**
- Summary table for all employees
- Employee ID, Name, Department
- Present days, Absent days
- Total hours worked
- Attendance percentage (color-coded: green ≥80%, yellow ≥60%, red <60%)

---

## ⏰ Automated Monthly Sending

The system automatically sends emails on the **last day of every month at 11:59 PM IST**.

**How it works:**
1. Cron job runs on days 28-31 at 11:59 PM
2. Checks if tomorrow is the 1st (meaning today is the last day)
3. If yes, sends emails to:
   - All active employees (individual reports)
   - HR and Founders (consolidated reports)

**Cron Schedule:** `59 23 28-31 * *` (IST timezone)

**To disable:** Comment out the `cron.schedule()` block in `server.js`

---

## 🔧 Troubleshooting

### "Email not configured" message

**Problem:** Environment variables not set

**Solution:**
1. Make sure `.env` file exists in the project root
2. Check that `EMAIL_USER` and `EMAIL_PASS` are set
3. Restart the server

### "Authentication failed" error

**Problem:** Wrong credentials or not using App Password

**Solution:**
- For Gmail: Use App Password (16 characters), NOT regular password
- For Outlook: Enable 2FA and create App Password
- Check for typos in `.env` file

### "Connection timeout" error

**Problem:** Firewall or wrong port

**Solution:**
- Check if port 587 is open
- Try port 465 with `secure: true` in `emailService.js`
- Disable antivirus/firewall temporarily to test

### Emails going to spam

**Solution:**
1. Add your sending email to contacts
2. Mark first email as "Not Spam"
3. Set up SPF/DKIM records (for production)

### No emails received

**Check:**
1. Employee has valid email in database
2. Check server logs for errors
3. Verify email credentials are correct
4. Test with a simple email first

---

## 📝 Manual Testing Commands

### Test Email Configuration

```javascript
// In browser console or Node REPL
const { testEmailConfig } = require('./emailService.js');
await testEmailConfig();
```

### Send Test Email (via API)

```bash
# January 2026 report for employee EMP001
curl -X POST http://localhost:3000/api/send-monthly-attendance \
  -H "Content-Type: application/json" \
  -d '{"employeeId": "EMP001", "month": "01", "year": "2026"}'
```

---

## 🎯 Production Deployment

### Environment Variables

Make sure to set these in your production environment:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-production-email@company.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@company.com
```

### Security Best Practices

1. **Never commit `.env` file** to version control
2. Use **App Passwords**, not regular passwords
3. Consider using a **dedicated email account** for the system
4. Set up **SPF and DKIM** records for your domain
5. Monitor email sending logs
6. Set up **rate limiting** if sending to many employees

### Recommended Email Providers

1. **Gmail** - Free, reliable, 500 emails/day limit
2. **SendGrid** - 100 emails/day free, better deliverability
3. **AWS SES** - Pay-as-you-go, very cheap
4. **Mailgun** - 5,000 emails/month free

---

## 📚 API Reference

### POST `/api/send-monthly-attendance`

**Send to specific employee:**
```json
{
  "employeeId": "EMP001",
  "month": "01",
  "year": "2026"
}
```

**Send to all employees:**
```json
{
  "sendToAll": true,
  "month": "01",
  "year": "2026"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "results": [
    {
      "employee": "John Doe",
      "email": "john@example.com",
      "success": true,
      "messageId": "<unique-id>"
    }
  ]
}
```

---

## 🎨 Customizing Email Templates

Email templates are in `emailService.js`:

- `generateEmployeeAttendanceHTML()` - Individual reports
- `generateConsolidatedReportHTML()` - HR reports

**To customize:**
1. Edit the HTML/CSS in these functions
2. Change colors, fonts, layout as needed
3. Add company logo
4. Modify statistics displayed

---

## ✅ Checklist

- [ ] Created `.env` file with email credentials
- [ ] Tested email configuration (server shows "Email service configured")
- [ ] Sent test email to yourself
- [ ] Verified email received and looks good
- [ ] Checked spam folder
- [ ] Tested sending to all employees
- [ ] Verified HR receives consolidated report
- [ ] Confirmed automated scheduler is active
- [ ] Documented credentials securely

---

## 🆘 Need Help?

**Common Issues:**

1. **"Module not found"** → Run `npm install`
2. **"Email not configured"** → Check `.env` file
3. **"Authentication failed"** → Use App Password, not regular password
4. **No emails** → Check employee email addresses in database
5. **Emails in spam** → Add sender to contacts

**Still stuck?** Check the server logs for detailed error messages.

---

## 🎉 You're All Set!

Once configured, the system will:
- ✅ Automatically send monthly reports on the last day of each month
- ✅ Send individual reports to all employees
- ✅ Send consolidated reports to HR/Founder
- ✅ Include beautiful HTML formatting with statistics
- ✅ Work reliably with proper error handling

**Next Steps:**
1. Set up email credentials
2. Test with a single employee
3. Let it run automatically!

Happy emailing! 📧✨
