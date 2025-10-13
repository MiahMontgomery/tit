-- Add memory and messages tables for autonomy system
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  role TEXT NOT NULL,
  content JSONB NOT NULL,
  parent_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_project_id ON messages(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_memories_project_id ON memories(project_id);
CREATE INDEX IF NOT EXISTS idx_memories_key ON memories(key);

-- Update tasks table with required columns
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'queued';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reserved_by TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reserved_until TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS heartbeat_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS error_text TEXT;

-- Add indexes for task queue performance
CREATE INDEX IF NOT EXISTS idx_tasks_state ON tasks(state);
CREATE INDEX IF NOT EXISTS idx_tasks_reserved_by ON tasks(reserved_by);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);




