import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { logger } from '../lib/logger.js';
import { requestId, logRequest } from '../middleware/requestId.js';
import { generalRateLimit } from '../middleware/rateLimit.js';
import routes from '../routes/index.js';

// Create test app
const app = express();
const server = createServer(app);

// Middleware
app.use(requestId());
app.use(logRequest());
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(generalRateLimit);
app.use(routes);

describe('API Integration Tests', () => {
  it('should create a project and enqueue scaffold job', async () => {
    const projectData = {
      name: 'Test Project',
      type: 'web-app',
      templateRef: 'persona/basic',
      spec: { description: 'A test project' }
    };

    const response = await request(app)
      .post('/api/projects')
      .send(projectData)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBeDefined();
  });

  it('should get project details', async () => {
    // First create a project
    const projectData = {
      name: 'Test Project 2',
      type: 'web-app',
      templateRef: 'persona/basic',
      spec: { description: 'Another test project' }
    };

    const createResponse = await request(app)
      .post('/api/projects')
      .send(projectData)
      .expect(200);

    const projectId = createResponse.body.data.id;

    // Then get the project details
    const getResponse = await request(app)
      .get(`/api/projects/${projectId}`)
      .expect(200);

    expect(getResponse.body.success).toBe(true);
    expect(getResponse.body.data.project).toBeDefined();
    expect(getResponse.body.data.project.id).toBe(projectId);
  });

  it('should handle ops proposal', async () => {
    const opsData = {
      title: 'Test Ops Change',
      description: 'A test operational change',
      patches: [
        {
          path: 'README.md',
          content: '# Updated README\n\nThis is a test change.'
        }
      ]
    };

    const response = await request(app)
      .post('/api/ops/propose')
      .set('X-OPS-TOKEN', process.env.OPS_TOKEN || 'test-token')
      .send(opsData)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('enqueued');
  });
});
