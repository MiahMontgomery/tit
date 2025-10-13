import { eq, desc } from "drizzle-orm";
import { db } from "./db.js";
import { projects, features, milestones, goals, type Project, type InsertProject } from "../../drizzle/schema.js";
import { mockStore } from "../mockData.ts";

export class ProjectsRepo {
  async create(project: InsertProject): Promise<Project> {
    if (!db) {
      // Mock mode - use mock store
      const mockProject = mockStore.createProject({
        name: project.name,
        description: project.description || "",
        prompt: project.prompt,
        status: "active"
      });
      return mockProject as Project;
    }
    
    const [created] = await db.insert(projects).values(project).returning();
    return created;
  }

  async getById(id: string): Promise<Project | null> {
    if (!db) {
      return mockStore.getProject(id) as Project | null;
    }
    
    const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return project || null;
  }

  async getAll(): Promise<Project[]> {
    if (!db) {
      return mockStore.getAllProjects() as Project[];
    }
    
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async update(id: string, updates: Partial<Project>): Promise<Project | null> {
    const [updated] = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updated || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return result.rowCount > 0;
  }

  async getOverview() {
    const allProjects = await this.getAll();
    
    return await Promise.all(
      allProjects.map(async (project) => {
        const projectFeatures = await db
          .select()
          .from(features)
          .where(eq(features.projectId, project.id));

        const completedFeatures = projectFeatures.filter(f => f.status === "completed").length;
        const totalFeatures = projectFeatures.length;

        return {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          featuresCount: totalFeatures,
          completedFeatures,
          completionRate: totalFeatures > 0 ? (completedFeatures / totalFeatures) * 100 : 0,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        };
      })
    );
  }
}

export const projectsRepo = new ProjectsRepo();
