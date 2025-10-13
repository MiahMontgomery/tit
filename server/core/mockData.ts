// Mock data store for testing without database
export interface MockProject {
  id: string;
  name: string;
  description: string;
  prompt: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockFeature {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: string;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockMilestone {
  id: string;
  projectId: string;
  featureId: string;
  title: string;
  description: string;
  status: string;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockGoal {
  id: string;
  projectId: string;
  milestoneId: string;
  title: string;
  description: string;
  status: string;
  priority: number;
  score: number;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockTask {
  id: string;
  projectId: string;
  goalId: string | null;
  type: string;
  status: string;
  payload: any;
  result: any;
  error: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface MockMessage {
  id: string;
  projectId: string;
  body: string;
  type: string;
  meta: any;
  createdAt: Date;
}

export interface MockProof {
  id: string;
  projectId: string;
  taskId: string | null;
  type: string;
  title: string;
  description: string;
  uri: string | null;
  content: string | null;
  meta: any;
  createdAt: Date;
}

class MockDataStore {
  projects: MockProject[] = [];
  features: MockFeature[] = [];
  milestones: MockMilestone[] = [];
  goals: MockGoal[] = [];
  tasks: MockTask[] = [];
  messages: MockMessage[] = [];
  proofs: MockProof[] = [];

  // Project methods
  createProject(data: Omit<MockProject, 'id' | 'createdAt' | 'updatedAt'>): MockProject {
    const project: MockProject = {
      ...data,
      id: `mock_project_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.projects.push(project);
    return project;
  }

  getProject(id: string): MockProject | null {
    return this.projects.find(p => p.id === id) || null;
  }

  getAllProjects(): MockProject[] {
    return [...this.projects];
  }

  // Feature methods
  createFeature(data: Omit<MockFeature, 'id' | 'createdAt' | 'updatedAt'>): MockFeature {
    const feature: MockFeature = {
      ...data,
      id: `mock_feature_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.features.push(feature);
    return feature;
  }

  getFeaturesByProject(projectId: string): MockFeature[] {
    return this.features.filter(f => f.projectId === projectId);
  }

  // Milestone methods
  createMilestone(data: Omit<MockMilestone, 'id' | 'createdAt' | 'updatedAt'>): MockMilestone {
    const milestone: MockMilestone = {
      ...data,
      id: `mock_milestone_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.milestones.push(milestone);
    return milestone;
  }

  getMilestonesByProject(projectId: string): MockMilestone[] {
    return this.milestones.filter(m => m.projectId === projectId);
  }

  // Goal methods
  createGoal(data: Omit<MockGoal, 'id' | 'createdAt' | 'updatedAt'>): MockGoal {
    const goal: MockGoal = {
      ...data,
      id: `mock_goal_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.goals.push(goal);
    return goal;
  }

  getGoalsByProject(projectId: string): MockGoal[] {
    return this.goals.filter(g => g.projectId === projectId);
  }

  // Task methods
  createTask(data: Omit<MockTask, 'id' | 'createdAt'>): MockTask {
    const task: MockTask = {
      ...data,
      id: `mock_task_${Date.now()}`,
      createdAt: new Date()
    };
    this.tasks.push(task);
    return task;
  }

  getTasksByProject(projectId: string): MockTask[] {
    return this.tasks.filter(t => t.projectId === projectId);
  }

  getNextQueuedTask(projectId: string): MockTask | null {
    return this.tasks.find(t => t.projectId === projectId && t.status === 'queued') || null;
  }

  updateTaskStatus(id: string, status: string, result?: any): MockTask | null {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.status = status;
      if (result) task.result = result;
      if (status === 'running') task.startedAt = new Date();
      if (status === 'completed' || status === 'failed') task.completedAt = new Date();
    }
    return task || null;
  }

  // Message methods
  createMessage(data: Omit<MockMessage, 'id' | 'createdAt'>): MockMessage {
    const message: MockMessage = {
      ...data,
      id: `mock_message_${Date.now()}`,
      createdAt: new Date()
    };
    this.messages.push(message);
    return message;
  }

  getMessagesByProject(projectId: string): MockMessage[] {
    return this.messages.filter(m => m.projectId === projectId);
  }

  // Proof methods
  createProof(data: Omit<MockProof, 'id' | 'createdAt'>): MockProof {
    const proof: MockProof = {
      ...data,
      id: `mock_proof_${Date.now()}`,
      createdAt: new Date()
    };
    this.proofs.push(proof);
    return proof;
  }

  getProofsByProject(projectId: string): MockProof[] {
    return this.proofs.filter(p => p.projectId === projectId);
  }
}

export const mockStore = new MockDataStore();
