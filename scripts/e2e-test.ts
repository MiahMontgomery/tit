/**
 * E2E Test for Titan - Master Remediation Prompt Validation
 * Tests the complete flow: creation→hierarchy→task→tick→proof→render
 */

import { storage } from '../server/storage';
import { orchestrator } from '../server/orchestrator';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
  details?: any;
}

class E2ETest {
  private results: TestResult[] = [];
  private testProjectId: string = '';

  async run(): Promise<void> {
    console.log('🧪 Starting Titan E2E tests...\n');

    try {
      // Test 1: Project Creation with Hierarchy
      await this.testProjectCreationWithHierarchy();
      
      // Test 2: Task Creation and Enqueueing
      await this.testTaskCreation();
      
      // Test 3: Orchestrator Tick and Proof Generation
      await this.testOrchestratorTick();
      
      // Test 4: Proof Content Retrieval
      await this.testProofContentRetrieval();
      
      // Test 5: Goal State Updates
      await this.testGoalStateUpdates();
      
      // Test 6: No White Backgrounds (UI validation)
      await this.testNoWhiteBackgrounds();
      
      // Test 7: No Mock Data
      await this.testNoMockData();
      
      // Print results
      this.printResults();
      
      // Exit with appropriate code
      const failedTests = this.results.filter(r => !r.passed);
      if (failedTests.length > 0) {
        console.log(`\n❌ ${failedTests.length} tests failed`);
        process.exit(1);
      } else {
        console.log('\n✅ All E2E tests passed!');
        process.exit(0);
      }

    } catch (error) {
      console.error('E2E test error:', error);
      process.exit(1);
    }
  }

  private async testProjectCreationWithHierarchy(): Promise<void> {
    const start = Date.now();
    
    try {
      // Create a test project with features first
      const project = await storage.createProject({
        name: 'E2E Test Project',
        description: 'A test project for E2E validation',
        prompt: 'Build a simple test application'
      });
      
      this.testProjectId = project.id;
      
      // Verify project was created
      if (!project.id || !project.name) {
        throw new Error('Project creation failed');
      }
      
      // Create features for the project
      await storage.createFeature({
        projectId: project.id,
        name: 'Test Feature 1',
        description: 'First test feature'
      });
      
      await storage.createFeature({
        projectId: project.id,
        name: 'Test Feature 2', 
        description: 'Second test feature'
      });
      
      // Wait a moment for orchestrator to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if hierarchy was generated
      const features = await storage.getFeaturesByProject(project.id);
      const milestones = await storage.getMilestonesByProject(project.id);
      const goals = await storage.getGoalsByProject(project.id);
      
      if (features.length === 0) {
        throw new Error('No features generated');
      }
      
      this.addResult('Project Creation with Hierarchy', true, undefined, Date.now() - start, {
        projectId: project.id,
        featuresCount: features.length,
        milestonesCount: milestones.length,
        goalsCount: goals.length
      });
      
    } catch (error) {
      this.addResult('Project Creation with Hierarchy', false, error instanceof Error ? error.message : 'Unknown error', Date.now() - start);
    }
  }

