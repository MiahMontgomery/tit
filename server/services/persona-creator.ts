import { storage } from '../storage';
import { enqueueTask } from '../queue';
import { proofLogger } from './proof-logger';
import { randomUUID } from 'crypto';

export interface PersonaProject {
  id: string;
  name: string;
  description: string;
  personaType: 'spicy' | 'worker' | 'specialized';
  personality: {
    name: string;
    traits: string[];
    communicationStyle: string;
    expertise: string[];
    targetAudience: string;
  };
  apiKeys: {
    openai: string;
    elevenlabs: string;
    ngrok: string;
  };
  features: {
    messaging: boolean;
    contentGeneration: boolean;
    voiceInteraction: boolean;
    webAutomation: boolean;
    salesTracking: boolean;
  };
  status: 'creating' | 'active' | 'paused' | 'completed';
  createdAt: string;
  lastActive: string;
}

export class PersonaCreator {
  async createPersonaProject(
    personaType: 'spicy' | 'worker' | 'specialized',
    name: string,
    description: string,
    personality: any
  ): Promise<PersonaProject> {
    const projectId = `persona-${randomUUID()}`;
    
    // Generate API keys (in production, these would be real keys)
    const apiKeys = {
      openai: `sk-${randomUUID().replace(/-/g, '')}`,
      elevenlabs: `el-${randomUUID().replace(/-/g, '')}`,
      ngrok: `ng-${randomUUID().replace(/-/g, '')}`
    };
    
    const personaProject: PersonaProject = {
      id: projectId,
      name,
      description,
      personaType,
      personality: {
        name: personality.name || name,
        traits: personality.traits || this.getDefaultTraits(personaType),
        communicationStyle: personality.communicationStyle || this.getDefaultCommunicationStyle(personaType),
        expertise: personality.expertise || this.getDefaultExpertise(personaType),
        targetAudience: personality.targetAudience || this.getDefaultTargetAudience(personaType)
      },
      apiKeys,
      features: {
        messaging: true,
        contentGeneration: true,
        voiceInteraction: true,
        webAutomation: personaType === 'worker',
        salesTracking: true
      },
      status: 'creating',
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };
    
    // Create the project in storage
    await storage.createProject({
      id: projectId,
      name,
      description,
      prompt: `Create a ${personaType} persona project: ${description}`,
      status: 'active',
      createdAt: new Date()
    });
    
    // Generate features for the persona
    await this.generatePersonaFeatures(projectId, personaProject);
    
    // Log proof
    await proofLogger.logFileCreation(
      projectId,
      `persona-creation-${Date.now()}`,
      'persona-config.json',
      JSON.stringify(personaProject, null, 2),
      `Created ${personaType} persona project: ${name}`
    );
    
    // Update status to active
    personaProject.status = 'active';
    
    return personaProject;
  }

  private async generatePersonaFeatures(projectId: string, persona: PersonaProject): Promise<void> {
    const features = this.getPersonaFeatures(persona);
    
    for (const feature of features) {
      await storage.createFeature({
        id: `feature-${randomUUID()}`,
        projectId,
        name: feature.name,
        description: feature.description,
        status: 'pending',
        createdAt: new Date()
      });
    }
  }

