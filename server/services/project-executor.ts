import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { storage } from '../storage';
import { broadcastAgentEvent } from '../websocket';

const execAsync = promisify(exec);

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  filesCreated?: string[];
  commandsExecuted?: string[];
}

export class ProjectExecutor {
  private projectDir: string;
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
    this.projectDir = join(process.cwd(), 'data', 'projects', projectId);
  }

  async executeFeature(featureId: string, featureName: string): Promise<ExecutionResult> {
    try {
      console.log(`Executing feature: ${featureName} for project: ${this.projectId}`);
      
      // Create project directory if it doesn't exist
      await this.ensureProjectDirectory();
      
      // Get project details
      const project = await storage.getProject(this.projectId);
      if (!project) {
        throw new Error(`Project ${this.projectId} not found`);
      }

      // Analyze feature and determine execution strategy
      const executionPlan = await this.analyzeFeature(featureName, project.prompt);
      
      // Execute the plan
      const result = await this.executePlan(executionPlan);
      
      // Update feature status
      await storage.updateFeature(featureId, { 
        status: result.success ? 'completed' : 'failed' 
      });
      
      // Create log entry
      await storage.createLog(this.projectId, 
        result.success ? "Feature Completed" : "Feature Failed",
        `${featureName}: ${result.success ? 'Successfully executed' : result.error}`
      );
      
      return result;
      
    } catch (error) {
      console.error(`Feature execution error for ${featureName}:`, error);
      
      await storage.updateFeature(featureId, { status: 'failed' });
      await storage.createLog(this.projectId, "Feature Failed", 
        `${featureName}: ${error.message}`);
      
      return {
        success: false,
        output: '',
        error: error.message
      };
    }
  }

  private async ensureProjectDirectory(): Promise<void> {
    try {
      await mkdir(this.projectDir, { recursive: true });
      await mkdir(join(this.projectDir, 'src'), { recursive: true });
      await mkdir(join(this.projectDir, 'public'), { recursive: true });
    } catch (error) {
      // Directory might already exist, that's fine
    }
  }

  private async analyzeFeature(featureName: string, projectPrompt: string): Promise<ExecutionPlan> {
    const featureLower = featureName.toLowerCase();
    const promptLower = projectPrompt.toLowerCase();
    
    // Determine what type of feature this is and create execution plan
    if (featureLower.includes('user interface') || featureLower.includes('frontend')) {
      return this.createFrontendPlan(promptLower);
    } else if (featureLower.includes('backend') || featureLower.includes('api')) {
      return this.createBackendPlan(promptLower);
    } else if (featureLower.includes('database') || featureLower.includes('data')) {
      return this.createDatabasePlan(promptLower);
    } else if (featureLower.includes('authentication') || featureLower.includes('security')) {
      return this.createAuthPlan(promptLower);
    } else if (featureLower.includes('deployment') || featureLower.includes('ci/cd')) {
      return this.createDeploymentPlan(promptLower);
    } else {
      return this.createGenericPlan(featureName, promptLower);
    }
  }

  private createFrontendPlan(prompt: string): ExecutionPlan {
    const isReact = prompt.includes('react') || prompt.includes('jsx') || prompt.includes('tsx');
    const isVue = prompt.includes('vue');
    const isAngular = prompt.includes('angular');
    
    if (isReact) {
      return {
        type: 'react-frontend',
        steps: [
          {
            type: 'file',
            path: 'package.json',
            content: this.generateReactPackageJson()
          },
          {
            type: 'file',
            path: 'src/App.tsx',
            content: this.generateReactApp()
          },
          {
            type: 'file',
            path: 'src/index.tsx',
            content: this.generateReactIndex()
          },
          {
            type: 'file',
            path: 'public/index.html',
            content: this.generateHTMLTemplate()
          },
          {
            type: 'command',
            command: 'npm install'
          }
        ]
      };
    }
    
    return {
      type: 'generic-frontend',
      steps: [
        {
          type: 'file',
          path: 'index.html',
          content: this.generateGenericHTML()
        },
        {
          type: 'file',
          path: 'style.css',
          content: this.generateGenericCSS()
        },
        {
          type: 'file',
          path: 'script.js',
          content: this.generateGenericJS()
        }
      ]
    };
  }

  private createBackendPlan(prompt: string): ExecutionPlan {
    const isNode = prompt.includes('node') || prompt.includes('express') || prompt.includes('javascript');
    const isPython = prompt.includes('python') || prompt.includes('flask') || prompt.includes('django');
    const isJava = prompt.includes('java') || prompt.includes('spring');
    
    if (isNode) {
      return {
        type: 'node-backend',
        steps: [
          {
            type: 'file',
            path: 'package.json',
            content: this.generateNodePackageJson()
          },
          {
            type: 'file',
            path: 'server.js',
            content: this.generateExpressServer()
          },
          {
            type: 'file',
            path: 'routes/api.js',
            content: this.generateAPIRoutes()
          },
          {
            type: 'command',
            command: 'npm install'
          }
        ]
      };
    }
    
    return {
      type: 'generic-backend',
      steps: [
        {
          type: 'file',
          path: 'server.py',
          content: this.generatePythonServer()
        },
        {
          type: 'file',
          path: 'requirements.txt',
          content: 'flask\nflask-cors\n'
        }
      ]
    };
  }

  private createDatabasePlan(prompt: string): ExecutionPlan {
    return {
      type: 'database',
      steps: [
        {
          type: 'file',
          path: 'database/schema.sql',
          content: this.generateDatabaseSchema(prompt)
        },
        {
          type: 'file',
          path: 'database/migrations/001_initial.sql',
          content: this.generateInitialMigration()
        }
      ]
    };
  }

  private createAuthPlan(prompt: string): ExecutionPlan {
    return {
      type: 'authentication',
      steps: [
        {
          type: 'file',
          path: 'auth/jwt.js',
          content: this.generateJWTHandler()
        },
        {
          type: 'file',
          path: 'auth/middleware.js',
          content: this.generateAuthMiddleware()
        },
        {
          type: 'file',
          path: 'auth/routes.js',
          content: this.generateAuthRoutes()
        }
      ]
    };
  }

  private createDeploymentPlan(prompt: string): ExecutionPlan {
    return {
      type: 'deployment',
      steps: [
        {
          type: 'file',
          path: 'Dockerfile',
          content: this.generateDockerfile()
        },
        {
          type: 'file',
          path: 'docker-compose.yml',
          content: this.generateDockerCompose()
        },
        {
          type: 'file',
          path: '.github/workflows/deploy.yml',
          content: this.generateGitHubActions()
        }
      ]
    };
  }

  private createGenericPlan(featureName: string, prompt: string): ExecutionPlan {
    return {
      type: 'generic',
      steps: [
        {
          type: 'file',
          path: `src/${featureName.toLowerCase().replace(/\s+/g, '-')}.js`,
          content: this.generateGenericFeature(featureName, prompt)
        },
        {
          type: 'file',
          path: 'README.md',
          content: this.generateReadme(featureName, prompt)
        }
      ]
    };
  }

  private async executePlan(plan: ExecutionPlan): Promise<ExecutionResult> {
    const filesCreated: string[] = [];
    const commandsExecuted: string[] = [];
    let output = '';
    
    try {
      for (const step of plan.steps) {
        if (step.type === 'file') {
          const filePath = join(this.projectDir, step.path);
          await writeFile(filePath, step.content, 'utf8');
          filesCreated.push(step.path);
          output += `Created file: ${step.path}\n`;
        } else if (step.type === 'command') {
          const { stdout, stderr } = await execAsync(step.command, { 
            cwd: this.projectDir,
            timeout: 30000 // 30 second timeout
          });
          commandsExecuted.push(step.command);
          output += `Executed: ${step.command}\n`;
          if (stdout) output += `Output: ${stdout}\n`;
          if (stderr) output += `Error: ${stderr}\n`;
        }
      }
      
      return {
        success: true,
        output,
        filesCreated,
        commandsExecuted
      };
      
    } catch (error) {
      return {
        success: false,
        output,
        error: error.message,
        filesCreated,
        commandsExecuted
      };
    }
  }

  // Template generators
  private generateReactPackageJson(): string {
    return JSON.stringify({
      name: `project-${this.projectId}`,
      version: "1.0.0",
      private: true,
      dependencies: {
        react: "^18.2.0",
        "react-dom": "^18.2.0",
        "react-scripts": "5.0.1",
        typescript: "^4.9.5",
        "@types/react": "^18.0.28",
        "@types/react-dom": "^18.0.11"
      },
      scripts: {
        start: "react-scripts start",
        build: "react-scripts build",
        test: "react-scripts test",
        eject: "react-scripts eject"
      },
      browserslist: {
        production: [">0.2%", "not dead", "not op_mini all"],
        development: ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
      }
    }, null, 2);
  }

  private generateReactApp(): string {
    return `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Project ${this.projectId}</h1>
        <p>Generated by Titan Autonomous System</p>
        <p>This is a React application created automatically based on your project requirements.</p>
      </header>
    </div>
  );
}

export default App;`;
  }

  private generateReactIndex(): string {
    return `import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;
  }

  private generateHTMLTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Project generated by Titan" />
    <title>Project ${this.projectId}</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>`;
  }

  private generateNodePackageJson(): string {
    return JSON.stringify({
      name: `project-${this.projectId}-backend`,
      version: "1.0.0",
      description: "Backend API generated by Titan",
      main: "server.js",
      scripts: {
        start: "node server.js",
        dev: "nodemon server.js"
      },
      dependencies: {
        express: "^4.18.2",
        cors: "^2.8.5",
        dotenv: "^16.0.3",
        helmet: "^6.1.5"
      },
      devDependencies: {
        nodemon: "^2.0.22"
      }
    }, null, 2);
  }

  private generateExpressServer(): string {
    return `const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', require('./routes/api'));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    project: '${this.projectId}'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
  console.log(\`Project: ${this.projectId}\`);
});`;
  }

  private generateAPIRoutes(): string {
    return `const express = require('express');
const router = express.Router();

// GET /api/projects
router.get('/projects', (req, res) => {
  res.json({
    message: 'Projects API endpoint',
    project: '${this.projectId}',
    timestamp: new Date().toISOString()
  });
});

// POST /api/projects
router.post('/projects', (req, res) => {
  res.json({
    message: 'Project created',
    data: req.body,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;`;
  }

  private generatePythonServer(): string {
    return `from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'project': '${this.projectId}'
    })

@app.route('/api/projects', methods=['GET'])
def get_projects():
    return jsonify({
        'message': 'Projects API endpoint',
        'project': '${this.projectId}',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/projects', methods=['POST'])
def create_project():
    data = request.get_json()
    return jsonify({
        'message': 'Project created',
        'data': data,
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)`;
  }

  private generateDatabaseSchema(prompt: string): string {
    return `-- Database schema for project ${this.projectId}
-- Generated by Titan Autonomous System

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS features (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_features_project_id ON features(project_id);
CREATE INDEX IF NOT EXISTS idx_features_status ON features(status);`;
  }

  private generateInitialMigration(): string {
    return `-- Initial migration for project ${this.projectId}
-- Generated by Titan Autonomous System

BEGIN;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create features table
CREATE TABLE IF NOT EXISTS features (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMIT;`;
  }

  private generateJWTHandler(): string {
    return `const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

class AuthService {
  static generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  static async hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  static async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }
}

module.exports = AuthService;`;
  }

  private generateAuthMiddleware(): string {
    return `const AuthService = require('./jwt');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = AuthService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole
};`;
  }

  private generateAuthRoutes(): string {
    return `const express = require('express');
const AuthService = require('./jwt');
const { authenticateToken } = require('./middleware');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Hash password
    const passwordHash = await AuthService.hashPassword(password);
    
    // In a real app, save to database
    const user = {
      id: Date.now(),
      username,
      email,
      passwordHash
    };
    
    // Generate token
    const token = AuthService.generateToken({
      id: user.id,
      username: user.username,
      email: user.email
    });
    
    res.json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // In a real app, find user in database
    // For demo purposes, we'll simulate a user
    const user = {
      id: 1,
      username: 'demo',
      email: 'demo@example.com',
      passwordHash: await AuthService.hashPassword('password')
    };
    
    // Verify password
    const isValid = await AuthService.comparePassword(password, user.passwordHash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate token
    const token = AuthService.generateToken({
      id: user.id,
      username: user.username,
      email: user.email
    });
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Protected route example
router.get('/profile', authenticateToken, (req, res) => {
  res.json({
    message: 'Profile data',
    user: req.user
  });
});

module.exports = router;`;
  }

  private generateDockerfile(): string {
    return `# Dockerfile for project ${this.projectId}
# Generated by Titan Autonomous System

FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["npm", "start"]`;
  }

  private generateDockerCompose(): string {
    return `version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=project_${this.projectId}
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

volumes:
  postgres_data:`;
  }

  private generateGitHubActions(): string {
    return `name: Deploy Project ${this.projectId}

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build
      run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to production
      run: |
        echo "Deploying project ${this.projectId} to production"
        # Add your deployment commands here`;
  }

  private generateGenericHTML(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project ${this.projectId}</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>Project ${this.projectId}</h1>
            <p>Generated by Titan Autonomous System</p>
        </header>
        
        <main>
            <section class="hero">
                <h2>Welcome to Your Project</h2>
                <p>This project was automatically generated based on your requirements.</p>
                <button id="actionBtn" class="btn">Get Started</button>
            </section>
        </main>
        
        <footer>
            <p>&copy; 2024 Titan Autonomous System</p>
        </footer>
    </div>
    
    <script src="script.js"></script>
</body>
</html>`;
  }

  private generateGenericCSS(): string {
    return `/* Styles for Project ${this.projectId} */
/* Generated by Titan Autonomous System */

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

header {
    text-align: center;
    color: white;
    margin-bottom: 40px;
}

header h1 {
    font-size: 3rem;
    margin-bottom: 10px;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

header p {
    font-size: 1.2rem;
    opacity: 0.9;
}

.hero {
    background: white;
    padding: 40px;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    text-align: center;
    margin-bottom: 40px;
}

.hero h2 {
    font-size: 2.5rem;
    margin-bottom: 20px;
    color: #333;
}

.hero p {
    font-size: 1.1rem;
    margin-bottom: 30px;
    color: #666;
}

.btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 15px 30px;
    font-size: 1.1rem;
    border-radius: 50px;
    cursor: pointer;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
}

footer {
    text-align: center;
    color: white;
    opacity: 0.8;
}

@media (max-width: 768px) {
    .container {
        padding: 10px;
    }
    
    header h1 {
        font-size: 2rem;
    }
    
    .hero {
        padding: 20px;
    }
    
    .hero h2 {
        font-size: 2rem;
    }
}`;
  }

  private generateGenericJS(): string {
    return `// JavaScript for Project ${this.projectId}
// Generated by Titan Autonomous System

document.addEventListener('DOMContentLoaded', function() {
    const actionBtn = document.getElementById('actionBtn');
    
    if (actionBtn) {
        actionBtn.addEventListener('click', function() {
            // Add your interactive functionality here
            alert('Hello from Project ${this.projectId}!\\n\\nThis is a working example generated by Titan Autonomous System.');
            
            // Example: Change button text
            this.textContent = 'Clicked!';
            
            // Example: Add some dynamic content
            const hero = document.querySelector('.hero p');
            if (hero) {
                hero.innerHTML += '<br><br><strong>Button clicked! The system is working.</strong>';
            }
        });
    }
    
    // Add some dynamic behavior
    console.log('Project ${this.projectId} initialized successfully');
    
    // Example: Add a simple animation
    const container = document.querySelector('.container');
    if (container) {
        container.style.opacity = '0';
        container.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            container.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        }, 100);
    }
});`;
  }

  private generateGenericFeature(featureName: string, prompt: string): string {
    return `// ${featureName} - Generated by Titan Autonomous System
