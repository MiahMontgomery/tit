# Frontend Deployment Fix - morteliv.com

## Problem
Frontend changes (new Input tab features, task creation, Replit-style UI) are not appearing on morteliv.com. The site is still showing the old build with the debug banner.

## Root Cause
The Render static site service for morteliv.com is not building the frontend correctly. The build command may be:
1. Not running `build:frontend`
2. Building to the wrong directory
3. Not using the `STATIC_SITE_BUILD` environment variable

## Solution: Update Render Static Site Configuration

### Step 1: Find the Static Site Service
1. Go to Render dashboard: https://dashboard.render.com
2. Find the static site service (likely named "Moduvo" or "morteliv" or "tit-frontend")
3. Click on it to open settings

### Step 2: Update Build Command

**Current Build Command (likely):**
```
npm install && npm run build
```

**Change To:**
```
npm install && STATIC_SITE_BUILD=true npm run build:static
```

**OR (if the above doesn't work):**
```
npm install && npm run build:frontend && cp -r dist/public/* dist/
```

### Step 3: Verify Publish Directory

**Publish Directory should be:** `dist`

**If that doesn't work, try:** `dist/public`

### Step 4: Add Environment Variable (Optional but Recommended)

In Render dashboard → Your Static Site → Environment:
- **Key:** `STATIC_SITE_BUILD`
- **Value:** `true`

Then you can use the simpler build command:
```
npm install && npm run build:static
```

### Step 5: Clear Build Cache

1. In Render dashboard → Your Static Site → Settings
2. Scroll to "Build Cache"
3. Click "Clear Build Cache"
4. This forces a fresh build

### Step 6: Trigger Manual Deploy

1. In Render dashboard → Your Static Site
2. Click "Manual Deploy" → "Deploy latest commit"
3. Watch the build logs to verify:
   - `npm install` completes
   - `vite build` runs
   - Files are created in `dist/` directory
   - No build errors

## Verification

After deployment, check morteliv.com:

### ✅ What Should Appear (New Code)
1. **No red/yellow debug banner** (we removed it)
2. **Send button shows spinner** when clicked
3. **Input clears immediately** when sending message
4. **User message appears in chat** immediately
5. **Task creation works** (counters update)

### ❌ What You're Seeing (Old Code)
1. Red/yellow debug banner still visible
2. Send button doesn't show spinner
3. Input doesn't clear
4. Messages don't create tasks

## Alternative: Check Build Output Locally

If Render configuration is correct but still not working, verify the build locally:

```bash
# In project root
npm install
STATIC_SITE_BUILD=true npm run build:static

# Check output
ls -la dist/
ls -la dist/assets/

# Should see:
# - index.html
# - assets/ directory with JS/CSS files
```

If files are in `dist/public/` instead of `dist/`, the `STATIC_SITE_BUILD` env var isn't being set correctly.

## Quick Diagnostic Commands

Run these in Render build logs or locally:

```bash
# Check if STATIC_SITE_BUILD is set
echo $STATIC_SITE_BUILD

# Check build output location
npm run build:static
ls -la dist/

# Check vite config
cat vite.config.ts | grep STATIC_SITE_BUILD
```

## Expected Build Log Output

When build is working correctly, you should see:

```
> npm run build:static
> vite build

vite v5.x.x building for production...
✓ built in X.XXs
dist/index.html
dist/assets/index-XXXXX.js
dist/assets/index-XXXXX.css
```

## If Still Not Working

1. **Check Render build logs** for errors
2. **Verify git commit** is pushed (check `git log`)
3. **Try clearing browser cache** (hard refresh: Cmd+Shift+R)
4. **Check if multiple static sites** exist (maybe wrong one is being updated)
5. **Verify domain** is pointing to correct service

## Files Changed (That Should Be Deployed)

These files were modified and should be in the new build:
- `client/src/components/tabs/input-tab.tsx` - Added `onMutate`, removed debug banner
- `INPUT_TAB_REPLIT_SPEC.md` - New spec document

## Next Steps After Fix

Once frontend is deploying correctly:
1. Test send button functionality
2. Verify task creation works
3. Check that counters update
4. Then proceed with Replit-style features (nested proof cards, rollback buttons, etc.)

