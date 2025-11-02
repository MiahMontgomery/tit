import { useQuery } from "@tanstack/react-query";
import { Clock, GitCommit, Code, Database, Settings } from "lucide-react";
import type { Log } from "@shared/schema";
import { fetchApi } from '@/lib/queryClient';

interface LogsTabProps {
  projectId: string;
}

export function LogsTab({ projectId }: LogsTabProps) {
  const { data: logs = [], isLoading, error } = useQuery<Log[]>({
    queryKey: ['/api/projects', projectId, 'logs'],
    queryFn: async () => {
      const response = await fetchApi(`/api/projects/${projectId}/logs`);
      if (!response.ok) {
        if (response.status === 404) {
          return []; // Return empty array for missing project
        }
        throw new Error('Failed to fetch logs');
      }
      return response.json();
    },
    refetchInterval: 5000, // Real-time updates
    retry: false, // Don't retry on 404
  });

  const formatTimestamp = (timestamp: Date) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getLogIcon = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('execute') || actionLower.includes('run')) return Code;
    if (actionLower.includes('feature') || actionLower.includes('update')) return GitCommit;
    if (actionLower.includes('database') || actionLower.includes('data')) return Database;
    if (actionLower.includes('rollback') || actionLower.includes('revert')) return GitCommit;
    return Settings;
  };

  const groupLogsByDate = (logs: any[]) => {
    const groups: { [key: string]: any[] } = {};
    logs.forEach(log => {
      const date = new Date(log.timestamp!).toDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(log);
    });
    return groups;
  };

  if (isLoading) {
    return (
      <div data-testid="logs-loading" className="text-center py-12">
        <div style={{ color: '#888888' }}>Loading logs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="logs-error" className="text-center py-12">
        <div style={{ color: '#ff6b6b' }}>
          Failed to load logs. Please try refreshing.
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div data-testid="logs-empty" className="text-center py-12">
        <div style={{ color: '#888888' }}>
          No actions logged yet. Activity will appear here as the project progresses.
        </div>
      </div>
    );
  }

  const groupedLogs = groupLogsByDate(logs);

  return (
    <div data-testid="logs-content" className="space-y-6 max-h-96 overflow-y-auto">
      {Object.entries(groupedLogs).map(([date, dateLogs]) => (
        <div key={date}>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4" style={{ color: '#40e0d0' }} />
            <h3 className="text-sm font-medium" style={{ color: '#e0e0e0' }}>{date}</h3>
          </div>
          <div className="space-y-3 ml-6">
            {dateLogs.map((log) => {
              const IconComponent = getLogIcon(log.action);
              return (
                <div
                  key={log.id}
                  data-testid={`log-${log.id}`}
                  className="border rounded-lg p-3"
                  style={{ backgroundColor: '#0e0e0e', borderColor: '#333333' }}
                >
                  <div className="flex items-start gap-3">
                    <IconComponent className="w-4 h-4 mt-0.5" style={{ color: '#40e0d0' }} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 data-testid={`log-action-${log.id}`} className="font-medium" style={{ color: '#e0e0e0' }}>
                          {log.action}
                        </h4>
                        <span data-testid={`log-timestamp-${log.id}`} className="text-xs" style={{ color: '#666666' }}>
                          {new Date(log.timestamp!).toLocaleTimeString()}
                        </span>
                      </div>
                      <p data-testid={`log-description-${log.id}`} className="text-sm" style={{ color: '#888888' }}>
                        {log.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
