# TITAN Build Tasks (Authoritative Spec)

This document outlines the implementation of Titan's functional brain - the core system that powers autonomous project management and self-editing capabilities.

## System Overview

Titan is an **autonomous AI project management system** that creates, manages, and executes software projects through AI-driven workflows. The system features:

- **Autonomous Project Builder**: Creates and manages software projects through AI-driven workflows
- **Real-time Dashboard**: Single-page application with 5-tab interface (Progress, Input, Logs, Output, Sales)
- **AI Agent Integration**: Features "Jason" - an AI project manager with voice communication
- **Self-Managing System**: Can propose and implement its own code changes through GitHub integration

## Architecture

### Core Components

1. **Server API** (Express + TypeScript)
   - RESTful endpoints for project management
   - Ops endpoints for self-editing capabilities
   - Health monitoring and metrics

2. **Worker System** (Background Job Processing)
   - Job queue with transactional claiming
   - Template-based project scaffolding
   - Ops self-edit pipeline with GitHub integration

3. **Database Layer** (Prisma + PostgreSQL)
   - Project, Job, Run, Artifact models
   - Transactional job management
   - Artifact storage and tracking

4. **Template System**
   - Pluggable template architecture
   - Persona/basic template implementation
   - Extensible for custom project types

## Implementation Status

### ✅ Completed

1. **Data Layer** - Prisma + Postgres
   - ✅ Schema with Project, Job, Run, Artifact models
   - ✅ Repository layer with thin Prisma wrappers
   - ✅ Migration scripts and client generation

2. **Server API** - Express
   - ✅ Health endpoint with uptime and version
   - ✅ Projects CRUD with job enqueueing
   - ✅ Ops endpoints for self-editing
   - ✅ Request validation with Zod schemas

3. **Queue System** - Shared Primitives
   - ✅ Transactional job claiming
   - ✅ Retry logic with exponential backoff
   - ✅ Error handling and job status management

4. **Worker System** - Main Loop
   - ✅ Polling loop with 500ms interval
   - ✅ Job routing to appropriate handlers
   - ✅ Heartbeat logging every minute
   - ✅ Graceful shutdown handling

5. **Template System** - Registry + Sample
   - ✅ Template interface definition
   - ✅ Registry for template resolution
   - ✅ Persona/basic template implementation
   - ✅ Scaffold → Build → Deploy → Verify → Publish pipeline

6. **Job Handlers** - Core Pipeline
   - ✅ Scaffold handler with template execution
   - ✅ Build handler for compilation
   - ✅ Deploy handler for deployment
   - ✅ Verify handler for validation
   - ✅ Publish handler for finalization

7. **Ops System** - Self-Edit Loop
   - ✅ Ops.diff handler with path validation
   - ✅ Ops.patch handler with GitHub integration
   - ✅ Ops.test handler with build verification
   - ✅ Ops.pr handler for pull request creation
   - ✅ Ops.deploy-canary handler with health checks
   - ✅ Ops.promote handler for PR merging
   - ✅ Ops.rollback handler for failure recovery

8. **Observability** - Monitoring
   - ✅ Health endpoint with system status
   - ✅ Worker heartbeat logging
   - ✅ Structured logging with job context
   - ✅ Error tracking and metrics

### 🔄 In Progress

9. **Testing** - Unit & Integration
   - 🔄 Queue operation tests
   - 🔄 Repository tests
   - 🔄 API integration tests
   - 🔄 Template tests

### 📋 Pending

10. **Documentation** - User Guides
    - 📋 Local development setup
    - 📋 Template development guide
    - 📋 Ops system configuration
    - 📋 Deployment instructions

## Environment Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/titan

# Output directories
OUTPUT_DIR=/data/projects
TEMPLATES_DIR=/app/worker/src/templates

# Ops authentication
OPS_TOKEN=your_long_random_token_here

# GitHub integration
GITHUB_REPO=owner/repo
GITHUB_TOKEN=your_github_personal_access_token

# Render deployment hooks
RENDER_DEPLOY_HOOK_API=https://api.render.com/deploy/srv-xxx
RENDER_DEPLOY_HOOK_WORKER=https://api.render.com/deploy/srv-yyy

# Path restrictions for ops
ALLOWED_PATHS=client/**,server/**,worker/**,Dockerfile,package.json,tsconfig.json,vite.config.ts
PROTECTED_PATHS=infra/**,secrets/**,database/migrations/**
```

## Usage Examples

### Creating a Project

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Web App",
    "type": "web-app",
    "templateRef": "persona/basic",
    "spec": {
      "description": "A modern web application",
      "features": ["authentication", "dashboard", "api"]
    }
  }'
```

### Proposing Ops Changes

```bash
curl -X POST http://localhost:3000/api/ops/propose \
  -H "Content-Type: application/json" \
  -H "X-OPS-TOKEN: your-ops-token" \
  -d '{
    "title": "Update README",
    "description": "Add deployment instructions",
    "patches": [
      {
        "path": "README.md",
        "content": "# My Project\n\n## Deployment\n\n..."
      }
    ]
  }'
```

## Development Commands

```bash
# Start development server
npm run dev

# Start worker
npm run dev:worker

# Run database migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate

# Run tests
npm test

# Build for production
npm run build
```

## Next Steps

1. **Complete Testing Suite**
   - Add comprehensive unit tests
   - Implement integration tests
   - Add end-to-end testing

2. **Enhanced Templates**
   - Create additional template types
   - Add template validation
   - Implement template marketplace

3. **Advanced Ops Features**
   - Add approval workflows
   - Implement rollback strategies
   - Add deployment monitoring

4. **Production Readiness**
   - Add monitoring and alerting
   - Implement backup strategies
   - Add performance optimization

## Contributing

This system is designed to be extensible and maintainable. Key areas for contribution:

- **New Templates**: Add support for different project types
- **Enhanced Ops**: Improve self-editing capabilities
- **Monitoring**: Add comprehensive observability
- **Testing**: Expand test coverage and quality

The system follows a modular architecture that makes it easy to add new features while maintaining stability and performance.
