import { storage } from '../server/storage';
import { taskQueue } from '../server/queue';
import { httpTap } from '../server/lib/httpTap';
import { personaManager } from '../server/lib/persona';
import { jasonAgent } from '../server/agents/jason-agent';
import fs from 'fs';
import path from 'path';

class SmokeAutonomyTest {
  private projectId: string = '';
  private personaId: string = '';

  async run() {
    console.log('🧪 Starting autonomy smoke test...');
    
    try {
      // Step 1: Create project + persona
      await this.createProjectAndPersona();
      
      // Step 2: POST tick
      await this.tickPersona();
      
      // Step 3: Assert httpTap proof exists
      await this.assertHttpTapProof();
      
      // Step 4: Assert new message exists
      await this.assertNewMessage();
      
      // Step 5: Assert memory non-empty
      await this.assertMemoryNonEmpty();
      
      // Step 6: If task created, check status
      await this.assertTaskStatus();
      
      // Step 7: Check health endpoint
      await this.assertHealthEndpoint();
      
      console.log('✅ All autonomy smoke tests passed!');
      
    } catch (error) {
      console.error('❌ Autonomy smoke test failed:', error);
      process.exit(1);
    }
  }

  private async createProjectAndPersona() {
    console.log('📝 Creating project and persona...');
    
    // Create project
    const project = await storage.createProject({
      id: crypto.randomUUID(),
      name: 'Smoke Test Project',
      description: 'Test project for autonomy smoke test',
      prompt: 'Test autonomy system'
    });
    
    this.projectId = project.id;
    console.log(`✅ Created project: ${this.projectId}`);
    
    // Create persona
    const persona = await personaManager.createPersona(
      this.projectId,
      'Test Jason',
      'Test persona for smoke test'
    );
    
    this.personaId = persona.id;
    console.log(`✅ Created persona: ${this.personaId}`);
  }

  private async tickPersona() {
    console.log('🧠 Ticking persona...');
    
    // Use Jason agent directly for testing
    await jasonAgent.tick(this.projectId);
    
    console.log('✅ Persona tick completed');
  }

  private async assertHttpTapProof() {
    console.log('🔍 Checking for httpTap proof...');
    
    const proofs = storage.getProofsByProject(this.projectId);
    const httpTapProof = proofs.find(p => p.type === 'file' && p.data?.path?.includes('openrouter'));
    
    if (!httpTapProof) {
      throw new Error('No httpTap proof found');
    }
    
    console.log(`✅ Found httpTap proof: ${httpTapProof.id}`);
    
    // Check if log file exists
    const logPath = path.join(process.cwd(), httpTapProof.data.path);
    if (fs.existsSync(logPath)) {
      console.log(`✅ Log file exists: ${logPath}`);
    } else {
      console.log(`⚠️ Log file not found: ${logPath}`);
    }
  }

  private async assertNewMessage() {
    console.log('💬 Checking for new message...');
    
    const messages = await storage.getProjectMessagesByProject(this.projectId, 10);
    
    if (messages.length === 0) {
      throw new Error('No messages found');
    }
    
    const assistantMessage = messages.find(m => m.role === 'assistant');
    if (!assistantMessage) {
      throw new Error('No assistant message found');
    }
    
    console.log(`✅ Found assistant message: ${assistantMessage.id}`);
  }

  private async assertMemoryNonEmpty() {
    console.log('🧠 Checking for memories...');
    
    const memories = await storage.getMemoriesByProject(this.projectId, 10);
    
    if (memories.length === 0) {
      throw new Error('No memories found');
    }
    
    console.log(`✅ Found ${memories.length} memories`);
  }

  private async assertTaskStatus() {
    console.log('📋 Checking task status...');
    
    const tasks = storage.getTasksByProject(this.projectId);
    
    if (tasks.length === 0) {
      console.log('⚠️ No tasks found (this may be expected)');
      return;
    }
    
    const task = tasks[0];
    console.log(`✅ Found task: ${task.id} (${task.state})`);
    
    // Wait a bit for task to potentially complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const updatedTask = storage.getTaskById(task.id);
    if (updatedTask) {
      console.log(`✅ Task status: ${updatedTask.state}`);
    }
  }

  private async assertHealthEndpoint() {
    console.log('🏥 Checking health endpoint...');
    
    const response = await fetch('http://localhost:3000/health');
    
    if (!response.ok) {
      throw new Error(`Health endpoint failed: ${response.status}`);
    }
    
    const health = await response.json();
    
    if (health.status === 'down') {
      throw new Error('Health status is down');
    }
    
    console.log(`✅ Health status: ${health.status}`);
    console.log(`✅ Autonomy loop: ${health.loop}`);
    console.log(`✅ Queue depth: ${health.queueDepth}`);
    
    if (health.causes && health.causes.length > 0) {
      console.log(`⚠️ Health causes: ${health.causes.join(', ')}`);
    }
  }
}

// Run the test
const test = new SmokeAutonomyTest();
test.run().catch(console.error);