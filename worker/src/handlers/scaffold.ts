import { resolveTemplate } from '../templates/registry.js';
import { ProjectsRepo } from '../../../server/src/lib/repos/ProjectsRepo.js';
import { ArtifactsRepo } from '../../../server/src/lib/repos/ArtifactsRepo.js';
import { enqueue } from '../../../server/src/lib/queue.js';
import { logger } from '../../../server/src/lib/logger.js';
import { Project as TemplateProject } from '../templates/types.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Convert Prisma Project to template Project format
 */
function toTemplateProject(prismaProject: any, templateRef: string, spec: any): TemplateProject {
  return {
    id: String(prismaProject.id),
    name: prismaProject.name,
    type: templateRef, // Use templateRef as type
    templateRef: templateRef,
    spec: spec,
    state: 'init', // Default state
    createdAt: prismaProject.createdAt,
    updatedAt: prismaProject.createdAt // Use createdAt as updatedAt if not available
  };
}

export async function scaffold(job: any) {
  const { projectId, payload } = job;
  const { templateRef, spec } = payload;
  
  logger.info('Starting scaffold job', { jobId: job.id, projectId, templateRef });
  
  try {
    // Get project details
    const project = await ProjectsRepo.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    
    // Create artifacts directory
    const outputDir = process.env.OUTPUT_DIR || '/data/projects';
    const projectDir = path.join(outputDir, projectId);
    await fs.mkdir(projectDir, { recursive: true });
    
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
        logger.info(`[Scaffold] ${msg}`, { projectId, ...meta });
      }
    };
    
    // Convert Prisma project to template format
    const templateProject = toTemplateProject(project, templateRef, spec);
    
    // Resolve and execute template
    const template = resolveTemplate(templateRef);
    await template.scaffold(templateProject, spec, ctx);
    
    // Note: Project model doesn't have a 'state' field, so we skip state update
    // The pipeline progress is tracked via Job status instead
    
    // Enqueue next job
    await enqueue({
      projectId,
      kind: 'build',
      payload: { templateRef, spec }
    });
    
    logger.info('Scaffold job completed', { jobId: job.id, projectId });
    
  } catch (error) {
    logger.error('Scaffold job failed', { jobId: job.id, projectId, error });
    throw error;
  }
}