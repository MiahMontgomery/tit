import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Send, RotateCcw, Activity } from "lucide-react";
import type { Message } from "@shared/schema";

interface InputTabProps {
  projectId: string;
}

export function InputTab({ projectId }: InputTabProps) {
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ['/api/projects', projectId, 'messages'],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/messages`, {
        content,
        sender: "user"
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'logs'] });
      setMessage("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    sendMessageMutation.mutate(message.trim());
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffMs = now.getTime() - messageTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    return messageTime.toLocaleDateString();
  };

  return (
    <div data-testid="input-tab-content" className="h-full flex flex-col">
      {/* Live Action Status Bar */}
      <div className="border-b p-3 mb-4" style={{ borderColor: '#333333', backgroundColor: '#0e0e0e' }}>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" style={{ color: '#40e0d0' }} />
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#00ff00' }}></div>
          <span className="text-sm font-medium" style={{ color: '#e0e0e0' }}>Ready for input</span>
        </div>
        <p className="text-xs mt-1" style={{ color: '#888888' }}>
          Waiting for your next instruction or question
        </p>
      </div>

      {/* Chat Container */}
      <div 
        data-testid="chat-container" 
        className="flex-1 overflow-y-auto mb-4 space-y-4 p-4 rounded-lg border"
        style={{ backgroundColor: '#0e0e0e', borderColor: '#333333' }}
      >
        {isLoading ? (
          <div className="text-center py-8" style={{ color: '#888888' }}>Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8" style={{ color: '#888888' }}>
            Start a conversation with Jason to begin building your project.
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} data-testid={`message-${msg.id}`} className="flex gap-3">
              <div 
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                style={{
                  backgroundColor: msg.sender === 'user' ? '#40e0d0' : '#00ff00',
                  color: '#000000'
                }}
              >
                {msg.sender === 'user' ? 'U' : 'J'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium" style={{ color: '#e0e0e0' }}>
                    {msg.sender === 'user' ? 'You' : 'Jason'}
                  </span>
                  <span className="text-xs" style={{ color: '#666666' }}>
                    {formatTimestamp(msg.timestamp!)}
                  </span>
                </div>
                <div 
                  className="rounded p-3 text-sm"
                  style={{
                    backgroundColor: msg.sender === 'user' ? 'rgba(64, 224, 208, 0.1)' : 'rgba(0, 255, 0, 0.1)',
                    borderLeft: `3px solid ${msg.sender === 'user' ? '#40e0d0' : '#00ff00'}`,
                    color: '#e0e0e0'
                  }}
                >
                  <p data-testid={`message-content-${msg.id}`}>{msg.content}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          data-testid="input-chat-message"
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message Jason..."
          disabled={sendMessageMutation.isPending}
          className="flex-1 px-3 py-2 rounded border text-sm"
          style={{
            backgroundColor: '#0e0e0e',
            borderColor: '#333333',
            color: '#e0e0e0',
          }}
        />
        <Button
          data-testid="button-send-message"
          type="submit"
          disabled={sendMessageMutation.isPending || !message.trim()}
          className="px-4"
          style={{
            backgroundColor: '#40e0d0',
            color: '#000000',
          }}
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>

      {/* Rollback Section */}
      <div className="pt-4 border-t" style={{ borderColor: '#333333' }}>
        <div className="flex items-center gap-2 mb-3">
          <RotateCcw className="w-4 h-4" style={{ color: '#40e0d0' }} />
          <h4 className="text-sm font-medium" style={{ color: '#e0e0e0' }}>Rollback Points</h4>
        </div>
        <div data-testid="rollback-empty" className="text-sm py-2" style={{ color: '#888888' }}>
          No rollback points available yet. Checkpoints will appear here as the project develops.
        </div>
      </div>
    </div>
  );
}
