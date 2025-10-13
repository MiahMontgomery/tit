import { useQuery } from "@tanstack/react-query";
import { getProjectHierarchy } from "@/lib/queryClient";
import ProgressTree from "@/components/progress/ProgressTree";

interface ProgressTabProps {
  projectId: string;
  pat?: string;
}

export function ProgressTab({ projectId, pat }: ProgressTabProps) {
  const { data: hierarchy, isLoading, error } = useQuery({
    queryKey: ['hierarchy', projectId],
    queryFn: () => getProjectHierarchy(projectId, pat),
    refetchInterval: 5000,
    retry: 3,
    retryDelay: 2000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading progress...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-red-500 mb-2">Error loading hierarchy</div>
        <div className="text-sm text-muted-foreground">
          {error.message}
        </div>
      </div>
    );
  }

  // Always show the progress tree - hierarchy should be auto-generated

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2" style={{ color: '#e0e0e0' }}>
          Hierarchical Project Progress
        </h3>
        <p className="text-sm" style={{ color: '#888888' }}>
          Features → Milestones → Goals structure with real-time updates
        </p>
      </div>

      <ProgressTree projectId={projectId} pat={pat} />
    </div>
  );
}
