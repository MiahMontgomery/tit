import { useQuery } from "@tanstack/react-query";
import type { Deliverable } from "@shared/schema";

interface OutputTabProps {
  projectId: string;
}

export function OutputTab({ projectId }: OutputTabProps) {
  const { data: deliverables = [], isLoading } = useQuery<Deliverable[]>({
    queryKey: ['/api/projects', projectId, 'deliverables'],
  });

  if (isLoading) {
    return (
      <div data-testid="output-loading" className="text-center py-12">
        <div className="text-muted-foreground">Loading deliverables...</div>
      </div>
    );
  }

  if (deliverables.length === 0) {
    return (
      <div data-testid="output-empty" className="text-center py-12">
        <div className="text-muted-foreground">
          No deliverables ready for review. Completed work will appear here for approval.
        </div>
      </div>
    );
  }

  return (
    <div data-testid="output-content" className="space-y-6">
      {deliverables.map((deliverable) => (
        <div
          key={deliverable.id}
          data-testid={`deliverable-${deliverable.id}`}
          className="bg-card border border-border rounded-lg p-4"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 data-testid={`deliverable-name-${deliverable.id}`} className="font-semibold text-foreground">
                {deliverable.name}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span data-testid={`deliverable-type-${deliverable.id}`} className="text-xs bg-muted px-2 py-1 rounded">
                  {deliverable.type}
                </span>
                <span 
                  data-testid={`deliverable-status-${deliverable.id}`}
                  className={`text-xs px-2 py-1 rounded ${
                    deliverable.status === 'approved' ? 'bg-secondary/20 text-secondary' :
                    deliverable.status === 'review' ? 'bg-yellow-500/20 text-yellow-500' :
                    'bg-muted text-muted-foreground'
                  }`}
                >
                  {deliverable.status}
                </span>
              </div>
            </div>
          </div>
          <div data-testid={`deliverable-content-${deliverable.id}`} className="text-sm text-muted-foreground">
            {deliverable.content.length > 200 
              ? `${deliverable.content.substring(0, 200)}...` 
              : deliverable.content
            }
          </div>
        </div>
      ))}
    </div>
  );
}
