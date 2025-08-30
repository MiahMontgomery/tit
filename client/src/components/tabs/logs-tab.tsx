import { useQuery } from "@tanstack/react-query";
import type { Log } from "@shared/schema";

interface LogsTabProps {
  projectId: string;
}

export function LogsTab({ projectId }: LogsTabProps) {
  const { data: logs = [], isLoading } = useQuery<Log[]>({
    queryKey: ['/api/projects', projectId, 'logs'],
  });

  const formatTimestamp = (timestamp: Date) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  if (isLoading) {
    return (
      <div data-testid="logs-loading" className="text-center py-12">
        <div className="text-muted-foreground">Loading logs...</div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div data-testid="logs-empty" className="text-center py-12">
        <div className="text-muted-foreground">
          No actions logged yet. Activity will appear here as the project progresses.
        </div>
      </div>
    );
  }

  return (
    <div data-testid="logs-content" className="space-y-4">
      {logs.map((log) => (
        <div
          key={log.id}
          data-testid={`log-${log.id}`}
          className="bg-card border border-border rounded-lg p-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 data-testid={`log-action-${log.id}`} className="font-medium text-foreground">
                  {log.action}
                </h4>
                <span data-testid={`log-timestamp-${log.id}`} className="text-xs text-muted-foreground">
                  {formatTimestamp(log.timestamp!)}
                </span>
              </div>
              <p data-testid={`log-description-${log.id}`} className="text-sm text-muted-foreground">
                {log.description}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
