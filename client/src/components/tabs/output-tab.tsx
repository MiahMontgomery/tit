import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { fetchApi } from '@/lib/queryClient';
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Download, 
  Play, 
  Pause, 
  RefreshCw,
  Camera,
  FileText,
  Video,
  Image,
  Code,
  ExternalLink,
  Globe,
  MousePointer,
  Type,
  Scroll,
  Clock,
  Terminal,
  Monitor,
  Power,
  PowerOff,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Bot,
  User,
  Zap,
  AlertCircle,
  CheckCircle2,
  X,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface OutputItem {
  id: string;
  type: 'screenshot' | 'video' | 'file' | 'code' | 'link' | 'content';
  title: string;
  description: string;
  content?: string;
  url?: string;
  thumbnail?: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  createdAt: string;
  metadata?: {
    fileSize?: string;
    duration?: string;
    dimensions?: string;
    language?: string;
  };
}

interface NestedNotification {
  id: string;
  type: 'message' | 'action' | 'proof' | 'error' | 'success';
  author: 'user' | 'agent' | 'system';
  timestamp: string;
  title: string;
  content: string;
  isExpanded: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  proofItems: ProofItem[];
  actions: ActionItem[];
  metadata?: {
    duration?: string;
    fileSize?: string;
    language?: string;
    error?: string;
  };
}

interface ProofItem {
  id: string;
  type: 'screenshot' | 'code' | 'file' | 'video' | 'link';
  title: string;
  content?: string;
  url?: string;
  thumbnail?: string;
  metadata?: any;
}

interface ActionItem {
  id: string;
  type: 'navigate' | 'click' | 'type' | 'scroll' | 'execute' | 'create' | 'update' | 'delete';
  description: string;
  status: 'pending' | 'executing' | 'completed' | 'error';
  timestamp: string;
  result?: any;
  error?: string;
}

interface LiveBrowserSession {
  id: string;
  isActive: boolean;
  startTime: string;
  lastActivity: string;
  actionCount: number;
}

interface BrowserAction {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  status: 'pending' | 'executing' | 'completed' | 'error';
  result?: any;
  error?: string;
  screenshot?: string;
}

interface OutputTabProps {
  projectId: string;
}

