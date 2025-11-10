# Critical Fixes for Production Issues

## Issues Identified

1. **404 on `/api/health`** - Catch-all route was intercepting API routes
2. **404 on hierarchy endpoint** - Routes may not be matching correctly
3. **Database error on project creation** - Need better error logging
4. **No logs appearing in Render** - Logs not being flushed to stdout/stderr

## Fixes Applied

### 1. Fixed Static File Handler Intercepting API Routes
**File**: `server/index.ts`

**Problem**: The catch-all `app.get('*', ...)` was returning 404 for API routes before they could be handled.

**Fix**: Changed the catch-all to call `next()` for API routes, allowing them to fall through to the 404 handler if not matched.

```typescript
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next(); // Let API routes fall through to 404 handler
  }
  // ... serve index.html for SPA
});
```

### 2. Enhanced Logging with Explicit Flushing
**Files**: `server/index.ts`, `server/routes/projects-hierarchy.ts`, `server/api/projects.ts`

**Problem**: Logs weren't appearing in Render because they weren't being flushed.

**Fix**: Added explicit `process.stdout.write()` and `process.stderr.write()` calls to force flush logs immediately.

### 3. Improved Error Handling
**File**: `server/index.ts`

**Problem**: Errors weren't being logged with full details.

**Fix**: 
- Added request ID tracking to error handler
- Added explicit stderr flushing for errors
- Added stack trace logging

### 4. Enhanced 404 Handler
**File**: `server/index.ts`

**Problem**: 404s weren't being logged, making debugging difficult.

**Fix**: Added logging to 404 handler with request ID and path.

## Testing After Deploy

1. **Test health endpoint:**
   ```bash
   curl https://morteliv.com/api/health
   ```
   Should return: `{"status":"ok","timestamp":"...","uptime":...}`

2. **Test hierarchy endpoint:**
   - Open a project in the UI
   - Check if Progress tab loads without 404
   - Check Render logs for `[requestId] [GET /api/hierarchy/:id]` entries

3. **Test project creation:**
   - Create a new project with plan
   - Click "Confirm & Create"
   - Check for detailed error messages (not just "Database error")
   - Check Render logs for database error details

4. **Verify logs:**
   - Check Render logs after making requests
   - Should see entries with `[requestId]` format
   - Should see error details if database errors occur

## Expected Log Format

After these fixes, logs should appear like:
```
[abc123] GET /api/health - no origin
[abc123] GET /api/health - 200 (5ms)
[def456] [GET /api/hierarchy/:id] Fetching hierarchy for project 1
[def456] [GET /api/hierarchy/:id] Returning hierarchy for project 1 with 0 features
[ghi789] [POST /api/projects] Request received
[ghi789] [POST /api/projects] Database error: {"code":"P2002","message":"..."}
```

## If Issues Persist

1. **Check if routes are being loaded:**
   - Look for startup message: `✅ Titan backend server started`
   - Check if routes file is being imported

2. **Check database connection:**
   - Look for "Database connection failed" in logs
   - Verify DATABASE_URL environment variable

3. **Check Prisma schema:**
   - Verify ProjectCharter table exists
   - Check if migrations have been run

4. **Check route mounting:**
   - Verify `server/routes.ts` exports the router
   - Verify `server/index.ts` imports and uses it

