/**
 * Project management API routes for Titan
 * Handles project proofs, input memory, and project data
 */

import { Router } from 'express';
import { proofLogger } from '../services/proofLogger';
import { voiceReportService } from '../services/voiceReport';
import { database } from '../database';
import { storage } from '../storage';

const router = Router();

/**
 * Get projects overview
 * GET /api/projects/overview
 */
router.get('/overview', async (req, res) => {
  try {
    const projects = await storage.getAllProjects();
    
    const overviews = await Promise.all(projects.map(async (project) => {
      // Get features count
      const features = await storage.getFeaturesByProject(project.id);
      
      // Get latest run state (mock for now - would need runs table)
      const latestRunState = 'DONE'; // TODO: implement runs table
      
      // Get budget info (mock for now)
      const budgetTokens = 10000;
      const budgetUsd = 50.0;
      const spentTokens = 0;
      const spentUsd = 0.0;
      
      // Get last 3 proofs
      const proofs = await proofLogger.getProofs(project.id, 3);
      const recentProofs = proofs.map(proof => ({
        summary: proof.data?.summary || `${proof.type} proof`,
        createdAt: proof.createdAt
      }));
      
      return {
        id: project.id,
        name: project.name,
        description: project.description,
        latestRunState,
        budgetTokens,
        budgetUsd,
        spentTokens,
        spentUsd,
        featuresCount: features.length,
        recentProofs
      };
    }));

    res.json(overviews);

  } catch (error) {
    console.error('Projects overview error:', error);
    res.status(500).json({ error: 'Failed to get projects overview' });
  }
});

/**
 * Get project proofs
 * GET /api/projects/:id/proofs
 */
router.get('/:id/proofs', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100 } = req.query;
    
    const proofs = await proofLogger.getProofs(id, parseInt(limit as string));

    res.json({
      projectId: id,
      proofs: proofs.map(proof => ({
        id: proof.id,
        taskId: proof.taskId,
        type: proof.type,
        data: proof.data,
        createdAt: proof.createdAt
      }))
    });

  } catch (error) {
    console.error('Project proofs error:', error);
    res.status(500).json({ error: 'Failed to get project proofs' });
  }
});

/**
 * Get project input memory
 * GET /api/projects/:id/input/memory
 */
router.get('/:id/input/memory', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100 } = req.query;
    
    const result = await database.query(
      `SELECT * FROM inputs 
       WHERE project_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [id, parseInt(limit as string)]
    );

    res.json({
      projectId: id,
      memory: result.rows.map(input => ({
        id: input.id,
        role: input.role,
        content: input.content_json,
        createdAt: input.created_at
      }))
    });

  } catch (error) {
    console.error('Project memory error:', error);
    res.status(500).json({ error: 'Failed to get project memory' });
  }
});

/**
 * Add input to project memory
 * POST /api/projects/:id/input/memory
 */
router.post('/:id/input/memory', async (req, res) => {
  try {
    const { id } = req.params;
    const { role, content } = req.body;

    if (!role || !content) {
      return res.status(400).json({ error: 'Missing required fields: role, content' });
    }

    if (!['user', 'assistant', 'system'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be: user, assistant, system' });
    }

    const inputId = require('uuid').v4();
    
    await database.query(
      `INSERT INTO inputs (id, project_id, role, content_json, created_at) 
       VALUES ($1, $2, $3, $4, $5)`,
      [inputId, id, role, JSON.stringify(content), new Date()]
    );

    res.json({
      id: inputId,
      projectId: id,
      role,
      content,
      createdAt: new Date()
    });

  } catch (error) {
    console.error('Add memory error:', error);
    res.status(500).json({ error: 'Failed to add memory' });
  }
});

/**
 * Generate voice report
 * POST /api/reports/voice
 */
router.post('/reports/voice', async (req, res) => {
  try {
    const { projectId, kind } = req.body;

    if (!projectId || !kind) {
      return res.status(400).json({ error: 'Missing required fields: projectId, kind' });
    }

    if (!['hourly', 'daily', 'emergency'].includes(kind)) {
      return res.status(400).json({ error: 'Invalid report kind. Must be: hourly, daily, emergency' });
    }

    let report;
    
    switch (kind) {
      case 'hourly':
        report = await voiceReportService.generateHourlyStatus(projectId);
        break;
      case 'daily':
        report = await voiceReportService.generateDailyStatus(projectId);
        break;
      case 'emergency':
        const { issue } = req.body;
        if (!issue) {
          return res.status(400).json({ error: 'Issue description required for emergency reports' });
        }
        report = await voiceReportService.generateEmergencyReport(projectId, issue);
        break;
    }

    res.json({
      text: report.text,
      audioUrl: report.audioUrl,
      reasonIfNull: report.reasonIfNull
    });

  } catch (error) {
    console.error('Voice report error:', error);
    res.status(500).json({ error: 'Failed to generate voice report' });
  }
});

/**
 * Get project reports
 * GET /api/projects/:id/reports
 */
router.get('/:id/reports', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;
    
    const reports = await voiceReportService.getReports(id, parseInt(limit as string));

    res.json({
      projectId: id,
      reports: reports.map(report => ({
        id: report.id,
        kind: report.kind,
        text: report.text,
        audioUrl: report.audioUrl,
        createdAt: report.createdAt
      }))
    });

  } catch (error) {
    console.error('Project reports error:', error);
    res.status(500).json({ error: 'Failed to get project reports' });
  }
});

export default router;
