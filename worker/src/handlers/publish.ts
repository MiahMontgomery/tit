import { resolveTemplate } from '../templates/registry.js';
import { ProjectsRepo } from '../../../server/src/lib/repos/ProjectsRepo.js';
import { ArtifactsRepo } from '../../../server/src/lib/repos/ArtifactsRepo.js';
import { RunsRepo } from '../../../server/src/lib/repos/RunsRepo.js';
import { logger } from '../../../server/src/lib/logger.js';
import { Project as TemplateProject } from '../templates/types.js';
import path from 'path';

/**
 * Convert Prisma Project to template Project format
 */
function toTemplateProject(prismaProject: any, templateRef: string, spec: any): TemplateProject {
  return {
    id: String(prismaProject.id),
    name: prismaProject.name,
    type: templateRef,
    templateRef: templateRef,
    spec: spec,
    state: 'init',
    createdAt: prismaProject.createdAt,
    updatedAt: prismaProject.createdAt
  };
}

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
        // Try to add artifact, but don't fail if ArtifactsRepo doesn't exist
        try {
          await ArtifactsRepo.add({
            projectId,
            kind,
            path: relPath,
            meta
          });
        } catch (error) {
          logger.warn('Failed to add artifact (repo may not be configured)', { 
            projectId, kind, path: relPath, error 
          });
        }
      },
      logger: (msg: string, meta?: any) => {
        logger.info(`[Publish] ${msg}`, { projectId, ...meta });
      }
    };
    
    // Convert Prisma project to template format
    const templateProject = toTemplateProject(project, templateRef, spec);
    
    // Resolve and execute template
    const template = resolveTemplate(templateRef);
    await template.publish(templateProject, spec, ctx);
    
    // Note: Project model doesn't have a 'state' field, so we skip state update
    // The pipeline progress is tracked via Job status instead
    
    // Try to finish the run, but don't fail if RunsRepo doesn't exist
    try {
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
    } catch (error) {
      logger.warn('Failed to finish run (repo may not be configured)', { 
        projectId, error 
      });
    }
    
    logger.info('Publish job completed - project fully deployed', { jobId: job.id, projectId });
    
  } catch (error) {
    logger.error('Publish job failed', { jobId: job.id, projectId, error });
    throw error;
  }
}