  private getPersonaFeatures(persona: PersonaProject): any[] {
    const baseFeatures = [
      {
        name: 'Personality Setup',
        description: 'Configure core personality traits and communication style'
      },
      {
        name: 'API Integration',
        description: 'Connect OpenAI, ElevenLabs, and other required APIs'
      },
      {
        name: 'Voice Configuration',
        description: 'Set up voice synthesis and speech recognition'
      },
      {
        name: 'Content Generation',
        description: 'Implement content creation capabilities'
      },
      {
        name: 'Message Processing',
        description: 'Handle incoming messages and generate responses'
      }
    ];

    if (persona.personaType === 'spicy') {
      baseFeatures.push(
        {
          name: 'Content Moderation',
          description: 'Implement content filtering and safety measures'
        },
        {
          name: 'Tiered Access',
          description: 'Set up different access levels for content'
        },
        {
          name: 'Revenue Tracking',
          description: 'Track earnings and subscription metrics'
        }
      );
    }

    if (persona.personaType === 'worker') {
      baseFeatures.push(
        {
          name: 'Job Scraping',
          description: 'Automatically find and apply to relevant jobs'
        },
        {
          name: 'Client Communication',
          description: 'Handle client interactions professionally'
        },
        {
          name: 'Portfolio Management',
          description: 'Maintain and update work portfolio'
        },
        {
          name: 'Web Automation',
          description: 'Automate web-based tasks and interactions'
        }
      );
    }

    if (persona.personaType === 'specialized') {
      baseFeatures.push(
        {
          name: 'Domain Expertise',
          description: 'Implement specialized knowledge and skills'
        },
        {
          name: 'Custom Workflows',
          description: 'Create tailored workflows for specific tasks'
        },
        {
          name: 'Integration Hub',
          description: 'Connect with specialized tools and platforms'
        }
      );
    }

    return baseFeatures;
  }

  private getDefaultTraits(personaType: string): string[] {
    switch (personaType) {
      case 'spicy':
        return ['confident', 'playful', 'engaging', 'mysterious', 'alluring'];
      case 'worker':
        return ['professional', 'reliable', 'efficient', 'detail-oriented', 'communicative'];
      case 'specialized':
        return ['expert', 'analytical', 'precise', 'innovative', 'focused'];
      default:
        return ['friendly', 'helpful', 'knowledgeable'];
    }
  }

  private getDefaultCommunicationStyle(personaType: string): string {
    switch (personaType) {
      case 'spicy':
        return 'Flirty, engaging, and slightly mysterious with a playful tone';
      case 'worker':
        return 'Professional, clear, and efficient with a helpful tone';
      case 'specialized':
        return 'Technical, precise, and authoritative with an expert tone';
      default:
        return 'Friendly, helpful, and conversational';
    }
  }

  private getDefaultExpertise(personaType: string): string[] {
    switch (personaType) {
      case 'spicy':
        return ['content creation', 'social media', 'engagement', 'marketing', 'communication'];
      case 'worker':
        return ['project management', 'client relations', 'task automation', 'web development', 'business operations'];
      case 'specialized':
        return ['technical analysis', 'problem solving', 'system optimization', 'data processing', 'research'];
      default:
        return ['general assistance', 'information gathering', 'task completion'];
    }
  }

  private getDefaultTargetAudience(personaType: string): string {
    switch (personaType) {
      case 'spicy':
        return 'Adults seeking entertainment and engagement';
      case 'worker':
        return 'Businesses and individuals needing professional services';
      case 'specialized':
        return 'Professionals requiring expert-level assistance';
      default:
        return 'General users seeking assistance';
    }
  }

  async getPersonaProject(projectId: string): Promise<PersonaProject | null> {
    try {
      const memory = await storage.getProjectMemory(projectId);
      return memory.personaProject || null;
    } catch (error) {
      return null;
    }
  }

  async updatePersonaProject(projectId: string, updates: Partial<PersonaProject>): Promise<void> {
    const memory = await storage.getProjectMemory(projectId);
    if (memory.personaProject) {
      memory.personaProject = { ...memory.personaProject, ...updates };
      await storage.updateProjectMemory(projectId, memory);
    }
  }

  async getAllPersonaProjects(): Promise<PersonaProject[]> {
    const projects = await storage.getProjects();
    const personaProjects: PersonaProject[] = [];
    
    for (const project of projects) {
      const memory = await storage.getProjectMemory(project.id);
      if (memory.personaProject) {
        personaProjects.push(memory.personaProject);
      }
    }
    
    return personaProjects;
  }
}

export const personaCreator = new PersonaCreator();
