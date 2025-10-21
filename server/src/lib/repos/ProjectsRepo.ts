import { PrismaClient, Project } from '@prisma/client';
import { getDb } from '../db.js';

export interface CreateProjectData {
  name: string;
  type: string;
  templateRef?: string;
  spec?: Record<string, any>;
}

export class ProjectsRepo {
  private async getDb(): Promise<PrismaClient> {
    return await getDb();
  }

  async create(data: CreateProjectData): Promise<Project> {
    const db = await this.getDb();
    return await db.project.create({
      data: {
        name: data.name,
        type: data.type,
        templateRef: data.templateRef || 'persona/basic',
        spec: data.spec || {},
        state: 'init'
      }
    });
  }

  async getById(id: string): Promise<Project | null> {
    const db = await this.getDb();
    return await db.project.findUnique({
      where: { id }
    });
  }

  async getAll(cursor?: string, limit: number = 20): Promise<Project[]> {
    const db = await this.getDb();
    return await db.project.findMany({
      where: cursor ? { id: { gt: cursor } } : undefined,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateState(id: string, state: string): Promise<Project> {
    const db = await this.getDb();
    return await db.project.update({
      where: { id },
      data: { state, updatedAt: new Date() }
    });
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDb();
    await db.project.delete({
      where: { id }
    });
  }
}

export const projectsRepo = new ProjectsRepo();
