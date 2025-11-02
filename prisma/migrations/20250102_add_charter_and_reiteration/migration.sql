-- CreateTable ProjectCharter
CREATE TABLE IF NOT EXISTS "ProjectCharter" (
    "id" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "narrative" TEXT NOT NULL,
    "prominentFeatures" JSONB NOT NULL,
    "modes" JSONB,
    "milestones" JSONB NOT NULL,
    "risks" JSONB,
    "dependencies" JSONB,
    "instrumentation" JSONB,
    "acceptanceCriteria" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectCharter_pkey" PRIMARY KEY ("id")
);

-- CreateTable ReiterationDraft
CREATE TABLE IF NOT EXISTS "ReiterationDraft" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "intent" TEXT,
    "context" JSONB,
    "narrative" TEXT NOT NULL,
    "prominentFeatures" JSONB NOT NULL,
    "modes" JSONB,
    "milestones" JSONB NOT NULL,
    "risks" JSONB,
    "dependencies" JSONB,
    "instrumentation" JSONB,
    "acceptanceCriteria" JSONB NOT NULL,
    "userEdits" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReiterationDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReiterationDraft_title_version_idx" ON "ReiterationDraft"("title", "version");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectCharter_projectId_key" ON "ProjectCharter"("projectId");

-- AddForeignKey (with IF NOT EXISTS check)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ProjectCharter_projectId_fkey'
    ) THEN
        ALTER TABLE "ProjectCharter" ADD CONSTRAINT "ProjectCharter_projectId_fkey" 
        FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

