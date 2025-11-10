# Render Static Site Configuration - Complete Setup Guide

## Current Issue
Static site "Moduvo" failing with exit code 254. Build command: `npm install && npm run build`, publish directory: `dist`.

## Root Cause
1. Main `package.json` `build` script builds server + worker + frontend (not needed for static site)
2. Vite outputs to `dist/public` by default, but Render expects `dist`
3. The build tries to build server/worker which may fail in static site environment

## Fix Applied in Code

### 1. Added Static Site Build Script
**File**: `package.json`
```json
"build:static": "vite build"
```

### 2. Updated Vite Configuration
**File**: `vite.config.ts`
- Now checks `STATIC_SITE_BUILD` environment variable
- If set: outputs to `dist` (for static sites)
- If not set: outputs to `dist/public` (for full-stack)

## Required Render Configuration Update

### Step 1: Update Build Command

In Render dashboard → "Moduvo" static site → Settings:

**Current Build Command:**
```
npm install && npm run build
```

**Change To:**
```
npm install && STATIC_SITE_BUILD=true npm run build:static
```

### Step 2: Verify Publish Directory

**Publish Directory**: Should be set to `dist`

### Step 3: Optional - Add Environment Variable

You can also add `STATIC_SITE_BUILD=true` as an environment variable in Render settings (instead of in the build command).

## Alternative: Simpler Build Command (If Above Doesn't Work)

If the env var approach doesn't work, use this simpler approach:

**Build Command:**
```
cd client && npm install && npm run build
```

**Publish Directory:** Change to `client/dist`

**Note**: This requires a `package.json` in the `client` directory, which doesn't currently exist.

## Verification Steps

After updating Render configuration:

1. **Trigger Manual Deploy**
   - Go to Render dashboard → "Moduvo" service
   - Click "Manual Deploy" → "Deploy latest commit"

2. **Check Build Logs**
   - Watch the deploy logs in real-time
   - Look for:
     - `npm install` completing successfully
     - `vite build` running
     - Build output in `dist` directory
     - No errors

3. **Verify Build Output**
   - After successful build, check that `dist` directory contains:
     - `index.html`
     - `assets/` directory with JS/CSS files

4. **Test Site**
   - Visit `https://morteliv.com` (or your configured domain)
   - Site should load correctly

## Expected Build Output

After successful build, you should see in logs:
```
✓ built in X.XXs
```

And the `dist` directory should contain:
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
```

## Troubleshooting

### If Build Still Fails:

1. **Check Node Version**
   - Add to `package.json`:
   ```json
   "engines": {
     "node": ">=20.0.0"
   }
   ```

2. **Check for Missing Dependencies**
   - Ensure all frontend dependencies are in root `package.json`
   - Check if any peer dependencies are missing

3. **Try Alternative Build Command**
   ```
   npm ci && STATIC_SITE_BUILD=true npm run build:static
   ```

4. **Check Build Logs for Specific Errors**
   - Look for TypeScript errors
   - Look for missing module errors
   - Look for path resolution errors

## Current Configuration Summary

✅ **Code Changes**: Already pushed to GitHub
- `build:static` script added
- Vite config updated to support static site builds

⏳ **Render Configuration**: Needs to be updated
- Build command needs to use `build:static`
- Environment variable `STATIC_SITE_BUILD=true` needs to be set

## Next Steps

1. Update Render "Moduvo" service build command as described above
2. Trigger manual deploy
3. Check build logs for errors
4. Verify site loads correctly

