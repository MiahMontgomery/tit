# Web Service Frontend Deployment Fix

## Problem Identified

The frontend code changes ARE in the git commits (verified: `input-tab.tsx` modified in commits `fac92a9`, `33c76db`, etc.), but they're not appearing on morteliv.com because:

1. **Architecture:** morteliv.com uses Caddy to reverse proxy:
   - `/api/*` → `api:3000` (backend - `tit` service on Render)
   - Everything else → `web:80` (frontend - separate web service)

2. **Issue:** The `web` service Dockerfile was:
   - Running `npm run build` (builds server + worker + frontend, unnecessary)
   - Copying from `/app/dist` but frontend outputs to `dist/public` by default
   - Not using `STATIC_SITE_BUILD=true` to output to `dist/`

## Fix Applied

Updated `web/Dockerfile` to:
1. Use `STATIC_SITE_BUILD=true` environment variable
2. Run `npm run build:static` (frontend only, no server/worker)
3. Copy from `/app/dist` (correct location when `STATIC_SITE_BUILD=true`)

## What This Means

The `web` service on Render needs to:
1. **Rebuild** with the updated Dockerfile
2. **Deploy** the new image
3. The frontend will then show v3.0 with all the fixes

## Verification

After the `web` service rebuilds and deploys:

**Check morteliv.com:**
- ✅ Should see "DEPLOYMENT CHECK v3.0" banner
- ✅ Send button should work (spinner, input clears, message appears)
- ✅ Task creation should work

**If still seeing v2.0:**
- Check if `web` service is deploying (Render dashboard)
- Check `web` service build logs for errors
- Verify the Dockerfile change is in the deployed commit

## Alternative: Static Site Service

If there's a separate Render static site service (not a web service), then:
1. That service needs the build command: `npm install && STATIC_SITE_BUILD=true npm run build:static`
2. Publish directory: `dist`
3. Clear build cache and redeploy

## Next Steps

1. **If using Docker web service:** The Dockerfile fix is committed, just need to trigger rebuild
2. **If using static site service:** Update build command as documented in `FRONTEND_DEPLOYMENT_FIX.md`
3. **Check Render dashboard:** Find the `web` service or static site service and verify it's building/deploying

