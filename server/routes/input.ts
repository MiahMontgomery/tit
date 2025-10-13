import express from 'express';
import { enqueuePromptInjection } from '../queue/enqueue';
import { storage } from '../storage';
import { voiceService } from '../services/voice';

const router = express.Router();

// POST /api/input/:projectId
router.post('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required and must be a string' });
    }

    // Load project memory
    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Append prompt to memory.input[]
    const memory = await storage.getProjectMemory(projectId);
    if (!memory.input) {
      memory.input = [];
    }
    
    const inputEntry = {
      id: `input_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      prompt,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    memory.input.push(inputEntry);
    await storage.updateProjectMemory(projectId, memory);

    // Enqueue task with inferred type
    const task = await enqueuePromptInjection(projectId, prompt);

    res.json({
      status: 'queued',
      taskId: task.id,
      inputId: inputEntry.id,
      message: 'Prompt queued for processing'
    });

  } catch (error) {
    console.error('Error processing input prompt:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      projectId: req.params.projectId,
      prompt: req.body.prompt
    });
    res.status(500).json({ 
      error: 'Failed to process input prompt',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Debug endpoint to check project memory
router.get('/:projectId/memory', async (req, res) => {
  try {
    const { projectId } = req.params;
    const memory = await storage.getProjectMemory(projectId);
    res.json(memory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get project memory' });
  }
});

// Debug endpoint to check queue
router.get('/debug/queue', async (req, res) => {
  try {
    const { getPendingTasks } = await import('../queue');
    const pendingTasks = await getPendingTasks();
    res.json({ pendingTasks });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get queue', details: error instanceof Error ? error.message : String(error) });
  }
});

// Generate voice for text
router.post('/:projectId/voice', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { text, voiceId } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required and must be a string' });
    }

    // Get project's ElevenLabs API key
    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const voicePath = await voiceService.generateVoice(text, voiceId, projectId, project.elevenLabsApiKey || undefined);
    
    if (!voicePath) {
      return res.status(503).json({ 
        error: 'Voice generation unavailable',
        message: 'ElevenLabs API key not configured for this project. Please add an ElevenLabs API key when creating the project.'
      });
    }

    res.json({
      success: true,
      voicePath,
      text
    });

  } catch (error) {
    console.error('Error generating voice:', error);
    res.status(500).json({ error: 'Failed to generate voice' });
  }
});

// Generate Jason's voice for status update
router.post('/:projectId/voice/status', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status object is required' });
    }

    // Get project's ElevenLabs API key
    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const voicePath = await voiceService.generateStatusUpdate(status, projectId, project.elevenLabsApiKey || undefined);
    
    if (!voicePath) {
      return res.status(503).json({ 
        error: 'Voice generation unavailable',
        message: 'ElevenLabs API key not configured for this project. Please add an ElevenLabs API key when creating the project.'
      });
    }

    res.json({
      success: true,
      voicePath,
      status
    });

  } catch (error) {
    console.error('Error generating status voice:', error);
    res.status(500).json({ error: 'Failed to generate status voice' });
  }
});

// Get available voices
router.get('/voices', async (req, res) => {
  try {
    const voices = await voiceService.getVoices();
    res.json({ voices });
  } catch (error) {
    console.error('Error fetching voices:', error);
    res.status(500).json({ error: 'Failed to fetch voices' });
  }
});

export default router;
