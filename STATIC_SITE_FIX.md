# Static Site Build Fix for Render

## Issue
Render static site "Moduvo" is failing with exit code 254. The build command is `npm install && npm run build` and publish directory is `dist`, but the actual build output goes to `dist/public`.

## Root Cause
The main `package.json` build script builds everything (server, worker, frontend), but for a static site we only need the frontend. Also, the output directory is `dist/public` but Render expects `dist`.

## Solution Options

### Option 1: Create a static-site-specific build script
Add to `package.json`:
```json
"build:static": "vite build"
```

And update Render build command to:
```
npm install && npm run build:static
```

### Option 2: Update vite.config.ts to output to `dist` instead of `dist/public`
Change the outDir in `vite.config.ts` from `dist/public` to `dist`.

### Option 3: Update Render publish directory
Change Render publish directory from `dist` to `dist/public`.

## Recommended Fix
Use Option 1 + Option 2:
1. Add `build:static` script that only builds frontend
2. Update vite config to output to `dist` for static site builds
3. Update Render build command to use `build:static`

