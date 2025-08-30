import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Send } from "lucide-react";
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
    <div data-testid="input-tab-content">
      {/* Live Action Status - Hidden for now */}
      <div className="bg-muted/20 rounded-lg p-3 mb-4 hidden" data-testid="live-action">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
          <span className="text-sm text-muted-foreground">Jason is working...</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Analyzing project requirements</p>
      </div>

      {/* Chat Container */}
      <div data-testid="chat-container" className="h-96 overflow-y-auto mb-4 space-y-4 p-4 bg-card/50 rounded-lg border border-border">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            Start a conversation with Jason to begin building your project.
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} data-testid={`message-${msg.id}`} className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                {msg.sender === 'user' ? 'U' : 'J'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">
                    {msg.sender === 'user' ? 'You' : 'Jason'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(msg.timestamp!)}
                  </span>
                </div>
                <div className="prose prose-invert max-w-none">
                  <p data-testid={`message-content-${msg.id}`}>{msg.content}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          data-testid="input-chat-message"
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message Jason..."
          disabled={sendMessageMutation.isPending}
          className="flex-1 bg-input border-border text-foreground placeholder:text-muted-foreground"
        />
        <Button
          data-testid="button-send-message"
          type="submit"
          disabled={sendMessageMutation.isPending || !message.trim()}
          className="bg-primary text-primary-foreground hover:opacity-90"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>

      {/* Rollback Section */}
      <div className="mt-6 pt-6 border-t border-border">
        <h4 className="text-sm font-medium mb-3">Rollback Points</h4>
        <div data-testid="rollback-empty" className="text-sm text-muted-foreground">
          No rollback points available yet.
        </div>
      </div>
    </div>
  );
}
