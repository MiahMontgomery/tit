import { useQuery } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { ExpandedProject } from '@/components/expanded-project';
import { getProjectsOverview } from '@/lib/queryClient';

export default function ProjectPage() {
  const [, params] = useRoute('/projects/:id');
  const projectIdParam = params?.id;
  // Convert to number for comparison since DB returns Int
  const projectIdNum = projectIdParam ? parseInt(projectIdParam, 10) : null;

  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['projects-overview'],
    queryFn: () => getProjectsOverview(),
    refetchOnMount: true, // Always refetch when navigating to project page
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#050505', color: '#e0e0e0' }}>
        <div className="text-lg">Loading project...</div>
      </div>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4" style={{ backgroundColor: '#050505', color: '#e0e0e0' }}>
        <div className="text-red-400 text-lg font-medium">Error loading project</div>
        <div className="text-red-300 text-sm">{errorMessage}</div>
        <button
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 rounded border"
          style={{ borderColor: '#40e0d0', color: '#40e0d0' }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!projectIdParam || !projectIdNum || isNaN(projectIdNum)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4" style={{ backgroundColor: '#050505', color: '#e0e0e0' }}>
        <div className="text-red-400 text-lg font-medium">Invalid Project ID</div>
        <button
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 rounded border"
          style={{ borderColor: '#40e0d0', color: '#40e0d0' }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Compare IDs properly - handle both string and number types
  const project = projects?.find(p => {
    const pId = typeof p.id === 'number' ? p.id : parseInt(String(p.id), 10);
    return pId === projectIdNum;
  });

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4" style={{ backgroundColor: '#050505', color: '#e0e0e0' }}>
        <div className="text-yellow-400 text-lg font-medium">Project not found</div>
        <div className="text-gray-400 text-sm">Project ID: {projectIdParam}</div>
        <div className="text-gray-500 text-xs">The project may not exist or may have been deleted.</div>
        <button
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 rounded border"
          style={{ borderColor: '#40e0d0', color: '#40e0d0' }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#050505', minHeight: '100vh', padding: '1rem' }}>
      <ExpandedProject 
        project={project} 
        onClose={() => window.location.href = '/'}
      />
    </div>
  );
}




