import { storage } from '../storage.js';
import { logger } from '../core/tools/logger.js';

export interface JasonMemory {
  id: string;
  type: 'decision' | 'outcome' | 'context' | 'learning';
  content: string;
  context: any;
  outcome?: 'success' | 'failure' | 'partial';
  timestamp: Date;
  projectId?: string;
}

export interface JasonDecision {
  id: string;
  request: string;
  analysis: any;
  decision: string;
  reasoning: string;
  confidence: number;
  timestamp: Date;
}

export class JasonAgent {
  private memory: Map<string, JasonMemory> = new Map();
  private decisions: Map<string, JasonDecision> = new Map();
  private isRunning: boolean = false;
  private updateInterval: NodeJS.Timeout | null = null;
  
  // Jason's core understanding of Titan
  private titanKnowledge = {
    purpose: "Titan is an autonomous project management system that creates, manages, and executes software projects",
    capabilities: [
      "Project creation and planning",
      "Feature, milestone, and goal generation",
      "Autonomous code execution",
      "Real-time progress tracking",
      "Web browser automation",
      "API integrations",
      "Continuous optimization"
    ],
    architecture: {
      frontend: "React + TypeScript + Tailwind CSS",
      backend: "Node.js + Express + WebSocket",
      storage: "In-memory with PostgreSQL schema",
      agents: "Individual project agents with separate API keys"
    }
  };

  constructor() {
    this.initializeMemory();
  }

  private async initializeMemory() {
    // Load existing memories and decisions
    console.log('🧠 Jason: Initializing memory system...');
    
    // Add some initial knowledge about Titan
    this.addMemory({
      type: 'learning',
      content: 'Titan is an autonomous project management system',
      context: { system: 'titan', knowledge: this.titanKnowledge }
    });
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️ Jason: Already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Jason: Starting autonomous operation...');
    
    // Start the decision-making loop
    this.updateInterval = setInterval(async () => {
      await this.autonomousTick();
    }, 30000); // Every 30 seconds
  }

  async stop() {
    if (!this.isRunning) {
      console.log('⚠️ Jason: Not running');
      return;
    }

    this.isRunning = false;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    console.log('🛑 Jason: Stopped autonomous operation');
  }

  private async autonomousTick() {
    try {
      // Get all active projects
      const projects = await storage.getAllProjects();
      const activeProjects = projects.filter(p => p.status === 'active');
      
      if (activeProjects.length === 0) {
        console.log('📋 Jason: No active projects to manage');
        return;
      }

      console.log(`🔄 Jason: Managing ${activeProjects.length} active projects`);
      
      // Process each project
      for (const project of activeProjects) {
        await this.processProject(project);
      }
      
    } catch (error) {
      console.error('❌ Jason: Error in autonomous tick:', error);
    }
  }

  private async processProject(project: any) {
    try {
      console.log(`📊 Jason: Processing project ${project.name}`);
      
      // Get project context
      const features = await storage.getFeaturesByProject(project.id);
      const messages = await storage.getProjectMessagesByProject(project.id, 10);
      const memories = await storage.getMemoriesByProject(project.id, 20);
      
      // Analyze project state
      const analysis = this.analyzeProjectState(project, features, messages, memories);
      
      // Make decisions if needed
      if (analysis.needsAttention) {
        const decision = await this.makeDecision(
          `Project ${project.name} needs attention: ${analysis.issues.join(', ')}`,
          { project, analysis, features, messages, memories }
        );
        
        // Execute the decision
        await this.executeDecision(decision, project.id);
      }
      
    } catch (error) {
      console.error(`❌ Jason: Error processing project ${project.name}:`, error);
    }
  }

  private analyzeProjectState(project: any, features: any[], messages: any[], memories: any[]) {
    const issues: string[] = [];
    const needsAttention = false;
    
    // Check for stalled projects
    const lastMessage = messages[0];
    if (lastMessage && this.isStale(lastMessage.createdAt)) {
      issues.push('No recent activity');
    }
    
    // Check for incomplete features
    const incompleteFeatures = features.filter(f => f.status !== 'completed');
    if (incompleteFeatures.length > 0) {
      issues.push(`${incompleteFeatures.length} incomplete features`);
    }
    
    // Check for error patterns in messages
    const errorMessages = messages.filter(m => 
      m.content.toLowerCase().includes('error') || 
      m.content.toLowerCase().includes('failed')
    );
    if (errorMessages.length > 0) {
      issues.push(`${errorMessages.length} error messages`);
    }
    
    return {
      issues,
      needsAttention: issues.length > 0,
      incompleteFeatures: incompleteFeatures.length,
      errorCount: errorMessages.length,
      lastActivity: lastMessage?.createdAt
    };
  }

  private isStale(timestamp: string | Date): boolean {
    const now = new Date();
    const lastActivity = new Date(timestamp);
    const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
    return hoursSinceActivity > 2; // Stale if no activity for 2+ hours
  }

