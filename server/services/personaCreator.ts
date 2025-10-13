/**
 * Persona creator service for Titan
 * Creates persona projects with API keys and basic setup
 */

import { database } from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface Persona {
  id: string;
  name: string;
  role: string;
  createdAt: Date;
  apiKeys: ApiKey[];
}

export interface ApiKey {
  id: string;
  personaId: string;
  name: string;
  key: string;
  createdAt: Date;
}

export interface PersonaProject {
  id: string;
  name: string;
  role: string;
  description: string;
  apiKeys: ApiKey[];
  createdAt: Date;
}

export class PersonaCreator {
  /**
   * Create a new persona project
   */
  async createPersonaProject(
    name: string, 
    role: string, 
    description: string,
    traits?: any
  ): Promise<PersonaProject> {
    const personaId = uuidv4();
    const projectId = uuidv4();

    // Create persona
    await database.query(
      `INSERT INTO personas (id, name, role, created_at) 
       VALUES ($1, $2, $3, $4)`,
      [personaId, name, role, new Date()]
    );

    // Generate API keys
    const apiKeys = await this.generateApiKeys(personaId);

    // Create project in storage (using existing storage system)
    const { storage } = await import('../storage');
    await storage.createProject(projectId, {
      name: `${name} - ${role}`,
      description,
      status: 'active',
      createdAt: new Date().toISOString(),
      features: [],
      milestones: [],
      goals: []
    });

    // Add persona-specific memory
    await storage.updateProjectMemory(projectId, {
      persona: {
        id: personaId,
        name,
        role,
        description,
        traits: traits || {},
        createdAt: new Date().toISOString()
      },
      input: [],
      tasks: [],
      lastUpdated: new Date().toISOString()
    });

    console.log(`🎭 Persona created: ${name} (${role}) with project ${projectId}`);

    return {
      id: projectId,
      name,
      role,
      description,
      apiKeys,
      createdAt: new Date()
    };
  }

  /**
   * Generate API keys for a persona
   */
  private async generateApiKeys(personaId: string): Promise<ApiKey[]> {
    const keys = [
      { name: 'OpenAI API Key', key: `sk-${uuidv4().replace(/-/g, '')}` },
      { name: 'ElevenLabs API Key', key: `el-${uuidv4().replace(/-/g, '')}` },
      { name: 'Ngrok API Key', key: `ng-${uuidv4().replace(/-/g, '')}` }
    ];

    const apiKeys: ApiKey[] = [];

    for (const keyData of keys) {
      const keyId = uuidv4();
      
      await database.query(
        `INSERT INTO api_keys (id, persona_id, name, key, created_at) 
         VALUES ($1, $2, $3, $4, $5)`,
        [keyId, personaId, keyData.name, keyData.key, new Date()]
      );

      apiKeys.push({
        id: keyId,
        personaId,
        name: keyData.name,
        key: keyData.key,
        createdAt: new Date()
      });
    }

    return apiKeys;
  }

  /**
   * Get persona by ID
   */
  async getPersona(personaId: string): Promise<Persona | null> {
    const result = await database.query(
      `SELECT * FROM personas WHERE id = $1`,
      [personaId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const persona = result.rows[0];
    const apiKeys = await this.getPersonaApiKeys(personaId);

    return {
      id: persona.id,
      name: persona.name,
      role: persona.role,
      createdAt: persona.created_at,
      apiKeys
    };
  }

  /**
   * Get API keys for a persona
   */
  private async getPersonaApiKeys(personaId: string): Promise<ApiKey[]> {
    const result = await database.query(
      `SELECT * FROM api_keys WHERE persona_id = $1 ORDER BY created_at ASC`,
      [personaId]
    );

    return result.rows.map(key => ({
      id: key.id,
      personaId: key.persona_id,
      name: key.name,
      key: key.key,
      createdAt: key.created_at
    }));
  }

  /**
   * List all personas
   */
  async listPersonas(): Promise<Persona[]> {
    const result = await database.query(
      `SELECT * FROM personas ORDER BY created_at DESC`
    );

    const personas: Persona[] = [];

    for (const row of result.rows) {
      const apiKeys = await this.getPersonaApiKeys(row.id);
      personas.push({
        id: row.id,
        name: row.name,
        role: row.role,
        createdAt: row.created_at,
        apiKeys
      });
    }

    return personas;
  }
}

export const personaCreator = new PersonaCreator();
