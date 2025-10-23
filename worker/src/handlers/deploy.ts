import { resolveTemplate } from '../templates/registry.js';
import { ProjectsRepo } from '../../../server/src/lib/repos/ProjectsRepo.js';
import { ArtifactsRepo } from '../../../server/src/lib/repos/ArtifactsRepo.js';
import { enqueue } from '../../../server/src/lib/queue.js';
import { logger } from '../../../server/src/lib/logger.js';
import path from 'path';

export async function deploy(job: any) {
  const { projectId, payload } = job;
  const { templateRef, spec } = payload;
  
  logger.info('Starting deploy job', { jobId: job.id, projectId, templateRef });
  
  try {
    // Get project details
    const project = await ProjectsRepo.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    
    // Create artifacts directory
    const outputDir = process.env.OUTPUT_DIR || '/data/projects';
    const projectDir = path.join(outputDir, projectId);
    
    // Create context for template
    const ctx = {
      artifactsDir: projectDir,
      addArtifact: async (kind: string, relPath: string, meta?: any) => {
        await ArtifactsRepo.add({
          projectId,
          kind,
          path: relPath,
          meta
        });
      },
      logger: (msg: string, meta?: any) => {
        logger.info(`[Deploy] ${msg}`, { projectId, ...meta });
      }
    };
    
    // Resolve and execute template
    const template = resolveTemplate(templateRef);
    await template.deploy(project, spec, ctx);
    
    // Update project state
    await ProjectsRepo.updateState(projectId, 'deployed');
    
    // Enqueue next job
    await enqueue({
      projectId,
      kind: 'verify',
      payload: { templateRef, spec }
    });
    
    logger.info('Deploy job completed', { jobId: job.id, projectId });
    
  } catch (error) {
    logger.error('Deploy job failed', { jobId: job.id, projectId, error });
    throw error;
  }
}