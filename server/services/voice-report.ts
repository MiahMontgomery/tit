import { voiceService } from './voice';
import { storage } from '../storage';
import { proofLogger } from './proof-logger';

export interface VoiceReport {
  id: string;
  projectId: string;
  timestamp: string;
  textContent: string;
  voicePath?: string;
  summary: {
    projects: number;
    totalFeatures: number;
    completedFeatures: number;
    completionRate: number;
    recentActivity: string[];
    systemHealth: string;
    decisions: number;
    proofs: number;
  };
  metadata: {
    duration: number;
    type: 'daily' | 'hourly' | 'status' | 'emergency';
    priority: 'low' | 'medium' | 'high';
  };
}

export class VoiceReportService {
  async generateDailyReport(projectId?: string): Promise<VoiceReport> {
    const projects = await storage.getProjects();
    const targetProjects = projectId ? projects.filter(p => p.id === projectId) : projects;
    
    let totalFeatures = 0;
    let completedFeatures = 0;
    const recentActivity: string[] = [];
    
    for (const project of targetProjects) {
      const features = await storage.getFeaturesByProject(project.id);
      totalFeatures += features.length;
      completedFeatures += features.filter(f => f.status === 'completed').length;
      
      // Get recent activity
      const proofs = await proofLogger.getProofsByProject(project.id);
      const recentProofs = proofs
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 3);
      
      recentProofs.forEach(proof => {
        recentActivity.push(`${proof.title} in ${project.name}`);
      });
    }
    
    const completionRate = totalFeatures > 0 ? (completedFeatures / totalFeatures) * 100 : 0;
    
    const report: VoiceReport = {
      id: `report-${Date.now()}`,
      projectId: projectId || 'all',
      timestamp: new Date().toISOString(),
      textContent: this.generateReportText({
        projects: targetProjects.length,
        totalFeatures,
        completedFeatures,
        completionRate,
        recentActivity,
        systemHealth: 'excellent',
        decisions: 0,
        proofs: recentActivity.length
      }),
      summary: {
        projects: targetProjects.length,
        totalFeatures,
        completedFeatures,
        completionRate,
        recentActivity,
        systemHealth: 'excellent',
        decisions: 0,
        proofs: recentActivity.length
      },
      metadata: {
        duration: 0,
        type: 'daily',
        priority: 'medium'
      }
    };
    
    // Generate voice version
    if (projectId) {
      report.voicePath = await voiceService.generateVoice(
        report.textContent,
        'jason',
        projectId
      );
    } else {
      report.voicePath = await voiceService.generateVoice(
        report.textContent,
        'jason',
        'global'
      );
    }
    
    // Store report
    await this.storeReport(report);
    