  async handleUserRequest(request: string, projectId?: string): Promise<string> {
    console.log(`👤 Jason: Handling user request: ${request}`);
    
    // Analyze the request
    const analysis = this.analyzeUserRequest(request);
    
    // Make a decision
    const decision = await this.makeDecision(
      `User request: ${request}`,
      { request, analysis, projectId }
    );
    
    // Execute the decision
    const response = await this.executeDecision(decision, projectId);
    
    return response;
  }

  private analyzeUserRequest(request: string) {
    const lowerRequest = request.toLowerCase();
    
    // Determine request type
    if (lowerRequest.includes('create') && lowerRequest.includes('project')) {
      return { type: 'project_creation', priority: 'high' };
    }
    
    if (lowerRequest.includes('status') || lowerRequest.includes('progress')) {
      return { type: 'status_inquiry', priority: 'medium' };
    }
    
    if (lowerRequest.includes('help') || lowerRequest.includes('what')) {
      return { type: 'help_request', priority: 'low' };
    }
    
    return { type: 'general', priority: 'medium' };
  }

  private async makeDecision(context: string, data: any): Promise<JasonDecision> {
    const decisionId = this.generateId();
    
    // Simple decision logic for now
    let decision = "Continue monitoring project status";
    let reasoning = "No immediate action required";
    let confidence = 0.7;
    
    if (data.analysis?.type === 'project_creation') {
      decision = "Create new project based on user requirements";
      reasoning = "User requested project creation";
      confidence = 0.9;
    } else if (data.analysis?.type === 'status_inquiry') {
      decision = "Provide project status update";
      reasoning = "User requested status information";
      confidence = 0.8;
    } else if (data.analysis?.type === 'help_request') {
      decision = "Provide helpful information about Titan capabilities";
      reasoning = "User needs assistance";
      confidence = 0.9;
    }
    
    const jasonDecision: JasonDecision = {
      id: decisionId,
      request: context,
      analysis: data.analysis,
      decision,
      reasoning,
      confidence,
      timestamp: new Date()
    };
    
    this.decisions.set(decisionId, jasonDecision);
    
    // Store in memory
    this.addMemory({
      type: 'decision',
      content: decision,
      context: data,
      outcome: 'pending',
      projectId: data.projectId
    });
    
    return jasonDecision;
  }

  private async executeDecision(decision: JasonDecision, projectId?: string): Promise<string> {
    console.log(`🎯 Jason: Executing decision: ${decision.decision}`);
    
    try {
      switch (decision.decision) {
        case "Create new project based on user requirements":
          return await this.createProject(decision, projectId);
          
        case "Provide project status update":
          return await this.provideStatusUpdate(projectId);
          
        case "Provide helpful information about Titan capabilities":
          return this.provideHelp();
          
        case "Continue monitoring project status":
          return "I'm monitoring the project status. Everything looks good so far.";
          
        default:
          return "I've processed your request and will continue monitoring the project.";
      }
    } catch (error) {
      console.error('❌ Jason: Error executing decision:', error);
      return "I encountered an error while processing your request. Please try again.";
    }
  }

  private async createProject(decision: JasonDecision, projectId?: string): Promise<string> {
    // This would integrate with the actual project creation system
    return "I'll help you create a new project. Please provide more details about what you'd like to build.";
  }

  private async provideStatusUpdate(projectId?: string): Promise<string> {
    if (!projectId) {
      return "Please specify which project you'd like a status update for.";
    }
    
    try {
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return "Project not found. Please check the project ID.";
      }
      
      const features = await storage.getFeaturesByProject(projectId);
      const messages = await storage.getProjectMessagesByProject(projectId, 5);
      
      return `Project "${project.name}" Status:
- Features: ${features.length} total
- Recent activity: ${messages.length} messages
- Status: ${project.status}
- Last updated: ${project.updatedAt || project.createdAt}`;
      
    } catch (error) {
      console.error('Error getting project status:', error);
      return "I couldn't retrieve the project status. Please try again.";
    }
  }

  private provideHelp(): string {
    return `Titan AI Assistant Help:

I can help you with:
- Creating and managing projects
- Monitoring project progress
- Providing status updates
- Answering questions about Titan

Just ask me what you'd like to do!`;
  }

  private addMemory(memory: Omit<JasonMemory, 'id' | 'timestamp'>) {
    const memoryWithId: JasonMemory = {
      ...memory,
      id: this.generateId(),
      timestamp: new Date()
    };
    
    this.memory.set(memoryWithId.id, memoryWithId);
    
    // Store in persistent storage
    if (memory.projectId) {
      storage.addMemory(memory.projectId, memoryWithId);
    }
  }

  private generateId(): string {
    return `jason_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getMemoryStats() {
    return {
      totalMemories: this.memory.size,
      totalDecisions: this.decisions.size,
      recentMemories: Array.from(this.memory.values()).slice(-10),
      recentDecisions: Array.from(this.decisions.values()).slice(-10)
    };
  }
}

// Export singleton instance
export const jason = new JasonAgent();
