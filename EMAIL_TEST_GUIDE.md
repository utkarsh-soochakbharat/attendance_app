# 📧 Quick Email Test Guide

## ✅ Test Data Created!

**Employee Details:**
- Name: Test Employee
- Email: myname@companyname.com (⚠️ **Change this to your real email!**)
- Employee ID: TEST001
- Attendance Records: 8 records for February 2026

---

## 🔧 Step 1: Update Email in Database

**Change the test email to YOUR email:**

```javascript
// Run this in PowerShell:
node -e "const db = require('better-sqlite3')('./visitor_management.db'); db.prepare('UPDATE employees SET email = ? WHERE employee_id = ?').run('YOUR-REAL-EMAIL@gmail.com', 'TEST001'); console.log('✅ Email updated!'); db.close();"
```

**Or manually:**
1. Open the database
2. Update the email for TEST001 to your real email address

---

## 🔧 Step 2: Configure Email in .env

Make sure your `.env` file has valid email credentials:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-char-app-password
EMAIL_FROM=your-email@gmail.com
```

**For Gmail:**
1. Go to https://myaccount.google.com/apppasswords
2. Generate app password
3. Copy it to EMAIL_PASS (remove spaces)

**For Google Workspace (@soochakbharat.com):**
- Use the same process but log in with your company email

---

## 🚀 Step 3: Restart Server

```bash
# Stop current server (Ctrl+C)
npm run server
```

Look for:
```
✅ Email configuration is valid
📧 Email service configured and ready
```

---

## 📧 Step 4: Send Test Email

### Option A: PowerShell Command

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/send-monthly-attendance" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"employeeId": "TEST001", "month": "02", "year": "2026"}'
```

### Option B: curl Command

```bash
curl -X POST http://localhost:3001/api/send-monthly-attendance \
  -H "Content-Type: application/json" \
  -d "{\"employeeId\": \"TEST001\", \"month\": \"02\", \"year\": \"2026\"}"
```

### Option C: Postman/Thunder Client

**URL:** `http://localhost:3001/api/send-monthly-attendance`  
**Method:** POST  
**Headers:** `Content-Type: application/json`  
**Body:**
```json
{
  "employeeId": "TEST001",
  "month": "02",
  "year": "2026"
}
```

---

## ✅ Expected Response

**Success:**
```json
{
  "success": true,
  "message": "Email sent successfully"
}
```

**Check your inbox!** You should receive a beautiful HTML email with:
- Employee details
- Statistics (days present, absent, total hours)
- Daily attendance table
- Professional purple gradient design

---

## 🐛 Troubleshooting

### "Email not configured"
- Check `.env` file exists
- Verify EMAIL_USER and EMAIL_PASS are set
- Restart server

### "Authentication failed"
- Use Gmail App Password, not regular password
- Remove spaces from app password
- Check email/password are correct

### "No email address"
- Update the employee email in database (see Step 1)

### Email not received
- Check spam folder
- Verify employee email is correct
- Check server logs for errors

---

## 🎯 Quick Update Email Command

**To change the test employee's email to yours:**

```powershell
node -e "const Database = require('better-sqlite3'); const db = new Database('./visitor_management.db'); db.prepare('UPDATE employees SET email = ? WHERE employee_id = ?').run('YOUR-EMAIL@gmail.com', 'TEST001'); console.log('✅ Updated!'); db.close();"
```

Replace `YOUR-EMAIL@gmail.com` with your actual email!

---

## 📊 View Test Data

**Check employees:**
```
http://localhost:3001/api/employees
```

**Check attendance:**
```
http://localhost:3001/api/attendance
```

---

**Ready to test? Follow the steps above!** 🚀
