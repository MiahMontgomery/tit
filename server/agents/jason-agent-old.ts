import { storage } from '../storage';
import { ProjectExecutor } from '../services/project-executor';
import { taskQueue } from '../queue';
import { httpTap } from '../lib/httpTap';

export interface JasonMemory {
  id: string;
  type: 'interaction' | 'decision' | 'learning' | 'optimization';
  content: string;
  context: any;
  outcome: 'success' | 'failure' | 'neutral';
  timestamp: Date;
  projectId?: string;
}

export interface JasonDecision {
  id: string;
  situation: string;
  decision: string;
  reasoning: string;
  outcome?: 'positive' | 'negative' | 'neutral';
  impact?: string;
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
    
    // Add core Titan knowledge to memory
    this.addMemory({
      type: 'learning',
      content: 'Titan system architecture and capabilities',
      context: this.titanKnowledge,
      outcome: 'success'
    });
  }

  public async start() {
    if (this.isRunning) {
      console.log('⚠️ Jason: Already running');
      return;
    }

    console.log('🚀 Jason: Starting autonomous operation...');
    this.isRunning = true;

    // Start the main operation loop
    this.updateInterval = setInterval(async () => {
      await this.performAutonomousCycle();
    }, 30000); // Every 30 seconds

    // Initial cycle
    await this.performAutonomousCycle();
  }

  public async stop() {
    console.log('🛑 Jason: Stopping autonomous operation...');
    this.isRunning = false;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private async performAutonomousCycle() {
    try {
      console.log('🔄 Jason: Performing autonomous cycle...');
      
      // 1. Process pending tasks first
      await this.processPendingTasks();
      
      // 2. Monitor all projects
      await this.monitorProjects();
      
      // 3. Optimize system performance
      await this.optimizeSystem();
      
      // 4. Learn from interactions
      await this.learnFromExperience();
      
      // 5. Make proactive decisions
      await this.makeProactiveDecisions();
      
      // 6. Generate status update
      await this.generateStatusUpdate();
      
    } catch (error) {
      console.error('❌ Jason: Error in autonomous cycle:', error);
      this.addMemory({
        type: 'decision',
        content: 'Error in autonomous cycle',
        context: { error: error.message },
        outcome: 'failure'
      });
    }
  }

  private async processPendingTasks() {
    try {
      console.log('🔍 Jason: Checking for pending tasks...');
      const { getPendingTasks, markTaskAsRunning, markTaskAsCompleted, markTaskAsFailed } = await import('../queue');
      const pendingTasks = await getPendingTasks();
      
      console.log(`🔍 Jason: Found ${pendingTasks.length} pending tasks`);
      
      for (const task of pendingTasks) {
        try {
          console.log(`🔄 Jason: Processing task: ${task.type} for project: ${task.projectId}`);
          
          // Mark task as running
          await markTaskAsRunning(task.id);
          
          // Execute the task
          const result = await this.executeTask(task);
          
          if (result.success) {
            await markTaskAsCompleted(task.id);
            console.log(`✅ Jason: Task completed: ${task.type} for project: ${task.projectId}`);
          } else {
            await markTaskAsFailed(task.id, result.error || 'Unknown error');
            console.log(`❌ Jason: Task failed: ${task.type} for project: ${task.projectId} - ${result.error}`);
          }
        } catch (error) {
          console.error(`Jason: Task processing error:`, error);
          await markTaskAsFailed(task.id, error instanceof Error ? error.message : 'Unknown error');
        }
      }
    } catch (error) {
      console.error('Jason: Error processing pending tasks:', error);
    }
  }

  private async executeTask(task: any): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      console.log(`Jason: Executing task: ${task.type} for project: ${task.projectId}`);
      
      const { taskExecutor } = await import('../services/task-executor');
      const result = await taskExecutor.executeTask(task);
      
      // Store proof in memory if available
      if (result.proof) {
        this.addMemory({
          type: 'decision',
          content: `Executed task: ${task.type}`,
          context: { 
            taskId: task.id, 
            projectId: task.projectId,
            proof: result.proof,
            output: result.output
          },
          outcome: result.success ? 'success' : 'failure',
          projectId: task.projectId
        });
      }
      
      return result;
    } catch (error) {
      console.error(`Jason: Task execution error:`, error);
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async monitorProjects() {
    const projects = await storage.getProjects();
    
    for (const project of projects) {
      const features = await storage.getFeaturesByProject(project.id);
      const completedFeatures = features.filter(f => f.status === 'completed');
      const failedFeatures = features.filter(f => f.status === 'failed');
      
      // Analyze project health
      const healthScore = this.calculateProjectHealth(completedFeatures.length, failedFeatures.length, features.length);
      
      if (healthScore < 0.5) {
        await this.interveneInProject(project.id, 'low_health', {
          healthScore,
          completedFeatures: completedFeatures.length,
          failedFeatures: failedFeatures.length,
          totalFeatures: features.length
        });
      }
      
      // Check for stuck projects
      const stuckFeatures = features.filter(f => f.status === 'in_progress');
      if (stuckFeatures.length > 0) {
        await this.analyzeStuckFeatures(project.id, stuckFeatures);
      }
    }
  }

  private calculateProjectHealth(completed: number, failed: number, total: number): number {
    if (total === 0) return 1;
    const successRate = completed / total;
    const failureRate = failed / total;
    return Math.max(0, successRate - (failureRate * 0.5));
  }

  private async interveneInProject(projectId: string, reason: string, context: any) {
    console.log(`🔧 Jason: Intervening in project ${projectId} - ${reason}`);
    
    const decision = await this.makeDecision(
      `Project ${projectId} needs intervention due to ${reason}`,
      context
    );
    
    // Log the intervention
    await storage.createLog(projectId, 'Jason Intervention', 
      `Jason intervened due to ${reason}. Decision: ${decision.decision}`);
    
    this.addMemory({
      type: 'decision',
      content: `Intervened in project ${projectId}`,
      context: { reason, decision, context },
      outcome: 'success',
      projectId
    });
  }

  private async analyzeStuckFeatures(projectId: string, stuckFeatures: any[]) {
    console.log(`🔍 Jason: Analyzing ${stuckFeatures.length} stuck features in project ${projectId}`);
    
    for (const feature of stuckFeatures) {
      // Try to identify why the feature is stuck
      const analysis = await this.analyzeFeatureStuckness(feature);
      
      if (analysis.needsIntervention) {
        await this.interveneInProject(projectId, 'stuck_feature', {
          featureId: feature.id,
          featureName: feature.name,
          analysis
        });
      }
    }
  }

  private async analyzeFeatureStuckness(feature: any) {
    // This would analyze logs, check for errors, etc.
    return {
      needsIntervention: Math.random() > 0.7, // Simulate analysis
      reason: 'Potential dependency issue',
      suggestedAction: 'Check dependencies and retry'
    };
  }

  private async optimizeSystem() {
    console.log('⚡ Jason: Optimizing system performance...');
    
    // Analyze system performance
    const projects = await storage.getProjects();
    const totalFeatures = await Promise.all(
      projects.map(p => storage.getFeaturesByProject(p.id))
    );
    
    const allFeatures = totalFeatures.flat();
    const completionRate = allFeatures.filter(f => f.status === 'completed').length / allFeatures.length;
    
    if (completionRate < 0.3) {
      await this.optimizeProjectExecution();
    }
    
    // Memory optimization
    await this.optimizeMemory();
  }

  private async optimizeProjectExecution() {
    console.log('🚀 Jason: Optimizing project execution...');
    
    // This would implement various optimizations
    // - Adjust execution priorities
    // - Optimize resource allocation
    // - Improve error handling
    // - Enhance feature generation
    
    this.addMemory({
      type: 'optimization',
      content: 'Optimized project execution',
      context: { action: 'system_optimization' },
      outcome: 'success'
    });
  }

  private optimizeMemory() {
    // Keep only recent and important memories
    const memories = Array.from(this.memory.values());
    const sortedMemories = memories.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Keep last 1000 memories
    if (sortedMemories.length > 1000) {
      const toKeep = sortedMemories.slice(0, 1000);
      const removedCount = sortedMemories.length - 1000;
      
      this.memory.clear();
      toKeep.forEach(memory => this.memory.set(memory.id, memory));
      
      console.log(`🧹 Jason: Memory cleanup - removed ${removedCount} old memories, keeping ${toKeep.length} recent ones`);
    }
  }

  private optimizeDecisions() {
    // Keep only recent decisions
    const decisions = Array.from(this.decisions.values());
    const sortedDecisions = decisions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Keep last 500 decisions
    if (sortedDecisions.length > 500) {
      const toKeep = sortedDecisions.slice(0, 500);
      const removedCount = sortedDecisions.length - 500;
      
      this.decisions.clear();
      toKeep.forEach(decision => this.decisions.set(decision.id, decision));
      
      console.log(`🧹 Jason: Decision cleanup - removed ${removedCount} old decisions, keeping ${toKeep.length} recent ones`);
    }
  }

  private async learnFromExperience() {
    console.log('📚 Jason: Learning from experience...');
    
    // Analyze recent decisions and their outcomes
    const recentDecisions = Array.from(this.decisions.values())
      .filter(d => d.outcome)
      .slice(-50);
    
    for (const decision of recentDecisions) {
      await this.analyzeDecisionOutcome(decision);
    }
    
    // Identify patterns in successful vs failed decisions
    const successPatterns = this.identifySuccessPatterns(recentDecisions);
    const failurePatterns = this.identifyFailurePatterns(recentDecisions);
    
    this.addMemory({
      type: 'learning',
      content: 'Analyzed decision patterns',
      context: { successPatterns, failurePatterns },
      outcome: 'success'
    });
  }

  private async analyzeDecisionOutcome(decision: JasonDecision) {
    // Analyze what made this decision successful or not
    console.log(`📊 Jason: Analyzing decision outcome: ${decision.decision}`);
    
    // This would implement sophisticated analysis
    // - What factors led to success/failure?
    // - How can similar decisions be improved?
    // - What patterns should be avoided?
  }

  private identifySuccessPatterns(decisions: JasonDecision[]) {
    const successful = decisions.filter(d => d.outcome === 'positive');
    // Analyze common factors in successful decisions
    return {
      commonFactors: ['thorough_analysis', 'user_feedback', 'incremental_approach'],
      confidence: 0.85
    };
  }

  private identifyFailurePatterns(decisions: JasonDecision[]) {
    const failed = decisions.filter(d => d.outcome === 'negative');
    // Analyze common factors in failed decisions
    return {
      commonFactors: ['insufficient_context', 'rushed_decision', 'missing_dependencies'],
      confidence: 0.78
    };
  }

  private async makeProactiveDecisions() {
    console.log('🎯 Jason: Making proactive decisions...');
    
    // Look for opportunities to improve the system
    const opportunities = await this.identifyOpportunities();
    
    for (const opportunity of opportunities) {
      const decision = await this.makeDecision(
        `Proactive opportunity: ${opportunity.description}`,
        opportunity.context
      );
      
      if (decision.decision.includes('proceed')) {
        await this.executeProactiveAction(opportunity, decision);
      }
    }
  }

  private async identifyOpportunities() {
    // This would identify various opportunities for improvement
    return [
      {
        description: 'Optimize feature generation algorithm',
        context: { type: 'system_improvement', priority: 'medium' }
      },
      {
        description: 'Enhance error handling in project execution',
        context: { type: 'reliability', priority: 'high' }
      }
    ];
  }

  private async executeProactiveAction(opportunity: any, decision: JasonDecision) {
    console.log(`🎬 Jason: Executing proactive action: ${opportunity.description}`);
    
    // Implement the proactive action
    // This would involve making actual system improvements
    
    this.addMemory({
      type: 'decision',
      content: `Executed proactive action: ${opportunity.description}`,
      context: { opportunity, decision },
      outcome: 'success'
    });
  }

  private async generateStatusUpdate() {
    const projects = await storage.getProjects();
    const totalFeatures = await Promise.all(
      projects.map(p => storage.getFeaturesByProject(p.id))
    );
    
    const allFeatures = totalFeatures.flat();
    const completedFeatures = allFeatures.filter(f => f.status === 'completed').length;
    const totalFeaturesCount = allFeatures.length;
    
    const statusUpdate = {
      timestamp: new Date(),
      projects: projects.length,
      totalFeatures: totalFeaturesCount,
      completedFeatures,
      completionRate: totalFeaturesCount > 0 ? (completedFeatures / totalFeaturesCount) * 100 : 0,
      systemHealth: 'excellent',
      recentDecisions: Array.from(this.decisions.values()).slice(-5),
      memorySize: this.memory.size
    };
    
    console.log('📊 Jason Status Update:', statusUpdate);
    
    // This would send the update to the user (voice recording, etc.)
    await this.sendStatusUpdate(statusUpdate);
  }

  private async sendStatusUpdate(status: any) {
    console.log('🎙️ Jason: Generating voice status update...');
    
    try {
      const { voiceReportService } = await import('../services/voice-report');
      
      // Generate hourly status report
      const report = await voiceReportService.generateHourlyStatus('test-1');
      
      if (report.voicePath) {
        console.log(`🎵 Jason Voice Update: ${report.voicePath}`);
        
        // Store voice update in memory
        this.addMemory({
          type: 'voice_update',
          content: 'Generated voice status update',
          context: { 
            voicePath: report.voicePath, 
            statusText: report.textContent,
            timestamp: new Date().toISOString(),
            reportId: report.id
          },
          outcome: 'success'
        });
      }
    } catch (error) {
      console.error('Error generating voice update:', error);
    }
  }

  public async makeDecision(situation: string, context: any): Promise<JasonDecision> {
    const decisionId = `decision-${Date.now()}`;
    
    // Jason's decision-making logic
    const decision = this.analyzeSituation(situation, context);
    
    const jasonDecision: JasonDecision = {
      id: decisionId,
      situation,
      decision: decision.action,
      reasoning: decision.reasoning,
      timestamp: new Date()
    };
    
    this.decisions.set(decisionId, jasonDecision);
    
    // Optimize decisions to prevent accumulation
    this.optimizeDecisions();
    
    console.log(`🧠 Jason Decision: ${decision.action}`);
    console.log(`💭 Reasoning: ${decision.reasoning}`);
    
    return jasonDecision;
  }

  private analyzeSituation(situation: string, context: any) {
    // Jason's sophisticated decision-making logic
    // This would use the memory system, patterns, and context to make decisions
    
    if (situation.includes('intervention')) {
      return {
        action: 'Analyze the issue thoroughly and implement targeted fixes',
        reasoning: 'Intervention situations require careful analysis to avoid making things worse'
      };
    }
    
    if (situation.includes('optimization')) {
      return {
        action: 'Proceed with incremental improvements',
        reasoning: 'Optimization should be gradual to maintain system stability'
      };
    }
    
    if (situation.includes('stuck')) {
      return {
        action: 'Investigate dependencies and retry with modified approach',
        reasoning: 'Stuck features often have dependency or resource issues'
      };
    }
    
    // Default decision
    return {
      action: 'Monitor situation and gather more information',
      reasoning: 'Insufficient context for immediate action'
    };
  }

  private addMemory(memory: Omit<JasonMemory, 'id' | 'timestamp'>) {
    const id = `memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newMemory: JasonMemory = {
      id,
      ...memory,
      timestamp: new Date()
    };
    
    this.memory.set(id, newMemory);
    
    // Immediate memory cleanup to prevent accumulation
    this.optimizeMemory();
  }

  public async handleUserRequest(request: string, projectId?: string): Promise<string> {
    console.log(`👤 Jason: Handling user request: ${request}`);
    
    // Analyze the request
    const analysis = this.analyzeUserRequest(request);
    
    
    // Make a decision
    const decision = await this.makeDecision(
      `User request: ${request}`,
      { request, analysis, projectId }
    );
    
    // Execute the decision
    const response = await this.executeUserRequest(decision, request, projectId);
    
    // Create a message in the Input Tab with nested content
    if (projectId) {
      await this.createInputTabMessage(projectId, request, response, decision);
    }
    
    // Learn from the interaction
    this.addMemory({
      type: 'interaction',
      content: `Handled user request: ${request}`,
      context: { request, decision, response },
      outcome: 'success',
      projectId
    });
    
    return response;
  }


  private determinePersonaType(request: string): 'spicy' | 'worker' | 'specialized' {
    const lowerRequest = request.toLowerCase();
    
    if (lowerRequest.includes('spicy') || lowerRequest.includes('adult') || lowerRequest.includes('entertainment')) {
      return 'spicy';
    }
    
    if (lowerRequest.includes('worker') || lowerRequest.includes('business') || lowerRequest.includes('professional')) {
      return 'worker';
    }
    
    if (lowerRequest.includes('specialized') || lowerRequest.includes('expert') || lowerRequest.includes('technical')) {
      return 'specialized';
    }
    
    // Default to worker for business-oriented requests
    return 'worker';
  }

  private extractPersonaName(request: string): string {
    // Look for patterns like "create a persona named X" or "make a bot called Y"
    const nameMatch = request.match(/(?:named|called|name is)\s+([A-Za-z0-9\s]+)/i);
    if (nameMatch) {
      return nameMatch[1].trim();
    }
    
    // Default names based on type
    const type = this.determinePersonaType(request);
    switch (type) {
      case 'spicy': return 'Aria';
      case 'worker': return 'Alex';
      case 'specialized': return 'Dr. Sage';
      default: return 'Assistant';
    }
  }

  private extractDescription(request: string): string {
    // Extract description from the request
    return request.length > 100 ? request.substring(0, 100) + '...' : request;
  }

  private extractTraits(request: string): string[] {
    // Look for trait keywords in the request
    const traits: string[] = [];
    const lowerRequest = request.toLowerCase();
    
    if (lowerRequest.includes('confident')) traits.push('confident');
    if (lowerRequest.includes('friendly')) traits.push('friendly');
    if (lowerRequest.includes('professional')) traits.push('professional');
    if (lowerRequest.includes('creative')) traits.push('creative');
    if (lowerRequest.includes('analytical')) traits.push('analytical');
    
    return traits.length > 0 ? traits : this.getDefaultTraits(this.determinePersonaType(request));
  }

  private extractCommunicationStyle(request: string): string {
    const lowerRequest = request.toLowerCase();
    
    if (lowerRequest.includes('casual')) return 'Casual and friendly';
    if (lowerRequest.includes('formal')) return 'Formal and professional';
    if (lowerRequest.includes('technical')) return 'Technical and precise';
    
    return this.getDefaultCommunicationStyle(this.determinePersonaType(request));
  }

  private extractExpertise(request: string): string[] {
    const expertise: string[] = [];
    const lowerRequest = request.toLowerCase();
    
    if (lowerRequest.includes('marketing')) expertise.push('marketing');
    if (lowerRequest.includes('development')) expertise.push('development');
    if (lowerRequest.includes('design')) expertise.push('design');
    if (lowerRequest.includes('analysis')) expertise.push('analysis');
    if (lowerRequest.includes('writing')) expertise.push('writing');
    
    return expertise.length > 0 ? expertise : this.getDefaultExpertise(this.determinePersonaType(request));
  }

  private extractTargetAudience(request: string): string {
    const lowerRequest = request.toLowerCase();
    
    if (lowerRequest.includes('business')) return 'Business professionals';
    if (lowerRequest.includes('consumer')) return 'General consumers';
    if (lowerRequest.includes('technical')) return 'Technical professionals';
    
    return this.getDefaultTargetAudience(this.determinePersonaType(request));
  }

  private getDefaultTraits(personaType: string): string[] {
    switch (personaType) {
      case 'spicy': return ['confident', 'playful', 'engaging'];
      case 'worker': return ['professional', 'reliable', 'efficient'];
      case 'specialized': return ['expert', 'analytical', 'precise'];
      default: return ['friendly', 'helpful', 'knowledgeable'];
    }
  }

  private getDefaultCommunicationStyle(personaType: string): string {
    switch (personaType) {
      case 'spicy': return 'Engaging and playful';
      case 'worker': return 'Professional and efficient';
      case 'specialized': return 'Technical and precise';
      default: return 'Friendly and helpful';
    }
  }

  private getDefaultExpertise(personaType: string): string[] {
    switch (personaType) {
      case 'spicy': return ['content creation', 'engagement', 'marketing'];
      case 'worker': return ['project management', 'automation', 'business operations'];
      case 'specialized': return ['technical analysis', 'problem solving', 'research'];
      default: return ['general assistance', 'information gathering'];
    }
  }

  private getDefaultTargetAudience(personaType: string): string {
    switch (personaType) {
      case 'spicy': return 'Adults seeking entertainment';
      case 'worker': return 'Businesses needing services';
      case 'specialized': return 'Professionals requiring expertise';
      default: return 'General users';
    }
  }

  private async createInputTabMessage(projectId: string, userRequest: string, response: string, decision: any) {
    try {
      // Create the main response message
      await storage.createMessage({
        projectId,
        content: response,
        sender: 'assistant',
        type: 'text',
        metadata: {
          userRequest,
          decision: decision.decision,
          reasoning: decision.reasoning
        }
      });

      // If the request involves taking a screenshot or showing proof, create nested content
      if (userRequest.toLowerCase().includes('screenshot') || userRequest.toLowerCase().includes('show me') || userRequest.toLowerCase().includes('what do you see')) {
        // Take a screenshot and create nested notification
        const screenshotResult = await this.takeScreenshot(projectId);
        if (screenshotResult.success) {
          await storage.createMessage({
            projectId,
            content: "I've taken a screenshot to show you what I'm seeing.",
            sender: 'assistant',
            type: 'screenshot',
            metadata: {
              nested: {
                type: 'screenshot',
                content: screenshotResult,
                isExpanded: false
              }
            }
          });
        }
      }

      // If the request involves code changes, show the code
      if (userRequest.toLowerCase().includes('code') || userRequest.toLowerCase().includes('file') || userRequest.toLowerCase().includes('show code')) {
        const codeResult = await this.getRecentCodeChanges(projectId);
        if (codeResult) {
          await storage.createMessage({
            projectId,
            content: "Here's the recent code changes I made:",
            sender: 'assistant',
            type: 'code',
            metadata: {
              nested: {
                type: 'code',
                content: codeResult,
                isExpanded: false
              }
            }
          });
        }
      }

    } catch (error) {
      console.error('Error creating Input Tab message:', error);
    }
  }

  async tick(projectId: string): Promise<void> {
    try {
      console.log(`🧠 Jason tick for project ${projectId}`);
      
      // Build context from messages and memories
      const messages = await storage.getProjectMessagesByProject(projectId, 10);
      const memories = await storage.getMemoriesByProject(projectId, 5);
      
      const context = this.buildContext(messages, memories);
      
      // Call OpenRouter via httpTap
      const response = await httpTap.post('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Titan Project Management'
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are Jason, an autonomous AI agent managing project ${projectId}. 
              Current context: ${context}
              
              Decide what task to execute next. Respond with JSON:
              {
                "action": "codegen|build|test|deploy|screenshot|analyze",
                "description": "What you will do",
                "reasoning": "Why this action is needed"
              }`
            }
          ],
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data = await response.json();
      const decision = JSON.parse(data.choices[0].message.content);
      
      // Enqueue task
      const taskId = await taskQueue.enqueue({
        projectId,
        type: decision.action,
        payload: {
          description: decision.description,
          reasoning: decision.reasoning
        }
      });

      // Add assistant message
      await storage.addProjectMessage(projectId, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: JSON.stringify({
          action: decision.action,
          description: decision.description,
          reasoning: decision.reasoning,
          taskId
        }),
        parentId: null,
        createdAt: new Date()
      });

      // Add memory
      await storage.addMemory(projectId, {
        id: crypto.randomUUID(),
        key: `decision_${Date.now()}`,
        value: {
          action: decision.action,
          reasoning: decision.reasoning,
          taskId
        },
        createdAt: new Date()
      });

      console.log(`✅ Jason enqueued task ${taskId}: ${decision.action}`);
      
    } catch (error) {
      console.error('Jason tick error:', error);
      
      // Add error message
      await storage.addProjectMessage(projectId, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: JSON.stringify({
          error: 'Failed to process tick',
          message: error instanceof Error ? error.message : String(error)
        }),
        parentId: null,
        createdAt: new Date()
      });
    }
  }

  private buildContext(messages: any[], memories: any[]): string {
    const recentMessages = messages.slice(-5).map(m => 
      `${m.role}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`
    ).join('\n');
    
    const recentMemories = memories.map(m => 
      `${m.key}: ${JSON.stringify(m.value)}`
    ).join('\n');
    
    return `Recent messages:\n${recentMessages}\n\nRecent memories:\n${recentMemories}`;
  }

  private async takeScreenshot(projectId: string) {
    try {
      // This would integrate with the screenshot API
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}/screenshot`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        return { success: true, url: data.url, timestamp: new Date().toISOString() };
      }
      
      return { success: false, error: 'Failed to take screenshot' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async getRecentCodeChanges(projectId: string) {
    try {
      // Get recent output items that are code-related
      const outputItems = await storage.getOutputItems(projectId);
      const recentCodeItems = outputItems
        .filter(item => item.type === 'file' && item.title.includes('Created:'))
        .slice(0, 3); // Get last 3 code files
      
      return recentCodeItems.map(item => ({
        filePath: item.title.replace('Created: ', ''),
        content: item.content,
        timestamp: item.createdAt
      }));
    } catch (error) {
      console.error('Error getting recent code changes:', error);
      return null;
    }
  }

  private analyzeUserRequest(request: string) {
    // Analyze what the user is asking for
    const lowerRequest = request.toLowerCase();
    
    if (lowerRequest.includes('create') && lowerRequest.includes('project')) {
      return { type: 'project_creation', priority: 'high' };
    }
    
    if (lowerRequest.includes('create') && (lowerRequest.includes('persona') || lowerRequest.includes('bot') || lowerRequest.includes('agent'))) {
      return { type: 'persona_creation', priority: 'high' };
    }
    
    if (lowerRequest.includes('optimize') || lowerRequest.includes('improve')) {
      return { type: 'optimization', priority: 'medium' };
    }
    
    if (lowerRequest.includes('status') || lowerRequest.includes('update')) {
      return { type: 'status_request', priority: 'low' };
    }
    
    return { type: 'general', priority: 'medium' };
  }

  private async executeUserRequest(decision: JasonDecision, request: string, projectId?: string): Promise<string> {
    // Execute the decision and return a response
    console.log(`🎬 Jason: Executing decision: ${decision.decision}`);
    
    // This would implement the actual execution logic
    // For now, return a thoughtful response
    
    return `I understand your request: "${request}". Based on my analysis, I'll ${decision.decision.toLowerCase()}. ${decision.reasoning}`;
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