export function OutputTab({ projectId }: OutputTabProps) {
  const [notifications, setNotifications] = useState<NestedNotification[]>([]);
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());
  const [liveSession, setLiveSession] = useState<LiveBrowserSession | null>(null);
  const [browserActions, setBrowserActions] = useState<BrowserAction[]>([]);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [selectorInput, setSelectorInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch proofs from orchestrator
  const { data: proofs = [], isLoading } = useQuery({
    queryKey: ['proofs', projectId],
    queryFn: async () => {
      const response = await fetchApi(`/api/projects/${projectId}/proofs`);
      if (!response.ok) throw new Error('Failed to fetch proofs');
      return response.json();
    },
    refetchInterval: 2000, // Real-time updates
  });

  // Convert proofs to notifications with real content
  useEffect(() => {
    const convertProofs = async () => {
      const convertedNotifications: NestedNotification[] = await Promise.all(
        proofs.map(async (proof: any) => {
          let proofContent = proof.content;
          
          // Fetch real content for text-based proofs
          if (proof.type === 'diff' || proof.type === 'log') {
            try {
              const response = await fetchApi(`/api/proofs/${proof.id}/content`);
              if (response.ok) {
                proofContent = await response.text();
              }
            } catch (error) {
              console.warn(`Failed to fetch content for proof ${proof.id}:`, error);
            }
          }

          return {
            id: proof.id,
            type: 'proof',
            author: 'agent',
            timestamp: proof.createdAt,
            title: proof.title || `${proof.type} - ${new Date(proof.createdAt).toLocaleTimeString()}`,
            content: proof.description || proofContent,
            isExpanded: expandedNotifications.has(proof.id),
            status: proof.status || 'completed',
            proofItems: [{
              id: `${proof.id}-proof`,
              type: proof.type || 'proof',
              title: proof.title,
              content: proofContent,
              url: proof.url,
              thumbnail: proof.thumbnail,
              metadata: proof.metadata
            }],
            actions: [],
            metadata: proof.metadata
          };
        })
      );
      setNotifications(convertedNotifications);
    };

    convertProofs();
  }, [proofs, expandedNotifications]);

  // Auto-scroll to bottom when new notifications arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notifications]);

  // Toggle notification expansion
  const toggleNotification = (notificationId: string) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  // Add new notification
  const addNotification = (notification: Omit<NestedNotification, 'id'>) => {
    const newNotification: NestedNotification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setNotifications(prev => [...prev, newNotification]);
  };

  // Approve output item
  const approveMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetchApi(`/api/projects/${projectId}/output/${itemId}/approve`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to approve item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['output-items', projectId] });
    },
  });

  // Reject output item
  const rejectMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetchApi(`/api/projects/${projectId}/output/${itemId}/reject`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to reject item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['output-items', projectId] });
    },
  });

  // Take screenshot
  const takeScreenshotMutation = useMutation({
    mutationFn: async () => {
      const response = await fetchApi(`/api/projects/${projectId}/screenshot`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to take screenshot');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['output-items', projectId] });
    },
  });

  // Live Browser mutations
  const startLiveSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetchApi(`/api/projects/${projectId}/live-browser/start`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to start live session');
      return response.json();
    },
    onSuccess: (data) => {
      setLiveSession({ 
        id: data.sessionId, 
        isActive: true, 
        startTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        actionCount: 0
      });
      setIsLiveMode(true);
      connectWebSocket(data.sessionId);
    },
  });

  const navigateMutation = useMutation({
    mutationFn: async (url: string) => {
      if (!liveSession) throw new Error('No live session');
      const response = await fetchApi(`/api/projects/${projectId}/live-browser/${liveSession.id}/navigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) throw new Error('Failed to navigate');
      return response.json();
    },
  });

  const clickMutation = useMutation({
    mutationFn: async (selector: string) => {
      if (!liveSession) throw new Error('No live session');
      const response = await fetchApi(`/api/projects/${projectId}/live-browser/${liveSession.id}/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selector }),
      });
      if (!response.ok) throw new Error('Failed to click');
      return response.json();
    },
  });

  const typeMutation = useMutation({
    mutationFn: async ({ selector, text }: { selector: string; text: string }) => {
      if (!liveSession) throw new Error('No live session');
      const response = await fetchApi(`/api/projects/${projectId}/live-browser/${liveSession.id}/type`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selector, text }),
      });
      if (!response.ok) throw new Error('Failed to type');
      return response.json();
    },
  });

  const scrollMutation = useMutation({
    mutationFn: async (distance: number) => {
      if (!liveSession) throw new Error('No live session');
      const response = await fetchApi(`/api/projects/${projectId}/live-browser/${liveSession.id}/scroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distance }),
      });
      if (!response.ok) throw new Error('Failed to scroll');
      return response.json();
    },
  });

  const closeSessionMutation = useMutation({
    mutationFn: async () => {
      if (!liveSession) throw new Error('No live session');
      const response = await fetchApi(`/api/projects/${projectId}/live-browser/${liveSession.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to close session');
      return response.json();
    },
    onSuccess: () => {
      setLiveSession(null);
      setIsLiveMode(false);
      setBrowserActions([]);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    },
  });

  // WebSocket connection for live browser updates
  const connectWebSocket = (sessionId: string) => {
    const ws = new WebSocket(`ws://localhost:5000/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('🔌 Connected to live browser WebSocket');
      // Join the session
      ws.send(JSON.stringify({
        type: 'join_session',
        sessionId
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'action_started':
            setBrowserActions(prev => [...prev, message.data]);
            break;
          case 'action_completed':
            setBrowserActions(prev => 
              prev.map(action => 
                action.id === message.data.id ? message.data : action
              )
            );
            // Refresh output items to show new screenshots
            queryClient.invalidateQueries({ queryKey: ['output-items', projectId] });
            break;
          case 'action_error':
            setBrowserActions(prev => 
              prev.map(action => 
                action.id === message.data.id ? message.data : action
              )
            );
            break;
          case 'session_state':
            setLiveSession(prev => prev ? {
              ...prev,
              isActive: message.data.isActive
            } : null);
            setBrowserActions(message.data.actions || []);
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('🔌 Disconnected from live browser WebSocket');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <Eye className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'screenshot': return <Camera className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'file': return <FileText className="h-4 w-4" />;
      case 'code': return <Code className="h-4 w-4" />;
      case 'link': return <ExternalLink className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getAuthorIcon = (author: string) => {
    switch (author) {
      case 'user': return <User className="h-4 w-4 text-blue-500" />;
      case 'agent': return <Bot className="h-4 w-4 text-green-500" />;
      case 'system': return <Zap className="h-4 w-4 text-purple-500" />;
      default: return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationTypeIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare className="h-4 w-4" />;
      case 'action': return <Zap className="h-4 w-4" />;
      case 'proof': return <Eye className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getProofTypeIcon = (type: string) => {
    switch (type) {
      case 'screenshot': return <Camera className="h-4 w-4" />;
      case 'code': return <Code className="h-4 w-4" />;
      case 'file': return <FileText className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'link': return <ExternalLink className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const renderProofItem = (proofItem: ProofItem) => {
    return (
      <div key={proofItem.id} className="rounded-lg p-3 border" style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mb-2">
          {getProofTypeIcon(proofItem.type)}
          <span className="text-sm font-medium text-gray-700">{proofItem.title}</span>
        </div>
        
        {proofItem.type === 'screenshot' && proofItem.url && (
          <div className="rounded-lg overflow-hidden border" style={{ backgroundColor: 'var(--card)' }}>
            <img 
              src={proofItem.url} 
              alt={proofItem.title}
              className="w-full h-auto max-h-64 object-contain"
            />
          </div>
        )}
        
        {proofItem.type === 'code' && proofItem.content && (
          <div className="bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto">
            <pre className="text-sm">{proofItem.content}</pre>
          </div>
        )}
        
        {proofItem.type === 'file' && proofItem.content && (
          <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--card)' }}>
            <pre className="text-sm text-gray-800 whitespace-pre-wrap">{proofItem.content}</pre>
          </div>
        )}
        
        {proofItem.type === 'link' && proofItem.url && (
          <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--card)' }}>
            <a 
              href={proofItem.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {proofItem.url}
            </a>
          </div>
        )}
        
        {proofItem.metadata && (
          <div className="text-xs text-gray-500 mt-2 space-y-1">
            {proofItem.metadata.fileSize && <div>Size: {proofItem.metadata.fileSize}</div>}
            {proofItem.metadata.dimensions && <div>Dimensions: {proofItem.metadata.dimensions}</div>}
            {proofItem.metadata.language && <div>Language: {proofItem.metadata.language}</div>}
          </div>
        )}
      </div>
    );
  };

  const renderNotification = (notification: NestedNotification) => {
    const isExpanded = expandedNotifications.has(notification.id);
    
    return (
      <div key={notification.id} className="mb-4">
        <div 
          className="rounded-lg border transition-all duration-200"
          style={{
            borderColor: notification.status === 'approved' ? '#22c55e' :
                        notification.status === 'rejected' ? '#ef4444' :
                        notification.status === 'processing' ? '#3b82f6' :
                        '#eab308',
            backgroundColor: notification.status === 'approved' ? '#0f1f0f' :
                            notification.status === 'rejected' ? '#1f0f0f' :
                            notification.status === 'processing' ? '#0f0f1f' :
                            '#1f1f0f'
          }}
        >
          {/* Notification Header */}
          <div 
            className="p-4 cursor-pointer"
            onClick={() => toggleNotification(notification.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getAuthorIcon(notification.author)}
                <div className="flex items-center gap-2">
                  {getNotificationTypeIcon(notification.type)}
                  <span className="font-medium" style={{ color: '#e0e0e0' }}>{notification.title}</span>
                </div>
                <Badge className="text-xs" style={{
                  backgroundColor: notification.status === 'approved' ? '#22c55e' :
                                  notification.status === 'rejected' ? '#ef4444' :
                                  notification.status === 'processing' ? '#3b82f6' :
                                  '#eab308',
                  color: '#000000'
                }}>
                  {notification.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: '#888888' }}>
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" style={{ color: '#40e0d0' }} />
                ) : (
                  <ChevronRight className="h-4 w-4" style={{ color: '#40e0d0' }} />
                )}
              </div>
            </div>
            
            <p className="text-sm mt-2 line-clamp-2" style={{ color: '#888888' }}>
              {notification.content}
            </p>
            
            {/* Quick preview of proof items */}
            {!isExpanded && notification.proofItems.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500">Proof:</span>
                {notification.proofItems.slice(0, 3).map((item, index) => (
                  <div key={item.id} className="flex items-center gap-1">
                    {getProofTypeIcon(item.type)}
                    <span className="text-xs text-gray-600">{item.title}</span>
                    {index < Math.min(notification.proofItems.length, 3) - 1 && (
                      <span className="text-gray-400">•</span>
                    )}
                  </div>
                ))}
                {notification.proofItems.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{notification.proofItems.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Expanded Content */}
          {isExpanded && (
            <div className="border-t border-gray-200 p-4 space-y-4">
              {/* Proof Items */}
              {notification.proofItems.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Proof of Work
                  </h4>
                  <div className="space-y-3">
                    {notification.proofItems.map(renderProofItem)}
                  </div>
                </div>
              )}
              
              {/* Actions */}
              {notification.actions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Actions Taken
                  </h4>
                  <div className="space-y-2">
                    {notification.actions.map((action) => (
                      <div key={action.id} className="flex items-center gap-3 p-2 rounded" style={{ backgroundColor: 'var(--muted)' }}>
                        <div className={`w-2 h-2 rounded-full ${
                          action.status === 'completed' ? 'bg-green-500' :
                          action.status === 'error' ? 'bg-red-500' :
                          action.status === 'executing' ? 'bg-blue-500 animate-pulse' :
                          'bg-gray-400'
                        }`} />
                        <span className="text-sm text-gray-700 flex-1">{action.description}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(action.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              {notification.status === 'pending' && (
                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate(notification.id)}
                    disabled={approveMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => rejectMutation.mutate(notification.id)}
                    disabled={rejectMutation.isPending}
                    className="flex-1"
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" style={{ backgroundColor: '#050505' }}>
        <RefreshCw className="h-8 w-8 animate-spin" style={{ color: '#40e0d0' }} />
        <span className="ml-2" style={{ color: '#888888' }}>Loading proofs...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#050505' }}>
      {/* Header with Actions */}
      <div className="flex items-center justify-between p-4 border-b" style={{ backgroundColor: '#0f0f0f', borderColor: '#333333' }}>
        <div>
          <h2 className="text-xl font-bold" style={{ color: '#e0e0e0' }}>Agent Output</h2>
          <p className="text-sm" style={{ color: '#888888' }}>Live proof of work and agent actions</p>
        </div>
        <div className="flex gap-2">
          {!isLiveMode ? (
            <Button
              onClick={() => startLiveSessionMutation.mutate()}
              disabled={startLiveSessionMutation.isPending}
              variant="outline"
              size="sm"
            >
              <Monitor className="h-4 w-4 mr-2" />
              Start Live Browser
            </Button>
          ) : (
            <Button
              onClick={() => closeSessionMutation.mutate()}
              disabled={closeSessionMutation.isPending}
              variant="destructive"
              size="sm"
            >
              <PowerOff className="h-4 w-4 mr-2" />
              Stop Live Browser
            </Button>
          )}
          <Button
            onClick={() => takeScreenshotMutation.mutate()}
            disabled={takeScreenshotMutation.isPending}
            variant="outline"
            size="sm"
          >
            <Camera className="h-4 w-4 mr-2" />
            Take Screenshot
          </Button>
        </div>
      </div>

      {/* Live Browser Controls */}
      {isLiveMode && liveSession && (
        <div className="p-4 border-b border-gray-200 bg-green-50">
          <div className="flex items-center gap-2 mb-3">
            <Monitor className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">Live Browser Active</span>
            <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
              {liveSession.id.slice(-8)}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="flex gap-1">
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com"
                className="text-xs"
                size={1}
              />
              <Button
                onClick={() => {
                  if (urlInput) {
                    navigateMutation.mutate(urlInput);
                    setUrlInput('');
                  }
                }}
                disabled={navigateMutation.isPending || !urlInput}
                size="sm"
                className="text-xs"
              >
                <Globe className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="flex gap-1">
              <Input
                value={selectorInput}
                onChange={(e) => setSelectorInput(e.target.value)}
                placeholder="button, #id, .class"
                className="text-xs"
                size={1}
              />
              <Button
                onClick={() => {
                  if (selectorInput) {
                    clickMutation.mutate(selectorInput);
                    setSelectorInput('');
                  }
                }}
                disabled={clickMutation.isPending || !selectorInput}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                <MousePointer className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="flex gap-1">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Text to type"
                className="text-xs"
                size={1}
              />
              <Button
                onClick={() => {
                  if (textInput && selectorInput) {
                    typeMutation.mutate({ selector: selectorInput, text: textInput });
                    setTextInput('');
                    setSelectorInput('');
                  }
                }}
                disabled={typeMutation.isPending || !textInput || !selectorInput}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                <Type className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Feed */}
      <ScrollArea className="flex-1 p-4" style={{ backgroundColor: '#050505' }}>
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 mx-auto mb-4" style={{ color: '#888888' }} />
              <h3 className="text-lg font-medium mb-2" style={{ color: '#e0e0e0' }}>No Agent Activity Yet</h3>
              <p className="mb-4" style={{ color: '#888888' }}>
                The AI agent will show proof of work and request approval here.
              </p>
            </div>
          ) : (
            notifications.map(renderNotification)
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
    </div>
  );
}