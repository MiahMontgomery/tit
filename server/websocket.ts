import { WebSocketServer } from 'ws';
import { Server } from 'http';

export interface TaskEvent {
  type: 'task.started' | 'task.completed' | 'task.failed' | 'project.started' | 'project.optimization.started' | 'feature.work.started' | 'feature.work.progress' | 'feature.work.completed' | 'feature.work.error';
  projectId: string;
  taskId?: string;
  taskType?: string;
  featureId?: string;
  featureName?: string;
  progress?: number;
  timestamp: number;
  status?: string;
  error?: string;
}

let wsServer: WebSocketServer;

export function setupWebSocket(httpServer: Server): WebSocketServer {
  wsServer = new WebSocketServer({ server: httpServer });
  
  wsServer.on('connection', (ws, req) => {
    console.log(`WebSocket client connected from ${req.socket.remoteAddress}`);
    
    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'connection.established',
      timestamp: Date.now()
    }));
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('WebSocket message received:', message);
        
        // Handle client messages if needed
        if (message.type === 'ping') {
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
  
  console.log('WebSocket server initialized');
  return wsServer;
}

export function broadcastAgentEvent(event: TaskEvent): void {
  if (!wsServer) {
    console.error('WebSocket server not initialized');
    return;
  }
  
  const connectedClients = wsServer.clients.size;
  if (connectedClients === 0) {
    console.log('No WebSocket clients connected, event not broadcast');
    return;
  }
  
  let broadcastCount = 0;
  wsServer.clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      try {
        client.send(JSON.stringify(event));
        broadcastCount++;
      } catch (error) {
        console.error('Failed to send event to client:', error);
      }
    }
  });
  
  console.log(`Broadcasted ${event.type} event to ${broadcastCount}/${connectedClients} clients`);
}