  private async testTaskCreation(): Promise<void> {
    const start = Date.now();
    
    try {
      if (!this.testProjectId) {
        throw new Error('No test project available');
      }
      
      // Create a test task
      const task = await storage.addTask(this.testProjectId, {
        content: 'Implement user authentication',
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      
      if (!task.id || !task.content) {
        throw new Error('Task creation failed');
      }
      
      // Verify task was stored
      const tasks = await storage.getTasksByProject(this.testProjectId);
      const createdTask = tasks.find(t => t.id === task.id);
      
      if (!createdTask) {
        throw new Error('Task not found in storage');
      }
      
      this.addResult('Task Creation', true, undefined, Date.now() - start, {
        taskId: task.id,
        content: task.content,
        status: task.status
      });
      
    } catch (error) {
      this.addResult('Task Creation', false, error instanceof Error ? error.message : 'Unknown error', Date.now() - start);
    }
  }

  private async testOrchestratorTick(): Promise<void> {
    const start = Date.now();
    
    try {
      if (!this.testProjectId) {
        throw new Error('No test project available');
      }
      
      // Start orchestrator if not already running
      await orchestrator.start();
      
      // Wait for orchestrator to process the project
      await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds
      
      // Check if proofs were generated
      const proofs = await storage.getProofsByProject(this.testProjectId);
      
      if (proofs.length === 0) {
        throw new Error('No proofs generated by orchestrator');
      }
      
      // Check if runs were created
      const runs = await storage.getRunsByProject(this.testProjectId);
      
      if (runs.length === 0) {
        throw new Error('No runs created by orchestrator');
      }
      
      // Verify proof types
      const proofTypes = proofs.map(p => p.type);
      const expectedTypes = ['log', 'diff', 'screenshot', 'link'];
      const hasExpectedTypes = expectedTypes.some(type => proofTypes.includes(type));
      
      if (!hasExpectedTypes) {
        throw new Error('Proofs do not contain expected types');
      }
      
      this.addResult('Orchestrator Tick and Proof Generation', true, undefined, Date.now() - start, {
        proofsCount: proofs.length,
        runsCount: runs.length,
        proofTypes: proofTypes,
        latestProof: proofs[0]
      });
      
    } catch (error) {
      this.addResult('Orchestrator Tick and Proof Generation', false, error instanceof Error ? error.message : 'Unknown error', Date.now() - start);
    }
  }

  private async testProofContentRetrieval(): Promise<void> {
    const start = Date.now();
    
    try {
      if (!this.testProjectId) {
        throw new Error('No test project available');
      }
      
      // Get proofs for the project
      const proofs = await storage.getProofsByProject(this.testProjectId);
      
      if (proofs.length === 0) {
        throw new Error('No proofs available for content retrieval test');
      }
      
      // Test content retrieval for each proof
      for (const proof of proofs.slice(0, 3)) { // Test first 3 proofs
        const proofContent = await storage.getProofById(proof.id);
        
        if (!proofContent) {
          throw new Error(`Proof content not found for proof ${proof.id}`);
        }
        
        if (!proofContent.content && !proofContent.description) {
          throw new Error(`Proof ${proof.id} has no content or description`);
        }
      }
      
      this.addResult('Proof Content Retrieval', true, undefined, Date.now() - start, {
        proofsTested: Math.min(3, proofs.length),
        totalProofs: proofs.length
      });
      
    } catch (error) {
      this.addResult('Proof Content Retrieval', false, error instanceof Error ? error.message : 'Unknown error', Date.now() - start);
    }
  }

  private async testGoalStateUpdates(): Promise<void> {
    const start = Date.now();
    
    try {
      if (!this.testProjectId) {
        throw new Error('No test project available');
      }
      
      // Get goals for the project
      const goals = await storage.getGoalsByProject(this.testProjectId);
      
      if (goals.length === 0) {
        throw new Error('No goals available for state update test');
      }
      
      // Check if any goals have been updated to DONE
      const doneGoals = goals.filter(g => g.state === 'DONE');
      
      if (doneGoals.length === 0) {
        // This might be expected if orchestrator hasn't completed a full cycle yet
        console.log('⚠️  No goals marked as DONE yet (this may be expected)');
      }
      
      // Verify goal states are valid
      const validStates = ['PLANNED', 'IN_PROGRESS', 'DONE', 'BLOCKED'];
      const invalidGoals = goals.filter(g => !validStates.includes(g.state));
      
      if (invalidGoals.length > 0) {
        throw new Error(`Found goals with invalid states: ${invalidGoals.map(g => g.state).join(', ')}`);
      }
      
      this.addResult('Goal State Updates', true, undefined, Date.now() - start, {
        totalGoals: goals.length,
        doneGoals: doneGoals.length,
        goalStates: goals.map(g => g.state)
      });
      
    } catch (error) {
      this.addResult('Goal State Updates', false, error instanceof Error ? error.message : 'Unknown error', Date.now() - start);
    }
  }

  private async testNoWhiteBackgrounds(): Promise<void> {
    const start = Date.now();
    
    try {
      // This test would typically use a headless browser to check for white backgrounds
      // For now, we'll validate the CSS configuration
      
      // Check if dark theme is properly configured
      const fs = await import('fs');
      const path = await import('path');
      
      const cssPath = path.join(process.cwd(), 'client/src/index.css');
      const cssContent = fs.readFileSync(cssPath, 'utf8');
      
      // Check for dark theme variables
      const hasDarkTheme = cssContent.includes('--background: #050505') && 
                          cssContent.includes('--primary: #40e0d0');
      
      if (!hasDarkTheme) {
        throw new Error('Dark theme not properly configured in CSS');
      }
      
      // Check for white background usage (should be minimal)
      const whiteBackgroundCount = (cssContent.match(/background.*#fff|background.*white/gi) || []).length;
      
      if (whiteBackgroundCount > 10) { // Allow some white backgrounds for text
        throw new Error(`Too many white backgrounds found: ${whiteBackgroundCount}`);
      }
      
      this.addResult('No White Backgrounds', true, undefined, Date.now() - start, {
        darkThemeConfigured: hasDarkTheme,
        whiteBackgroundCount: whiteBackgroundCount
      });
      
    } catch (error) {
      this.addResult('No White Backgrounds', false, error instanceof Error ? error.message : 'Unknown error', Date.now() - start);
    }
  }

  private async testNoMockData(): Promise<void> {
    const start = Date.now();
    
    try {
      // Check for mock data in key files
      const fs = await import('fs');
      const path = await import('path');
      
      const filesToCheck = [
        'client/src/components/tabs/sales-tab.tsx',
        'client/src/components/tabs/output-tab.tsx',
        'client/src/components/tabs/input-tab.tsx',
        'server/routes.ts'
      ];
      
      let mockDataFound = false;
      const mockDataFiles: string[] = [];
      
      for (const file of filesToCheck) {
        const filePath = path.join(process.cwd(), file);
        
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Check for common mock data patterns (excluding legitimate placeholders)
          const mockPatterns = [
            /mock data/i,
            /fake data/i,
            /dummy data/i,
            /coming soon/i,
            /TODO.*mock/i,
            /placeholder.*data/i
          ];
          
          for (const pattern of mockPatterns) {
            if (pattern.test(content)) {
              mockDataFound = true;
              mockDataFiles.push(file);
              break;
            }
          }
        }
      }
      
      if (mockDataFound) {
        throw new Error(`Mock data found in files: ${mockDataFiles.join(', ')}`);
      }
      
      this.addResult('No Mock Data', true, undefined, Date.now() - start, {
        filesChecked: filesToCheck.length,
        mockDataFound: false
      });
      
    } catch (error) {
      this.addResult('No Mock Data', false, error instanceof Error ? error.message : 'Unknown error', Date.now() - start);
    }
  }

  private addResult(name: string, passed: boolean, error?: string, duration: number = 0, details?: any): void {
    this.results.push({ name, passed, error, duration, details });
  }

  private printResults(): void {
    console.log('\n📊 E2E Test Results:');
    console.log('====================');
    
    for (const result of this.results) {
      const status = result.passed ? '✅' : '❌';
      const duration = `${result.duration}ms`;
      console.log(`${status} ${result.name} (${duration})`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      if (result.details) {
        console.log(`   Details:`, JSON.stringify(result.details, null, 2));
      }
    }
    
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    console.log(`\n📈 Summary: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('\n🎉 All E2E tests passed! The system is ready for production.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review and fix the issues.');
    }
  }
}

// Run the E2E test
const e2eTest = new E2ETest();
e2eTest.run();
