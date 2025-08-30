import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Trash2 } from "lucide-react";
import type { Project } from "@shared/schema";

interface ProjectCardProps {
  project: Project;
  onSelect: (project: Project) => void;
}

export function ProjectCard({ project, onSelect }: ProjectCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Project deleted",
        description: "The project has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (window.confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
      deleteProjectMutation.mutate(project.id);
    }
  };

  const handleCardClick = () => {
    onSelect(project);
  };

  return (
    <Card 
      data-testid={`card-project-${project.id}`}
      className="cursor-pointer transition-all duration-200 p-6 group"
      onClick={handleCardClick}
      style={{
        backgroundColor: '#0f0f0f',
        borderColor: '#00ffff',
        border: '1px solid #00ffff',
        boxShadow: '0 0 0 1px #00ffff, 0 0 8px rgba(0, 255, 255, 0.3)',
        color: '#e0e0e0'
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 data-testid={`text-project-name-${project.id}`} className="font-semibold text-lg text-foreground">
          {project.name}
        </h3>
        <Button
          data-testid={`button-delete-${project.id}`}
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={deleteProjectMutation.isPending}
          className="text-destructive hover:bg-destructive hover:text-destructive-foreground p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      
      <p data-testid={`text-project-description-${project.id}`} className="text-muted-foreground text-sm mb-4">
        {project.description}
      </p>
      
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#00ff00' }}></div>
        <span data-testid={`text-project-status-${project.id}`} className="text-sm font-medium" style={{ color: '#00ff00' }}>
          {project.status}
        </span>
      </div>
    </Card>
  );
}
