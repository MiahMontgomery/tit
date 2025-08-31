import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { X } from "lucide-react";
import type { InsertProject } from "@shared/schema";

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectModal({ isOpen, onClose }: ProjectModalProps) {
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createProjectMutation = useMutation({
    mutationFn: async (data: InsertProject) => {
      const response = await apiRequest("POST", "/api/projects", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Project created",
        description: "Your project has been created successfully.",
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !prompt.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in both project name and prompt.",
        variant: "destructive",
      });
      return;
    }

    createProjectMutation.mutate({
      name: name.trim(),
      prompt: prompt.trim(),
      description: "No description"
    });
  };

  const handleClose = () => {
    setName("");
    setPrompt("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-md"
        style={{
          backgroundColor: '#0d0d0d',
          borderColor: '#40e0d0',
          border: '1px solid #40e0d0',
          boxShadow: '0 0 8px rgba(64, 224, 208, 0.3)'
        }}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold" style={{ color: '#e0e0e0' }}>Create New Project</DialogTitle>
            <Button
              data-testid="button-close-modal"
              variant="ghost"
              size="sm"
              onClick={handleClose}
              style={{ color: '#888888' }}
              className="hover:bg-gray-800"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="project-name" className="text-sm font-medium" style={{ color: '#e0e0e0' }}>
              Project Name
            </Label>
            <Input
              id="project-name"
              data-testid="input-project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
              style={{
                backgroundColor: '#0e0e0e',
                borderColor: '#333333',
                color: '#e0e0e0'
              }}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-prompt" className="text-sm font-medium" style={{ color: '#e0e0e0' }}>
              Project Prompt
            </Label>
            <Textarea
              id="project-prompt"
              data-testid="textarea-project-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to build..."
              rows={4}
              className="resize-none"
              style={{
                backgroundColor: '#0e0e0e',
                borderColor: '#333333',
                color: '#e0e0e0'
              }}
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              data-testid="button-cancel-project"
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 hover:bg-gray-800"
              style={{
                borderColor: '#333333',
                color: '#888888'
              }}
            >
              Cancel
            </Button>
            <Button
              data-testid="button-create-project"
              type="submit"
              disabled={createProjectMutation.isPending}
              className="flex-1 hover:opacity-90"
              style={{
                backgroundColor: '#40e0d0',
                color: '#000000'
              }}
            >
              {createProjectMutation.isPending ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
