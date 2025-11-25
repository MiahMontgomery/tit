import { Project } from '@prisma/client';
import { prisma } from '../db.js';

export interface CreateProjectData {
  name: string;
  description?: string;
}

export class ProjectsRepo {
  /**
   * Create a new project with basic fields (matches actual Prisma schema)
   */
  static async create(data: CreateProjectData) {
    return await prisma.project.create({
      data: {
        name: data.name,
        description: data.description || null
      }
    });
  }

  /**
   * Get a project by ID (accepts both string and number for flexibility)
   */
  static async get(id: string | number) {
    const projectId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(projectId)) {
      throw new Error(`Invalid project ID: ${id}`);
    }
    
    return await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        charter: true,
        features: {
          include: {
            milestones: {
              include: {
                goals: true
              }
            }
          }
        }
      }
    });
  }

  /**
   * Get all projects
   */
  static async getAll(cursor?: number, limit: number = 20) {
    const where = cursor ? { id: { gt: cursor } } : {};
    
    return await prisma.project.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'asc' },
      include: {
        charter: true,
        features: {
          include: {
            milestones: {
              include: {
                goals: true
              }
            }
          }
        }
      }
    });
  }

  /**
   * Get projects that have no pending jobs (idle projects)
   */
  static async getIdleProjects(limit: number = 10) {
    // Get all projects
    const allProjects = await prisma.project.findMany({
      take: limit * 2, // Get more to filter
      orderBy: { createdAt: 'asc' }
    });

    // Get all projects with pending jobs
    const projectsWithJobs = await prisma.job.findMany({
      where: {
        status: { in: ['queued', 'running'] }
      },
      select: {
        projectId: true
      },
      distinct: ['projectId']
    });

    const activeProjectIds = new Set(
      projectsWithJobs.map(j => j.projectId)
    );

    // Filter to projects without active jobs
    const idleProjects = allProjects.filter(
      p => !activeProjectIds.has(String(p.id))
    );

    return idleProjects.slice(0, limit);
  }

  /**
   * Check if there are any pending or running jobs
   */
  static async hasActiveJobs(): Promise<boolean> {
    const count = await prisma.job.count({
      where: {
        status: { in: ['queued', 'running'] }
      }
    });
    return count > 0;
  }
}