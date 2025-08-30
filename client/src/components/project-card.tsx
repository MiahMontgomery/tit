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
      className="bg-card border-primary/50 hover:border-primary cursor-pointer transition-all duration-200 p-6 group glow-border hover:glow-border-active"
      onClick={handleCardClick}
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
        <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
        <span data-testid={`text-project-status-${project.id}`} className="text-sm text-secondary font-medium">
          {project.status}
        </span>
      </div>
    </Card>
  );
}
