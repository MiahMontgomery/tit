import { Router } from 'express';
import { jason } from '../agents/jason-agent';
import { personaCreator } from '../services/persona-creator';
import { voiceReportService } from '../services/voice-report';
import { proofLogger } from '../services/proof-logger';

const router = Router();

// Test the complete feedback loop
router.post('/feedback-loop', async (req, res) => {
  try {
    console.log('🧪 Testing complete feedback loop...');
    
    const results = {
      step1: 'Creating persona project...',
      step2: 'Jason making decisions...',
      step3: 'Generating voice report...',
      step4: 'Creating proof logs...',
      step5: 'Testing executive decision making...',
      success: false
    };
    
    // Step 1: Create a persona project
    console.log('Step 1: Creating persona project');
    const personaProject = await personaCreator.createPersonaProject(
      'worker',
      'Test Worker Bot',
      'A test worker bot for demonstrating the feedback loop',
      {
        name: 'Test Worker Bot',
        traits: ['professional', 'efficient', 'reliable'],
        communicationStyle: 'Professional and clear',
        expertise: ['automation', 'project management', 'business operations'],
        targetAudience: 'Business professionals'
      }
    );
    
    results.step1 = `✅ Created persona project: ${personaProject.name} (ID: ${personaProject.id})`;
    
    // Step 2: Jason makes decisions about the project
    console.log('Step 2: Jason making decisions');
    const decision1 = await jason.makeDecision(
      'New persona project created, what should be the first action?',
      { projectId: personaProject.id, personaType: 'worker' }
    );
    
    const decision2 = await jason.makeDecision(
      'Project needs optimization, what should be prioritized?',
      { projectId: personaProject.id, currentStatus: 'active' }
    );
    
    results.step2 = `✅ Jason made 2 decisions: "${decision1.decision}" and "${decision2.decision}"`;
    
    // Step 3: Generate voice report
    console.log('Step 3: Generating voice report');
    const voiceReport = await voiceReportService.generateHourlyStatus(personaProject.id);
    
    results.step3 = `✅ Generated voice report: ${voiceReport.id} (Voice: ${voiceReport.voicePath ? 'Yes' : 'No'})`;
    
    // Step 4: Create proof logs
    console.log('Step 4: Creating proof logs');
    const proof1 = await proofLogger.logFileCreation(
      personaProject.id,
      'test-task-1',
      'test-file.js',
      'console.log("Hello from test!");',
      'Created test file for feedback loop demonstration'
    );
    
    const proof2 = await proofLogger.logExecution(
      personaProject.id,
      'test-task-2',
      'Test execution',
      { result: 'success', message: 'Test completed successfully' },
      'success',
      150
    );
    
    results.step4 = `✅ Created 2 proof logs: ${proof1.id} and ${proof2.id}`;
    
    // Step 5: Test executive decision making
    console.log('Step 5: Testing executive decision making');
    const executiveDecision = await jason.makeDecision(
      'Project is running smoothly but user input is needed for next phase. Should I proceed autonomously or wait?',
      { 
        projectId: personaProject.id,
        situation: 'autonomous_vs_wait',
        timeSinceLastInput: 120, // 2 hours
        projectHealth: 'good'
      }
    );
    
    results.step5 = `✅ Executive decision: "${executiveDecision.decision}" (Reasoning: ${executiveDecision.reasoning})`;
    
    // Test user request handling
    console.log('Testing user request handling');
    const userResponse = await jason.handleUserRequest(
      'Create a spicy persona bot named Luna for adult entertainment',
      personaProject.id
    );
    
    results.step6 = `✅ User request handled: ${userResponse.substring(0, 100)}...`;
    
    results.success = true;
    
    res.json({
      success: true,
      message: 'Feedback loop test completed successfully',
      results,
      personaProject,
      decisions: [decision1, decision2, executiveDecision],
      voiceReport,
      proofs: [proof1, proof2]
    });
    
  } catch (error) {
    console.error('Feedback loop test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      results: req.body.results || {}
    });
  }
});

// Test Jason's autonomous decision making
router.post('/autonomous-decision', async (req, res) => {
  try {
    const { situation, context } = req.body;
    
    const decision = await jason.makeDecision(situation, context);
    
    res.json({
      success: true,
      decision,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Autonomous decision test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test persona creation
router.post('/create-persona', async (req, res) => {
  try {
    const { type, name, description, personality } = req.body;
    
    const personaProject = await personaCreator.createPersonaProject(
      type,
      name,
      description,
      personality
    );
    
    res.json({
      success: true,
      personaProject
    });
    
  } catch (error) {
    console.error('Persona creation test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test voice report generation
router.post('/voice-report', async (req, res) => {
  try {
    const { projectId, type } = req.body;
    
    let report;
    if (type === 'daily') {
      report = await voiceReportService.generateDailyReport(projectId);
    } else {
      report = await voiceReportService.generateHourlyStatus(projectId);
    }
    
    res.json({
      success: true,
      report
    });
    
  } catch (error) {
    console.error('Voice report test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test proof logging
router.post('/proof-log', async (req, res) => {
  try {
    const { projectId, type, data } = req.body;
    
    let proof;
    switch (type) {
      case 'code_change':
        proof = await proofLogger.logCodeChange(
          projectId,
          data.taskId,
          data.filePath,
          data.before,
          data.after,
          data.description
        );
        break;
      case 'screenshot':
        proof = await proofLogger.logScreenshot(
          projectId,
          data.taskId,
          data.screenshotPath,
          data.description
        );
        break;
      case 'execution':
        proof = await proofLogger.logExecution(
          projectId,
          data.taskId,
          data.action,
          data.result,
          data.status,
          data.duration
        );
        break;
      default:
        throw new Error(`Unknown proof type: ${type}`);
    }
    
    res.json({
      success: true,
      proof
    });
    
  } catch (error) {
    console.error('Proof logging test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all test results
router.get('/results', async (req, res) => {
  try {
    const projects = await personaCreator.getAllPersonaProjects();
    const allProofs = [];
    
    for (const project of projects) {
      const proofs = await proofLogger.getProofsByProject(project.id);
      allProofs.push(...proofs);
    }
    
    res.json({
      success: true,
      personaProjects: projects,
      totalProofs: allProofs.length,
      recentProofs: allProofs
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10)
    });
    
  } catch (error) {
    console.error('Failed to get test results:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
