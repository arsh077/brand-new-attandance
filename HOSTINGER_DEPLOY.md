# 🚀 Hostinger Deployment Guide - Real-Time Attendance

## ✅ GitHub Already Updated

Latest code already pushed hai:
```
https://github.com/arsh077/legal-success-india-attandnce.git
```

---

## 📦 Hostinger Deployment Steps

### Method 1: File Manager Upload (Recommended)

#### Step 1: Build Project Locally

```bash
npm run build
```

Ye `dist` folder create karega with production files.

#### Step 2: Hostinger File Manager

1. **Login to Hostinger:**
   - Go to: https://hpanel.hostinger.com/
   - Login karein

2. **File Manager kholen:**
   - Website section mein jao
   - "File Manager" click karein

3. **Navigate to attendance folder:**
   ```
   public_html/attendance/
   ```

4. **Upload Files:**
   - `dist` folder ke **andar ki saari files** select karein
   - Upload karein (drag & drop ya upload button)
   - Files:
     - `index.html`
     - `assets/` folder
     - All other files from `dist/`

5. **Important: .htaccess File**
   
   Create new file: `.htaccess` in `public_html/attendance/`
   
   Content:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

#### Step 3: Environment Variables

**Important:** Pusher credentials add karne hain!

**Option A: JavaScript mein directly (Quick fix):**

File Manager mein `assets/index-*.js` file kholen aur search karein:
```
YOUR_PUSHER_APP_KEY
```

Replace karein:
```javascript
VITE_PUSHER_APP_KEY: "29d18e6ae1f9ed4b02ce"
VITE_PUSHER_CLUSTER: "ap2"
```

**Option B: Build with env variables (Better):**

Local mein `.env.production` file banao:
```env
VITE_PUSHER_APP_KEY=29d18e6ae1f9ed4b02ce
VITE_PUSHER_CLUSTER=ap2
```

Phir build karein:
```bash
npm run build
```

Upload karein.

---

### Method 2: Git Deployment (Advanced)

#### Step 1: Hostinger SSH Access

1. **Enable SSH:**
   - Hostinger panel → Advanced → SSH Access
   - Enable karein

2. **SSH Login:**
   ```bash
   ssh u123456789@your-domain.com
   ```

#### Step 2: Clone Repository

```bash
cd public_html/attendance
git clone https://github.com/arsh077/legal-success-india-attandnce.git temp
mv temp/* .
rm -rf temp
```

#### Step 3: Install & Build

```bash
# Node.js version check
node -v

# If Node.js not available, use NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# Install dependencies
npm install

# Create .env.production
echo "VITE_PUSHER_APP_KEY=29d18e6ae1f9ed4b02ce" > .env.production
echo "VITE_PUSHER_CLUSTER=ap2" >> .env.production

# Build
npm run build

# Move build files
mv dist/* .
```

---

### Method 3: GitHub Actions Auto-Deploy (Best)

Create `.github/workflows/hostinger-deploy.yml`:

```yaml
name: Deploy to Hostinger

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm install
    
    - name: Build
      env:
        VITE_PUSHER_APP_KEY: ${{ secrets.VITE_PUSHER_APP_KEY }}
        VITE_PUSHER_CLUSTER: ap2
      run: npm run build
    
    - name: Deploy to Hostinger via FTP
      uses: SamKirkland/FTP-Deploy-Action@4.3.0
      with:
        server: ftp.your-domain.com
        username: ${{ secrets.FTP_USERNAME }}
        password: ${{ secrets.FTP_PASSWORD }}
        local-dir: ./dist/
        server-dir: /public_html/attendance/
```

**GitHub Secrets add karein:**
- `VITE_PUSHER_APP_KEY` = `29d18e6ae1f9ed4b02ce`
- `FTP_USERNAME` = Your Hostinger FTP username
- `FTP_PASSWORD` = Your Hostinger FTP password

---

## 🔧 Post-Deployment Configuration

### 1. Check .htaccess

Ensure `.htaccess` file hai for React Router:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

### 2. Verify Pusher Credentials

Browser console (F12) mein check karein:
```
✅ Pusher connected successfully
```

Agar nahi dikha toh:
- Build files mein credentials check karein
- `.env.production` file verify karein
- Rebuild karein

### 3. Test Real-Time

**Tab 1:** Admin login
**Tab 2:** Employee login → Clock In
**Tab 1:** Instant update dikhna chahiye

---

## 🌐 Access URLs

**Production URL:**
```
https://attendance.legalsuccessindia.com
```

**Test Credentials:**

**Admin:**
- Email: `Info@legalsuccessindia.com`
- Password: `Legal@000`

**Employee (Kabir):**
- Email: `lsikabir27@gmail.com`
- Password: `Legal@001`

---

## 🐛 Troubleshooting

### Problem 1: Blank Page

**Solution:**
- Check `.htaccess` file
- Verify all files uploaded
- Check browser console for errors

### Problem 2: Pusher Not Connected

**Console shows:**
```
⚠️ Pusher credentials not found
```

**Solution:**
```bash
# Rebuild with env variables
npm run build

# Or manually edit index.js file
# Replace YOUR_PUSHER_APP_KEY with actual key
```

### Problem 3: 404 Errors on Refresh

**Solution:**
- Add `.htaccess` file (see above)
- Enable mod_rewrite in Hostinger

### Problem 4: Real-Time Not Working

**Check:**
1. Pusher connected? (console)
2. Internet connection?
3. Pusher dashboard: https://dashboard.pusher.com/apps/2102508
4. Try hard refresh: Ctrl + Shift + R

---

## 📊 Verification Checklist

After deployment:

- [ ] Site loads: https://attendance.legalsuccessindia.com
- [ ] Login working (Admin & Employee)
- [ ] Dashboard showing
- [ ] Console: "Pusher connected successfully"
- [ ] Clock In/Out working
- [ ] Real-time updates working (2 tabs test)
- [ ] Duration counting
- [ ] Late detection working
- [ ] Mobile responsive

---

## 🔄 Future Updates

Jab bhi code update karna ho:

**Method 1: Manual**
```bash
npm run build
# Upload dist/ files to Hostinger
```

**Method 2: Git + SSH**
```bash
ssh u123456789@your-domain.com
cd public_html/attendance
git pull
npm install
npm run build
mv dist/* .
```

**Method 3: GitHub Actions**
- Just push to GitHub
- Auto-deploy ho jayega

---

## 📞 Support

**Hostinger Support:**
- Live Chat: https://www.hostinger.com/
- Email: support@hostinger.com

**Pusher Support:**
- Dashboard: https://dashboard.pusher.com/
- Docs: https://pusher.com/docs/

---

## ✅ Quick Deploy Command

```bash
# Build
npm run build

# Files to upload:
# dist/index.html
# dist/assets/*
# dist/.htaccess (create manually)
```

**Upload to:** `public_html/attendance/`

**Test:** https://attendance.legalsuccessindia.com

---

**Status:** 🟢 Ready to Deploy
**GitHub:** ✅ Updated
**Build:** ✅ Ready
**Pusher:** ✅ Configured

Deploy karein! 🚀
