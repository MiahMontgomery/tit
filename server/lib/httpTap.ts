import { storage } from '../storage';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

export interface HttpTapLog {
  timestamp: string;
  url: string;
  model: string;
  reqTokens: number;
  respTokens: number;
  latencyMs: number;
  status: number;
  error?: string;
}

export class HttpTap {
  private logDir: string;

  constructor() {
    this.logDir = path.join(process.cwd(), 'data', 'proofs', 'http');
    this.ensureLogDir();
  }

  private ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private async logCall(log: HttpTapLog) {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logDir, `openrouter-${today}.log`);
    const logLine = JSON.stringify(log) + '\n';
    
    fs.appendFileSync(logFile, logLine);
  }

  private async createProof(log: HttpTapLog) {
    const proofId = randomUUID();
    const logFile = `data/proofs/http/openrouter-${new Date().toISOString().split('T')[0]}.log`;
    
    const proof = {
      id: proofId,
      projectId: 'system',
      type: 'file',
      summary: `OpenRouter API call to ${log.model}`,
      data: {
        path: logFile,
        model: log.model,
        status: log.status,
        latencyMs: log.latencyMs,
        reqTokens: log.reqTokens,
        respTokens: log.respTokens
      },
      createdAt: new Date()
    };

    storage.addProof(proof);
    return proofId;
  }

  async post(url: string, options: any = {}): Promise<Response> {
    const startTime = Date.now();
    const model = this.extractModel(options);
    
    try {
      // Make the actual HTTP request
      const response = await fetch(url, options);
      const endTime = Date.now();
      const latencyMs = endTime - startTime;
      
      // Calculate token counts (rough estimates)
      const reqTokens = this.estimateTokens(options.body || '');
      const respTokens = this.estimateTokens(await response.text());
      
      const log: HttpTapLog = {
        timestamp: new Date().toISOString(),
        url,
        model,
        reqTokens,
        respTokens,
        latencyMs,
        status: response.status
      };

      await this.logCall(log);
      await this.createProof(log);

      return response;
    } catch (error) {
      const endTime = Date.now();
      const latencyMs = endTime - startTime;
      
      const log: HttpTapLog = {
        timestamp: new Date().toISOString(),
        url,
        model,
        reqTokens: this.estimateTokens(options.body || ''),
        respTokens: 0,
        latencyMs,
        status: 0,
        error: error instanceof Error ? error.message : String(error)
      };

      await this.logCall(log);
      await this.createProof(log);

      throw error;
    }
  }

  private extractModel(options: any): string {
    // Try to extract model from headers or body
    if (options.headers?.['x-model']) {
      return options.headers['x-model'];
    }
    
    if (options.body) {
      try {
        const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
        return body.model || 'unknown';
      } catch {
        return 'unknown';
      }
    }
    
    return 'unknown';
  }

  private estimateTokens(text: string): number {
    // Rough token estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  // Mock response for testing when OpenRouter is not available
  async mockPost(url: string, options: any = {}): Promise<Response> {
    const startTime = Date.now();
    const model = this.extractModel(options);
    
    // Simulate latency
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    const endTime = Date.now();
    const latencyMs = endTime - startTime;
    
    const mockResponse = {
      id: randomUUID(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: 'Mock response from httpTap for testing purposes'
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 50,
        completion_tokens: 20,
        total_tokens: 70
      }
    };

    const log: HttpTapLog = {
      timestamp: new Date().toISOString(),
      url,
      model,
      reqTokens: 50,
      respTokens: 20,
      latencyMs,
      status: 200
    };

    await this.logCall(log);
    await this.createProof(log);

    return new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export const httpTap = new HttpTap();