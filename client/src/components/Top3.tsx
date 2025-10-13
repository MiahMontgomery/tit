import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface Top3Task {
  id: string;
  title: string;
  score: number;
}

interface Top3Props {
  projectId: string;
  pat: string;
}

export default function Top3({ projectId, pat }: Top3Props) {
  const [tasks, setTasks] = useState<Top3Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTop3 = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/top3`, {
        headers: {
          'Authorization': `Bearer ${pat}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch top3 tasks');
      }

      const data = await response.json();
      setTasks(data.tasks);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTop3();
  }, [projectId, pat]);

  useEffect(() => {
    const eventSource = new EventSource(`/api/events?projectId=${projectId}&pat=${pat}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.kind === 'status' && data.summary === 'Top3 updated' && data.projectId === projectId) {
          fetchTop3();
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
    };

    return () => {
      eventSource.close();
    };
  }, [projectId, pat]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Top 3 Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Top 3 Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Top 3 Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-sm text-muted-foreground">No tasks available</div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task, index) => (
              <div key={task.id} className="flex items-center justify-between p-2 bg-muted rounded">
                <div className="flex items-center gap-2">
                  <Badge variant={index === 0 ? 'default' : 'secondary'}>
                    #{index + 1}
                  </Badge>
                  <span className="text-sm font-medium">{task.title}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {task.score}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}