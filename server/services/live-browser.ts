import { chromium, Browser, Page } from 'playwright';
import { WebSocket } from 'ws';
import { storage } from '../storage';

export interface LiveBrowserSession {
  id: string;
  projectId: string;
  browser: Browser;
  page: Page;
  isActive: boolean;
  startTime: Date;
  lastActivity: Date;
  actions: BrowserAction[];
  websocketClients: Set<WebSocket>;
}

export interface BrowserAction {
  id: string;
  type: 'navigate' | 'click' | 'type' | 'screenshot' | 'scroll' | 'wait' | 'evaluate';
  description: string;
  timestamp: Date;
  status: 'pending' | 'executing' | 'completed' | 'error';
  result?: any;
  error?: string;
  screenshot?: string;
}

export class LiveBrowserManager {
  private sessions: Map<string, LiveBrowserSession> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up inactive sessions every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000);
  }

  public async createSession(projectId: string): Promise<LiveBrowserSession> {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🌐 Creating live browser session: ${sessionId} for project: ${projectId}`);
    
    // Launch browser with visible UI (for development) or headless (for production)
    const browser = await chromium.launch({
      headless: false, // Set to true for production
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      slowMo: 1000 // Slow down actions so you can see them
    });

    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewportSize({ width: 1280, height: 720 });

    const session: LiveBrowserSession = {
      id: sessionId,
      projectId,
      browser,
      page,
      isActive: true,
      startTime: new Date(),
      lastActivity: new Date(),
      actions: [],
      websocketClients: new Set()
    };

    this.sessions.set(sessionId, session);

    // Create initial log entry
    await storage.createLog(projectId, 'Live Browser Session Started', 
      `Live browser session ${sessionId} created for real-time automation`);

    return session;
  }

  public async addWebSocketClient(sessionId: string, ws: WebSocket) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.websocketClients.add(ws);
      console.log(`📡 WebSocket client connected to session: ${sessionId}`);
      
      // Send current session state to new client
      this.broadcastToSession(sessionId, {
        type: 'session_state',
        data: {
          sessionId,
          isActive: session.isActive,
          actions: session.actions,
          currentUrl: await session.page.url()
        }
      });
    }
  }

  public removeWebSocketClient(sessionId: string, ws: WebSocket) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.websocketClients.delete(ws);
      console.log(`📡 WebSocket client disconnected from session: ${sessionId}`);
    }
  }

  public async executeAction(sessionId: string, action: Omit<BrowserAction, 'id' | 'timestamp' | 'status'>): Promise<BrowserAction> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const browserAction: BrowserAction = {
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...action,
      timestamp: new Date(),
      status: 'pending'
    };

    session.actions.push(browserAction);
    session.lastActivity = new Date();

    // Broadcast action start
    this.broadcastToSession(sessionId, {
      type: 'action_started',
      data: browserAction
    });

    try {
      browserAction.status = 'executing';
      
      // Execute the action
      const result = await this.performAction(session.page, browserAction);
      browserAction.result = result;
      browserAction.status = 'completed';

      // Take screenshot after action
      browserAction.screenshot = await session.page.screenshot({ 
        type: 'png',
        fullPage: false // Just viewport for faster updates
      });

      // Create output item for the action
      await storage.createOutputItem({
        projectId: session.projectId,
        type: 'screenshot',
        title: `Live Action: ${browserAction.description}`,
        description: `Browser action executed: ${browserAction.type}`,
        url: `data:image/png;base64,${browserAction.screenshot.toString('base64')}`,
        metadata: {
          actionType: browserAction.type,
          sessionId,
          actionId: browserAction.id,
          timestamp: browserAction.timestamp.toISOString()
        }
      });

      // Broadcast action completion
      this.broadcastToSession(sessionId, {
        type: 'action_completed',
        data: browserAction
      });

      console.log(`✅ Browser action completed: ${browserAction.description}`);

    } catch (error) {
      browserAction.status = 'error';
      browserAction.error = error.message;
      
      // Broadcast action error
      this.broadcastToSession(sessionId, {
        type: 'action_error',
        data: browserAction
      });

      console.error(`❌ Browser action failed: ${browserAction.description}`, error);
    }

    return browserAction;
  }

  private async performAction(page: Page, action: BrowserAction): Promise<any> {
    switch (action.type) {
      case 'navigate':
        await page.goto(action.result.url);
        return { url: page.url() };

      case 'click':
        await page.click(action.result.selector);
        return { clicked: action.result.selector };

      case 'type':
        await page.fill(action.result.selector, action.result.text);
        return { typed: action.result.text, selector: action.result.selector };

      case 'scroll':
        await page.evaluate(() => window.scrollBy(0, action.result.distance));
        return { scrolled: action.result.distance };

      case 'wait':
        await page.waitForTimeout(action.result.duration);
        return { waited: action.result.duration };

      case 'evaluate':
        const result = await page.evaluate(action.result.code);
        return { evaluated: result };

      case 'screenshot':
        const screenshot = await page.screenshot({ fullPage: true });
        return { screenshot: screenshot.toString('base64') };

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  public async navigateToUrl(sessionId: string, url: string): Promise<BrowserAction> {
    return this.executeAction(sessionId, {
      type: 'navigate',
      description: `Navigate to ${url}`,
      result: { url }
    });
  }

  public async clickElement(sessionId: string, selector: string): Promise<BrowserAction> {
    return this.executeAction(sessionId, {
      type: 'click',
      description: `Click element: ${selector}`,
      result: { selector }
    });
  }

  public async typeText(sessionId: string, selector: string, text: string): Promise<BrowserAction> {
    return this.executeAction(sessionId, {
      type: 'type',
      description: `Type "${text}" into ${selector}`,
      result: { selector, text }
    });
  }

  public async scrollPage(sessionId: string, distance: number): Promise<BrowserAction> {
    return this.executeAction(sessionId, {
      type: 'scroll',
      description: `Scroll ${distance}px`,
      result: { distance }
    });
  }

  public async waitForDuration(sessionId: string, duration: number): Promise<BrowserAction> {
    return this.executeAction(sessionId, {
      type: 'wait',
      description: `Wait ${duration}ms`,
      result: { duration }
    });
  }

  public async evaluateCode(sessionId: string, code: string): Promise<BrowserAction> {
    return this.executeAction(sessionId, {
      type: 'evaluate',
      description: `Execute: ${code}`,
      result: { code }
    });
  }

  public async takeScreenshot(sessionId: string): Promise<BrowserAction> {
    return this.executeAction(sessionId, {
      type: 'screenshot',
      description: 'Take screenshot',
      result: {}
    });
  }

  private broadcastToSession(sessionId: string, message: any) {
    const session = this.sessions.get(sessionId);
    if (session) {
      const messageStr = JSON.stringify(message);
      session.websocketClients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
        }
      });
    }
  }

  public getSession(sessionId: string): LiveBrowserSession | undefined {
    return this.sessions.get(sessionId);
  }

  public getSessionsForProject(projectId: string): LiveBrowserSession[] {
    return Array.from(this.sessions.values())
      .filter(session => session.projectId === projectId);
  }

  public async closeSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      console.log(`🔒 Closing live browser session: ${sessionId}`);
      
      session.isActive = false;
      
      // Close browser
      await session.browser.close();
      
      // Remove from sessions
      this.sessions.delete(sessionId);
      
      // Create log entry
      await storage.createLog(session.projectId, 'Live Browser Session Ended', 
        `Live browser session ${sessionId} closed`);
    }
  }

  private async cleanupInactiveSessions() {
    const now = new Date();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

    for (const [sessionId, session] of this.sessions.entries()) {
      const timeSinceActivity = now.getTime() - session.lastActivity.getTime();
      
      if (timeSinceActivity > inactiveThreshold) {
        console.log(`🧹 Cleaning up inactive session: ${sessionId}`);
        await this.closeSession(sessionId);
      }
    }
  }

  public async shutdown() {
    console.log('🛑 Shutting down Live Browser Manager...');
    
    // Close all sessions
    for (const sessionId of this.sessions.keys()) {
      await this.closeSession(sessionId);
    }
    
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Export singleton instance
export const liveBrowserManager = new LiveBrowserManager();

