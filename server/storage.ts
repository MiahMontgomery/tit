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
  type Goal
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  deleteProject(id: string): Promise<boolean>;

  // Features
  getFeaturesByProject(projectId: string): Promise<Feature[]>;
  createFeature(feature: InsertFeature): Promise<Feature>;

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

  constructor() {
    this.projects = new Map();
    this.features = new Map();
    this.messages = new Map();
    this.logs = new Map();
    this.deliverables = new Map();
    this.salesData = new Map();
    this.milestones = new Map();
    this.goals = new Map();
    
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
      content: "Hello! I'm ready to help build your test project. What would you like to start with?",
      sender: "assistant",
      timestamp: new Date()
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
      createdAt: new Date()
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
    const id = randomUUID();
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
    const id = randomUUID();
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

  async getMessagesByProject(projectId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(m => m.projectId === projectId)
      .sort((a, b) => new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      timestamp: new Date()
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
}

export const storage = new MemStorage();
