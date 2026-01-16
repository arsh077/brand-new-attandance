# ⚡ Quick Setup - Automated Deployment (5 Minutes)

## ✅ Automated Deployment Setup Ho Gaya!

Ab aapko sirf **FTP credentials add karne hain** GitHub mein, phir automatic deployment start ho jayegi!

---

## 🔑 Step 1: FTP Credentials Nikalo (2 minutes)

### Hostinger Panel:
```
1. Login: https://hpanel.hostinger.com/
2. Files → FTP Accounts
3. Note these details:
```

### FTP Details Example:
```
Server: ftp.legalsuccessindia.com
Username: u987654321
Password: YourPassword123
```

**Important:** Agar FTP account nahi hai toh create karo!

---

## 🔐 Step 2: GitHub Secrets Add Karo (3 minutes)

### 2.1 GitHub Repository Kholo:
```
https://github.com/arsh077/legal-success-india-attandnce
```

### 2.2 Settings → Secrets:
```
Settings tab → Secrets and variables → Actions → New repository secret
```

### 2.3 Add These 4 Secrets:

#### 1️⃣ FTP_SERVER
```
Name: FTP_SERVER
Value: ftp.legalsuccessindia.com
```
Click "Add secret"

#### 2️⃣ FTP_USERNAME
```
Name: FTP_USERNAME
Value: u987654321 (your FTP username)
```
Click "Add secret"

#### 3️⃣ FTP_PASSWORD
```
Name: FTP_PASSWORD
Value: YourPassword123 (your FTP password)
```
Click "Add secret"

#### 4️⃣ VITE_PUSHER_APP_KEY
```
Name: VITE_PUSHER_APP_KEY
Value: 29d18e6ae1f9ed4b02ce
```
Click "Add secret"

---

## ✅ Step 3: Test Deployment

### Option A: Automatic (Recommended)
```
Workflow already triggered by last push!
Check: GitHub → Actions tab
```

### Option B: Manual Trigger
```
1. GitHub → Actions tab
2. "Deploy to Hostinger" workflow
3. "Run workflow" button
4. Select branch: main
5. "Run workflow"
```

---

## 🎯 Expected Result:

### GitHub Actions:
```
🚚 Checkout code ✅
📦 Setup Node.js ✅
📥 Install dependencies ✅
🔨 Build project ✅
📤 Deploy to Hostinger via FTP ✅

Status: Success ✅
Time: 2-3 minutes
```

### Your Site:
```
https://attendance.legalsuccessindia.com
Should be updated automatically!
```

---

## 🚀 Future Updates:

Ab jab bhi code change karoge:

```bash
git add .
git commit -m "Your changes"
git push origin main

# Automatic deployment starts! 🎉
# Wait 2-3 minutes
# Site updated!
```

---

## 📸 Visual Guide:

### GitHub Secrets Page:
```
Repository → Settings
    ↓
Left sidebar: Secrets and variables
    ↓
Click: Actions
    ↓
Button: New repository secret
    ↓
Add all 4 secrets
```

### Actions Page:
```
Repository → Actions tab
    ↓
See: "Deploy to Hostinger" workflow
    ↓
Click on latest run
    ↓
See progress and logs
```

---

## ✅ Quick Checklist:

- [ ] Hostinger FTP credentials ready
- [ ] GitHub repository opened
- [ ] Settings → Secrets → Actions
- [ ] Added: FTP_SERVER
- [ ] Added: FTP_USERNAME
- [ ] Added: FTP_PASSWORD
- [ ] Added: VITE_PUSHER_APP_KEY
- [ ] Checked Actions tab
- [ ] Deployment successful
- [ ] Site working

---

## 🎉 Done!

**Setup Time:** 5 minutes (one-time)

**Future Deployments:** Automatic!

**Just:** `git push` → Wait 2-3 minutes → Live! ⚡

---

## 📞 Need Help?

**FTP Credentials:**
- Hostinger Panel: https://hpanel.hostinger.com/
- Support: 24/7 live chat

**GitHub Actions:**
- Check logs in Actions tab
- See error messages
- Fix and retry

---

**Ab FTP credentials add karo aur enjoy automatic deployments!** 🚀
