/**
 * Development seed script for Titan
 * Creates demo data for testing and development
 */

import { database } from '../server/database';
import { taskQueue } from '../server/core/queue';
import { personaCreator } from '../server/services/personaCreator';
import { storage } from '../server/storage';
import { v4 as uuidv4 } from 'uuid';

class DevSeed {
  async run(): Promise<void> {
    console.log('🌱 Seeding development data...\n');

    try {
      // Create demo project
      await this.createDemoProject();
      
      // Create demo persona
      await this.createDemoPersona();
      
      // Enqueue demo tasks
      await this.enqueueDemoTasks();
      
      console.log('✅ Development data seeded successfully');
      
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    }
  }

  private async createDemoProject(): Promise<void> {
    console.log('📁 Creating demo project...');
    
    const projectId = uuidv4();
    
    await storage.createProject(projectId, {
      name: 'Demo Project',
      description: 'A demonstration project for testing Titan functionality',
      status: 'active',
      createdAt: new Date().toISOString(),
      features: [
        {
          id: 'feature-1',
          title: 'User Authentication',
          description: 'Implement user login and registration',
          status: 'in_progress',
          priority: 'high',
          milestones: [
            {
              id: 'milestone-1',
              title: 'Create login form',
              description: 'Build the user login interface',
              status: 'pending',
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            }
          ],
          goals: [
            {
              id: 'goal-1',
              title: 'Secure authentication',
              description: 'Ensure passwords are properly hashed',
              status: 'pending'
            }
          ]
        }
      ],
      milestones: [],
      goals: []
    });

    // Add some demo memory
    await storage.updateProjectMemory(projectId, {
      input: [
        {
          id: 'input-1',
          role: 'user',
          content: 'Create a user authentication system',
          timestamp: new Date().toISOString()
        },
        {
          id: 'input-2',
          role: 'assistant',
          content: 'I\'ll help you build a secure authentication system with login and registration features.',
          timestamp: new Date().toISOString()
        }
      ],
      tasks: [],
      lastUpdated: new Date().toISOString()
    });

    console.log(`✅ Demo project created: ${projectId}`);
  }

  private async createDemoPersona(): Promise<void> {
    console.log('🎭 Creating demo persona...');
    
    const persona = await personaCreator.createPersonaProject(
      'Demo Developer',
      'Full Stack Developer',
      'A demo persona for testing autonomous development',
      {
        expertise: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
        communicationStyle: 'professional',
        traits: ['detail-oriented', 'collaborative', 'innovative']
      }
    );

    console.log(`✅ Demo persona created: ${persona.name}`);
  }

  private async enqueueDemoTasks(): Promise<void> {
    console.log('📋 Enqueuing demo tasks...');
    
    const projectId = uuidv4();
    
    // Create a simple project for tasks
    await storage.createProject(projectId, {
      name: 'Task Demo Project',
      description: 'Project for demonstrating task execution',
      status: 'active',
      createdAt: new Date().toISOString(),
      features: [],
      milestones: [],
      goals: []
    });

    // Enqueue various types of tasks
    const tasks = [
      {
        type: 'exec' as const,
        payload: {
          command: 'node',
          args: ['-v'],
          description: 'Check Node.js version'
        }
      },
      {
        type: 'code' as const,
        payload: {
          filePath: './demo.js',
          content: 'console.log("Hello, Titan!");',
          description: 'Create demo JavaScript file'
        }
      },
      {
        type: 'screenshot' as const,
        payload: {
          url: 'https://example.com',
          description: 'Capture example website screenshot'
        }
      }
    ];

    for (const task of tasks) {
      await taskQueue.enqueue(projectId, task.type, task.payload);
    }

    console.log(`✅ ${tasks.length} demo tasks enqueued for project: ${projectId}`);
  }
}

// Run the seed script
const devSeed = new DevSeed();
devSeed.run();
