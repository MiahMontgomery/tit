# Titan Deployment Guide

## 🚀 Production Deployment Checklist

### 1. Database Setup

#### Option A: Neon (Recommended)
1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string: `postgres://username:password@host:port/database`

#### Option B: Railway
1. Go to [railway.app](https://railway.app)
2. Create new project → Add Postgres plugin
3. Copy the `DATABASE_URL` from the plugin

### 2. Run Database Migrations

```bash
# Set your database URL
export DATABASE_URL="postgres://username:password@host:port/database"

# Generate migrations
npx drizzle-kit generate

# Run migrations
npx drizzle-kit migrate

# Add indexes for performance
psql $DATABASE_URL -c "
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_proofs_project ON proofs(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_id);
"
```

### 3. Deploy Backend

#### Option A: Railway (Recommended)
1. Connect your GitHub repo to Railway
2. Set environment variables:
   ```
   NODE_ENV=production
   DATABASE_URL=postgres://...
   OPENROUTER_API_KEY=sk-or-...
   OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
   ELEVENLABS_API_KEY=eleven-...
   FILE_STORAGE_DIR=/data/storage
   FRONTEND_URL=https://your-app.vercel.app
   ```
3. Deploy

#### Option B: Fly.io
1. Install flyctl: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. Launch: `fly launch`
4. Set secrets: `fly secrets set DATABASE_URL=... OPENROUTER_API_KEY=...`

### 4. Deploy Frontend (Vercel)

1. Connect your repo to Vercel
2. Set environment variables:
   ```
   NEXT_PUBLIC_API_BASE=https://your-backend.railway.app
   NEXT_PUBLIC_WS_URL=wss://your-backend.railway.app
   ```
3. Deploy

### 5. Test Production Deployment

```bash
# Test the deployed backend
BASE=https://your-backend.railway.app

# Create project
PID=$(curl -s -X POST $BASE/api/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"Prod Test","prompt":"Build a simple app"}' | jq -r '.data.id')

# Generate plan
curl -s -X POST $BASE/api/projects/$PID/plan | jq

# Check tree
curl -s $BASE/api/projects/$PID/tree | jq

# Enqueue task
curl -s -X POST $BASE/api/projects/$PID/tasks \
  -H 'Content-Type: application/json' \
  -d '{"type":"screenshot","payload":{"url":"https://example.com"}}' | jq

# Wait 60s, then check proofs
curl -s $BASE/api/proofs/$PID | jq
```

### 6. Monitoring & Observability

#### Health Checks
- `GET /health` - Basic health check
- `GET /healthz` - Uptime monitoring
- `GET /api/metrics` - System metrics

#### Logs
- Railway: View logs in dashboard
- Fly.io: `fly logs`
- Add Sentry for error tracking

#### Database Monitoring
- Neon: Built-in monitoring dashboard
- Railway: Database metrics in dashboard

### 7. n8n Automations (Optional)

#### Nightly Summary
```json
{
  "trigger": "cron",
  "schedule": "0 9 * * *",
  "workflow": [
    {
      "type": "http",
      "method": "GET",
      "url": "{{$env.BACKEND_URL}}/api/proofs/{{$json.projectId}}"
    },
    {
      "type": "http", 
      "method": "POST",
      "url": "{{$env.BACKEND_URL}}/api/messages/{{$json.projectId}}",
      "body": {
        "type": "system",
        "body": "Daily summary: {{$json.proofs.length}} proofs created"
      }
    }
  ]
}
```

#### Stuck Goal Sweeper
```json
{
  "trigger": "cron",
  "schedule": "0 * * * *",
  "workflow": [
    {
      "type": "http",
      "method": "POST", 
      "url": "{{$env.BACKEND_URL}}/api/projects/{{$json.projectId}}/tasks",
      "body": {
        "type": "screenshot",
        "payload": {"url": "https://example.com"}
      }
    }
  ]
}
```

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Ensure database is accessible
   - Run migrations: `npx drizzle-kit migrate`

2. **Puppeteer Fails in Container**
   - Ensure `--no-sandbox` args are set
   - Check if Chromium is installed

3. **CORS Errors**
   - Update FRONTEND_URL environment variable
   - Check CORS configuration in server

4. **WebSocket Not Connecting**
   - Ensure WebSocket is enabled on platform
   - Check if port is properly exposed

### Performance Optimization

1. **Database Indexes**
   ```sql
   CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status, created_at);
   CREATE INDEX IF NOT EXISTS idx_proofs_project ON proofs(project_id);
   CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_id);
   ```

2. **Rate Limiting**
   - Already configured: 30 tasks/min per project
   - General: 100 requests/min per IP

3. **File Storage**
   - Use persistent storage for proofs
   - Consider S3/Supabase for large files

## 📊 Monitoring Dashboard

Access these endpoints for monitoring:

- **Health**: `GET /health`
- **Metrics**: `GET /api/metrics`
- **WebSocket**: `wss://your-backend.railway.app`

## 🚨 Runbook

### Start Local Development
```bash
npm run dev
```

### Run Migrations
```bash
npx drizzle-kit migrate
```

### Check Health
```bash
curl https://your-backend.railway.app/health
```

### Create Project
```bash
curl -X POST https://your-backend.railway.app/api/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","prompt":"Build something"}'
```

### Generate Plan
```bash
curl -X POST https://your-backend.railway.app/api/projects/PROJECT_ID/plan
```

### Get Tree
```bash
curl https://your-backend.railway.app/api/projects/PROJECT_ID/tree
```

### Enqueue Task
```bash
curl -X POST https://your-backend.railway.app/api/projects/PROJECT_ID/tasks \
  -H 'Content-Type: application/json' \
  -d '{"type":"screenshot","payload":{"url":"https://example.com"}}'
```

### Get Proofs
```bash
curl https://your-backend.railway.app/api/proofs/PROJECT_ID
```

### Score Goals
```bash
curl -X POST https://your-backend.railway.app/api/projects/PROJECT_ID/score-goals
```

### WebSocket Connection
```javascript
const ws = new WebSocket('wss://your-backend.railway.app');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
```