// Project: ${this.projectId}

class ${featureName.replace(/\s+/g, '')} {
    constructor() {
        this.name = '${featureName}';
        this.projectId = '${this.projectId}';
        this.initialized = false;
    }
    
    async initialize() {
        try {
            console.log(\`Initializing \${this.name} for project \${this.projectId}\`);
            
            // Add your initialization logic here
            this.initialized = true;
            
            console.log(\`\${this.name} initialized successfully\`);
            return true;
        } catch (error) {
            console.error(\`Failed to initialize \${this.name}:\`, error);
            return false;
        }
    }
    
    async execute() {
        if (!this.initialized) {
            await this.initialize();
        }
        
        try {
            console.log(\`Executing \${this.name}\`);
            
            // Add your execution logic here
            // This is where the main functionality would go
            
            return {
                success: true,
                message: \`\${this.name} executed successfully\`,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(\`Failed to execute \${this.name}:\`, error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
    
    getStatus() {
        return {
            name: this.name,
            projectId: this.projectId,
            initialized: this.initialized,
            timestamp: new Date().toISOString()
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ${featureName.replace(/\s+/g, '')};
}

// Auto-initialize if running in browser
if (typeof window !== 'undefined') {
    window.${featureName.replace(/\s+/g, '')} = ${featureName.replace(/\s+/g, '')};
}`;
  }

  private generateReadme(featureName: string, prompt: string): string {
    return `# Project ${this.projectId}

## Overview
This project was automatically generated by the Titan Autonomous System based on your requirements.

## Feature: ${featureName}
${featureName} has been implemented as part of this project.

## Project Details
- **Project ID**: ${this.projectId}
- **Generated**: ${new Date().toISOString()}
- **System**: Titan Autonomous System

## Original Prompt
\`\`\`
${prompt}
\`\`\`

## Getting Started

### Prerequisites
- Node.js (if applicable)
- npm or yarn (if applicable)

### Installation
\`\`\`bash
# If this is a Node.js project
npm install

# If this is a Python project
pip install -r requirements.txt
\`\`\`

### Running the Project
\`\`\`bash
# For Node.js projects
npm start

# For Python projects
python server.py

# For static HTML projects
# Simply open index.html in your browser
\`\`\`

## Project Structure
\`\`\`
project-${this.projectId}/
├── src/                 # Source code
├── public/              # Static assets
├── package.json         # Dependencies (if applicable)
├── README.md           # This file
└── ...                 # Other generated files
\`\`\`

## Features Implemented
- ${featureName}
- Additional features as specified in the original prompt

## Development
This project was generated automatically. You can modify and extend it as needed.

## Support
For questions about this project, refer to the Titan Autonomous System documentation.

---
*Generated by Titan Autonomous System on ${new Date().toISOString()}*`;
  }
}

interface ExecutionPlan {
  type: string;
  steps: ExecutionStep[];
}

interface ExecutionStep {
  type: 'file' | 'command';
  path?: string;
  content?: string;
  command?: string;
}

// Temporary stub export to satisfy worker import
export const projectExecutor = {
  async executeTask(task: any) {
    console.log('Stub executeTask called for', task);
  },
};
