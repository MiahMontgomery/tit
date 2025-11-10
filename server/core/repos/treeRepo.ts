import { eq, asc } from "drizzle-orm";
import { db } from "./db.js";
import { features, milestones, goals, type Feature, type Milestone, type Goal } from "../../drizzle/schema.js";
import { mockStore } from "../mockData.ts";

export interface TreeItem {
  id: string;
  name: string;
  description: string;
  status: string;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
  children?: TreeItem[];
}

export class TreeRepo {
  async getProjectTree(projectId: string): Promise<TreeItem[]> {
    if (!db) {
      // Mock mode - return mock tree structure
      const projectFeatures = mockStore.getFeaturesByProject(projectId);
      const projectMilestones = mockStore.getMilestonesByProject(projectId);
      const projectGoals = mockStore.getGoalsByProject(projectId);

      return projectFeatures.map(feature => {
        const featureMilestones = projectMilestones.filter(m => m.featureId === feature.id);
        
        return {
          id: feature.id,
          name: feature.name,
          description: feature.description,
          status: feature.status,
          orderIndex: feature.orderIndex,
          createdAt: feature.createdAt,
          updatedAt: feature.updatedAt,
          children: featureMilestones.map(milestone => {
            const milestoneGoals = projectGoals.filter(g => g.milestoneId === milestone.id);
            
            return {
              id: milestone.id,
              name: milestone.title,
              description: milestone.description,
              status: milestone.status,
              orderIndex: milestone.orderIndex,
              createdAt: milestone.createdAt,
              updatedAt: milestone.updatedAt,
              children: milestoneGoals.map(goal => ({
                id: goal.id,
                name: goal.title,
                description: goal.description,
                status: goal.status,
                orderIndex: goal.orderIndex,
                createdAt: goal.createdAt,
                updatedAt: goal.updatedAt
              }))
            };
          })
        };
      });
    }

    // Get all features for the project
    const projectFeatures = await db
      .select()
      .from(features)
      .where(eq(features.projectId, projectId))
      .orderBy(asc(features.orderIndex), asc(features.createdAt));

    // Get all milestones for each feature
    const featureIds = projectFeatures.map(f => f.id);
    const allMilestones = featureIds.length > 0 
      ? await db
          .select()
          .from(milestones)
          .where(eq(milestones.projectId, projectId))
          .orderBy(asc(milestones.orderIndex), asc(milestones.createdAt))
      : [];

    // Get all goals for each milestone
    const milestoneIds = allMilestones.map(m => m.id);
    const allGoals = milestoneIds.length > 0
      ? await db
          .select()
          .from(goals)
          .where(eq(goals.projectId, projectId))
          .orderBy(asc(goals.orderIndex), asc(goals.createdAt))
      : [];

    // Build the tree structure
    const featuresMap = new Map<string, TreeItem>();
    
    // Initialize features
    projectFeatures.forEach(feature => {
      featuresMap.set(feature.id, {
        id: feature.id,
        name: feature.name,
        description: feature.description || "",
        status: feature.status,
        orderIndex: feature.orderIndex || 0,
        createdAt: feature.createdAt,
        updatedAt: feature.updatedAt,
        children: []
      });
    });

    // Add milestones to features
    allMilestones.forEach(milestone => {
      const feature = featuresMap.get(milestone.featureId);
      if (feature) {
        feature.children!.push({
          id: milestone.id,
          name: milestone.title,
          description: milestone.description || "",
          status: milestone.status,
          orderIndex: milestone.orderIndex || 0,
          createdAt: milestone.createdAt,
          updatedAt: milestone.updatedAt,
          children: []
        });
      }
    });

    // Add goals to milestones
    const milestonesMap = new Map<string, TreeItem>();
    allMilestones.forEach(milestone => {
      const feature = featuresMap.get(milestone.featureId);
      if (feature) {
        const milestoneItem = feature.children!.find(m => m.id === milestone.id);
        if (milestoneItem) {
          milestonesMap.set(milestone.id, milestoneItem);
        }
      }
    });

    allGoals.forEach(goal => {
      const milestone = milestonesMap.get(goal.milestoneId);
      if (milestone) {
        milestone.children!.push({
          id: goal.id,
          name: goal.title,
          description: goal.description || "",
          status: goal.status,
          orderIndex: goal.orderIndex || 0,
          createdAt: goal.createdAt,
          updatedAt: goal.updatedAt
        });
      }
    });

    return Array.from(featuresMap.values());
  }

  async createFeature(projectId: string, name: string, description: string = ""): Promise<Feature> {
    if (!db) {
      return mockStore.createFeature({
        projectId,
        name,
        description,
        status: "pending",
        orderIndex: 0
      }) as Feature;
    }
    
    try {
      const [feature] = await db
        .insert(features)
        .values({
          projectId,
          name,
          description,
          status: "pending",
          orderIndex: 0
        })
        .returning();
      return feature;
    } catch (error) {
      console.warn(`DB error creating feature; falling back to mock store:`, (error as Error).message);
      return mockStore.createFeature({
        projectId,
        name,
        description,
        status: "pending",
        orderIndex: 0
      }) as Feature;
    }
  }

