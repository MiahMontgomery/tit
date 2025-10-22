import { Template, Ctx } from '../types.js';
import fs from 'fs/promises';
import path from 'path';

export const personaBasic: Template = {
  async scaffold(project, spec, ctx) {
    ctx.logger('Starting scaffold for persona/basic template', { projectId: project.id });
    
    // Create project directory
    const projectDir = path.join(ctx.artifactsDir, project.id);
    await fs.mkdir(projectDir, { recursive: true });
    
    // Write README.md
    const readmeContent = `# ${project.name}

This is a basic project created by Titan.

## Project Details
- **Type**: ${project.type}
- **Template**: ${project.templateRef}
- **Created**: ${new Date().toISOString()}

## Specification
\`\`\`json
${JSON.stringify(spec, null, 2)}
\`\`\`

## Next Steps
This project has been scaffolded and is ready for the next phase of development.
`;

    await fs.writeFile(path.join(projectDir, 'README.md'), readmeContent);
    await ctx.addArtifact('readme', 'README.md', { size: readmeContent.length });
    
    // Write manifest.json
    const manifest = {
      name: project.name,
      type: project.type,
      template: project.templateRef,
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      spec
    };
    
    await fs.writeFile(path.join(projectDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    await ctx.addArtifact('manifest', 'manifest.json', { size: JSON.stringify(manifest).length });
    
    ctx.logger('Scaffold completed', { projectId: project.id });
  },

  async build(project, spec, ctx) {
    ctx.logger('Starting build for persona/basic template', { projectId: project.id });
    
    // For basic template, just create a simple build artifact
    const projectDir = path.join(ctx.artifactsDir, project.id);
    const buildInfo = {
      buildTime: new Date().toISOString(),
      projectId: project.id,
      version: '1.0.0'
    };
    
    await fs.writeFile(path.join(projectDir, 'build.json'), JSON.stringify(buildInfo, null, 2));
    await ctx.addArtifact('build', 'build.json', { size: JSON.stringify(buildInfo).length });
    
    ctx.logger('Build completed', { projectId: project.id });
  },

  async deploy(project, spec, ctx) {
    ctx.logger('Starting deploy for persona/basic template', { projectId: project.id });
    
    // For basic template, just record deployment info
    const projectDir = path.join(ctx.artifactsDir, project.id);
    const deployInfo = {
      deployedAt: new Date().toISOString(),
      projectId: project.id,
      status: 'deployed'
    };
    
    await fs.writeFile(path.join(projectDir, 'deploy.json'), JSON.stringify(deployInfo, null, 2));
    await ctx.addArtifact('deploy', 'deploy.json', { size: JSON.stringify(deployInfo).length });
    
    ctx.logger('Deploy completed', { projectId: project.id });
  },

  async verify(project, spec, ctx) {
    ctx.logger('Starting verify for persona/basic template', { projectId: project.id });
    
    // Check that required files exist
    const projectDir = path.join(ctx.artifactsDir, project.id);
    const requiredFiles = ['README.md', 'manifest.json', 'build.json', 'deploy.json'];
    
    for (const file of requiredFiles) {
      try {
        await fs.access(path.join(projectDir, file));
        ctx.logger(`Verified file exists: ${file}`, { projectId: project.id });
      } catch (error) {
        throw new Error(`Required file missing: ${file}`);
      }
    }
    
    await ctx.addArtifact('verification', 'verification.json', { 
      verifiedAt: new Date().toISOString(),
      files: requiredFiles
    });
    
    ctx.logger('Verify completed', { projectId: project.id });
  },

  async publish(project, spec, ctx) {
    ctx.logger('Starting publish for persona/basic template', { projectId: project.id });
    
    // Create final publish artifact
    const projectDir = path.join(ctx.artifactsDir, project.id);
    const publishInfo = {
      publishedAt: new Date().toISOString(),
      projectId: project.id,
      status: 'published',
      version: '1.0.0'
    };
    
    await fs.writeFile(path.join(projectDir, 'publish.json'), JSON.stringify(publishInfo, null, 2));
    await ctx.addArtifact('publish', 'publish.json', { size: JSON.stringify(publishInfo).length });
    
    ctx.logger('Publish completed', { projectId: project.id });
  }
};