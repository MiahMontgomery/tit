import { useEffect, useRef, useState } from 'react';

interface WebSocketEvent {
  type: string;
  projectId?: string;
  featureId?: string;
  featureName?: string;
  progress?: number;
  error?: string;
  timestamp: number;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<WebSocketEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket event received:', data);
        
        setEvents(prev => [...prev, data]);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.CLOSED) {
          console.log('Attempting to reconnect WebSocket...');
          // Trigger reconnection by updating the effect
          setIsConnected(false);
        }
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [isConnected]); // Re-run effect when connection state changes

  const sendMessage = (message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  const getProjectEvents = (projectId: string) => {
    return events.filter(event => event.projectId === projectId);
  };

  const getFeatureEvents = (projectId: string, featureId: string) => {
    return events.filter(event => 
      event.projectId === projectId && event.featureId === featureId
    );
  };

  const clearEvents = () => {
    setEvents([]);
  };

  return {
    isConnected,
    events,
    sendMessage,
    getProjectEvents,
    getFeatureEvents,
    clearEvents
  };
}

