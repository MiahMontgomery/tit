export interface ScoringContext {
  projectId: string;
  goalId?: string;
  taskType: string;
  priority: number;
  dependencies: string[];
  estimatedDuration: number;
  complexity: number;
  urgency: number;
}

export interface GoalScoringContext {
  urgency: number;
  impact: number;
  unblock: number;
  risk: number;
  cost: number;
  age: number;
}

export interface ScoreResult {
  score: number;
  factors: {
    priority: number;
    dependencies: number;
    duration: number;
    complexity: number;
    urgency: number;
  };
  reasoning: string;
}

export class ScoringEngine {
  private weights = {
    priority: 0.3,
    dependencies: 0.2,
    duration: 0.15,
    complexity: 0.15,
    urgency: 0.2
  };

  calculateScore(context: ScoringContext): ScoreResult {
    const factors = {
      priority: this.scorePriority(context.priority),
      dependencies: this.scoreDependencies(context.dependencies),
      duration: this.scoreDuration(context.estimatedDuration),
      complexity: this.scoreComplexity(context.complexity),
      urgency: this.scoreUrgency(context.urgency)
    };

    const score = 
      factors.priority * this.weights.priority +
      factors.dependencies * this.weights.dependencies +
      factors.duration * this.weights.duration +
      factors.complexity * this.weights.complexity +
      factors.urgency * this.weights.urgency;

    const reasoning = this.generateReasoning(factors, context);

    return {
      score: Math.round(score * 100) / 100,
      factors,
      reasoning
    };
  }

  private scorePriority(priority: number): number {
    // Higher priority = higher score (0-10 scale)
    return Math.min(priority / 10, 1);
  }

  private scoreDependencies(dependencies: string[]): number {
    // Fewer dependencies = higher score
    if (dependencies.length === 0) return 1.0;
    if (dependencies.length <= 2) return 0.8;
    if (dependencies.length <= 5) return 0.6;
    return 0.4;
  }

  private scoreDuration(duration: number): number {
    // Shorter duration = higher score (in minutes)
    if (duration <= 30) return 1.0;
    if (duration <= 60) return 0.8;
    if (duration <= 120) return 0.6;
    if (duration <= 240) return 0.4;
    return 0.2;
  }

  private scoreComplexity(complexity: number): number {
    // Lower complexity = higher score (1-10 scale)
    return (10 - complexity) / 10;
  }

  private scoreUrgency(urgency: number): number {
    // Higher urgency = higher score (1-10 scale)
    return urgency / 10;
  }

  private generateReasoning(factors: any, context: ScoringContext): string {
    const reasons: string[] = [];

    if (factors.priority > 0.8) {
      reasons.push("high priority");
    } else if (factors.priority < 0.4) {
      reasons.push("low priority");
    }

    if (factors.dependencies > 0.8) {
      reasons.push("no dependencies");
    } else if (factors.dependencies < 0.4) {
      reasons.push("many dependencies");
    }

    if (factors.duration > 0.8) {
      reasons.push("quick execution");
    } else if (factors.duration < 0.4) {
      reasons.push("long execution time");
    }

    if (factors.complexity > 0.8) {
      reasons.push("simple task");
    } else if (factors.complexity < 0.4) {
      reasons.push("complex task");
    }

    if (factors.urgency > 0.8) {
      reasons.push("urgent");
    } else if (factors.urgency < 0.4) {
      reasons.push("not urgent");
    }

    return reasons.length > 0 
      ? `Scored based on: ${reasons.join(", ")}`
      : "Scored based on standard factors";
  }

  // Batch scoring for multiple tasks
  scoreTasks(contexts: ScoringContext[]): Array<ScoreResult & { context: ScoringContext }> {
    return contexts.map(context => ({
      ...this.calculateScore(context),
      context
    })).sort((a, b) => b.score - a.score); // Sort by score descending
  }

  // Get top N tasks by score
  getTopTasks(contexts: ScoringContext[], limit: number = 3): Array<ScoreResult & { context: ScoringContext }> {
    return this.scoreTasks(contexts).slice(0, limit);
  }

  // Update weights based on performance
  updateWeights(performance: {
    priority: number;
    dependencies: number;
    duration: number;
    complexity: number;
    urgency: number;
  }): void {
    // Simple learning: increase weights for factors that led to successful tasks
    const total = performance.priority + performance.dependencies + performance.duration + 
                  performance.complexity + performance.urgency;
    
    if (total > 0) {
      this.weights.priority = Math.max(0.1, Math.min(0.5, performance.priority / total));
      this.weights.dependencies = Math.max(0.1, Math.min(0.5, performance.dependencies / total));
      this.weights.duration = Math.max(0.1, Math.min(0.5, performance.duration / total));
      this.weights.complexity = Math.max(0.1, Math.min(0.5, performance.complexity / total));
      this.weights.urgency = Math.max(0.1, Math.min(0.5, performance.urgency / total));
    }
  }

  // Simple goal scoring function
  scoreGoal(context: GoalScoringContext): number {
    const { urgency, impact, unblock, risk, cost, age } = context;
    
    // Simple weighted scoring: higher urgency, impact, unblock = higher score
    // Lower risk, cost = higher score
    // Age can be positive (older = more urgent) or negative (older = stale)
    const score = (urgency * 2) + (impact * 1.5) + (unblock * 2) - (risk * 0.5) - (cost * 0.3) + (age * 0.1);
    
    return Math.max(0, Math.round(score * 10)); // Scale to 0-100 range
  }
}

export const scoringEngine = new ScoringEngine();
