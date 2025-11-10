# Testing Guide for Titan Site

Since I cannot directly browse websites or access Render logs, here's how to test and report issues:

## Quick Test Commands

### Option 1: Use the test script
```bash
./test-endpoints.sh https://morteliv.com
```

### Option 2: Manual curl commands

1. **Test health endpoint:**
```bash
curl https://morteliv.com/api/health
```

2. **Test projects list:**
```bash
curl https://morteliv.com/api/projects
```

3. **Test hierarchy endpoint (replace PROJECT_ID with actual ID):**
```bash
curl https://morteliv.com/api/hierarchy/PROJECT_ID
```

4. **Test project creation (this will create a test project):**
```bash
curl -X POST https://morteliv.com/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project","description":"Test description"}'
```

## What to Check

### 1. Website Functionality
- [ ] Can you access morteliv.com?
- [ ] Does the dashboard load?
- [ ] Can you see existing projects?
- [ ] Can you click on a project to view it?
- [ ] Does the Progress tab load (or show error)?
- [ ] Can you create a new project?
- [ ] Does "Draft Plan" work?
- [ ] Does "Confirm & Create" work?

### 2. Error Messages
If you see errors, note:
- What page/action triggered it
- The exact error message
- Any error codes shown
- Browser console errors (F12 → Console tab)

### 3. Render Logs
In Render dashboard:
- Go to your `moduvo-node` service
- Click "Logs" tab
- Filter for "Last hour" or "Last 24 hours"
- Look for:
  - Request logs with `[requestId]` format
  - Error messages
  - Database errors
  - Any stack traces

## What to Report

If you find issues, please provide:

1. **What you were trying to do:**
   - "I clicked 'Confirm & Create' after reviewing a plan"

2. **What happened:**
   - "Got a red error message saying 'Database error'"
   - "The page just hung/spun forever"
   - "Got a 404 error"

3. **Error details:**
   - Exact error message
   - Any error codes (like `ERR_DB_P2002`)
   - Browser console errors

4. **Render logs:**
   - Copy/paste relevant log entries
   - Look for entries with timestamps matching when you tried the action
   - Include any stack traces

5. **Network tab (optional but helpful):**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Try the action again
   - Find the failed request
   - Share the request URL, status code, and response body

## Common Issues to Check

### Issue: "Database error" when creating project
**Check logs for:**
- Prisma error codes (P1001, P2002, etc.)
- Database connection errors
- Schema mismatch errors

### Issue: 404 on hierarchy endpoint
**Check:**
- Is the route mounted in `server/routes.ts`?
- Are logs showing the request reaching the server?

### Issue: No logs appearing
**Check:**
- Are there ANY logs in Render (even old ones)?
- Is the service actually running?
- Are logs being written to stdout/stderr?

## Quick Diagnostic Commands

If you have SSH access to Render or can run commands:

```bash
# Check if server is running
curl https://morteliv.com/api/health

# Check recent logs (if you have access)
# This depends on your Render setup
```

## Next Steps

Once you've tested and gathered information:
1. Share the error messages you see
2. Share relevant Render log entries
3. Share any browser console errors
4. I'll analyze and provide fixes

