import { useQuery } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { ExpandedProject } from '@/components/expanded-project';
import { getProjectsOverview } from '@/lib/queryClient';

export default function ProjectPage() {
  const [, params] = useRoute('/projects/:id');
  const projectId = params?.id;

  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['projects-overview'],
    queryFn: () => getProjectsOverview(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading project...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Error loading project: {error.message}</div>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Project ID not found</div>
      </div>
    );
  }

  const project = projects?.find(p => p.id === projectId);

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Project not found</div>
      </div>
    );
  }

  return (
    <ExpandedProject 
      project={project} 
      onClose={() => window.history.back()} 
    />
  );
}




