import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ElevenLabsWidget } from '@/components/ElevenLabsWidget';
import NestedMemory from '@/components/NestedMemory';
import Top3 from '@/components/Top3';
import { 
  Send, 
  Camera, 
  Code, 
  FileText, 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronDown, 
  ChevronRight,
  Bot,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Eye
} from 'lucide-react';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  type: 'text' | 'action' | 'screenshot' | 'code' | 'file' | 'execution';
  metadata?: {
    action?: string;
    status?: 'success' | 'error' | 'pending';
    duration?: number;
    filePath?: string;
    codeBlock?: string;
    screenshotUrl?: string;
    rollbackId?: string;
  };
  nested?: {
    type: 'screenshot' | 'code' | 'file' | 'execution';
    content: any;
    isExpanded: boolean;
  };
}

interface LiveAction {
  id: string;
  action: string;
  status: 'running' | 'completed' | 'error';
  progress?: number;
  timestamp: string;
}

interface InputTabProps {
  projectId: string;
  pat?: string;
}

export function InputTab({ projectId, pat }: InputTabProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [liveActions, setLiveActions] = useState<LiveAction[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch messages for the project
  const { data: projectMessages = [], isLoading: messagesLoading, error: messagesError } = useQuery({
    queryKey: ['messages', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/messages?limit=50`);
      if (!response.ok) {
        if (response.status === 404) {
          return []; // Return empty array for missing project
        }
        throw new Error('Failed to fetch messages');
      }
      return response.json();
    },
    refetchInterval: 2000, // Real-time updates
    retry: false, // Don't retry on 404
  });

  // Fetch memories for the project
  const { data: projectMemories = [], isLoading: memoriesLoading, error: memoriesError } = useQuery({
    queryKey: ['memories', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/memory?limit=20`);
      if (!response.ok) {
        if (response.status === 404) {
          return []; // Return empty array for missing project
        }
        throw new Error('Failed to fetch memories');
      }
      return response.json();
    },
    refetchInterval: 5000, // Less frequent updates
    retry: false, // Don't retry on 404
  });

  // Send task mutation
  const sendTaskMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error('Failed to create task');
      return response.json();
    },
    onSuccess: (task) => {
      // Add task to chat
      const taskMessage: ChatMessage = {
        id: task.id,
        content: `Task: ${task.content}`,
        sender: 'user',
        timestamp: task.createdAt,
        type: 'action',
        metadata: {
          action: 'task_created',
          status: 'pending'
        }
      };
      setMessages(prev => [...prev, taskMessage]);
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      setMessage('');
    },
  });

  // Take screenshot mutation
  const takeScreenshotMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/screenshot`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to take screenshot');
      return response.json();
    },
    onSuccess: (data) => {
      // Add screenshot message to chat
      const screenshotMessage: ChatMessage = {
        id: `screenshot-${Date.now()}`,
        content: "I've taken a screenshot to show you what I'm seeing.",
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        type: 'screenshot',
        nested: {
          type: 'screenshot',
          content: data,
          isExpanded: false
        }
      };
      setMessages(prev => [...prev, screenshotMessage]);
    },
  });

  // Rollback mutation
  const rollbackMutation = useMutation({
    mutationFn: async (rollbackId: string) => {
      const response = await fetch(`/api/projects/${projectId}/rollback/${rollbackId}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to rollback');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', projectId] });
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch live actions from orchestrator
  const { data: liveActionsData = [] } = useQuery({
    queryKey: ['live-actions', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/live-actions`);
      if (!response.ok) throw new Error('Failed to fetch live actions');
      return response.json();
    },
    refetchInterval: 2000, // Real-time updates
  });

  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/tasks`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    },
    refetchInterval: 2000,
  });

  // Fetch runs
  const { data: runs = [] } = useQuery({
    queryKey: ['runs', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/runs`);
      if (!response.ok) throw new Error('Failed to fetch runs');
      return response.json();
    },
    refetchInterval: 2000,
  });


  const { data: memories = [] } = useQuery({
    queryKey: ['memories', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/memory`);
      if (!response.ok) throw new Error('Failed to fetch memories');
      return response.json();
    },
    refetchInterval: 2000,
  });

  useEffect(() => {
    setLiveActions(liveActionsData);
  }, [liveActionsData]);

  const handleSendMessage = () => {
    if (message.trim()) {
      sendTaskMutation.mutate(message);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getActionStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-800 text-gray-200 border-gray-600';
    }
  };

  // Convert messages to nested memory format for structured display
  const convertToNestedMemory = (messages: any[]): any[] => {
    return messages
      .filter(msg => msg.sender === 'assistant' && msg.nested)
      .map(msg => ({
        id: msg.id,
        type: msg.nested.type,
        title: msg.nested.title || `${msg.nested.type} - ${new Date(msg.timestamp).toLocaleTimeString()}`,
        content: msg.content,
        timestamp: msg.timestamp,
        data: msg.nested.content,
        nested: msg.nested.nested || []
      }));
  };

  const renderNestedContent = (nested: ChatMessage['nested']) => {
    if (!nested) return null;

    const isExpanded = expandedMessages.has(nested.content.id || '');

  return (
      <div className="mt-3 border rounded-lg" style={{ 
        backgroundColor: '#0f0f0f', 
        borderColor: '#333333' 
      }}>
        <div 
          className="flex items-center justify-between p-3 cursor-pointer"
          onClick={() => toggleMessageExpansion(nested.content.id || '')}
          style={{ backgroundColor: '#0a0a0a' }}
        >
        <div className="flex items-center gap-2">
            {nested.type === 'screenshot' && <Camera className="h-4 w-4" style={{ color: '#40e0d0' }} />}
            {nested.type === 'code' && <Code className="h-4 w-4" style={{ color: '#40e0d0' }} />}
            {nested.type === 'file' && <FileText className="h-4 w-4" style={{ color: '#40e0d0' }} />}
            {nested.type === 'execution' && <Play className="h-4 w-4" style={{ color: '#40e0d0' }} />}
            <span className="text-sm font-medium" style={{ color: '#e0e0e0' }}>
              {nested.type === 'screenshot' && 'Screenshot'}
              {nested.type === 'code' && 'Code Changes'}
              {nested.type === 'file' && 'File Content'}
              {nested.type === 'execution' && 'Execution Result'}
            </span>
          </div>
          {isExpanded ? <ChevronDown className="h-4 w-4" style={{ color: '#40e0d0' }} /> : <ChevronRight className="h-4 w-4" style={{ color: '#40e0d0' }} />}
        </div>
        
        {isExpanded && (
          <div className="p-3 border-t" style={{ 
            borderColor: '#333333',
            backgroundColor: '#050505'
          }}>
            {nested.type === 'screenshot' && (
              <img 
                src={nested.content.url} 
                alt="Screenshot" 
                className="w-full rounded border"
                style={{ borderColor: '#333333' }}
              />
            )}
            {nested.type === 'code' && (
              <pre className="p-3 rounded text-sm overflow-x-auto" style={{ 
                backgroundColor: '#000000',
                color: '#40e0d0',
                border: '1px solid #333333'
              }}>
                <code>{nested.content.codeBlock}</code>
              </pre>
            )}
            {nested.type === 'file' && (
              <div className="p-3 rounded text-sm" style={{ 
                backgroundColor: '#0f0f0f',
                border: '1px solid #333333'
              }}>
                <div className="font-medium mb-2" style={{ color: '#e0e0e0' }}>{nested.content.filePath}</div>
                <pre className="whitespace-pre-wrap" style={{ color: '#888888' }}>{nested.content.content}</pre>
              </div>
            )}
            {nested.type === 'execution' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(nested.content.status)}
                  <span className="text-sm" style={{ color: '#e0e0e0' }}>{nested.content.action}</span>
                </div>
                {nested.content.duration && (
                  <div className="text-xs" style={{ color: '#888888' }}>
                    Duration: {nested.content.duration}ms
                  </div>
                )}
                {nested.content.rollbackId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rollbackMutation.mutate(nested.content.rollbackId)}
                    disabled={rollbackMutation.isPending}
                    style={{ 
                      borderColor: '#40e0d0',
                      color: '#40e0d0',
                      backgroundColor: 'transparent'
                    }}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Rollback
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Enhanced nested notification system for Replit-style proof of work
  const renderReplitStyleNotification = (message: any) => {
    if (!message.nested) return null;

    const isExpanded = expandedMessages.has(message.id);
    
    return (
      <div className="mt-3 border rounded-lg" style={{ 
        backgroundColor: '#0f0f0f', 
        borderColor: '#333333' 
      }}>
        {/* Notification Header */}
        <div 
          className="flex items-center justify-between p-3 cursor-pointer border-b"
          onClick={() => toggleMessageExpansion(message.id)}
          style={{ 
            backgroundColor: '#0a0a0a',
            borderColor: '#333333'
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#40e0d0' }}>
              <Bot className="h-4 w-4" style={{ color: '#000000' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: '#e0e0e0' }}>Jason</span>
                <Badge className="text-xs" style={{ 
                  backgroundColor: '#333333',
                  color: '#40e0d0',
                  border: '1px solid #40e0d0'
                }}>
                  {message.nested.type}
                </Badge>
              </div>
              <p className="text-xs" style={{ color: '#888888' }}>
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: '#888888' }}>Proof of Work</span>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" style={{ color: '#40e0d0' }} />
            ) : (
              <ChevronRight className="h-4 w-4" style={{ color: '#40e0d0' }} />
            )}
          </div>
        </div>
        
        {/* Expanded Content */}
        {isExpanded && (
          <div className="p-4 space-y-4" style={{ backgroundColor: '#050505' }}>
            {/* Proof Items */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: '#e0e0e0' }}>
                <Eye className="h-4 w-4" style={{ color: '#40e0d0' }} />
                Proof of Work
              </h4>
              <div className="space-y-3">
                {message.nested.type === 'screenshot' && (
                  <div className="rounded-lg p-3 border" style={{ 
                    backgroundColor: '#0f0f0f',
                    borderColor: '#333333'
                  }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Camera className="h-4 w-4" style={{ color: '#40e0d0' }} />
                      <span className="text-sm font-medium" style={{ color: '#e0e0e0' }}>Screenshot</span>
                    </div>
                    <img 
                      src={message.nested.content.url} 
                      alt="Screenshot" 
                      className="w-full rounded border"
                      style={{ borderColor: '#333333' }}
                    />
                  </div>
                )}
                
                {message.nested.type === 'code' && (
                  <div className="rounded-lg p-3 border" style={{ 
                    backgroundColor: '#0f0f0f',
                    borderColor: '#333333'
                  }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Code className="h-4 w-4" style={{ color: '#40e0d0' }} />
                      <span className="text-sm font-medium" style={{ color: '#e0e0e0' }}>Code Changes</span>
                    </div>
                    <pre className="p-3 rounded text-sm overflow-x-auto" style={{ 
                      backgroundColor: '#000000',
                      color: '#40e0d0',
                      border: '1px solid #333333'
                    }}>
                      <code>{message.nested.content.codeBlock}</code>
                    </pre>
                  </div>
                )}
                
                {message.nested.type === 'file' && (
                  <div className="rounded-lg p-3 border" style={{ 
                    backgroundColor: '#0f0f0f',
                    borderColor: '#333333'
                  }}>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4" style={{ color: '#40e0d0' }} />
                      <span className="text-sm font-medium" style={{ color: '#e0e0e0' }}>File Content</span>
                    </div>
                    <div className="p-3 rounded border" style={{ 
                      backgroundColor: '#050505',
                      borderColor: '#333333'
                    }}>
                      <div className="font-medium mb-2 text-sm" style={{ color: '#e0e0e0' }}>{message.nested.content.filePath}</div>
                      <pre className="text-xs whitespace-pre-wrap" style={{ color: '#888888' }}>{message.nested.content.content}</pre>
                    </div>
                  </div>
                )}
                
                {message.nested.type === 'execution' && (
                  <div className="rounded-lg p-3 border" style={{ 
                    backgroundColor: '#0f0f0f',
                    borderColor: '#333333'
                  }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Play className="h-4 w-4" style={{ color: '#40e0d0' }} />
                      <span className="text-sm font-medium" style={{ color: '#e0e0e0' }}>Execution Result</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(message.nested.content.status)}
                        <span className="text-sm" style={{ color: '#e0e0e0' }}>{message.nested.content.action}</span>
                      </div>
                      {message.nested.content.duration && (
                        <div className="text-xs" style={{ color: '#888888' }}>
                          Duration: {message.nested.content.duration}ms
                        </div>
                      )}
                      {message.nested.content.rollbackId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rollbackMutation.mutate(message.nested.content.rollbackId)}
                          disabled={rollbackMutation.isPending}
                          style={{ 
                            borderColor: '#40e0d0',
                            color: '#40e0d0',
                            backgroundColor: 'transparent'
                          }}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Rollback
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Show loading state
  if (messagesLoading || memoriesLoading) {
    return (
      <div className="flex items-center justify-center h-64" style={{ backgroundColor: '#050505' }}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: '#40e0d0' }} />
          <p className="text-sm" style={{ color: '#888888' }}>Loading project data...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (messagesError || memoriesError) {
    return (
      <div className="flex items-center justify-center h-64" style={{ backgroundColor: '#050505' }}>
        <div className="text-center">
          <XCircle className="h-8 w-8 mx-auto mb-4" style={{ color: '#ff6b6b' }} />
          <p className="text-sm" style={{ color: '#ff6b6b' }}>
            Failed to load project data. Please try refreshing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full" style={{ backgroundColor: '#050505' }}>
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Live Actions Bar */}
        <div className="border-b p-3" style={{ backgroundColor: '#0f0f0f', borderColor: '#333333' }}>
          <div className="flex items-center gap-4 overflow-x-auto">
            <span className="text-sm font-medium" style={{ color: '#e0e0e0' }}>Live Actions:</span>
            {liveActions.map((action) => (
              <div key={action.id} className="flex items-center gap-2 whitespace-nowrap">
                <Badge className="text-xs" style={{ 
                  backgroundColor: '#333333', 
                  color: '#e0e0e0',
                  border: '1px solid #40e0d0'
                }}>
                  {action.status}
                </Badge>
                <span className="text-sm" style={{ color: '#888888' }}>{action.action}</span>
                {action.progress && (
                  <div className="w-16 rounded-full h-1.5" style={{ backgroundColor: '#333333' }}>
                    <div 
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${action.progress}%`,
                        backgroundColor: '#40e0d0'
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tasks, Runs, and Memory Section */}
        <div className="border-b p-4" style={{ backgroundColor: '#0f0f0f', borderColor: '#333333' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tasks */}
            <div>
              <h3 className="text-sm font-medium mb-2" style={{ color: '#e0e0e0' }}>Tasks ({tasks.length})</h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {tasks.map((task: any) => (
                  <div key={task.id} className="p-2 rounded border" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
                    <div className="flex items-center gap-2">
                      <Badge className="text-xs" style={{ 
                        backgroundColor: task.status === 'completed' ? '#22c55e' : '#f59e0b',
                        color: '#000000'
                      }}>
                        {task.status}
                      </Badge>
                      <span className="text-xs" style={{ color: '#888888' }}>
                        {new Date(task.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm mt-1" style={{ color: '#e0e0e0' }}>{task.content}</p>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <p className="text-sm text-center" style={{ color: '#888888' }}>No tasks yet</p>
                )}
              </div>
            </div>

            {/* Runs */}
            <div>
              <h3 className="text-sm font-medium mb-2" style={{ color: '#e0e0e0' }}>Runs ({runs.length})</h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {runs.map((run: any) => (
                  <div key={run.id} className="p-2 rounded border" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
                    <div className="flex items-center gap-2">
                      <Badge className="text-xs" style={{ 
                        backgroundColor: run.state === 'completed' ? '#22c55e' : '#3b82f6',
                        color: '#000000'
                      }}>
                        {run.state}
                      </Badge>
                      <span className="text-xs" style={{ color: '#888888' }}>
                        {new Date(run.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm mt-1" style={{ color: '#e0e0e0' }}>
                      {run.currentTaskId ? `Task: ${run.currentTaskId}` : 'No active task'}
                    </p>
                  </div>
                ))}
                {runs.length === 0 && (
                  <p className="text-sm text-center" style={{ color: '#888888' }}>No runs yet</p>
                )}
              </div>
            </div>

            {/* Memory */}
            <div>
              <h3 className="text-sm font-medium mb-2" style={{ color: '#e0e0e0' }}>Memory ({memories.length})</h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {memories.map((memory: any) => (
                  <div key={memory.id} className="p-2 rounded border" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
                    <div className="flex items-center gap-2">
                      <Badge className="text-xs" style={{ 
                        backgroundColor: '#40e0d0',
                        color: '#000000'
                      }}>
                        {memory.kind}
                      </Badge>
                      <span className="text-xs" style={{ color: '#888888' }}>
                        {new Date(memory.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm mt-1" style={{ color: '#e0e0e0' }}>
                      {memory.key}: {JSON.stringify(memory.value)}
                    </p>
                  </div>
                ))}
                {memories.length === 0 && (
                  <p className="text-sm text-center" style={{ color: '#888888' }}>No memories yet</p>
                )}
              </div>
            </div>
          </div>
        </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4" style={{ backgroundColor: '#050505' }}>
        <div className="space-y-4">
          {projectMessages.map((msg: any) => (
            <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#40e0d0' }}>
                  <Bot className="h-4 w-4" style={{ color: '#000000' }} />
                </div>
              )}
              
              <div className={`max-w-[70%] ${msg.sender === 'user' ? 'order-first' : ''}`}>
                <div className={`rounded-lg p-3 ${
                  msg.sender === 'user' 
                    ? 'text-white' 
                    : 'border'
                }`} style={{
                  backgroundColor: msg.sender === 'user' ? '#40e0d0' : '#0f0f0f',
                  borderColor: '#333333'
                }}>
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium" style={{ color: msg.sender === 'user' ? '#000000' : '#e0e0e0' }}>
                    {msg.sender === 'user' ? 'You' : 'Jason'}
                  </span>
                    <div className="flex items-center gap-1 text-xs opacity-70">
                      <Clock className="h-3 w-3" />
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                </div>
                  <p className="text-sm" style={{ color: msg.sender === 'user' ? '#000000' : '#e0e0e0' }}>{msg.content}</p>
                  
                  {/* Render Replit-style nested notifications */}
                  {msg.nested && renderReplitStyleNotification(msg)}
                </div>
              </div>
              
              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#333333' }}>
                  <User className="h-4 w-4" style={{ color: '#e0e0e0' }} />
                </div>
              )}
            </div>
          ))}
          
          {/* Structured Memory Section */}
          {convertToNestedMemory(projectMessages).length > 0 && (
            <div className="mt-6 border-t pt-6" style={{ borderColor: '#333333' }}>
              <div className="flex items-center gap-2 mb-4">
                <Eye className="h-5 w-5" style={{ color: '#40e0d0' }} />
                <h3 className="text-lg font-semibold" style={{ color: '#e0e0e0' }}>Structured Memory & Proof of Work</h3>
              </div>
              <NestedMemory 
                items={convertToNestedMemory(projectMessages)}
                onToggleExpand={(id) => toggleMessageExpansion(id)}
                onAction={(action, item) => {
                  if (action === 'rollback' && item.data?.rollbackId) {
                    rollbackMutation.mutate(item.data.rollbackId);
                  }
                }}
              />
            </div>
          )}
          
          <div ref={messagesEndRef} />
      </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-4" style={{ backgroundColor: '#0f0f0f', borderColor: '#333333' }}>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message or request..."
              className="pr-20"
          disabled={sendTaskMutation.isPending}
              style={{ 
                backgroundColor: '#050505', 
                borderColor: '#333333',
                color: '#e0e0e0'
              }}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => takeScreenshotMutation.mutate()}
                disabled={takeScreenshotMutation.isPending}
                className="h-6 w-6 p-0"
                style={{ color: '#40e0d0' }}
              >
                <Camera className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <Button
            onClick={() => setIsRecording(!isRecording)}
            variant={isRecording ? "destructive" : "outline"}
            size="sm"
            className="h-10 w-10 p-0"
            style={{ 
              backgroundColor: isRecording ? '#dc2626' : 'transparent',
              borderColor: '#40e0d0',
              color: '#40e0d0'
            }}
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          
        <Button
            onClick={() => setIsCallActive(!isCallActive)}
            variant={isCallActive ? "destructive" : "outline"}
            size="sm"
            className="h-10 w-10 p-0"
            style={{ 
              backgroundColor: isCallActive ? '#dc2626' : 'transparent',
              borderColor: '#40e0d0',
              color: '#40e0d0'
            }}
          >
            {isCallActive ? <PhoneOff className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
        </Button>
          
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || sendTaskMutation.isPending}
            size="sm"
            className="h-10 px-4"
            style={{ 
              backgroundColor: '#40e0d0',
              color: '#000000'
            }}
          >
            {sendTaskMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Voice Call Status */}
        {isCallActive && (
          <div className="mt-2 p-2 rounded text-sm" style={{ 
            backgroundColor: '#0f0f0f', 
            border: '1px solid #40e0d0',
            color: '#40e0d0'
          }}>
            🎙️ Voice call active - Jason can hear you and will respond verbally
          </div>
        )}
        
        {/* Recording Status */}
        {isRecording && (
          <div className="mt-2 p-2 rounded text-sm" style={{ 
            backgroundColor: '#0f0f0f', 
            border: '1px solid #dc2626',
            color: '#dc2626'
          }}>
            🔴 Recording - Your voice will be transcribed to text
        </div>
        )}
      </div>
      </div>

      {/* ElevenLabs Widget Sidebar */}
      <div className="w-80 border-l p-4" style={{ 
        borderColor: '#333333', 
        backgroundColor: '#0f0f0f' 
      }}>
        {pat && <Top3 projectId={projectId} pat={pat} />}
        <div className="mt-4">
          <ElevenLabsWidget projectId={projectId} />
        </div>
      </div>
    </div>
  );
}