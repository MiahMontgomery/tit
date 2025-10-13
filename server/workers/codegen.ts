import { getDb } from '../db/drizzle.js';
import { tasks } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { join, resolve, relative } from 'path';

export async function runCodegen({ projectId, runId, taskId, repoRoot }: {
  projectId: string;
  runId: string;
  taskId: string;
  repoRoot: string;
}): Promise<{ patch: string }> {
  const db = getDb();
  
  // Get task details
  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }
  
  // TODO: Replace with actual OpenRouter LLM client when available
  // For now, return a mock patch
  const mockPatch = `--- a/README.md
+++ b/README.md
@@ -1,3 +1,4 @@
 # Project
+${task.title}
 
 This is a sample project.
`;
  
  // Validate patch paths are inside repoRoot
  const lines = mockPatch.split('\n');
  const filePaths = new Set<string>();
  
  for (const line of lines) {
    if (line.startsWith('--- a/') || line.startsWith('+++ b/')) {
      const filePath = line.substring(6); // Remove '--- a/' or '+++ b/'
      if (filePath && filePath !== '/dev/null') {
        filePaths.add(filePath);
      }
    }
  }
  
  // Validate all file paths are within repoRoot
  const resolvedRepoRoot = resolve(repoRoot);
  for (const filePath of filePaths) {
    const resolvedPath = resolve(repoRoot, filePath);
    const relativePath = relative(resolvedRepoRoot, resolvedPath);
    
    if (relativePath.startsWith('..') || relativePath.includes('..')) {
      throw new Error(`File path ${filePath} escapes repository root`);
    }
  }
  
  return { patch: mockPatch };
}




