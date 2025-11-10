# Render Static Site Configuration Fix

## Current Issue
Static site "Moduvo" failing with exit code 254. Build command: `npm install && npm run build`, publish directory: `dist`.

## Problem
1. Main `package.json` build script builds server + worker + frontend (not needed for static site)
2. Vite outputs to `dist/public` but Render expects `dist`

## Fix Applied

### 1. Added Static Site Build Script
Added `build:static` script to `package.json` that only builds the frontend.

### 2. Updated Vite Config
Vite now checks `STATIC_SITE_BUILD` env var:
- If set: outputs to `dist` (for static sites)
- If not set: outputs to `dist/public` (for full-stack)

## Render Configuration Update Required

Update the "Moduvo" static site service in Render:

### Build Command
Change from:
```
npm install && npm run build
```

To:
```
npm install && STATIC_SITE_BUILD=true npm run build:static
```

### Publish Directory
Keep as: `dist`

## Alternative: Simpler Build Command

If the env var approach doesn't work, you can:

1. **Option A**: Update build command to:
   ```
   npm install && cd client && npm run build
   ```
   And update publish directory to: `client/dist`

2. **Option B**: Create a separate `package.json` in the `client` directory with its own build script

3. **Option C**: Update Render publish directory to `dist/public` and keep current build command

## Testing

After updating Render config:
1. Trigger a manual deploy
2. Check build logs for any errors
3. Verify files are in the `dist` directory
4. Check if the site loads correctly

