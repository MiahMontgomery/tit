/**
 * Persona management API routes for Titan
 * Handles persona creation and management
 */

import { Router } from 'express';
import { personaCreator } from '../services/personaCreator';

const router = Router();

/**
 * Create a new persona
 * POST /api/personas
 */
router.post('/', async (req, res) => {
  try {
    const { name, role, description, traits } = req.body;

    if (!name || !role) {
      return res.status(400).json({ error: 'Missing required fields: name, role' });
    }

    const personaProject = await personaCreator.createPersonaProject(
      name,
      role,
      description || `${name} - ${role}`,
      traits
    );

    res.json({
      id: personaProject.id,
      name: personaProject.name,
      role: personaProject.role,
      description: personaProject.description,
      apiKeys: personaProject.apiKeys.map(key => ({
        id: key.id,
        name: key.name,
        key: key.key
      })),
      createdAt: personaProject.createdAt
    });

  } catch (error) {
    console.error('Persona creation error:', error);
    res.status(500).json({ error: 'Failed to create persona' });
  }
});

/**
 * Get persona by ID
 * GET /api/personas/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const persona = await personaCreator.getPersona(id);

    if (!persona) {
      return res.status(404).json({ error: 'Persona not found' });
    }

    res.json({
      id: persona.id,
      name: persona.name,
      role: persona.role,
      createdAt: persona.createdAt,
      apiKeys: persona.apiKeys.map(key => ({
        id: key.id,
        name: key.name,
        key: key.key
      }))
    });

  } catch (error) {
    console.error('Get persona error:', error);
    res.status(500).json({ error: 'Failed to get persona' });
  }
});

/**
 * List all personas
 * GET /api/personas
 */
router.get('/', async (req, res) => {
  try {
    const personas = await personaCreator.listPersonas();

    res.json({
      personas: personas.map(persona => ({
        id: persona.id,
        name: persona.name,
        role: persona.role,
        createdAt: persona.createdAt,
        apiKeys: persona.apiKeys.map(key => ({
          id: key.id,
          name: key.name,
          key: key.key
        }))
      }))
    });

  } catch (error) {
    console.error('List personas error:', error);
    res.status(500).json({ error: 'Failed to list personas' });
  }
});

export default router;
