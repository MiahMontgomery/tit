# Input Tab - Replit Agent Chat Specification

## Overview
The Input tab should mirror the Replit Agent chat experience, displaying all agent actions (questions, messages, code changes, screenshots, rollbacks) with nested proof blocks and seamless integration with Progress and Logs tabs.

## Core Functionality (Priority: CRITICAL - Must Fix First)

### 1. Send Button & Task Creation
**Current Issue:** Send button doesn't create tasks or show loading state.

**Required Behavior:**
- ✅ Send button shows spinner when `isPending === true`
- ✅ Input field disables during request
- ✅ Message clears from input immediately (via `onMutate`)
- ✅ User message appears in chat immediately (optimistic update)
- ✅ Task is created via `POST /api/projects/:id/tasks`
- ✅ Success/error message appears in chat
- ✅ Counters (Tasks, Runs, Memory) update after task creation

**Implementation Status:**
- ✅ Added `onMutate` handler for immediate UI feedback
- ✅ Added optimistic message update
- ✅ Added comprehensive logging
- ⚠️ **BLOCKER:** Mutation may not be starting (button doesn't show spinner)

**Next Steps:**
1. Verify mutation is being called (check if `onMutate` fires)
2. If mutation isn't starting, check React Query setup
3. If mutation starts but fails, check API endpoint/network

## Replit-Style Features (Priority: HIGH - After Core Fix)

### 2. Nested "Proof" Blocks
**Behavior:**
- Under each agent message, show a collapsible card with arrow (▶️ / ▼)
- Card summarizes the action: "Created home.html", "Took screenshot", "Updated server.js"
- Clicking arrow expands to show:
  - **Screenshots:** Thumbnail that expands to full image
  - **Code Changes:** Diff view showing added/removed lines
  - **File Links:** Link to file touched or commit
  - **Logs:** Relevant log entries

**Visual Design:**
- Dark card with subtle border (#333333)
- Teal accent color (#40e0d0) for icons/borders
- Arrow icon changes orientation when expanded
- Smooth expand/collapse animation

**Implementation:**
- Use existing `expandedMessages` state
- Create `NestedProofCard` component
- Parse task results to extract proof data
- Link to Logs tab entries

### 3. Rollback Buttons
**Behavior:**
- Each action card has a "Rollback" or "Undo" button
- Clicking it sends rollback instruction to agent
- Rollback event is logged
- UI updates to show rollback status

**Implementation:**
- Add rollback button to each nested proof card
- Call `POST /api/projects/:id/rollback/:rollbackId`
- Update task/run status
- Show rollback confirmation in chat

### 4. Two-Hour Timeout Summary
**Behavior:**
- If no user response for ~2 hours, agent posts summary message
- Summary includes all actions taken during inactivity
- All nested proof blocks attached
- "Rollback all changes" option included

**Implementation:**
- Backend: Track last user interaction timestamp
- Backend: Generate summary after 2 hours of inactivity
- Frontend: Display summary message with all proofs
- Frontend: Show "Rollback all" button

### 5. Progress Tab Integration
**Behavior:**
- User message like "Add a login feature" → Creates Features → Milestones → Goals
- New hierarchy items appear immediately in Progress tab
- Progress updates push back to Input: "Completed Milestone: Authentication UI"

**Implementation:**
- Parse user messages to extract feature requests
- Call hierarchy generation endpoint
- Invalidate Progress tab queries
- Emit events when milestones/goals complete
- Display completion messages in Input chat

### 6. Voice Transcription
**Behavior:**
- When voice session is active, transcribe conversation in real-time
- Transcripts appear in Input chat as messages
- No placeholder "Voice widget disabled" message when inactive

**Implementation:**
- Remove disabled widget message
- Add real-time transcription display
- Format transcripts as chat messages
- Link transcripts to voice session

### 7. Logs Integration
**Behavior:**
- Logs tab is chronological ledger of actions (not a chat)
- Input tab links to log entries from nested proof cards
- Hover/click on proof card → shows link to log entry
- Only actionable events go to Logs (not conversation)

**Implementation:**
- Add log entry IDs to proof card metadata
- Create links from proof cards to Logs tab
- Filter Logs to show only actions (not messages)
- Add navigation from Input to specific log entries

## Visual & UX Refinements

### Color Palette
- **Background:** Dark (#050505, #0f0f0f)
- **Borders:** Subtle gray (#333333)
- **Accents:** Teal/turquoise (#40e0d0)
- **Text:** White (#e0e0e0) and gray (#888888)
- **Remove:** Red/yellow debug colors (temporary only)

### Icons
- Reuse existing icon set (lucide-react)
- Code diff icon for code changes
- Camera icon for screenshots
- File icon for file operations
- Check/X icons for success/error

### Animations
- Smooth expand/collapse for proof cards
- Spinner animation for loading states
- Fade-in for new messages
- Scroll to bottom on new messages

## Implementation Priority

### Phase 1: Core Fix (IMMEDIATE)
1. ✅ Fix send button to show spinner and disable input
2. ✅ Ensure mutation actually starts (`onMutate` fires)
3. ✅ Verify task creation works end-to-end
4. ✅ Test that counters update

### Phase 2: Basic Replit Features (HIGH)
1. Remove debug test button and use Titan colors
2. Implement nested proof cards with expand/collapse
3. Add rollback buttons to proof cards
4. Remove voice widget disabled message

### Phase 3: Advanced Features (MEDIUM)
1. Two-hour timeout summary
2. Progress tab integration
3. Voice transcription display
4. Logs tab linking

## Testing Checklist

### Core Functionality
- [ ] Type message → Click send → Input clears immediately
- [ ] Send button shows spinner during request
- [ ] User message appears in chat immediately
- [ ] Task is created in database
- [ ] Success message appears in chat
- [ ] Counters (Tasks, Runs, Memory) update
- [ ] Error message appears if request fails

### Replit Features
- [ ] Proof cards appear under agent messages
- [ ] Proof cards expand/collapse smoothly
- [ ] Screenshots show as thumbnails
- [ ] Code diffs display correctly
- [ ] Rollback buttons work
- [ ] Progress updates appear in Input
- [ ] Voice transcripts appear when active
- [ ] Logs links work from proof cards

## Files to Modify

### Core Fix
- `client/src/components/tabs/input-tab.tsx` - Mutation setup, UI feedback
- `server/api/projects.ts` - Task creation endpoint
- `server/core/repos/tasksRepo.ts` - Task storage

### Replit Features
- `client/src/components/tabs/input-tab.tsx` - Nested proof cards, rollback UI
- `client/src/components/NestedMemory.tsx` - Proof card component (or create new)
- `server/api/projects.ts` - Rollback endpoint
- `server/core/repos/tasksRepo.ts` - Rollback logic
- `client/src/components/tabs/progress-tab.tsx` - Integration with Input
- `client/src/components/tabs/logs-tab.tsx` - Linking from Input

## Notes

- The test button and debug colors are temporary - remove after core fix
- All console logging should be removed or made conditional in production
- The mutation setup follows React Query best practices with `onMutate` for optimistic updates
- ProjectId is numeric (integer) from URL, converted to string for API calls

