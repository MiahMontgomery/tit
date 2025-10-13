import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { logger } from "../core/tools/logger.js";

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

let broadcaster: { broadcast: (msg: any) => void } | null = null;

export function startWs(server: any) {
  const wss = new WebSocketServer({ server });
  
  broadcaster = {
    broadcast: (msg: any) => {
      const s = JSON.stringify(msg);
      wss.clients.forEach(c => { 
        try { 
          c.send(s); 
        } catch (e) {
          // Ignore send errors
        }
      });
    }
  };

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    logger.systemInfo("WebSocket client connected");

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        logger.systemInfo("WebSocket message received", { messageType: message.type });
      } catch (error) {
        logger.systemError("Failed to parse WebSocket message", { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    ws.on('close', () => {
      logger.systemInfo("WebSocket client disconnected");
    });

    ws.on('error', (error) => {
      logger.systemError("WebSocket client error", { 
        error: error.message 
      });
    });

    // Send welcome message
    try {
      ws.send(JSON.stringify({
        type: 'connected',
        data: { timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString()
      }));
    } catch (e) {
      // Ignore send errors
    }
  });

  logger.systemInfo("WebSocket server initialized");
  return broadcaster;
}

export function getBroadcaster() {
  if (!broadcaster) return { broadcast: (_: any) => {} }; // no-op until start
  return broadcaster;
}

export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocket> = new Map();

  initialize(server: any): void {
    this.wss = new WebSocketServer({ server });
    
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, ws);
      
      logger.systemInfo("WebSocket client connected", { clientId });

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          logger.systemError("Failed to parse WebSocket message", { 
            clientId, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        logger.systemInfo("WebSocket client disconnected", { clientId });
      });

      ws.on('error', (error) => {
        logger.systemError("WebSocket client error", { 
          clientId, 
          error: error.message 
        });
        this.clients.delete(clientId);
      });

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connected',
        data: { clientId },
        timestamp: new Date().toISOString()
      });
    });

    logger.systemInfo("WebSocket server initialized");
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleMessage(clientId: string, message: any): void {
    logger.systemInfo("WebSocket message received", { clientId, messageType: message.type });
    
    // Handle different message types
    switch (message.type) {
      case 'ping':
        this.sendToClient(clientId, {
          type: 'pong',
          data: { timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString()
        });
        break;
      
      case 'subscribe':
        // Handle subscription to specific project updates
        if (message.data?.projectId) {
          this.sendToClient(clientId, {
            type: 'subscribed',
            data: { projectId: message.data.projectId },
            timestamp: new Date().toISOString()
          });
        }
        break;
      
      default:
        logger.systemInfo("Unknown WebSocket message type", { clientId, type: message.type });
    }
  }

  private sendToClient(clientId: string, message: WebSocketMessage): boolean {
    const client = this.clients.get(clientId);
    if (!client || client.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      client.send(JSON.stringify(message));
      return true;
    } catch (error) {
      logger.systemError("Failed to send WebSocket message", { 
        clientId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  // Broadcast to all connected clients
  broadcast(message: WebSocketMessage): number {
    let sentCount = 0;
    
    for (const [clientId, client] of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        if (this.sendToClient(clientId, message)) {
          sentCount++;
        }
      }
    }

    logger.systemInfo("WebSocket broadcast sent", { 
      messageType: message.type, 
      sentCount, 
      totalClients: this.clients.size 
    });

    return sentCount;
  }

  // Broadcast to clients subscribed to a specific project
  broadcastToProject(projectId: string, message: WebSocketMessage): number {
    let sentCount = 0;
    
    for (const [clientId, client] of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        // For now, broadcast to all clients
        // In a real implementation, you'd track subscriptions
        if (this.sendToClient(clientId, {
          ...message,
          data: { ...message.data, projectId }
        })) {
          sentCount++;
        }
      }
    }

    logger.projectInfo(projectId, "WebSocket project broadcast sent", { 
      messageType: message.type, 
      sentCount 
    });

    return sentCount;
  }

  // Get connected clients count
  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  // Get all client IDs
  getClientIds(): string[] {
    return Array.from(this.clients.keys());
  }

  // Close all connections
  close(): void {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    this.clients.clear();
    logger.systemInfo("WebSocket server closed");
  }
}

export const wsManager = new WebSocketManager();
