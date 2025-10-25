# Titan Deployment Environment Configuration

Based on your current environment variables, here's the complete setup needed:

## Current Environment Variables

```bash
# Core Application
NODE_ENV=production
NODE_VERSION=20
PORT=3000

# Database (you'll need to add this)
DATABASE_URL=postgresql://user:password@host:5432/titan

# File Storage
FILE_STORAGE_DIR=/tmp
TITAN_CACHE_ROOT=/var/titan/cache
TITAN_EVIDENCE_ROOT=/var/titan/evidence
TITAN_ROOT=/var/titan
TITAN_RUNS_ROOT=/var/titan/runs

# AI Services
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key-here

# GitHub Integration
GITHUB_TOKEN=ghp_your-github-token-here

# Evidence Storage
EVIDENCE_BUCKET_KEY=your-bucket-key-here
EVIDENCE_BUCKET_SECRET=your-bucket-secret-here
EVIDENCE_BUCKET_URL=https://s3.us-west-002.backblazeb2.com

# Worker Configuration
ACTIVE_WORKERS=8
```

## Missing Environment Variables (Add These)

```bash
# Database (REQUIRED)
DATABASE_URL=postgresql://user:password@host:5432/titan

# GitHub Repository (REQUIRED for ops)
GITHUB_REPO=owner/repo

# Ops Authentication (REQUIRED for ops)
OPS_TOKEN=your-random-ops-token-here

# Path Restrictions (REQUIRED for ops)
ALLOWED_PATHS=client/**,server/**,worker/**,Dockerfile,package.json,tsconfig.json,vite.config.ts
PROTECTED_PATHS=infra/**,secrets/**,database/migrations/**

# Render Deployment Hooks (if using Render)
RENDER_DEPLOY_HOOK_API=https://api.render.com/deploy/srv-xxxxx
RENDER_DEPLOY_HOOK_WORKER=https://api.render.com/deploy/srv-yyyyy

# Application URLs
API_URL=https://your-api.onrender.com
WORKER_URL=https://your-worker.onrender.com
FRONTEND_URL=https://your-frontend.vercel.app

# App Version
APP_VERSION=1.0.0
```

## Database Setup

1. **Create PostgreSQL database** (if not already done)
2. **Set DATABASE_URL** with your connection string
3. **Run migrations**:
   ```bash
   npm run db:deploy
   ```

## File System Setup

Your current file structure should be:
```
/var/titan/
├── cache/          # TITAN_CACHE_ROOT
├── evidence/       # TITAN_EVIDENCE_ROOT  
└── runs/           # TITAN_RUNS_ROOT
```

## Backblaze B2 Integration

Your evidence storage is configured for Backblaze B2:
- **Bucket**: Evidence storage for proofs
- **Region**: us-west-002
- **Access**: Configured with key/secret

## Worker Configuration

- **ACTIVE_WORKERS=8**: Maximum concurrent workers
- **FILE_STORAGE_DIR=/tmp**: Temporary file storage

## Next Steps

1. **Add missing environment variables** to your deployment
2. **Set up PostgreSQL database** and configure DATABASE_URL
3. **Configure GitHub repository** for ops integration
4. **Set up file system directories** for Titan storage
5. **Test deployment** with health checks

## Health Check Endpoints

- **API Health**: `GET /api/health`
- **Metrics**: `GET /api/metrics`
- **Database**: Check Prisma connection
- **File System**: Verify directory permissions

## Security Notes

- **GITHUB_TOKEN**: Ensure it has repo permissions
- **OPS_TOKEN**: Generate a secure random token
- **Database**: Use connection pooling in production
- **File Storage**: Ensure proper permissions on /var/titan/*
