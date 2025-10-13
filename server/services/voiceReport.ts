/**
 * Voice report service for Titan
 * Generates voice reports with graceful degradation when ElevenLabs is unavailable
 */

import { database } from '../database';
import { voiceService } from './voice';
import { v4 as uuidv4 } from 'uuid';

export interface VoiceReport {
  id: string;
  projectId: string;
  kind: 'hourly' | 'daily' | 'emergency';
  text: string;
  audioUrl?: string;
  reasonIfNull?: string;
  createdAt: Date;
}

export class VoiceReportService {
  /**
   * Generate hourly status report
   */
  async generateHourlyStatus(projectId: string): Promise<VoiceReport> {
    const reportId = uuidv4();
    const text = await this.generateHourlyText(projectId);
    
    let audioUrl: string | undefined;
    let reasonIfNull: string | undefined;

    try {
      const voiceResult = await voiceService.generateVoice(text);
      audioUrl = voiceResult.audioUrl;
    } catch (error) {
      reasonIfNull = 'Voice generation failed: ' + (error instanceof Error ? error.message : 'Unknown error');
    }

    // Save to database
    await database.query(
      `INSERT INTO reports (id, project_id, kind, text, audio_url, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [reportId, projectId, 'hourly', text, audioUrl, new Date()]
    );

    return {
      id: reportId,
      projectId,
      kind: 'hourly',
      text,
      audioUrl,
      reasonIfNull,
      createdAt: new Date()
    };
  }

  /**
   * Generate daily status report
   */
  async generateDailyStatus(projectId: string): Promise<VoiceReport> {
    const reportId = uuidv4();
    const text = await this.generateDailyText(projectId);
    
    let audioUrl: string | undefined;
    let reasonIfNull: string | undefined;

    try {
      const voiceResult = await voiceService.generateVoice(text);
      audioUrl = voiceResult.audioUrl;
    } catch (error) {
      reasonIfNull = 'Voice generation failed: ' + (error instanceof Error ? error.message : 'Unknown error');
    }

    // Save to database
    await database.query(
      `INSERT INTO reports (id, project_id, kind, text, audio_url, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [reportId, projectId, 'daily', text, audioUrl, new Date()]
    );

    return {
      id: reportId,
      projectId,
      kind: 'daily',
      text,
      audioUrl,
      reasonIfNull,
      createdAt: new Date()
    };
  }

  /**
   * Generate emergency report
   */
  async generateEmergencyReport(projectId: string, issue: string): Promise<VoiceReport> {
    const reportId = uuidv4();
    const text = await this.generateEmergencyText(projectId, issue);
    
    let audioUrl: string | undefined;
    let reasonIfNull: string | undefined;

    try {
      const voiceResult = await voiceService.generateVoice(text);
      audioUrl = voiceResult.audioUrl;
    } catch (error) {
      reasonIfNull = 'Voice generation failed: ' + (error instanceof Error ? error.message : 'Unknown error');
    }

    // Save to database
    await database.query(
      `INSERT INTO reports (id, project_id, kind, text, audio_url, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [reportId, projectId, 'emergency', text, audioUrl, new Date()]
    );

    return {
      id: reportId,
      projectId,
      kind: 'emergency',
      text,
      audioUrl,
      reasonIfNull,
      createdAt: new Date()
    };
  }

  /**
   * Generate hourly report text
   */
  private async generateHourlyText(projectId: string): Promise<string> {
    // Get recent tasks for the project
    const tasks = await this.getRecentTasks(projectId, 10);
    const completedTasks = tasks.filter(t => t.state === 'succeeded').length;
    const failedTasks = tasks.filter(t => t.state === 'failed').length;

    return `This is Jason with an hourly status update for project ${projectId}. 
            In the last hour, I've completed ${completedTasks} tasks successfully. 
            ${failedTasks > 0 ? `There were ${failedTasks} failed tasks that need attention.` : 'All tasks are running smoothly.'}
            I'll continue monitoring and will reach out if I need your input.`;
  }

  /**
   * Generate daily report text
   */
  private async generateDailyText(projectId: string): Promise<string> {
    // Get all tasks for the project from today
    const tasks = await this.getRecentTasks(projectId, 100);
    const completedTasks = tasks.filter(t => t.state === 'succeeded').length;
    const failedTasks = tasks.filter(t => t.state === 'failed').length;
    const runningTasks = tasks.filter(t => t.state === 'running').length;

    return `This is Jason with your daily status report for project ${projectId}. 
            Today I completed ${completedTasks} tasks successfully. 
            ${failedTasks > 0 ? `There were ${failedTasks} failed tasks.` : 'No failed tasks today.'}
            ${runningTasks > 0 ? `Currently running ${runningTasks} tasks.` : 'No tasks currently running.'}
            Overall progress is looking good. I'll continue working through the night.`;
  }

  /**
   * Generate emergency report text
   */
  private async generateEmergencyText(projectId: string, issue: string): Promise<string> {
    return `This is Jason with an emergency report for project ${projectId}. 
            I've encountered an issue: ${issue}. 
            I need your immediate attention to resolve this problem. 
            Please check the project logs and let me know how you'd like me to proceed.`;
  }

  /**
   * Get recent tasks for a project
   */
  private async getRecentTasks(projectId: string, limit: number): Promise<any[]> {
    try {
      const result = await database.query(
        `SELECT * FROM tasks 
         WHERE project_id = $1 
         AND created_at > NOW() - INTERVAL '24 hours'
         ORDER BY created_at DESC 
         LIMIT $2`,
        [projectId, limit]
      );
      return result.rows;
    } catch {
      return [];
    }
  }

  /**
   * Get reports for a project
   */
  async getReports(projectId: string, limit: number = 50): Promise<VoiceReport[]> {
    const result = await database.query(
      `SELECT * FROM reports 
       WHERE project_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [projectId, limit]
    );

    return result.rows.map(report => ({
      id: report.id,
      projectId: report.project_id,
      kind: report.kind,
      text: report.text,
      audioUrl: report.audio_url,
      createdAt: report.created_at
    }));
  }
}

export const voiceReportService = new VoiceReportService();
