# Titan Next Phase Roadmap: Task Execution & Autonomous Workflows

## Current Status Summary

### ✅ What's Working
1. **Project Creation** - Both simple and AI-assisted paths work
2. **Draft Plan Generation** - Full regurgitation with resources/gaps, assumptions, questions
3. **Database Persistence** - Projects persist across refreshes
4. **Frontend UI** - All tabs render, Input tab chat interface is functional
5. **API Endpoints** - Task creation endpoint exists (`POST /api/projects/:id/tasks`)

### ❌ What's Not Working
1. **Task Execution** - Tasks are created but never processed
2. **Worker Process** - Worker exists but may not be running in production
3. **Run Creation** - No runs are created when tasks execute
4. **Logs/Output** - Tabs are empty because no runs/logs are generated
5. **Memory System** - Counters stay at zero
6. **Voice Integration** - ElevenLabs widget disabled (missing API key)

## Root Cause Analysis

### The Task Execution Gap

**What happens now:**
1. User types message in Input tab → `sendTaskMutation` called
2. Frontend calls `POST /api/projects/:id/tasks` with `{ type: "chat", payload: { content: "..." } }`
3. Backend calls `tasksRepo.enqueueTask()` → Task saved to DB with status "queued"
4. **STOP** - No worker picks up the task

### The Two Queue System Problem

**Critical Discovery:** There are TWO separate queue systems:

1. **Jobs Queue** (`server/src/lib/queue.ts` + Prisma `Job` model)
   - Used by `worker/src/index.ts` (the worker that IS running)
   - Processes "jobs" with `kind` field: `scaffold`, `build`, `deploy`, `ops.*`
   - This is for ops/automation tasks

2. **Tasks Queue** (`server/core/repos/tasksRepo.ts` + Drizzle `tasks` table)
   - Used by Input tab (`POST /api/projects/:id/tasks`)
   - Processes "tasks" with `type` field: `chat`, `code`, `screenshot`, `exec`
   - This is for user-initiated tasks from the Input tab
   - **NO WORKER IS PROCESSING THIS QUEUE**

**The Problem:**
- `worker/src/index.ts` only processes **jobs** (from Prisma `Job` table)
- User tasks are saved to **tasks** table (Drizzle schema)
- `server/worker.ts` was supposed to process tasks, but it's NOT being started
- The `start` script in `package.json` runs `worker/src/index.ts`, not `server/worker.ts`

**The Solution:**
Either:
1. Start `server/worker.ts` as a separate process to handle tasks
2. Modify `worker/src/index.ts` to also poll the `tasks` table
3. Create a unified queue system that handles both jobs and tasks

**What should happen:**
1. User types message → Task created (✅ working)
2. Worker process polls for queued tasks (❌ not running or not connected)
3. Worker executes task → Creates run, generates logs, updates memory (❌ not implemented)
4. Frontend polls for updates → Shows task status, run results, logs (❌ no data to show)

## Implementation Plan

### Phase 1: Task Execution Foundation (Priority: HIGH)

#### 1.1 Verify Worker Process
- [ ] Check if `server/worker.ts` is being started in production
- [ ] Verify worker can connect to database
- [ ] Ensure worker polls `tasksRepo.getNextQueuedTask()` correctly
- [ ] Add health check endpoint for worker status

**Files to check:**
- `server/worker.ts` - Main worker loop
- `server/src/index.ts` - Server startup (does it start worker?)
- `package.json` - Worker start script
- Render deployment config - Is worker process defined?

#### 1.2 Wire Up Task Execution
- [ ] Ensure `StateMachine` or `TaskExecutor` is called when worker picks up task
- [ ] Implement task type handlers:
  - `chat` → Process user message, generate response
  - `code` → Execute code generation
  - `screenshot` → Take screenshot
  - `exec` → Execute command
- [ ] Create run when task starts executing
- [ ] Update task status: `queued` → `running` → `completed`/`failed`

**Files to modify:**
- `server/core/stateMachine.ts` - Task execution logic
- `server/services/taskExecutor.ts` - Task type handlers
- `server/core/repos/tasksRepo.ts` - Status updates

#### 1.3 Create Run System
- [ ] When task starts, create a `Run` record
- [ ] Link run to task
- [ ] Store run state (INTAKE → PROCESSING → REVIEW → DONE)
- [ ] Update run status as task progresses

**Files to check:**
- `server/src/lib/repos/RunsRepo.ts` - Run creation/updates
- `server/orchestrator/orchestrator.ts` - Run state machine
- `server/routes/runs.ts` - Run API endpoints

### Phase 2: Logs & Output Generation (Priority: HIGH)

#### 2.1 Log Creation
- [ ] When task executes, create log entries
- [ ] Store logs in database (or log service)
- [ ] Include: timestamp, level, message, taskId, runId
- [ ] Expose logs via API endpoint

**Files to create/modify:**
- `server/api/logs.ts` - Log retrieval endpoint
- `server/core/repos/logsRepo.ts` - Log storage
- `server/services/proofLogger.ts` - Log writing service

#### 2.2 Output Generation
- [ ] When task completes, generate output artifacts
- [ ] Store outputs (code, screenshots, files) in database
- [ ] Link outputs to runs
- [ ] Expose outputs via API endpoint

**Files to check:**
- `server/api/outputs.ts` - Output retrieval
- `server/core/repos/outputsRepo.ts` - Output storage

#### 2.3 Frontend Updates
- [ ] Logs tab: Poll for logs, display in real-time
- [ ] Output tab: Show generated artifacts, approve/reject
- [ ] Update counters: Tasks, Runs, Memory

