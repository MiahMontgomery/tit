import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TitanLogo } from "@/components/titan-logo";
import { ProjectModal } from "@/components/project-modal";
import { ProjectCard } from "@/components/project-card";
import { ExpandedProject } from "@/components/expanded-project";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { Link } from "wouter";
import type { Project } from "@shared/schema";
import Dashboard from "@/components/dashboard";

export default function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
  };

  const handleProjectClose = () => {
    setSelectedProject(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#050505', color: '#e0e0e0' }}>
      {/* Health Banner */}
      
      {/* Header */}
      <header className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#333333' }}>
        <div className="flex items-center gap-3">
          <TitanLogo />
          <h1 className="text-2xl font-bold" style={{ color: '#40e0d0' }}>TITAN</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Button to navigate to the personas page */}
          <Link href="/personas" className="no-underline">
            <Button
              variant="outline"
              className="flex items-center gap-2 transition-all duration-200"
              style={{
                borderColor: '#40e0d0',
                color: '#40e0d0',
                backgroundColor: 'transparent'
              }}
            >
              <Users className="w-4 h-4" />
              Personas
            </Button>
          </Link>
          {/* Button to create a project */}
          <Button
            data-testid="button-add-project"
            onClick={() => setIsModalOpen(true)}
            variant="outline"
            className="flex items-center gap-2 transition-all duration-200"
            style={{
              borderColor: '#40e0d0',
              color: '#40e0d0',
              backgroundColor: 'transparent'
            }}
          >
            <Plus className="w-4 h-4" />
            Add Project
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {selectedProject ? (
          <ExpandedProject project={selectedProject} onClose={handleProjectClose} />
        ) : (
          <Dashboard />
        )}
      </main>

      {/* Project Creation Modal */}
      <ProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
