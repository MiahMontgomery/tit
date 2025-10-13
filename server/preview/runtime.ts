import { spawn } from 'child_process';
import { createServer } from 'http';
import { join } from 'path';
import { stat } from 'fs/promises';

const previewRegistry = new Map<string, { url: string; process: any; port: number }>();

export async function startPreview({ projectId, runId, repoRoot }: {
  projectId: string;
  runId: string;
  repoRoot: string;
}): Promise<{ url: string }> {
  // Check if preview already exists
  if (previewRegistry.has(runId)) {
    const existing = previewRegistry.get(runId)!;
    return { url: existing.url };
  }
  
  // Find artifacts directory
  const artifactsDir = join('/data/artifacts', projectId, runId);
  
  // Check if artifacts directory exists
  try {
    await stat(artifactsDir);
  } catch {
    throw new Error(`Artifacts directory not found: ${artifactsDir}`);
  }
  
  // Find free port starting from 4000
  let port = 4000;
  let server: any = null;
  
  while (port < 5000) {
    try {
      server = await createPreviewServer(port, artifactsDir);
      break;
    } catch (error) {
      port++;
    }
  }
  
  if (!server) {
    throw new Error('No available ports for preview server');
  }
  
  const url = `http://localhost:${port}/`;
  
  // Register preview
  previewRegistry.set(runId, { url, process: server, port });
  
  // Clean up on process exit
  process.on('exit', () => {
    if (server) {
      server.close();
    }
  });
  
  return { url };
}

export function stopPreview(runId: string): void {
  const preview = previewRegistry.get(runId);
  if (preview) {
    if (preview.process) {
      preview.process.close();
    }
    previewRegistry.delete(runId);
  }
}

export function getPreviewUrl(runId: string): string | null {
  const preview = previewRegistry.get(runId);
  return preview ? preview.url : null;
}

async function createPreviewServer(port: number, artifactsDir: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      // Add CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }
      
      const { pathname } = new URL(req.url || '', `http://localhost:${port}`);
      const filePath = join(artifactsDir, pathname === '/' ? 'index.html' : pathname);
      
      // Simple static file server
      import('fs').then(fs => {
        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
            return;
          }
          
          // Set content type based on file extension
          const ext = filePath.split('.').pop()?.toLowerCase();
          let contentType = 'text/plain';
          
          switch (ext) {
            case 'html':
              contentType = 'text/html';
              break;
            case 'css':
              contentType = 'text/css';
              break;
            case 'js':
              contentType = 'application/javascript';
              break;
            case 'json':
              contentType = 'application/json';
              break;
            case 'png':
              contentType = 'image/png';
              break;
            case 'jpg':
            case 'jpeg':
              contentType = 'image/jpeg';
              break;
            case 'gif':
              contentType = 'image/gif';
              break;
            case 'svg':
              contentType = 'image/svg+xml';
              break;
          }
          
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(data);
        });
      });
    });
    
    server.listen(port, '0.0.0.0', (err: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(server);
      }
    });
    
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        reject(err);
      }
    });
  });
}
