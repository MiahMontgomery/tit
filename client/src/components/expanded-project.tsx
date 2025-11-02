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
import { DesktopCodeEditor } from "@/components/DesktopCodeEditor";
import type { Project } from "@shared/schema";

interface ExpandedProjectProps {
  project: Project;
  onClose: () => void;
}

type TabName = "progress" | "input" | "logs" | "output" | "sales" | "code";

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
    { id: "code", label: "Code" },
  ] as const;

  const renderTabContent = () => {
    // Ensure projectId is always a string for consistency
    const projectId = String(project.id);
    
    try {
      switch (activeTab) {
        case "progress":
          return <ProgressTab projectId={projectId} pat={undefined} />;
        case "input":
          return <InputTab projectId={projectId} />;
        case "logs":
          return <LogsTab projectId={projectId} />;
        case "output":
          return <OutputTab projectId={projectId} />;
        case "sales":
          return <SalesTab projectId={projectId} />;
        case "code":
          return <DesktopCodeEditor projectId={projectId} />;
        default:
          return null;
      }
    } catch (error) {
      console.error('Error rendering tab content:', error);
      return (
        <div className="p-4 text-red-400">
          Error loading tab content. Please try refreshing the page.
        </div>
      );
    }
  };

  return (
    <div className="rounded-lg border p-6 mt-4" style={{
      backgroundColor: '#0d0d0d',
      borderColor: '#40e0d0',
      boxShadow: '0 0 0 1px #40e0d0, 0 0 8px rgba(64, 224, 208, 0.3)'
    }}>
      {/* Project Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 data-testid="text-expanded-project-name" className="text-2xl font-bold" style={{ color: '#e0e0e0' }}>
            {project.name}
          </h3>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#00ff00' }}></div>
            <span data-testid="text-expanded-project-status" className="text-sm" style={{ color: '#888888' }}>
              Active
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
            className="hover:bg-gray-800 p-2"
            title="Delete Project"
            style={{ color: '#ff6b6b' }}
          >
            <Trash2 className="w-5 h-5" />
          </Button>
          <Button
            data-testid="button-close-expanded-project"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="hover:bg-gray-800 p-2"
            style={{ color: '#888888' }}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b mb-6" style={{ borderColor: '#333333' }}>
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              data-testid={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className="border-b-2 py-2 px-1 text-sm font-medium transition-colors"
              style={{
                color: activeTab === tab.id ? '#40e0d0' : '#888888',
                borderBottomColor: activeTab === tab.id ? '#40e0d0' : 'transparent',
              }}
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
