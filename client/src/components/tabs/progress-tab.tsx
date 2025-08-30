import { useQuery } from "@tanstack/react-query";
import type { Feature } from "@shared/schema";

interface ProgressTabProps {
  projectId: string;
}

export function ProgressTab({ projectId }: ProgressTabProps) {
  const { data: features = [], isLoading } = useQuery<Feature[]>({
    queryKey: ['/api/projects', projectId, 'features'],
  });

  if (isLoading) {
    return (
      <div data-testid="progress-loading" className="text-center py-12">
        <div className="text-muted-foreground">Loading features...</div>
      </div>
    );
  }

  if (features.length === 0) {
    return (
      <div data-testid="progress-empty" className="text-center py-12">
        <div className="text-muted-foreground">
          No features created yet. Features will appear here as the project develops.
        </div>
      </div>
    );
  }

  return (
    <div data-testid="progress-content" className="space-y-4">
      {features.map((feature) => (
        <div
          key={feature.id}
          data-testid={`feature-${feature.id}`}
          className="bg-card border border-border rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg 
                className="w-4 h-4 text-muted-foreground transition-transform duration-200" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
              <div>
                <h4 data-testid={`feature-name-${feature.id}`} className="font-semibold">
                  {feature.name}
                </h4>
                {feature.description && (
                  <p data-testid={`feature-description-${feature.id}`} className="text-sm text-muted-foreground mt-1">
                    {feature.description}
                  </p>
                )}
              </div>
            </div>
            <div 
              data-testid={`feature-status-${feature.id}`}
              className={`w-2 h-2 rounded-full ${
                feature.status === 'completed' ? 'bg-secondary' :
                feature.status === 'in-progress' ? 'bg-yellow-500' :
                'bg-muted'
              }`} 
            />
          </div>
        </div>
      ))}
    </div>
  );
}
