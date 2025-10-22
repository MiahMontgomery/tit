import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateProjectData {
  name: string;
  type: string;
  templateRef: string;
  spec: any;
}

export interface UpdateProjectStateData {
  state: string;
}

export class ProjectsRepo {
  static async create(data: CreateProjectData) {
    return await prisma.project.create({
      data: {
        name: data.name,
        type: data.type,
        templateRef: data.templateRef,
        spec: data.spec,
        state: 'init'
      }
    });
  }

  static async updateState(id: string, state: string) {
    return await prisma.project.update({
      where: { id },
      data: { state }
    });
  }

  static async get(id: string) {
    return await prisma.project.findUnique({
      where: { id },
      include: {
        runs: true,
        jobs: true,
        artifacts: true
      }
    });
  }

  static async getAll(cursor?: string, limit: number = 20) {
    const where = cursor ? { id: { gt: cursor } } : {};
    
    return await prisma.project.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'asc' },
      include: {
        runs: true,
        jobs: true,
        artifacts: true
      }
    });
  }
}