# Input Tab Task Creation - Debugging Guide

## Issue
When typing a message in the Input tab and clicking send, nothing happens:
- Message stays in input box
- No task is created
- Counters (Tasks, Runs, Memory) don't update
- No error message shown

## What We've Added

### Frontend Improvements
1. **Better Error Handling**
   - Errors now show in chat as assistant messages
   - Message is restored if task creation fails
   - Comprehensive console logging

2. **Input Validation**
   - Checks for empty messages
   - Checks for missing projectId
   - Clear error messages

3. **Logging**
   - Logs when `handleSendMessage` is called
   - Logs mutation state
   - Logs all error details

### Backend Improvements
1. **Request Logging**
   - Logs when request is received
   - Logs parsed request body
   - Logs projectId, type, payload

2. **Response Logging**
   - Logs successful task creation with taskId
   - Logs all errors with details

3. **Better Error Messages**
   - Validation errors include field-level details
   - All errors include a `message` field

## How to Debug

### Step 1: Check Browser Console
When you click send, you should see:
```
[InputTab] handleSendMessage called { message: "...", hasMessage: true, projectId: "..." }
[InputTab] Calling sendTaskMutation.mutate with: { content: "...", projectId: "...", mutationState: "idle" }
[InputTab] mutationFn called - Sending task: { projectId: "...", content: "...", contentLength: ... }
[InputTab] Request body: {"type":"message","payload":{"content":"..."},"goalId":null}
[InputTab] About to call fetchApi: { method: 'POST', url: '/api/projects/.../tasks' }
```

**If you don't see these logs:**
- The click handler isn't firing
- Check if the button is disabled
- Check if there's a JavaScript error preventing execution

**If you see an error:**
- Check the error message
- Look for network errors (CORS, 404, 500, etc.)
- Check if the API URL is correct

### Step 2: Check Network Tab
1. Open browser DevTools → Network tab
2. Click send
3. Look for a request to `/api/projects/{id}/tasks`
4. Check:
   - **Status Code**: Should be 201 (created) or 400/500 (error)
   - **Request Payload**: Should have `{ type: "message", payload: { content: "..." }, goalId: null }`
   - **Response**: Should have `{ success: true, data: { ... } }` or error details

**If no request appears:**
- The mutation isn't being called
- Check browser console for JavaScript errors
- Check if `fetchApi` is working

**If request fails:**
- Check status code and response body
- Look for validation errors
- Check CORS headers

### Step 3: Check Server Logs
In Render dashboard logs, you should see:
```
[POST /api/projects/:id/tasks] Request received { projectId: "...", body: {...}, bodyKeys: [...] }
[POST /api/projects/:id/tasks] Parsed request: { projectId: "...", type: "message", ... }
[POST /api/projects/:id/tasks] Task created successfully: { taskId: "...", ... }
```

**If you don't see these logs:**
- Request isn't reaching the server
- Check if route is mounted correctly
- Check if server is running

**If you see validation errors:**
- Check the error details
- Verify request body format matches schema
- Check if `type` field is valid

**If you see database errors:**
- Check database connection
- Check if `tasks` table exists
- Check if `tasksRepo.enqueueTask` is working

## Common Issues

### Issue 1: "Validation failed"
**Symptoms:** 400 error with validation details
**Cause:** Request body doesn't match schema
**Fix:** Check that request has:
- `type`: string (required)
- `payload`: object (optional, defaults to {})
- `goalId`: string | null (optional)

### Issue 2: "Failed to create task"
**Symptoms:** 500 error
**Cause:** Database error or taskRepo failure
**Fix:** 
- Check database connection
- Check if `tasks` table exists
- Check `tasksRepo.enqueueTask` implementation

### Issue 3: No request in Network tab
**Symptoms:** Nothing happens when clicking send
**Cause:** Frontend issue
**Fix:**
- Check browser console for errors
- Verify `handleSendMessage` is called
- Check if mutation is set up correctly

### Issue 4: CORS error
**Symptoms:** Network error about CORS
**Cause:** Server CORS configuration
**Fix:** Check `server/src/index.ts` CORS settings

## Next Steps After Debugging

Once you identify the issue:

1. **If it's a validation error:**
   - Fix the request body format
   - Or update the schema to accept the format

2. **If it's a database error:**
   - Check database connection
   - Run migrations if needed
   - Verify table structure

3. **If it's a routing error:**
   - Verify route is mounted
   - Check route path matches frontend call
   - Check middleware (rate limiting, etc.)

4. **If task is created but not processed:**
   - This is the worker issue (see NEXT_PHASE_ROADMAP.md)
   - Task is created but no worker picks it up

## Testing Checklist

After deploying these changes:

- [ ] Type a message and click send
- [ ] Check browser console for logs
- [ ] Check Network tab for API request
- [ ] Check server logs for request/response
- [ ] Verify task appears in database (if possible)
- [ ] Check if error message appears in chat (if error occurs)
- [ ] Verify message is cleared on success
- [ ] Verify message is restored on error