**Files to modify:**
- `client/src/components/tabs/logs-tab.tsx` - Display logs
- `client/src/components/tabs/output-tab.tsx` - Display outputs
- `client/src/components/tabs/input-tab.tsx` - Update counters

### Phase 3: Memory System (Priority: MEDIUM)

#### 3.1 Memory Storage
- [ ] When task executes, extract and store memories
- [ ] Link memories to tasks/runs
- [ ] Update memory counters
- [ ] Expose memories via API

**Files to check:**
- `server/api/messages.ts` - Message/memory storage
- `server/core/repos/memoryRepo.ts` - Memory operations
- `client/src/components/NestedMemory.tsx` - Memory display

### Phase 4: Voice Integration (Priority: LOW)

#### 4.1 ElevenLabs Setup
- [ ] Add `ELEVENLABS_API_KEY` to environment variables
- [ ] Enable voice widget in Input tab
- [ ] Wire up voice input → text → task creation

**Files to modify:**
- `client/src/components/ElevenLabsWidget.tsx` - Voice widget
- `env.example` - Add ELEVENLABS_API_KEY

## Environment Variables Needed

```bash
# Required for task execution
OPENROUTER_API_KEY=sk-or-v1-...  # ✅ Already configured

# Required for voice
ELEVENLABS_API_KEY=...  # ❌ Missing

# Optional but recommended
VECTOR_STORE_URL=...  # For memory/search
DATABASE_URL=...  # ✅ Already configured
```

## API Endpoints Status

### ✅ Implemented
- `POST /api/projects` - Create project
- `POST /api/projects/reiterate` - Generate draft plan
- `POST /api/projects/:id/tasks` - Create task
- `GET /api/projects/:id/tasks` - Get tasks
- `GET /api/projects/:id/charter` - Get charter
- `GET /api/projects/:id/messages` - Get messages

### ❌ Missing or Incomplete
- `GET /api/projects/:id/runs` - Get runs for project
- `POST /api/runs/:id/start` - Start run execution
- `GET /api/projects/:id/logs` - Get logs
- `GET /api/projects/:id/outputs` - Get outputs
- `GET /api/projects/:id/memory` - Get memory stats
- `POST /api/tasks/:id/execute` - Manually trigger task execution (for testing)

## Testing Checklist

### Manual Testing Steps

1. **Task Creation**
   - [ ] Type message in Input tab
   - [ ] Click send
   - [ ] Verify task appears in chat
   - [ ] Check browser console for API call success
   - [ ] Check database: task should exist with status "queued"

2. **Task Execution**
   - [ ] Check worker logs: Is worker running?
   - [ ] Check worker logs: Does it pick up the task?
   - [ ] Check database: Task status should change to "running" then "completed"
   - [ ] Check database: Run should be created

3. **Logs Generation**
   - [ ] After task executes, check Logs tab
   - [ ] Logs should appear with timestamps
   - [ ] Logs should show task execution steps

4. **Output Generation**
   - [ ] After task executes, check Output tab
   - [ ] Outputs should appear (if task generates any)
   - [ ] Can approve/reject outputs

5. **Memory Updates**
   - [ ] After task executes, check memory counter
   - [ ] Counter should increment
   - [ ] Memory entries should appear in NestedMemory component

## Quick Wins (Can Do First)

1. **Add Worker Health Check**
   - Create `GET /api/worker/health` endpoint
   - Returns: `{ running: boolean, lastHeartbeat: Date, currentTask: string | null }`
   - Helps diagnose if worker is running

2. **Add Manual Task Execution Endpoint**
   - Create `POST /api/tasks/:id/execute` endpoint
   - Manually trigger task execution for testing
   - Bypasses worker if needed

3. **Add Debug Logging**
   - Log when task is created
   - Log when worker picks up task
   - Log when task execution starts/completes
   - Helps trace the execution flow

4. **Fix Task Status Updates**
   - Ensure `tasksRepo.setTaskStatus()` is called correctly
   - Update task status at each stage
   - Frontend can poll for status updates

## Next Steps (Immediate)

1. **Verify Worker is Running**
   - Check Render logs for worker process
   - Check if `server/worker.ts` is being executed
   - If not, add worker start script to deployment

2. **Test Task Execution Locally**
   - Start worker locally: `node server/worker.ts`
   - Create a task via API
   - Verify worker picks it up and executes
   - Check database for status updates

3. **Wire Up Basic Execution**
   - For `chat` type tasks, just echo back the message for now
   - Create a run record
   - Generate a simple log entry
   - Verify frontend can see the updates

4. **Deploy and Test**
   - Deploy worker process
   - Test end-to-end: message → task → execution → logs
   - Iterate based on what breaks

## Files to Review First

1. `server/worker.ts` - Main worker loop (does it start?)
2. `server/src/index.ts` - Server startup (does it start worker?)
3. `server/core/stateMachine.ts` - Task execution logic
4. `server/core/repos/tasksRepo.ts` - Task database operations
5. `package.json` - Scripts and dependencies
6. Render deployment config - Process definitions

## Success Criteria

Titan will be "working" when:
- ✅ User can type message → Task created
- ✅ Worker picks up task within 5 seconds
- ✅ Task executes and creates run
- ✅ Logs appear in Logs tab
- ✅ Outputs appear in Output tab (if applicable)
- ✅ Memory counter increments
- ✅ Task status updates in real-time
- ✅ No infinite spinners or hanging requests

