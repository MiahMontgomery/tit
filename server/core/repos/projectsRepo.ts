import { eq, desc } from "drizzle-orm";
import { db } from "./db.js";
import { projects, features, milestones, goals, type Project, type InsertProject } from "../../drizzle/schema.js";
import { mockStore } from "../mockData.ts";

/**
 * ProjectsRepo provides an API for reading and writing project data.  When a
 * backing database connection is available (`db` is defined), it will use
 * Drizzle/pg to read from and write to the database.  If the database is
 * unavailable (for example because the `DATABASE_URL` environment variable is
 * missing or misconfigured) or if any database operation throws, the repo
 * gracefully falls back to an in‑memory mock store.  This makes the API
 * endpoints resilient in environments where a database is not configured.
 */
export class ProjectsRepo {
  /**
   * Create a new project.  When the database is available the new row is
   * inserted and returned.  Otherwise a project is added to the mock store.
   */
  async create(project: InsertProject): Promise<Project> {
    // If no database is configured, always use the mock store
    if (!db) {
      const mockProject = mockStore.createProject({
        name: project.name,
        description: project.description || "",
        prompt: project.prompt,
        status: "active",
      });
      return mockProject as Project;
    }
    try {
      const [created] = await db.insert(projects).values(project).returning();
      return created;
    } catch (error) {
      // Fall back to mock store on any error
      console.warn(
        "DB error creating project; falling back to in-memory store:",
        (error as Error).message
      );
      const mockProject = mockStore.createProject({
        name: project.name,
        description: project.description || "",
        prompt: project.prompt,
        status: "active",
      });
      return mockProject as Project;
    }
  }

  /**
   * Retrieve a project by id.  Falls back to the mock store on failure.
   */
  async getById(id: string): Promise<Project | null> {
    if (!db) {
      return mockStore.getProject(id) as Project | null;
    }
    try {
      const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
      return project || null;
    } catch (error) {
      console.warn(
        `DB error fetching project ${id}; falling back to in-memory store:`,
        (error as Error).message
      );
      return mockStore.getProject(id) as Project | null;
    }
  }

  /**
   * Return all projects, ordered by creation date descending.  If the database
   * cannot be queried, returns all projects from the mock store.
   */
  async getAll(): Promise<Project[]> {
    if (!db) {
      return mockStore.getAllProjects() as Project[];
    }
    try {
      return await db.select().from(projects).orderBy(desc(projects.createdAt));
    } catch (error) {
      console.warn(
        "DB error fetching all projects; falling back to in-memory store:",
        (error as Error).message
      );
      return mockStore.getAllProjects() as Project[];
    }
  }

  /**
   * Update a project by id.  If the database is unavailable, returns null.
   */
  async update(id: string, updates: Partial<Project>): Promise<Project | null> {
    if (!db) {
      // We don't support updating projects in the mock store; just return null
      return null;
    }
    try {
      const [updated] = await db
        .update(projects)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(projects.id, id))
        .returning();
      return updated || null;
    } catch (error) {
      console.warn(
        `DB error updating project ${id}; operation aborted:`,
        (error as Error).message
      );
      return null;
    }
  }

  /**
   * Delete a project by id.  Returns true if deletion succeeded, false otherwise.
   */
  async delete(id: string): Promise<boolean> {
    if (!db) {
      // Mock store deletion is not supported; treat as false
      return false;
    }
    try {
      const result = await db.delete(projects).where(eq(projects.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.warn(
        `DB error deleting project ${id}; operation aborted:`,
        (error as Error).message
      );
      return false;
    }
  }

  /**
   * Return a summary overview for all projects.  If the database is
   * unavailable or an error occurs, returns an array with fallback values.
   */
  async getOverview() {
    const allProjects = await this.getAll();
    if (!db || allProjects.length === 0) {
      return allProjects.map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        featuresCount: 0,
        completedFeatures: 0,
        completionRate: 0,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      }));
    }
    try {
      return await Promise.all(
        allProjects.map(async (project) => {
          try {
            const projectFeatures = await db
              .select()
              .from(features)
              .where(eq(features.projectId, project.id));
            const completedFeatures = projectFeatures.filter((f) => f.status === "completed").length;
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
          } catch (error) {
            console.warn(
              `DB error fetching overview for project ${project.id}; using fallback values:`,
              (error as Error).message
            );
            return {
              id: project.id,
              name: project.name,
              description: project.description,
              status: project.status,
              featuresCount: 0,
              completedFeatures: 0,
              completionRate: 0,
              createdAt: project.createdAt,
              updatedAt: project.updatedAt,
            };
          }
        })
      );
    } catch (error) {
      console.warn(
        "DB error generating project overview; returning fallback values:",
        (error as Error).message
      );
      return allProjects.map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        featuresCount: 0,
        completedFeatures: 0,
        completionRate: 0,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      }));
    }
  }
}

export const projectsRepo = new ProjectsRepo();