  async createMilestone(projectId: string, featureId: string, title: string, description: string = ""): Promise<Milestone> {
    if (!db) {
      return mockStore.createMilestone({
        projectId,
        featureId,
        title,
        description,
        status: "pending",
        orderIndex: 0
      }) as Milestone;
    }
    
    try {
      const [milestone] = await db
        .insert(milestones)
        .values({
          projectId,
          featureId,
          title,
          description,
          status: "pending",
          orderIndex: 0
        })
        .returning();
      return milestone;
    } catch (error) {
      console.warn(`DB error creating milestone; falling back to mock store:`, (error as Error).message);
      return mockStore.createMilestone({
        projectId,
        featureId,
        title,
        description,
        status: "pending",
        orderIndex: 0
      }) as Milestone;
    }
  }

  async createGoal(projectId: string, milestoneId: string, title: string, description: string = ""): Promise<Goal> {
    if (!db) {
      return mockStore.createGoal({
        projectId,
        milestoneId,
        title,
        description,
        status: "pending",
        priority: 0,
        score: 0,
        orderIndex: 0
      }) as Goal;
    }
    
    try {
      const [goal] = await db
        .insert(goals)
        .values({
          projectId,
          milestoneId,
          title,
          description,
          status: "pending",
          priority: 0,
          orderIndex: 0
        })
        .returning();
      return goal;
    } catch (error) {
      console.warn(`DB error creating goal; falling back to mock store:`, (error as Error).message);
      return mockStore.createGoal({
        projectId,
        milestoneId,
        title,
        description,
        status: "pending",
        priority: 0,
        score: 0,
        orderIndex: 0
      }) as Goal;
    }
  }

  async updateFeatureStatus(featureId: string, status: string): Promise<void> {
    if (!db) {
      mockStore.updateFeatureStatus(featureId, status);
      return;
    }
    
    try {
      await db
        .update(features)
        .set({ status, updatedAt: new Date() })
        .where(eq(features.id, featureId));
    } catch (error) {
      console.warn(`DB error updating feature status; falling back to mock store:`, (error as Error).message);
      mockStore.updateFeatureStatus(featureId, status);
    }
  }

  async updateMilestoneStatus(milestoneId: string, status: string): Promise<void> {
    if (!db) {
      mockStore.updateMilestoneStatus(milestoneId, status);
      return;
    }
    
    try {
      await db
        .update(milestones)
        .set({ status, updatedAt: new Date() })
        .where(eq(milestones.id, milestoneId));
    } catch (error) {
      console.warn(`DB error updating milestone status; falling back to mock store:`, (error as Error).message);
      mockStore.updateMilestoneStatus(milestoneId, status);
    }
  }

  async updateGoalStatus(goalId: string, status: string): Promise<void> {
    if (!db) {
      mockStore.updateGoalStatus(goalId, status);
      return;
    }
    
    try {
      await db
        .update(goals)
        .set({ status, updatedAt: new Date() })
        .where(eq(goals.id, goalId));
    } catch (error) {
      console.warn(`DB error updating goal status; falling back to mock store:`, (error as Error).message);
      mockStore.updateGoalStatus(goalId, status);
    }
  }

  async insertPlanTree(projectId: string, plan: any): Promise<{
    features: number;
    milestones: number;
    goals: number;
  }> {
    if (!db) {
      // Mock mode - use mock store
      let featuresCount = 0;
      let milestonesCount = 0;
      let goalsCount = 0;

      for (const f of (plan.features ?? [])) {
        const feature = mockStore.createFeature({
          projectId,
          name: f.title,
          description: f.description ?? "",
          status: "pending",
          orderIndex: featuresCount
        });
        featuresCount++;

        for (const m of (f.milestones ?? [])) {
          const milestone = mockStore.createMilestone({
            projectId,
            featureId: feature.id,
            title: m.title,
            description: m.description ?? "",
            status: "pending",
            orderIndex: milestonesCount
          });
          milestonesCount++;

          for (const g of (m.goals ?? [])) {
            mockStore.createGoal({
              projectId,
              milestoneId: milestone.id,
              title: g.title,
              description: g.description ?? "",
              status: "pending",
              priority: 0,
              score: 0,
              orderIndex: goalsCount
            });
            goalsCount++;
          }
        }
      }

      return {
        features: featuresCount,
        milestones: milestonesCount,
        goals: goalsCount
      };
    }

    let featuresCount = 0;
    let milestonesCount = 0;
    let goalsCount = 0;

    for (const f of (plan.features ?? [])) {
      const [feature] = await db.insert(features).values({
        projectId,
        name: f.title,
        description: f.description ?? "",
        status: "pending",
        orderIndex: featuresCount
      }).returning();
      featuresCount++;

      for (const m of (f.milestones ?? [])) {
        const [milestone] = await db.insert(milestones).values({
          projectId,
          featureId: feature.id,
          title: m.title,
          description: m.description ?? "",
          status: "pending",
          orderIndex: milestonesCount
        }).returning();
        milestonesCount++;

        for (const g of (m.goals ?? [])) {
          await db.insert(goals).values({
            projectId,
            milestoneId: milestone.id,
            title: g.title,
            description: g.description ?? "",
            status: "pending",
            priority: 0,
            orderIndex: goalsCount
          });
          goalsCount++;
        }
      }
    }

    return {
      features: featuresCount,
      milestones: milestonesCount,
      goals: goalsCount
    };
  }
}

export const treeRepo = new TreeRepo();