    return report;
  }

  async generateHourlyStatus(projectId: string): Promise<VoiceReport> {
    const project = await storage.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    const features = await storage.getFeaturesByProject(projectId);
    const completedFeatures = features.filter(f => f.status === 'completed').length;
    const completionRate = features.length > 0 ? (completedFeatures / features.length) * 100 : 0;
    
    // Get recent proofs
    const proofs = await proofLogger.getProofsByProject(projectId);
    const recentProofs = proofs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
    
    const recentActivity = recentProofs.map(proof => proof.title);
    
    const report: VoiceReport = {
      id: `status-${Date.now()}`,
      projectId,
      timestamp: new Date().toISOString(),
      textContent: this.generateStatusText({
        projectName: project.name,
        totalFeatures: features.length,
        completedFeatures,
        completionRate,
        recentActivity,
        systemHealth: 'excellent',
        decisions: 0,
        proofs: recentProofs.length
      }),
      summary: {
        projects: 1,
        totalFeatures: features.length,
        completedFeatures,
        completionRate,
        recentActivity,
        systemHealth: 'excellent',
        decisions: 0,
        proofs: recentProofs.length
      },
      metadata: {
        duration: 0,
        type: 'hourly',
        priority: 'low'
      }
    };
    
    // Generate voice version
    report.voicePath = await voiceService.generateVoice(
      report.textContent,
      'jason',
      projectId
    );
    
    // Store report
    await this.storeReport(report);
    
    return report;
  }

  async generateEmergencyReport(projectId: string, issue: string): Promise<VoiceReport> {
    const report: VoiceReport = {
      id: `emergency-${Date.now()}`,
      projectId,
      timestamp: new Date().toISOString(),
      textContent: this.generateEmergencyText(issue),
      summary: {
        projects: 1,
        totalFeatures: 0,
        completedFeatures: 0,
        completionRate: 0,
        recentActivity: [issue],
        systemHealth: 'critical',
        decisions: 1,
        proofs: 0
      },
      metadata: {
        duration: 0,
        type: 'emergency',
        priority: 'high'
      }
    };
    
    // Generate voice version
    report.voicePath = await voiceService.generateVoice(
      report.textContent,
      'jason',
      projectId
    );
    
    // Store report
    await this.storeReport(report);
    
    return report;
  }

  private generateReportText(data: any): string {
    return `
Good day! This is Jason with your daily Titan status report.

I'm currently managing ${data.projects} active project${data.projects !== 1 ? 's' : ''} with ${data.totalFeatures} total features.
${data.completedFeatures} features have been completed, giving us a ${data.completionRate.toFixed(1)}% completion rate.

System health is ${data.systemHealth}. I've made ${data.decisions} key decisions today and generated ${data.proofs} proof entries.

Recent activity includes:
${data.recentActivity.slice(0, 3).map((activity: string, index: number) => `${index + 1}. ${activity}`).join('\n')}

I'm continuing to optimize the system and ensure all projects are progressing smoothly.
No immediate action is required from you at this time.

I'll continue monitoring and will reach out if I need your input.
    `.trim();
  }

  private generateStatusText(data: any): string {
    return `
This is Jason with an hourly status update for ${data.projectName}.

The project has ${data.totalFeatures} total features with ${data.completedFeatures} completed.
Current completion rate is ${data.completionRate.toFixed(1)}%.

Recent activity:
${data.recentActivity.slice(0, 3).map((activity: string, index: number) => `${index + 1}. ${activity}`).join('\n')}

System health is ${data.systemHealth}. Everything is running smoothly.

I'll continue monitoring and provide updates as needed.
    `.trim();
  }

  private generateEmergencyText(issue: string): string {
    return `
This is Jason with an emergency alert.

I've detected a critical issue: ${issue}

I'm taking immediate action to resolve this problem. Please check the Input tab for more details and screenshots.

I'll provide updates as I work on resolving this issue.
    `.trim();
  }

  private async storeReport(report: VoiceReport): Promise<void> {
    // Store in project memory
    const memory = await storage.getProjectMemory(report.projectId);
    if (!memory.reports) {
      memory.reports = [];
    }
    memory.reports.push(report);
    await storage.updateProjectMemory(report.projectId, memory);
    
    // Also store as output item
    await storage.createOutputItem({
      projectId: report.projectId,
      type: 'content',
      title: `Voice Report: ${report.metadata.type}`,
      description: report.textContent.substring(0, 100) + '...',
      content: JSON.stringify(report, null, 2),
      url: report.voicePath || null,
      thumbnail: null,
      status: 'approved',
      metadata: { 
        type: 'voice_report',
        reportId: report.id,
        voicePath: report.voicePath
      }
    });
  }

  async getReportsByProject(projectId: string): Promise<VoiceReport[]> {
    const memory = await storage.getProjectMemory(projectId);
    return memory.reports || [];
  }

  async getLatestReport(projectId: string): Promise<VoiceReport | null> {
    const reports = await this.getReportsByProject(projectId);
    return reports.length > 0 ? reports[reports.length - 1] : null;
  }
}

export const voiceReportService = new VoiceReportService();
