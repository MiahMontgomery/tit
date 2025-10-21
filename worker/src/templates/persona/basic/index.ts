import { Template, Ctx } from '../../types.js';
import { promises as fs } from 'fs';
import { join } from 'path';

export const personaBasicTemplate: Template = {
  async scaffold(project: Project, spec: any, ctx: Ctx): Promise<void> {
    const { artifactsDir, addArtifact, logger } = ctx;
    
    logger('Starting persona/basic scaffold', { projectId: project.id });
    
    // Create README.md
    const readmeContent = `# ${project.name}

This is a basic persona project created by Titan.

## Project Details
- **Type**: ${project.type}
- **Template**: ${project.templateRef}
- **Created**: ${new Date().toISOString()}

## Spec
\`\`\`json
${JSON.stringify(spec, null, 2)}
\`\`\`

## Next Steps
This persona is ready for configuration and deployment.
`;

    const readmePath = join(artifactsDir, 'README.md');
    await fs.writeFile(readmePath, readmeContent);
    await addArtifact('manifest', 'README.md', { type: 'documentation' });
    
    // Create manifest.json
    const manifest = {
      name: project.name,
      type: project.type,
      template: project.templateRef,
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      spec
    };
    
    const manifestPath = join(artifactsDir, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    await addArtifact('manifest', 'manifest.json', { type: 'configuration' });
    
    // Create basic persona config
    const personaConfig = {
      name: project.name,
      role: spec.role || 'Assistant',
      description: spec.description || 'A helpful AI persona',
      traits: spec.traits || ['helpful', 'friendly'],
      communicationStyle: spec.communicationStyle || 'professional',
      expertise: spec.expertise || ['general assistance'],
      targetAudience: spec.targetAudience || 'general users'
    };
    
    const configPath = join(artifactsDir, 'persona.json');
    await fs.writeFile(configPath, JSON.stringify(personaConfig, null, 2));
    await addArtifact('config', 'persona.json', { type: 'persona-config' });
    
    logger('Persona/basic scaffold completed', { projectId: project.id });
  },

  async build(project: Project, spec: any, ctx: Ctx): Promise<void> {
    const { logger } = ctx;
    
    logger('Persona/basic build (no-op)', { projectId: project.id });
    // No build step needed for basic persona
  },

  async deploy(project: Project, spec: any, ctx: Ctx): Promise<void> {
    const { logger } = ctx;
    
    logger('Persona/basic deploy (no-op)', { projectId: project.id });
    // No deployment needed for basic persona
  },

  async verify(project: Project, spec: any, ctx: Ctx): Promise<void> {
    const { artifactsDir, addArtifact, logger } = ctx;
    
    logger('Verifying persona/basic project', { projectId: project.id });
    
    // Check that required files exist
    const requiredFiles = ['README.md', 'manifest.json', 'persona.json'];
    const verificationResults: Record<string, boolean> = {};
    
    for (const file of requiredFiles) {
      try {
        await fs.access(join(artifactsDir, file));
        verificationResults[file] = true;
      } catch {
        verificationResults[file] = false;
      }
    }
    
    const allFilesExist = Object.values(verificationResults).every(exists => exists);
    
    const verifyResult = {
      timestamp: new Date().toISOString(),
      projectId: project.id,
      template: 'persona/basic',
      files: verificationResults,
      status: allFilesExist ? 'passed' : 'failed',
      message: allFilesExist ? 'All required files present' : 'Some required files missing'
    };
    
    const verifyPath = join(artifactsDir, 'verify.json');
    await fs.writeFile(verifyPath, JSON.stringify(verifyResult, null, 2));
    await addArtifact('verification', 'verify.json', { type: 'verification-result' });
    
    logger('Persona/basic verification completed', { 
      projectId: project.id, 
      status: verifyResult.status 
    });
  },

  async publish(project: Project, spec: any, ctx: Ctx): Promise<void> {
    const { logger } = ctx;
    
    logger('Persona/basic publish (no-op)', { projectId: project.id });
    // No publishing needed for basic persona
  }
};
