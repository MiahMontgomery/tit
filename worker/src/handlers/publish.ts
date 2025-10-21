import { resolveTemplate } from '../templates/registry.js';
import { artifactsRepo } from '../../../server/src/lib/repos/ArtifactsRepo.js';
import { projectsRepo } from '../../../server/src/lib/repos/ProjectsRepo.js';
import { runsRepo } from '../../../server/src/lib/repos/RunsRepo.js';
import { logger } from '../lib/logger.js';
import { promises as fs } from 'fs';
import { join } from 'path';

export async function publish(job: any): Promise<void> {
  const { projectId, payload } = job;
  
  logger.info('Starting publish job', { jobId: job.id, projectId });
  
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
        logger.info(`[Publish] ${msg}`, { projectId, ...meta });
      }
    };
    
    // Resolve and execute template
    const template = resolveTemplate(project.templateRef);
    await template.publish(project, project.spec, ctx);
    
    // Finalize the run
    const latestRun = await runsRepo.getLatestByProject(projectId);
    if (latestRun) {
      await runsRepo.finish(latestRun.id, 'done', {
        completedAt: new Date().toISOString(),
        status: 'published'
      });
    }
    
    logger.info('Publish job completed', { jobId: job.id, projectId });
    
  } catch (error) {
    logger.error('Publish job failed', { 
      jobId: job.id, 
      projectId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw error;
  }
}
