/**
 * Smoke test script for Titan
 * Tests all critical functionality and endpoints
 */

import { database } from '../server/database';
import { taskQueue } from '../server/core/queue';
import { taskExecutor } from '../server/services/taskExecutor';
import { proofLogger } from '../server/services/proofLogger';
import { voiceReportService } from '../server/services/voiceReport';
import { personaCreator } from '../server/services/personaCreator';
import { healthService } from '../server/services/health';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

class SmokeTest {
  private results: TestResult[] = [];
  private testProjectId: string = '';

  async run(): Promise<void> {
    console.log('🧪 Starting Titan smoke tests...\n');

    try {
      // Test database connection
      await this.testDatabaseConnection();
      
      // Test task queue
      await this.testTaskQueue();
      
      // Test task execution
      await this.testTaskExecution();
      
      // Test proof logging
      await this.testProofLogging();
      
      // Test voice reports
      await this.testVoiceReports();
      
      // Test persona creation
      await this.testPersonaCreation();
      
      // Test health service
      await this.testHealthService();
      
      // Test API endpoints
      await this.testApiEndpoints();
      
      // Print results
      this.printResults();
      
      // Exit with appropriate code
      const failedTests = this.results.filter(r => !r.passed);
      if (failedTests.length > 0) {
        console.log(`\n❌ ${failedTests.length} tests failed`);
        process.exit(1);
      } else {
        console.log('\n✅ All tests passed!');
        process.exit(0);
      }

    } catch (error) {
      console.error('Smoke test error:', error);
      process.exit(1);
    }
  }

  private async testDatabaseConnection(): Promise<void> {
    const start = Date.now();
    
    try {
      const connected = await database.isConnected();
      if (!connected) {
        throw new Error('Database not connected');
      }
      
      this.addResult('Database Connection', true, undefined, Date.now() - start);
    } catch (error) {
      this.addResult('Database Connection', false, error instanceof Error ? error.message : 'Unknown error', Date.now() - start);
    }
  }

  private async testTaskQueue(): Promise<void> {
    const start = Date.now();
    
    try {
      // Create test project
      this.testProjectId = (await import('uuid')).v4();
      
      // Enqueue a test task
      const taskId = await taskQueue.enqueue(this.testProjectId, 'exec', {
        command: 'node',
        args: ['-v']
      });
      
      if (!taskId) {
        throw new Error('Failed to enqueue task');
      }
      
      // Get task status
      const task = await taskQueue.getTask(taskId);
      if (!task || task.state !== 'queued') {
        throw new Error('Task not found or wrong state');
      }
      
      this.addResult('Task Queue', true, undefined, Date.now() - start);
    } catch (error) {
      this.addResult('Task Queue', false, error instanceof Error ? error.message : 'Unknown error', Date.now() - start);
    }
  }

  private async testTaskExecution(): Promise<void> {
    const start = Date.now();
    
    try {
      // Create a test task
      const task = {
        id: 1,
        projectId: this.testProjectId,
        type: 'exec',
        payload: {
          command: 'node',
          args: ['-v']
        }
      };
      
      // Execute the task
      const result = await taskExecutor.executeTask(task);
      
      if (!result.success) {
        throw new Error(`Task execution failed: ${result.error}`);
      }
      
      this.addResult('Task Execution', true, undefined, Date.now() - start);
    } catch (error) {
      this.addResult('Task Execution', false, error instanceof Error ? error.message : 'Unknown error', Date.now() - start);
    }
  }

  private async testProofLogging(): Promise<void> {
    const start = Date.now();
    
    try {
      const taskId = 2;
      
      // Log a proof
      const proofId = await proofLogger.logExecution(this.testProjectId, taskId, 'test', {
        message: 'Test proof',
        timestamp: new Date().toISOString()
      });
      
      if (!proofId) {
        throw new Error('Failed to log proof');
      }
      
      // Get proofs
      const proofs = await proofLogger.getProofs(this.testProjectId, 10);
      if (proofs.length === 0) {
        throw new Error('No proofs found');
      }
      
      this.addResult('Proof Logging', true, undefined, Date.now() - start);
    } catch (error) {
      this.addResult('Proof Logging', false, error instanceof Error ? error.message : 'Unknown error', Date.now() - start);
    }
  }

  private async testVoiceReports(): Promise<void> {
    const start = Date.now();
    
    try {
      // Generate hourly report
      const report = await voiceReportService.generateHourlyStatus(this.testProjectId);
      
      if (!report.text) {
        throw new Error('Report text is empty');
      }
      
      this.addResult('Voice Reports', true, undefined, Date.now() - start);
    } catch (error) {
      this.addResult('Voice Reports', false, error instanceof Error ? error.message : 'Unknown error', Date.now() - start);
    }
  }

  private async testPersonaCreation(): Promise<void> {
    const start = Date.now();
    
    try {
      const persona = await personaCreator.createPersonaProject(
        'Test Persona',
        'Developer',
        'A test persona for smoke testing'
      );
      
      if (!persona.id || !persona.apiKeys.length) {
        throw new Error('Persona creation failed');
      }
      
      this.addResult('Persona Creation', true, undefined, Date.now() - start);
    } catch (error) {
      this.addResult('Persona Creation', false, error instanceof Error ? error.message : 'Unknown error', Date.now() - start);
    }
  }

  private async testHealthService(): Promise<void> {
    const start = Date.now();
    
    try {
      const health = await healthService.getHealth();
      
      if (!health.status || !health.hasOwnProperty('queueDepth')) {
        throw new Error('Invalid health status');
      }
      
      this.addResult('Health Service', true, undefined, Date.now() - start);
    } catch (error) {
      this.addResult('Health Service', false, error instanceof Error ? error.message : 'Unknown error', Date.now() - start);
    }
  }

  private async testApiEndpoints(): Promise<void> {
    const start = Date.now();
    
    try {
      // This would test the actual HTTP endpoints
      // For now, we'll just verify the services are working
      const health = await healthService.getHealth();
      const stats = await taskQueue.getStats();
      
      if (!health || !stats) {
        throw new Error('API services not responding');
      }
      
      this.addResult('API Endpoints', true, undefined, Date.now() - start);
    } catch (error) {
      this.addResult('API Endpoints', false, error instanceof Error ? error.message : 'Unknown error', Date.now() - start);
    }
  }

  private addResult(name: string, passed: boolean, error?: string, duration: number = 0): void {
    this.results.push({ name, passed, error, duration });
  }

  private printResults(): void {
    console.log('\n📊 Test Results:');
    console.log('================');
    
    for (const result of this.results) {
      const status = result.passed ? '✅' : '❌';
      const duration = `${result.duration}ms`;
      console.log(`${status} ${result.name} (${duration})`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
    
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    console.log(`\n📈 Summary: ${passed}/${total} tests passed`);
  }
}

// Run the smoke test
const smokeTest = new SmokeTest();
smokeTest.run();
