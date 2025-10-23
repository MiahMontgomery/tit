import { resolveTemplate } from '../templates/registry.js';
import { ProjectsRepo } from '../../../server/src/lib/repos/ProjectsRepo.js';
import { ArtifactsRepo } from '../../../server/src/lib/repos/ArtifactsRepo.js';
import { RunsRepo } from '../../../server/src/lib/repos/RunsRepo.js';
import { logger } from '../../../server/src/lib/logger.js';
import path from 'path';

export async function publish(job: any) {
  const { projectId, payload } = job;
  const { templateRef, spec } = payload;
  
  logger.info('Starting publish job', { jobId: job.id, projectId, templateRef });
  
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
        logger.info(`[Publish] ${msg}`, { projectId, ...meta });
      }
    };
    
    // Resolve and execute template
    const template = resolveTemplate(templateRef);
    await template.publish(project, spec, ctx);
    
    // Update project state to final state
    await ProjectsRepo.updateState(projectId, 'deployed');
    
    // Finish the run
    const latestRun = await RunsRepo.getLatestByProject(projectId);
    if (latestRun) {
      await RunsRepo.finish(latestRun.id, {
        status: 'done',
        details: {
          completedAt: new Date().toISOString(),
          finalState: 'deployed'
        }
      });
    }
    
    logger.info('Publish job completed - project fully deployed', { jobId: job.id, projectId });
    
  } catch (error) {
    logger.error('Publish job failed', { jobId: job.id, projectId, error });
    throw error;
  }
}