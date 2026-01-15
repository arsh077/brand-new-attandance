# 🚀 Build and Deploy Instructions

## Current Issue
Subdomain is created but showing main domain dashboard because no files are uploaded yet.

## Solution: Upload Build Files

### Step 1: Build Project Locally

Open terminal in project folder:

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

This creates a `dist` folder with all files.

### Step 2: Upload to cPanel

#### Option A: File Manager (Recommended)

1. **Login to Hostinger/cPanel**
2. **Go to File Manager**
3. **Navigate to**: `/public_html/attendance/`
4. **Upload ALL files from `dist` folder**:
   - `index.html`
   - `assets/` folder (entire folder)
   - `favicon.png`
   - Any other files

#### Option B: FTP Upload

Use FileZilla or any FTP client:
- Host: `ftp.legalsuccessindia.com`
- Upload to: `/public_html/attendance/`
- Upload: All files from `dist` folder

### Step 3: Verify File Structure

In `/public_html/attendance/` you should have:

```
attendance/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── logo.png
└── favicon.png
```

**IMPORTANT**: Files should be directly in `attendance/` folder, NOT in `attendance/dist/`

### Step 4: Test

Visit: **https://attendance.legalsuccessindia.com**

Should show your attendance portal login page!

---

## 🔍 Troubleshooting

### Still showing main domain?

**Check 1: Files in correct location?**
- Go to File Manager
- Check `/public_html/attendance/`
- `index.html` should be there

**Check 2: Clear cache**
- Clear browser cache
- Try incognito/private mode
- Hard refresh: Ctrl + Shift + R

**Check 3: Wait for DNS**
- Sometimes takes 5-10 minutes
- Try again after a few minutes

---

## 📦 What Files to Upload

From your `dist` folder, upload:

✅ `index.html` - Main HTML file  
✅ `assets/` - Entire folder with JS/CSS  
✅ `favicon.png` - Site icon  
✅ Any other files in `dist`

❌ Don't upload:
- `node_modules/`
- `src/`
- `.git/`
- Development files

---

## ✅ After Upload

1. Visit: `https://attendance.legalsuccessindia.com`
2. Should see: Login page with logo
3. Test login with authorized emails
4. Done!

---

## 🎯 Quick Checklist

- [ ] Built project: `npm run build`
- [ ] Opened File Manager in Hostinger
- [ ] Navigated to `/public_html/attendance/`
- [ ] Uploaded all files from `dist` folder
- [ ] Verified `index.html` is in `attendance/` folder
- [ ] Cleared browser cache
- [ ] Tested: `https://attendance.legalsuccessindia.com`
- [ ] Login working

---

**Once files are uploaded, your attendance portal will be live!** 🚀
