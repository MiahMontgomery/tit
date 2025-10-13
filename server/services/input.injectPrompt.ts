import { storage } from '../storage';
import { enqueuePromptInjection } from '../queue/enqueue';
import puppeteer from 'puppeteer';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface InjectPromptParams {
  projectId: string;
  taskId: string;
  prompt: string;
}

export async function executeInjectPrompt({ projectId, taskId, prompt }: InjectPromptParams) {
  try {
    console.log(`🔧 Executing input.injectPrompt for project ${projectId}`);
    
    // Load project memory
    const memory = await storage.getProjectMemory(projectId);
    if (!memory) {
      throw new Error(`Project memory not found for ${projectId}`);
    }

    // Classify prompt and determine service type
    const serviceType = classifyPrompt(prompt);
    
    // Update memory with input entry
    if (!memory.input) {
      memory.input = [];
    }
    
    const inputEntry = {
      id: `input_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      prompt,
      timestamp: new Date().toISOString(),
      status: 'processing',
      serviceType,
      taskId,
      notifications: [] as any[]
    };
    
    memory.input.push(inputEntry);
    await storage.updateProjectMemory(projectId, memory);

    // Capture initial screenshot
    const screenshot = await captureScreenshot(projectId, inputEntry.id, 'initial');
    if (screenshot) {
      inputEntry.notifications.push({
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'screenshot',
        title: 'Initial State',
        content: 'Captured current state before processing',
        timestamp: new Date().toISOString(),
        data: { screenshotPath: screenshot },
        nested: []
      });
    }

    // Add processing notification
    inputEntry.notifications.push({
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'processing',
      title: 'Classifying Request',
      content: `Analyzing prompt and determining service type: ${serviceType}`,
      timestamp: new Date().toISOString(),
      data: { serviceType },
      nested: []
    });

    // Enqueue secondary task based on service type
    const secondaryTask = await enqueueTask({
      projectId,
      type: serviceType,
      data: { 
        projectId, 
        prompt,
        inputId: inputEntry.id,
        originalTaskId: taskId
      },
      priority: 'medium'
    });

    // Add task queued notification
    inputEntry.notifications.push({
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'task',
      title: 'Task Queued',
      content: `Task queued for execution with ID: ${secondaryTask.id}`,
      timestamp: new Date().toISOString(),
      data: { taskId: secondaryTask.id, serviceType },
      nested: []
    });

    // Update memory with notifications
    await storage.updateProjectMemory(projectId, memory);

    // Create proof file
    const proof = {
      taskId,
      projectId,
      prompt,
      serviceType,
      secondaryTaskId: secondaryTask.id,
      timestamp: new Date().toISOString(),
      status: 'completed',
      notifications: inputEntry.notifications
    };

    await storage.createOutputItem({
      projectId,
      type: 'content',
      title: `Input Processed: ${prompt.substring(0, 50)}...`,
      description: `Prompt classified as ${serviceType} and queued for execution`,
      content: JSON.stringify(proof, null, 2),
      url: null,
      thumbnail: null,
      status: 'approved',
      metadata: { taskId, serviceType }
    });

    console.log(`✅ Input prompt processed: ${serviceType} -> ${secondaryTask.id}`);
    
    return {
      success: true,
      serviceType,
      secondaryTaskId: secondaryTask.id,
      inputId: inputEntry.id,
      proof,
      notifications: inputEntry.notifications
    };

  } catch (error) {
    console.error('Error executing input.injectPrompt:', error);
    throw error;
  }
}

function classifyPrompt(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();
  
  // Code generation patterns
  if (lowerPrompt.includes('create') && (lowerPrompt.includes('component') || lowerPrompt.includes('function') || lowerPrompt.includes('class'))) {
    return 'service:codegen.createComponent';
  }
  
  if (lowerPrompt.includes('generate') && (lowerPrompt.includes('code') || lowerPrompt.includes('file'))) {
    return 'service:codegen.generateFile';
  }
  
  if (lowerPrompt.includes('implement') || lowerPrompt.includes('build') || lowerPrompt.includes('develop')) {
    return 'service:codegen.implementFeature';
  }
  
  // Content generation patterns
  if (lowerPrompt.includes('write') && (lowerPrompt.includes('content') || lowerPrompt.includes('article') || lowerPrompt.includes('text'))) {
    return 'service:content.generateText';
  }
  
  if (lowerPrompt.includes('create') && (lowerPrompt.includes('documentation') || lowerPrompt.includes('readme'))) {
    return 'service:content.generateDocumentation';
  }
  
  // Analysis patterns
  if (lowerPrompt.includes('analyze') || lowerPrompt.includes('review') || lowerPrompt.includes('examine')) {
    return 'service:analysis.analyzeCode';
  }
  
  if (lowerPrompt.includes('debug') || lowerPrompt.includes('fix') || lowerPrompt.includes('error')) {
    return 'service:debug.fixIssue';
  }
  
  // Testing patterns
  if (lowerPrompt.includes('test') || lowerPrompt.includes('validate') || lowerPrompt.includes('verify')) {
    return 'service:test.runTests';
  }
  
  // Default to general task execution
  return 'service:task.execute';
}

async function captureScreenshot(projectId: string, inputId: string, stage: string): Promise<string | null> {
  try {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Navigate to the project page
    await page.goto(`http://localhost:5000/projects/${projectId}`, { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });
    
    // Create screenshots directory
    const screenshotsDir = join(process.cwd(), 'data', 'screenshots', projectId);
    mkdirSync(screenshotsDir, { recursive: true });
    
    // Generate screenshot filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${inputId}_${stage}_${timestamp}.png`;
    const screenshotPath = join(screenshotsDir, filename);
    
    // Take screenshot
    await page.screenshot({ 
      path: screenshotPath as `${string}.png`,
      fullPage: true 
    });
    
    await browser.close();
    
    // Return relative path for web access
    return `/screenshots/${projectId}/${filename}`;
    
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    return null;
  }
}

