import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TitanLogo } from "@/components/titan-logo";
import { ProjectModal } from "@/components/project-modal";
import { ProjectCard } from "@/components/project-card";
import { ExpandedProject } from "@/components/expanded-project";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Project } from "@shared/schema";

export default function Dashboard() {
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
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <TitanLogo />
          <h1 className="text-2xl font-bold text-foreground">TITAN</h1>
        </div>
        <Button
          data-testid="button-add-project"
          onClick={() => setIsModalOpen(true)}
          variant="outline"
          className="flex items-center gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          Add Project
        </Button>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {selectedProject ? (
          <ExpandedProject project={selectedProject} onClose={handleProjectClose} />
        ) : (
          <>
            {projects.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center min-h-96 text-center">
                <p className="text-muted-foreground text-lg mb-6">
                  No projects yet. Click "Add New Project" to begin.
                </p>
                <Button
                  data-testid="button-add-first-project"
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                  Add New Project
                </Button>
              </div>
            ) : (
              /* Projects Grid */
              <div>
                <h2 className="text-xl font-semibold mb-6">Projects</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onSelect={handleProjectSelect}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Project Creation Modal */}
      <ProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
