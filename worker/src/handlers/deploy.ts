import { resolveTemplate } from '../templates/registry.js';
import { artifactsRepo } from '../../../server/src/lib/repos/ArtifactsRepo.js';
import { projectsRepo } from '../../../server/src/lib/repos/ProjectsRepo.js';
import { logger } from '../lib/logger.js';
import { promises as fs } from 'fs';
import { join } from 'path';

export async function deploy(job: any): Promise<void> {
  const { projectId, payload } = job;
  
  logger.info('Starting deploy job', { jobId: job.id, projectId });
  
  try {
    // Get project details
    const project = await projectsRepo.getById(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    // Create artifacts directory
    const outputDir = process.env.OUTPUT_DIR || '/data/projects';
    const artifactsDir = join(outputDir, projectId);
    
    // Create context
    const ctx = {
      artifactsDir,
      addArtifact: async (kind: string, relPath: string, meta?: any) => {
        await artifactsRepo.add({
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
    const template = resolveTemplate(project.templateRef);
    await template.deploy(project, project.spec, ctx);
    
    // Record deployment timestamp
    await artifactsRepo.add({
      projectId,
      kind: 'deployment',
      path: 'deployment.json',
      meta: {
        deployedAt: new Date().toISOString(),
        status: 'deployed'
      }
    });
    
    logger.info('Deploy job completed', { jobId: job.id, projectId });
    
  } catch (error) {
    logger.error('Deploy job failed', { 
      jobId: job.id, 
      projectId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw error;
  }
}
