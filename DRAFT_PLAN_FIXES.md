# Draft Plan Endpoint Fixes - Deployment Checklist

## Changes Made

### Backend (`server/src/routes/reiterate.ts`)
1. ✅ Enhanced LLM prompt to request resources/gaps, assumptions, questions
2. ✅ Added 2.5-minute timeout wrapper around LLM call
3. ✅ Added API key check - returns clear error if `OPENROUTER_API_KEY` not set
4. ✅ Improved error handling with specific error codes:
   - `ERR_LLM_NOT_CONFIGURED` - API key missing
   - `ERR_LLM_TIMEOUT` - Request timed out
   - `ERR_LLM_AUTH` - Authentication failed
   - `ERR_LLM_NETWORK` - Network error
   - `ERR_LLM_INVALID_RESPONSE` - Invalid response format
5. ✅ Response structure includes new fields: `resourcesAndGaps`, `assumptions`, `questionsForUser`

### LLM Client (`server/core/tools/llm.ts`)
1. ✅ Updated timeout to 2.5 minutes (matching endpoint)
2. ✅ Enhanced prompt to explicitly request resources/gaps breakdown
3. ✅ Response parsing includes new fields with fallbacks

### Frontend (`client/src/components/reiteration-modal.tsx`)
1. ✅ Added "Create Project" button (primary, always visible)
2. ✅ "Draft Plan (AI)" button is secondary/outline style
3. ✅ Client-side timeout set to 2.5 minutes (matches server)
4. ✅ Warning message at 2 minutes
5. ✅ Cancel button during generation
6. ✅ Error handling for all new error codes
7. ✅ All error messages suggest using "Create Project" as fallback

### Frontend Preview (`client/src/components/reiteration-preview.tsx`)
1. ✅ Added "Resources & Gaps" section with hardware/infra/skills/other
2. ✅ Added "Assumptions" section
3. ✅ Added "Questions for You" section (highlighted)

### Fetch API (`client/src/lib/queryClient.ts`)
1. ✅ Fixed to properly pass AbortController signal
2. ✅ Better error handling for AbortError

## Deployment Steps

### 1. Verify Environment Variables
Check that `OPENROUTER_API_KEY` is set in production:
```bash
# In Render dashboard, verify:
OPENROUTER_API_KEY=sk-or-v1-...
```

If not set, the endpoint will return `ERR_LLM_NOT_CONFIGURED` and suggest using "Create Project".

### 2. Build and Deploy
```bash
# Build the project
npm run build

# Deploy to production (via Render/GitHub)
git add .
git commit -m "Fix draft plan endpoint with timeout and error handling"
git push
```

### 3. Verify Routes Are Mounted
After deployment, check logs for:
```
🔗 Mounting /api/projects/reiterate
✅ Mounted /api/projects/reiterate
```

### 4. Test the Flow

**Test 1: Simple Create (Should Always Work)**
- Click "Add Project"
- Fill title and description
- Click "Create Project" (not "Draft Plan")
- ✅ Should create project immediately
- ✅ Should appear on dashboard

**Test 2: Draft Plan with API Key**
- Click "Add Project"
- Fill title and description
- Click "Draft Plan (AI)"
- ✅ Should show "Generating project plan..." with cancel option
- ✅ Should complete within 2.5 minutes OR show timeout error
- ✅ If successful, should show review screen with all sections:
  - Narrative
  - Features
  - Resources & Gaps (hardware/infra/skills)
  - Assumptions
  - Questions for You
  - Risks, Dependencies, etc.

**Test 3: Draft Plan Without API Key**
- If `OPENROUTER_API_KEY` is not set:
- Click "Draft Plan (AI)"
- ✅ Should immediately show error: "AI planning is not available. Please use 'Create Project'..."
- ✅ Error should suggest using "Create Project" button

**Test 4: Timeout Handling**
- If draft takes > 2.5 minutes:
- ✅ Should show timeout error after 2.5 minutes
- ✅ Error should suggest using "Create Project"
- ✅ User can cancel and use "Create Project" button

## Expected Behavior After Fix

### If API Key is Configured:
1. "Draft Plan (AI)" works and returns full regurgitation
2. Review screen shows all new sections
3. "Approve & Create" creates project with charter

### If API Key is NOT Configured:
1. "Draft Plan (AI)" immediately returns `ERR_LLM_NOT_CONFIGURED`
2. Error message suggests using "Create Project"
3. "Create Project" button always works regardless

### If Draft Times Out:
1. After 2.5 minutes, shows timeout error
2. User can cancel and use "Create Project"
3. "Create Project" always works as fallback

## Files Changed
- `server/src/routes/reiterate.ts` - Enhanced endpoint with timeout and error handling
- `server/core/tools/llm.ts` - Enhanced prompt and timeout
- `client/src/components/reiteration-modal.tsx` - Added Create button, improved error handling
- `client/src/components/reiteration-preview.tsx` - Added new sections display
- `client/src/lib/queryClient.ts` - Fixed AbortController signal passing

## Next Steps After Deployment

1. **Monitor Logs**: Check Render logs for:
   - `[POST /api/projects/reiterate]` entries
   - Timeout errors
   - API key errors
   - Successful draft generations

2. **Test Both Paths**:
   - Verify "Create Project" works reliably
   - Verify "Draft Plan" works when API key is set

3. **If Still Hanging**:
   - Check if `OPENROUTER_API_KEY` is actually set in production
   - Check network connectivity to OpenRouter API
   - Check if request is reaching the endpoint (look for log entries)

4. **Once Draft Works**:
   - Test "Approve & Create" flow
   - Verify project appears on dashboard
   - Verify hierarchy generation works

