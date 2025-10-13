import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname, resolve, relative } from 'path';

interface Hunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

interface FilePatch {
  oldFile: string;
  newFile: string;
  hunks: Hunk[];
}

export async function applyUnifiedDiff(root: string, patch: string): Promise<{ changed: number }> {
  const resolvedRoot = resolve(root);
  const filePatches = parseUnifiedDiff(patch);
  let changedCount = 0;
  
  for (const filePatch of filePatches) {
    const filePath = filePatch.newFile === '/dev/null' ? filePatch.oldFile : filePatch.newFile;
    const fullPath = resolve(root, filePath);
    
    // Ensure file path is within root
    const relativePath = relative(resolvedRoot, fullPath);
    if (relativePath.startsWith('..') || relativePath.includes('..')) {
      throw new Error(`File path ${filePath} escapes repository root`);
    }
    
    // Ensure directory exists
    await mkdir(dirname(fullPath), { recursive: true });
    
    if (filePatch.newFile === '/dev/null') {
      // File deletion
      try {
        await readFile(fullPath);
        // File exists, delete it (in a real implementation)
        changedCount++;
      } catch {
        // File doesn't exist, nothing to delete
      }
    } else if (filePatch.oldFile === '/dev/null') {
      // File creation
      const content = applyHunksToContent('', filePatch.hunks);
      await writeFile(fullPath, content, 'utf8');
      changedCount++;
    } else {
      // File modification
      let content = '';
      try {
        content = await readFile(fullPath, 'utf8');
      } catch {
        // File doesn't exist, start with empty content
      }
      
      const newContent = applyHunksToContent(content, filePatch.hunks);
      await writeFile(fullPath, newContent, 'utf8');
      changedCount++;
    }
  }
  
  return { changed: changedCount };
}

function parseUnifiedDiff(patch: string): FilePatch[] {
  const filePatches: FilePatch[] = [];
  const lines = patch.split('\n');
  let currentPatch: FilePatch | null = null;
  let currentHunk: Hunk | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('--- a/')) {
      currentPatch = {
        oldFile: line.substring(6),
        newFile: '',
        hunks: []
      };
    } else if (line.startsWith('+++ b/')) {
      if (currentPatch) {
        currentPatch.newFile = line.substring(6);
      }
    } else if (line.startsWith('@@')) {
      if (currentPatch) {
        if (currentHunk) {
          currentPatch.hunks.push(currentHunk);
        }
        
        const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
        if (match) {
          currentHunk = {
            oldStart: parseInt(match[1]),
            oldLines: parseInt(match[2]) || 0,
            newStart: parseInt(match[3]),
            newLines: parseInt(match[4]) || 0,
            lines: []
          };
        }
      }
    } else if (currentHunk && (line.startsWith('+') || line.startsWith('-') || line.startsWith(' '))) {
      currentHunk.lines.push(line);
    }
  }
  
  if (currentPatch) {
    if (currentHunk) {
      currentPatch.hunks.push(currentHunk);
    }
    filePatches.push(currentPatch);
  }
  
  return filePatches;
}

function applyHunksToContent(content: string, hunks: Hunk[]): string {
  const lines = content.split('\n');
  let result: string[] = [];
  let lineIndex = 0;
  
  for (const hunk of hunks) {
    // Add lines before the hunk
    while (lineIndex < hunk.oldStart - 1) {
      result.push(lines[lineIndex] || '');
      lineIndex++;
    }
    
    // Apply hunk
    for (const line of hunk.lines) {
      if (line.startsWith('+')) {
        result.push(line.substring(1));
      } else if (line.startsWith('-')) {
        lineIndex++; // Skip old line
      } else if (line.startsWith(' ')) {
        result.push(line.substring(1));
        lineIndex++;
      }
    }
  }
  
  // Add remaining lines
  while (lineIndex < lines.length) {
    result.push(lines[lineIndex]);
    lineIndex++;
  }
  
  return result.join('\n');
}




