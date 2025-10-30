-- CreateEnum if not exists (Postgres doesn't support IF NOT EXISTS on type creation safely in all versions)
DO $$ BEGIN
  CREATE TYPE "JobStatus" AS ENUM ('queued', 'running', 'done', 'error');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable Job if not exists
DO $$ BEGIN
  CREATE TABLE "Job" (
      "id" TEXT NOT NULL,
      "projectId" TEXT NOT NULL,
      "kind" TEXT NOT NULL,
      "payload" JSONB NOT NULL,
      "status" "JobStatus" NOT NULL DEFAULT 'queued',
      "attempts" INTEGER NOT NULL DEFAULT 0,
      "error" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,

      CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Skip creating Run and Artifact in this migration to avoid conflicts

CREATE INDEX "Job_status_createdAt_idx" ON "Job"("status", "createdAt");
-- No FKs to Project to avoid schema mismatch across environments

