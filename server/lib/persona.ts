import { randomUUID } from 'crypto';
import { storage } from '../storage';
import { httpTap } from './httpTap';

export interface Persona {
  id: string;
  projectId: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class PersonaManager {
  private personas = new Map<string, Persona>();

  async createPersona(projectId: string, name: string, description: string): Promise<Persona> {
    const persona: Persona = {
      id: randomUUID(),
      projectId,
      name,
      description,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.personas.set(persona.id, persona);
    return persona;
  }

  async getPersona(id: string): Promise<Persona | undefined> {
    return this.personas.get(id);
  }

  async getPersonasByProject(projectId: string): Promise<Persona[]> {
    return Array.from(this.personas.values()).filter(p => p.projectId === projectId);
  }

  async tickPersona(personaId: string): Promise<{ success: boolean; message: string; taskId?: string }> {
    try {
      const persona = await this.getPersona(personaId);
      if (!persona) {
        throw new Error('Persona not found');
      }

      // Get recent messages and memories for context
      const messages = await storage.getProjectMessagesByProject(persona.projectId, 10);
      const memories = await storage.getMemoriesByProject(persona.projectId, 20);

      // Build context from messages and memories
      const context = this.buildContext(messages, memories);

      // Call OpenRouter to decide next action
      const openRouterResponse = await httpTap.post(
        'https://api.openrouter.ai/api/v1/chat/completions',
        {
          model: 'openai/gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are ${persona.name}, an AI persona working on project ${persona.projectId}. 
              Your description: ${persona.description}
              
              Based on the context provided, decide on the next concrete action to take.
              You can choose from:
              - exec: Execute a command or script
              - code: Generate or modify code
              - screenshot: Take a screenshot
              - research: Research a topic
              - analyze: Analyze data or logs
              
              Respond with a JSON object containing:
              {
                "action": "action_type",
                "description": "What you plan to do",
                "payload": "Specific details for the action"
              }`
            },
            {
              role: 'user',
              content: `Context: ${context}\n\nWhat should I do next?`
            }
          ]
        },
        persona.projectId
      );

      const decision = JSON.parse(openRouterResponse.choices[0].message.content);
      
      // Create a task based on the decision
      const task = await storage.addTask(persona.projectId, {
        content: `${decision.action}: ${decision.description}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
        metadata: {
          action: decision.action,
          payload: decision.payload,
          personaId: personaId
        }
      });

      // Add assistant message summarizing the plan
      await storage.addProjectMessage(persona.projectId, {
        role: 'assistant',
        content: `I've decided to ${decision.description}. Task created: ${task.id}`,
        parentId: null
      });

      // Extract and store salient facts as memories
      await this.extractMemories(persona.projectId, decision, context);

      return {
        success: true,
        message: `Persona ${persona.name} decided to ${decision.description}`,
        taskId: task.id
      };

    } catch (error) {
      console.error('Persona tick error:', error);
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private buildContext(messages: any[], memories: any[]): string {
    let context = 'Recent Messages:\n';
    messages.slice(-5).forEach(msg => {
      context += `- ${msg.role}: ${msg.content}\n`;
    });

    context += '\nRelevant Memories:\n';
    memories.slice(-10).forEach(mem => {
      context += `- ${mem.kind}: ${mem.key} = ${JSON.stringify(mem.value)}\n`;
    });

    return context;
  }

  private async extractMemories(projectId: string, decision: any, context: string): Promise<void> {
    try {
      // Extract key facts from the decision and context
      const facts = [
        {
          kind: 'decision',
          key: 'last_action',
          value: decision.action
        },
        {
          kind: 'context',
          key: 'last_decision',
          value: decision.description
        }
      ];

      for (const fact of facts) {
        await storage.addMemory(projectId, {
          ...fact,
          personaId: 'default'
        });
      }
    } catch (error) {
      console.error('Memory extraction error:', error);
    }
  }
}

export const personaManager = new PersonaManager();




