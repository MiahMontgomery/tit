import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProjectHierarchy, getApiUrl } from '@/lib/queryClient';
import { ChevronDown, ChevronRight, Circle, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';

interface Goal {
  id: string;
  title: string;
  state: 'PLANNED' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'BLOCKED';
  orderIndex: number;
}

interface Milestone {
  id: string;
  title: string;
  state: 'PLANNED' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'BLOCKED';
  orderIndex: number;
  goals: Goal[];
}

interface Feature {
  id: string;
  title: string;
  state: string;
  orderIndex: number;
  milestones: Milestone[];
}

interface Hierarchy {
  project: {
    id: string;
    name: string;
    description: string;
  };
  features: Feature[];
}

interface ProgressTreeProps {
  projectId: string;
  pat?: string;
}

const stateIcons = {
  PLANNED: <Circle className="w-4 h-4 text-gray-400" />,
  IN_PROGRESS: <Clock className="w-4 h-4 text-blue-500" />,
  REVIEW: <AlertCircle className="w-4 h-4 text-yellow-500" />,
  DONE: <CheckCircle className="w-4 h-4 text-green-500" />,
  BLOCKED: <XCircle className="w-4 h-4 text-red-500" />,
};

const stateColors = {
  PLANNED: 'bg-gray-800 text-gray-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  REVIEW: 'bg-yellow-100 text-yellow-800',
  DONE: 'bg-green-100 text-green-800',
  BLOCKED: 'bg-red-100 text-red-800',
};

export default function ProgressTree({ projectId, pat }: ProgressTreeProps) {
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: hierarchy, isLoading, error } = useQuery<Hierarchy>({
    queryKey: ['hierarchy', projectId],
    queryFn: () => getProjectHierarchy(projectId, pat),
    refetchInterval: 5000,
  });

  // State changes are handled by orchestrator only - no manual mutations

  // Expand features and milestones by default when hierarchy loads
  useEffect(() => {
    if (hierarchy?.features) {
      const featureIds = new Set(hierarchy.features.map(f => f.id));
      setExpandedFeatures(featureIds);
      
      // Also expand all milestones
      const milestoneIds = new Set();
      hierarchy.features.forEach(feature => {
        feature.milestones.forEach(milestone => {
          milestoneIds.add(milestone.id);
        });
      });
      setExpandedMilestones(milestoneIds);
    }
  }, [hierarchy]);

  // SSE subscription for real-time updates
  useEffect(() => {
    if (!projectId) return;

    const eventSource = new EventSource(getApiUrl(`/api/events?projectId=${projectId}&pat=${pat || ''}`));
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.kind === 'status' && 
          (data.summary === 'hierarchy.updated' || 
           data.summary === 'milestone.updated' || 
           data.summary === 'goal.updated')) {
        queryClient.invalidateQueries({ queryKey: ['hierarchy', projectId] });
      }
    };

    return () => eventSource.close();
  }, [projectId, pat, queryClient]);

  const toggleFeature = (featureId: string) => {
    const newExpanded = new Set(expandedFeatures);
    if (newExpanded.has(featureId)) {
      newExpanded.delete(featureId);
    } else {
      newExpanded.add(featureId);
    }
    setExpandedFeatures(newExpanded);
  };

  const toggleMilestone = (milestoneId: string) => {
    const newExpanded = new Set(expandedMilestones);
    if (newExpanded.has(milestoneId)) {
      newExpanded.delete(milestoneId);
    } else {
      newExpanded.add(milestoneId);
    }
    setExpandedMilestones(newExpanded);
  };

  // State changes are now handled by orchestrator only - no manual updates

  if (isLoading) return <div className="p-4">Loading hierarchy...</div>;
  if (error) return <div className="p-4 text-red-500">Error loading hierarchy: {error.message}</div>;
  if (!hierarchy) return (
    <div className="p-8 text-center">
      <div className="text-gray-500 mb-4">No hierarchy data available</div>
      <div className="text-sm text-gray-400">
        The project hierarchy is being generated. Please wait a moment and refresh the page.
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>{hierarchy.project.name}</h3>
        <p 
          className="text-sm leading-relaxed break-words overflow-wrap-anywhere"
          style={{ 
            color: 'var(--muted-foreground)',
            maxHeight: '200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 8,
            WebkitBoxOrient: 'vertical'
          }}
        >
          {hierarchy.project.description}
        </p>
      </div>

      {hierarchy.features.map((feature) => (
        <div key={feature.id} className="border rounded-lg" style={{ borderColor: 'var(--border)' }}>
          <div
            className="p-4 cursor-pointer flex items-center justify-between"
            style={{ backgroundColor: 'var(--card)' }}
            onClick={() => toggleFeature(feature.id)}
          >
            <div className="flex items-center space-x-2">
              {expandedFeatures.has(feature.id) ? (
                <ChevronDown className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              ) : (
                <ChevronRight className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              )}
              <span className="font-medium" style={{ color: 'var(--foreground)' }}>{feature.title}</span>
              <span className="px-2 py-1 rounded-full text-xs" style={{ 
                backgroundColor: 'var(--muted)', 
                color: 'var(--foreground)',
                border: '1px solid var(--primary)'
              }}>
                {feature.state}
              </span>
            </div>
          </div>

          {expandedFeatures.has(feature.id) && (
            <div className="border-t" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
              {feature.milestones.map((milestone) => (
                <div key={milestone.id} className="border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                  <div
                    className="p-3 pl-8 cursor-pointer flex items-center justify-between"
                    style={{ backgroundColor: 'var(--muted)' }}
                    onClick={() => toggleMilestone(milestone.id)}
                  >
                    <div className="flex items-center space-x-2">
                      {expandedMilestones.has(milestone.id) ? (
                        <ChevronDown className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                      ) : (
                        <ChevronRight className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                      )}
                      {stateIcons[milestone.state]}
                      <span className="font-medium" style={{ color: 'var(--foreground)' }}>{milestone.title}</span>
                    </div>
                  </div>

                  {expandedMilestones.has(milestone.id) && (
                    <div className="pl-16" style={{ backgroundColor: 'var(--background)' }}>
                      {milestone.goals.map((goal) => (
                        <div key={goal.id} className="p-2 border-b last:border-b-0 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                          <div className="flex items-center space-x-2">
                            {stateIcons[goal.state]}
                            <span style={{ color: 'var(--foreground)' }}>{goal.title}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
