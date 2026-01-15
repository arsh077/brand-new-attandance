# 🚀 Vercel Environment Variables Setup

## Important: Pusher Credentials Vercel Mein Add Karein

Local mein `.env.local` file hai, lekin Vercel pe deploy karne ke liye **environment variables** Vercel dashboard mein add karne honge.

## Step-by-Step Guide:

### Method 1: Vercel Dashboard (Recommended)

1. **Vercel Dashboard kholen:**
   - Go to: https://vercel.com/dashboard
   - Apna project select karein: `legal-success-india-attendance-portal`

2. **Settings tab pe jao:**
   - Top menu mein **"Settings"** click karein

3. **Environment Variables section:**
   - Left sidebar mein **"Environment Variables"** click karein

4. **Add New Variable:**
   
   **Variable 1:**
   - **Key:** `VITE_PUSHER_APP_KEY`
   - **Value:** `29d18e6ae1f9ed4b02ce`
   - **Environments:** Select all (Production, Preview, Development)
   - Click **"Save"**

   **Variable 2:**
   - **Key:** `VITE_PUSHER_CLUSTER`
   - **Value:** `ap2`
   - **Environments:** Select all (Production, Preview, Development)
   - Click **"Save"**

5. **Redeploy:**
   - Go to **"Deployments"** tab
   - Latest deployment pe 3 dots (...) click karein
   - **"Redeploy"** select karein
   - Confirm karein

### Method 2: Vercel CLI (Alternative)

```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Login to Vercel
vercel login

# Add environment variables
vercel env add VITE_PUSHER_APP_KEY
# Paste: 29d18e6ae1f9ed4b02ce
# Select: Production, Preview, Development (all)

vercel env add VITE_PUSHER_CLUSTER
# Paste: ap2
# Select: Production, Preview, Development (all)

# Deploy with new env variables
vercel --prod
```

## Verification:

### After Deployment:

1. **Open your live site:**
   - `https://attendance.legalsuccessindia.com`

2. **Open browser console (F12)**

3. **Check for message:**
   ```
   ✅ Pusher connected successfully
   ```

### If You See:
```
⚠️ Pusher credentials not found. Using fallback polling mechanism.
```

**Then:**
- Environment variables sahi se add nahi hue
- Vercel dashboard check karein
- Redeploy karein

## Testing After Deployment:

### Tab 1 - Admin:
```
URL: https://attendance.legalsuccessindia.com
Email: Info@legalsuccessindia.com
Password: Legal@000
```

### Tab 2 - Employee:
```
URL: https://attendance.legalsuccessindia.com
Email: lsikabir27@gmail.com
Password: Legal@001
```

**Test:**
1. Tab 2 mein Clock In karein
2. Tab 1 mein **instantly** update dikhna chahiye
3. Console mein Pusher messages dikhne chahiye

## Important Notes:

### Security:
- ✅ `.env.local` file Git mein push **NAHI** hoti (secure)
- ✅ Vercel environment variables encrypted hain
- ✅ Pusher key public hai (safe to expose in frontend)
- ❌ Secret key kabhi frontend mein use **NAHI** karna

### Free Tier Limits:
- Vercel: Unlimited deployments
- Pusher: 100 connections, 200k messages/day
- Both are **more than enough** for your use case

## Troubleshooting:

### Problem: Env variables not working
**Solution:**
1. Vercel dashboard > Settings > Environment Variables
2. Check variables exist
3. Check spelling: `VITE_PUSHER_APP_KEY` (exact)
4. Redeploy project

### Problem: Still using polling
**Solution:**
1. Clear browser cache (Ctrl + Shift + Delete)
2. Hard refresh (Ctrl + Shift + R)
3. Check console for errors
4. Verify Pusher dashboard shows connection

### Problem: Connection failed
**Solution:**
1. Check Pusher dashboard: https://dashboard.pusher.com/apps/2102508
2. Verify app is active
3. Check "Enable client events" is ON
4. Check cluster is `ap2`

## Current Status:

- ✅ Pusher app created
- ✅ Client events enabled
- ✅ Local `.env.local` configured
- ⏳ **Next:** Add env variables to Vercel
- ⏳ **Then:** Deploy and test

## Quick Deploy Command:

```bash
# After adding env variables to Vercel dashboard
vercel --prod
```

---

**Next Step:** Add environment variables to Vercel dashboard, then deploy! 🚀
