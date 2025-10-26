import { Artifact } from '@prisma/client';
import { prisma } from '../db.js';

export interface AddArtifactData {
  projectId: string;
  kind: string;
  path: string;
  meta?: any;
}

export class ArtifactsRepo {
  static async add(data: AddArtifactData) {
    return await prisma.artifact.create({
      data: {
        projectId: data.projectId,
        kind: data.kind,
        path: data.path,
        meta: data.meta || {}
      }
    });
  }

  static async getByProject(projectId: string) {
    return await prisma.artifact.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getByProjectAndKind(projectId: string, kind: string) {
    return await prisma.artifact.findMany({
      where: { 
        projectId,
        kind 
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}