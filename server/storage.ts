import { 
  type Project, 
  type InsertProject,
  type Feature,
  type InsertFeature,
  type Message,
  type InsertMessage,
  type Log,
  type Deliverable,
  type SalesData,
  type Milestone,
  type InsertMilestone,
  type Goal,
  type InsertGoal,
  type OutputItem
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project>;
  deleteProject(id: string): Promise<boolean>;

  // Features
  getFeaturesByProject(projectId: string): Promise<Feature[]>;
  createFeature(feature: InsertFeature): Promise<Feature>;
  updateFeature(featureId: string, updates: Partial<Feature>): Promise<Feature>;

  // Messages
  getMessagesByProject(projectId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Logs
  getLogsByProject(projectId: string): Promise<Log[]>;
  createLog(projectId: string, action: string, description: string): Promise<Log>;

  // Deliverables
  getDeliverablesByProject(projectId: string): Promise<Deliverable[]>;

  // Sales Data
  getSalesData(projectId: string): Promise<SalesData | undefined>;

  // Milestones
  getMilestonesByProject(projectId: string): Promise<Milestone[]>;
  getMilestonesByFeature(featureId: string): Promise<Milestone[]>;
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  getMilestone(id: string): Promise<Milestone | undefined>;
  updateMilestoneState(id: string, state: string): Promise<void>;

  // Goals
  getGoalsByProject(projectId: string): Promise<Goal[]>;
  getGoalsByMilestone(milestoneId: string): Promise<Goal[]>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  getGoal(id: string): Promise<Goal | undefined>;
  updateGoalState(id: string, state: string): Promise<void>;

  // Runs
  getRunsByProject(projectId: string): Promise<any[]>;
  getLatestRunByProject(projectId: string): Promise<any | undefined>;
}

export class MemStorage implements IStorage {
  private projects: Map<string, Project>;
  private features: Map<string, Feature>;
  private messages: Map<string, Message>;
  private logs: Map<string, Log>;
  private deliverables: Map<string, Deliverable>;
  private salesData: Map<string, SalesData>;
  private milestones: Map<string, Milestone>;
  private goals: Map<string, Goal>;
  private projectMemory: Map<string, any>;
  private outputItems: Map<string, OutputItem>;

  constructor() {
    this.projects = new Map();
    this.features = new Map();
    this.messages = new Map();
    this.logs = new Map();
    this.deliverables = new Map();
    this.salesData = new Map();
    this.milestones = new Map();
    this.goals = new Map();
    this.projectMemory = new Map();
    this.outputItems = new Map();
    
    // Add a test project for demonstration
    const testProject: Project = {
      id: "test-1",
      name: "Test Project",
      description: "Simple test project to demonstrate the 5-tab interface",
      prompt: "Build a simple test project to show all tabs working",
      status: "active",
      createdAt: new Date()
    };
    this.projects.set("test-1", testProject);
    
    // Add the Person.ai project that the frontend is looking for
    const personAIProject: Project = {
      id: "60962608-24df-4213-a283-8075d83d5ff2",
      name: "Person.ai",
      description: "Project: Person.ai\n\nBuild a comprehensive AI-powered personal assistant application",
      prompt: "Build a comprehensive AI-powered personal assistant application",
      status: "active",
      createdAt: new Date()
    };
    this.projects.set("60962608-24df-4213-a283-8075d83d5ff2", personAIProject);
    
    // Add test features
    const feature1: Feature = {
      id: "feature-1",
      projectId: "test-1",
      name: "User Interface",
      description: "Build the main user interface components",
      status: "in-progress",
      createdAt: new Date()
    };
    const feature2: Feature = {
      id: "feature-2", 
      projectId: "test-1",
      name: "Backend API",
      description: "Create REST API endpoints",
      status: "pending",
      createdAt: new Date()
    };
    this.features.set("feature-1", feature1);
    this.features.set("feature-2", feature2);
    
    // Add test message
    const testMessage: Message = {
      id: "msg-1",
      projectId: "test-1", 
      content: "",
      sender: "assistant",
      type: "text",
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.messages.set("msg-1", testMessage);
    
    // Add test log
    const testLog: Log = {
      id: "log-1",
      projectId: "test-1",
      action: "Project Created",
      description: "Test project initialized with basic structure",
      timestamp: new Date()
    };
    this.logs.set("log-1", testLog);
    
         // Add sales data
     const testSales: SalesData = {
       id: "sales-1",
       projectId: "test-1",
       messagesSent: 0,
       contentCreated: 0,
       income: 0,
       updatedAt: new Date()
     };
     this.salesData.set("test-1", testSales);
  }

  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = insertProject.id || randomUUID();
    const project: Project = {
      ...insertProject,
      id,
      createdAt: new Date(),
      status: "Active",
      description: insertProject.description || "No description"
    };
    this.projects.set(id, project);

    // Initialize sales data for the project
    const salesDataId = randomUUID();
    const initialSalesData: SalesData = {
      id: salesDataId,
      projectId: id,
      messagesSent: 0,
      contentCreated: 0,
      income: 0,
      updatedAt: new Date()
    };
    this.salesData.set(salesDataId, initialSalesData);

    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const project = this.projects.get(id);
    if (!project) {
      throw new Error(`Project ${id} not found`);
    }
    
    const updatedProject = { ...project, ...updates };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: string): Promise<boolean> {
    const deleted = this.projects.delete(id);
    
    // Clean up related data
    Array.from(this.features.values())
      .filter(f => f.projectId === id)
      .forEach(f => this.features.delete(f.id));
    
    Array.from(this.messages.values())
      .filter(m => m.projectId === id)
      .forEach(m => this.messages.delete(m.id));
    
    Array.from(this.logs.values())
      .filter(l => l.projectId === id)
      .forEach(l => this.logs.delete(l.id));
    
    Array.from(this.deliverables.values())
      .filter(d => d.projectId === id)
      .forEach(d => this.deliverables.delete(d.id));
    
    Array.from(this.salesData.values())
      .filter(s => s.projectId === id)
      .forEach(s => this.salesData.delete(s.id));

    return deleted;
  }

  async getFeaturesByProject(projectId: string): Promise<Feature[]> {
    return Array.from(this.features.values())
      .filter(f => f.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createFeature(insertFeature: InsertFeature): Promise<Feature> {
    const id = insertFeature.id || randomUUID();
    const feature: Feature = {
      ...insertFeature,
      id,
      createdAt: new Date(),
      status: "pending",
      description: insertFeature.description || null
    };
    this.features.set(id, feature);
    return feature;
  }

  async updateFeature(featureId: string, updates: Partial<Feature>): Promise<Feature> {
    const feature = this.features.get(featureId);
    if (!feature) {
      throw new Error(`Feature ${featureId} not found`);
    }
    
    const updatedFeature = { ...feature, ...updates };
    this.features.set(featureId, updatedFeature);
    return updatedFeature;
  }

  async getMessagesByProject(projectId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(m => m.projectId === projectId)
      .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      type: "text",
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.messages.set(id, message);
    return message;
  }

  async getLogsByProject(projectId: string): Promise<Log[]> {
    return Array.from(this.logs.values())
      .filter(l => l.projectId === projectId)
      .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime());
  }

  async createLog(projectId: string, action: string, description: string): Promise<Log> {
    const id = randomUUID();
    const log: Log = {
      id,
      projectId,
      action,
      description,
      timestamp: new Date()
    };
    this.logs.set(id, log);
    return log;
  }

  async getDeliverablesByProject(projectId: string): Promise<Deliverable[]> {
    return Array.from(this.deliverables.values())
      .filter(d => d.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getSalesData(projectId: string): Promise<SalesData | undefined> {
    return Array.from(this.salesData.values()).find(s => s.projectId === projectId);
  }

  async createOutputItem(data: Omit<OutputItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<OutputItem> {
    const id = randomUUID();
    const outputItem: OutputItem = {
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.outputItems.set(id, outputItem);
    return outputItem;
  }

  async getOutputItems(projectId: string): Promise<OutputItem[]> {
    return Array.from(this.outputItems.values())
      .filter(item => item.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async updateOutputItem(id: string, data: Partial<OutputItem>): Promise<OutputItem> {
    const outputItem = this.outputItems.get(id);
    if (!outputItem) {
      throw new Error(`Output item ${id} not found`);
    }
    const updatedItem = { ...outputItem, ...data, updatedAt: new Date() };
    this.outputItems.set(id, updatedItem);
    return updatedItem;
  }

  async getProjectMemory(projectId: string): Promise<any> {
    // Initialize memory if it doesn't exist
    if (!this.projectMemory.has(projectId)) {
      this.projectMemory.set(projectId, {
        input: [],
        tasks: [],
        context: {},
        lastUpdated: new Date().toISOString()
      });
    }
    return this.projectMemory.get(projectId);
  }

  async updateProjectMemory(projectId: string, memory: any): Promise<void> {
    memory.lastUpdated = new Date().toISOString();
    
    // Clean up input array to prevent memory accumulation
    if (memory.input && Array.isArray(memory.input)) {
      // Keep only the last 100 input entries
      if (memory.input.length > 100) {
        memory.input = memory.input.slice(-100);
        console.log(`🧹 Project Memory: Cleaned up input array for project ${projectId}, kept last 100 entries`);
      }
    }
    
    // Clean up tasks array to prevent memory accumulation
    if (memory.tasks && Array.isArray(memory.tasks)) {
      // Keep only the last 200 task entries
      if (memory.tasks.length > 200) {
        memory.tasks = memory.tasks.slice(-200);
        console.log(`🧹 Project Memory: Cleaned up tasks array for project ${projectId}, kept last 200 entries`);
      }
    }
    
    this.projectMemory.set(projectId, memory);
  }

  // Milestone methods
  async getMilestonesByProject(projectId: string): Promise<Milestone[]> {
    return Array.from(this.milestones.values()).filter(m => m.projectId === projectId);
  }

  async getMilestonesByFeature(featureId: string): Promise<Milestone[]> {
    return Array.from(this.milestones.values()).filter(m => m.featureId === featureId);
  }

  async createMilestone(insertMilestone: InsertMilestone): Promise<Milestone> {
    const id = insertMilestone.id || randomUUID();
    const milestone: Milestone = {
      ...insertMilestone,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.milestones.set(id, milestone);
    return milestone;
  }

  async getMilestone(id: string): Promise<Milestone | undefined> {
    return this.milestones.get(id);
  }

  async updateMilestoneState(id: string, state: string): Promise<void> {
    const milestone = this.milestones.get(id);
    if (milestone) {
      milestone.state = state as any;
      milestone.updatedAt = new Date();
      this.milestones.set(id, milestone);
    }
  }

  // Goal methods
  async getGoalsByProject(projectId: string): Promise<Goal[]> {
    return Array.from(this.goals.values()).filter(g => g.projectId === projectId);
  }

  async getGoalsByMilestone(milestoneId: string): Promise<Goal[]> {
    return Array.from(this.goals.values()).filter(g => g.milestoneId === milestoneId);
  }

  async createGoal(insertGoal: InsertGoal): Promise<Goal> {
    const id = insertGoal.id || randomUUID();
    const goal: Goal = {
      ...insertGoal,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.goals.set(id, goal);
    return goal;
  }

  async getGoal(id: string): Promise<Goal | undefined> {
    return this.goals.get(id);
  }

  async updateGoalState(id: string, state: string): Promise<void> {
    const goal = this.goals.get(id);
    if (goal) {
      goal.state = state as any;
      goal.updatedAt = new Date();
      this.goals.set(id, goal);
    }
  }

  // Runs methods - for now return empty arrays since runs are stored in DB

  async getLatestRunByProject(projectId: string): Promise<any | undefined> {
    // In a real implementation, this would query the database for the latest run
    // For now, return undefined since runs are managed by orchestrator
    return undefined;
  }

  // Live actions storage
  private liveActions = new Map<string, any[]>();
  private proofs = new Map<string, any[]>();
  private projectMessages = new Map<string, any[]>();

  // Live actions methods
  async getLiveActionsByProject(projectId: string): Promise<any[]> {
    return this.liveActions.get(projectId) || [];
  }

  async addLiveAction(projectId: string, action: any): Promise<void> {
    const actions = this.liveActions.get(projectId) || [];
    actions.push(action);
    this.liveActions.set(projectId, actions);
  }

  // Proofs methods
  async getProofsByProject(projectId: string): Promise<any[]> {
    return this.proofs.get(projectId) || [];
  }

  async addProof(projectId: string, proof: any): Promise<void> {
    const proofs = this.proofs.get(projectId) || [];
    proofs.push(proof);
    this.proofs.set(projectId, proofs);
  }

  async getProofById(proofId: string): Promise<any | null> {
    // Search through all proofs to find the one with matching ID
    for (const proofs of this.proofs.values()) {
      const proof = proofs.find(p => p.id === proofId);
      if (proof) return proof;
    }
    return null;
  }

  // Project messages methods (separate from regular messages)
  async getProjectMessagesByProject(projectId: string): Promise<any[]> {
    return this.projectMessages.get(projectId) || [];
  }

  async addProjectMessage(projectId: string, message: any): Promise<void> {
    const messages = this.projectMessages.get(projectId) || [];
    messages.push(message);
    this.projectMessages.set(projectId, messages);
  }

  // Tasks storage
  private tasks = new Map<string, any>();
  private runs = new Map<string, any[]>();
  
  // Memory and message storage
  private memories = new Map<string, any[]>();
  private projectMessages = new Map<string, any[]>();

  addTask(task: any): void {
    this.tasks.set(task.id, task);
  }

  updateTask(task: any): void {
    this.tasks.set(task.id, task);
  }

  getTaskById(taskId: string): any {
    return this.tasks.get(taskId);
  }

  getTasksByProject(projectId: string): any[] {
    if (projectId === 'all') {
      return Array.from(this.tasks.values());
    }
    return Array.from(this.tasks.values()).filter(t => t.projectId === projectId);
  }

  async addRun(projectId: string, run: any): Promise<any> {
    const runWithId = { ...run, id: randomUUID(), projectId };
    const runs = this.runs.get(projectId) || [];
    runs.push(runWithId);
    this.runs.set(projectId, runs);
    return runWithId;
  }

  async getRunsByProject(projectId: string): Promise<any[]> {
    return this.runs.get(projectId) || [];
  }

  // Memory methods
  async getMemoriesByProject(projectId: string, limit?: number): Promise<any[]> {
    const memories = this.memories.get(projectId) || [];
    return limit ? memories.slice(-limit) : memories;
  }

  async addMemory(projectId: string, memory: any): Promise<any> {
    const memoryWithId = { 
      ...memory, 
      id: randomUUID(), 
      projectId, 
      createdAt: new Date().toISOString() 
    };
    const memories = this.memories.get(projectId) || [];
    memories.push(memoryWithId);
    this.memories.set(projectId, memories);
    return memoryWithId;
  }

  // Project message methods (separate from regular messages)
  async getProjectMessagesByProject(projectId: string, limit?: number): Promise<any[]> {
    const messages = this.projectMessages.get(projectId) || [];
    return limit ? messages.slice(-limit) : messages;
  }

  async getLogsByProject(projectId: string): Promise<any[]> {
    // Get logs from the project's runs and attempts
    const runs = this.getRunsByProject(projectId);
    const logs: any[] = [];
    
    runs.forEach(run => {
      // Add run logs
      logs.push({
        id: `run-${run.id}`,
        action: `Run ${run.state}`,
        description: `Project run ${run.state.toLowerCase()} with task ${run.currentTaskId || 'none'}`,
        timestamp: run.createdAt,
        type: 'run'
      });
      
      // Add attempt logs
      const attempts = this.getAttemptsByRun(run.id);
      attempts.forEach(attempt => {
        logs.push({
          id: `attempt-${attempt.id}`,
          action: `Attempt ${attempt.status}`,
          description: attempt.message || `Attempt ${attempt.status.toLowerCase()}`,
          timestamp: attempt.createdAt,
          type: 'attempt'
        });
      });
    });
    
    // Sort by timestamp (newest first)
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async addProjectMessage(projectId: string, message: any): Promise<any> {
    const messageWithId = { 
      ...message, 
      id: randomUUID(), 
      projectId, 
      createdAt: new Date().toISOString() 
    };
    const messages = this.projectMessages.get(projectId) || [];
    messages.push(messageWithId);
    this.projectMessages.set(projectId, messages);
    return messageWithId;
  }
}

export const storage = new MemStorage();
