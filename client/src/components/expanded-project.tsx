import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { X, Trash2 } from "lucide-react";
import { ProgressTab } from "@/components/tabs/progress-tab";
import { InputTab } from "@/components/tabs/input-tab";
import { LogsTab } from "@/components/tabs/logs-tab";
import { OutputTab } from "@/components/tabs/output-tab";
import { SalesTab } from "@/components/tabs/sales-tab";
import type { Project } from "@shared/schema";

interface ExpandedProjectProps {
  project: Project;
  onClose: () => void;
}

type TabName = "progress" | "input" | "logs" | "output" | "sales";

export function ExpandedProject({ project, onClose }: ExpandedProjectProps) {
  const [activeTab, setActiveTab] = useState<TabName>("progress");
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
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
      deleteProjectMutation.mutate(project.id);
    }
  };

  const tabs = [
    { id: "progress", label: "Progress" },
    { id: "input", label: "Input" },
    { id: "logs", label: "Logs" },
    { id: "output", label: "Output" },
    { id: "sales", label: "Sales" },
  ] as const;

  const renderTabContent = () => {
    switch (activeTab) {
      case "progress":
        return <ProgressTab projectId={project.id} />;
      case "input":
        return <InputTab projectId={project.id} />;
      case "logs":
        return <LogsTab projectId={project.id} />;
      case "output":
        return <OutputTab projectId={project.id} />;
      case "sales":
        return <SalesTab projectId={project.id} />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-card rounded-lg border border-primary/30 p-6 glow-border">
      {/* Project Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 data-testid="text-expanded-project-name" className="text-2xl font-bold text-foreground">
            {project.name}
          </h3>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 bg-secondary rounded-full"></div>
            <span data-testid="text-expanded-project-status" className="text-sm text-muted-foreground">
              {project.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            data-testid="button-delete-expanded-project"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleteProjectMutation.isPending}
            className="text-destructive hover:bg-destructive hover:text-destructive-foreground p-2"
            title="Delete Project"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
          <Button
            data-testid="button-close-expanded-project"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-2"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              data-testid={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 py-2 px-1 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {renderTabContent()}
      </div>
    </div>
  );
}
