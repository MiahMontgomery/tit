# Titan - New Structure

This document describes the new repository structure and how to use it.

## Repository Layout

```
/server
  /src
    index.ts              // Express app bootstrap
    routes/
      health.ts
      projects.ts
      ops.ts
    lib/
      db.ts               // Prisma client init
      repos/              // ProjectRepo, JobRepo, RunRepo, ArtifactRepo
      queue.ts            // enqueue & polling primitives
      logger.ts           // pino or console wrapper
      types.ts           // shared TS types/interfaces
      validators.ts       // zod schemas
  /prisma
    schema.prisma
/worker
  /src
    index.ts              // worker bootstrap & main polling loop
    handlers/
      scaffold.ts
      build.ts
      deploy.ts
      verify.ts
      publish.ts
      ops.diff.ts
      ops.patch.ts
      ops.test.ts
      ops.pr.ts
      ops.deploy-canary.ts
      ops.promote.ts
      ops.rollback.ts
    templates/
      registry.ts         // exports a map of template handlers
      persona/basic/      // sample template
        index.ts
    /lib (symlinks to /server/src/lib)
/templates               // shared static files or blueprints if needed
/.env.example
```

## Getting Started

### 1. Environment Setup

Copy the environment template:
```bash
cp env.example .env
```

Configure your environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `GITHUB_REPO`: Your GitHub repository (owner/repo)
- `GITHUB_TOKEN`: GitHub personal access token
- `OPS_TOKEN`: Random token for ops authentication
- `OUTPUT_DIR`: Directory for project artifacts
- `RENDER_DEPLOY_HOOK_*`: Render deployment webhooks

### 2. Database Setup

Generate Prisma client:
```bash
npm run db:generate
```

Run migrations:
```bash
npm run db:migrate
```

### 3. Development

Start the server:
```bash
npm run dev
```

Start the worker (in another terminal):
```bash
npm run dev:worker
```

### 4. Production

Build everything:
```bash
npm run build
```

Start server:
```bash
npm start
```

Start worker:
```bash
npm run start:worker
```

## API Endpoints

### Health
- `GET /api/health` - Health check

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details

### Ops (Internal)
- `POST /api/ops/propose` - Propose changes (requires X-OPS-TOKEN header)

## Adding a New Template

1. Create a new template directory under `worker/src/templates/`
2. Implement the `Template` interface with methods: `scaffold`, `build`, `deploy`, `verify`, `publish`
3. Register the template in `worker/src/templates/registry.ts`
4. The template will be available for use in project creation

### Template Interface

```typescript
export interface Template {
  scaffold(project: Project, spec: any, ctx: Ctx): Promise<void>;
  build(project: Project, spec: any, ctx: Ctx): Promise<void>;
  deploy(project: Project, spec: any, ctx: Ctx): Promise<void>;
  verify(project: Project, spec: any, ctx: Ctx): Promise<void>;
  publish(project: Project, spec: any, ctx: Ctx): Promise<void>;
}
```

## Ops Self-Edit Loop

The ops system allows automated code changes through a secure pipeline:

1. **Propose**: Submit changes via `POST /api/ops/propose`
2. **Diff**: Validate allowed/protected paths
3. **Patch**: Create branch and commit changes
4. **Test**: Run `npm ci && npm run build`
5. **PR**: Create pull request with `titan-ops` label
6. **Deploy Canary**: Trigger canary deployment
7. **Promote**: Merge PR and deploy to production
8. **Rollback**: Revert on failure

## Database Schema

The system uses Prisma with PostgreSQL:

- **Projects**: Main project entities
- **Jobs**: Task queue with retry logic
- **Runs**: Pipeline execution tracking
- **Artifacts**: Generated files and metadata

## Monitoring

- Health endpoints: `/api/health`
- Metrics: `/api/metrics`
- Structured logging with project/job context
- Graceful shutdown handling

## Deployment

### Render Setup

1. Create two Render services:
   - **Web Service**: Points to server code
   - **Background Worker**: Points to worker code

2. Set environment variables for both services

3. Mount shared disk at `/data` for both services

4. Configure deployment hooks for ops system

### Environment Variables

See `env.example` for complete list of required variables.

## Troubleshooting

### Common Issues

1. **Database connection**: Ensure `DATABASE_URL` is correct
2. **GitHub integration**: Verify `GITHUB_TOKEN` has repo permissions
3. **File permissions**: Ensure `OUTPUT_DIR` is writable
4. **Build failures**: Check Node.js version (20+)

### Logs

- Server logs: Structured JSON with request IDs
- Worker logs: Job execution with timing
- Ops logs: Change pipeline with GitHub integration
