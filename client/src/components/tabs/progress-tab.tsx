import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, CheckCircle, Circle } from "lucide-react";
import type { Feature } from "@shared/schema";

interface ProgressTabProps {
  projectId: string;
}

interface Milestone {
  id: string;
  name: string;
  completed: boolean;
  goals: Goal[];
}

interface Goal {
  id: string;
  name: string;
  completed: boolean;
}

export function ProgressTab({ projectId }: ProgressTabProps) {
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  
  const { data: features = [], isLoading } = useQuery<Feature[]>({
    queryKey: ['/api/projects', projectId, 'features'],
  });

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

  if (isLoading) {
    return (
      <div data-testid="progress-loading" className="text-center py-12">
        <div style={{ color: '#888888' }}>Loading features...</div>
      </div>
    );
  }

  if (features.length === 0) {
    return (
      <div data-testid="progress-empty" className="text-center py-12">
        <div style={{ color: '#888888' }}>
          No features created yet. Features will appear here as the project develops.
        </div>
      </div>
    );
  }

  return (
    <div data-testid="progress-content" className="space-y-4 max-h-96 overflow-y-auto">
      {features.map((feature) => {
        const isCompleted = feature.status === 'completed';
        // Mock milestones for demonstration - in real app this would come from API
        const milestones: Milestone[] = [];

        return (
          <div
            key={feature.id}
            data-testid={`feature-${feature.id}`}
            className="border rounded-lg p-4 transition-all duration-200"
            style={{
              backgroundColor: '#0e0e0e',
              borderColor: isCompleted ? '#00ff00' : '#333333',
              boxShadow: isCompleted ? '0 0 8px rgba(0, 255, 0, 0.3)' : 'none',
            }}
          >
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleFeature(feature.id)}>
              {expandedFeatures.has(feature.id) ? (
                <ChevronDown className="w-4 h-4" style={{ color: '#40e0d0' }} />
              ) : (
                <ChevronRight className="w-4 h-4" style={{ color: '#40e0d0' }} />
              )}
              <h3 className="font-semibold" style={{ color: '#e0e0e0' }}>{feature.name}</h3>
              {isCompleted && <CheckCircle className="w-4 h-4" style={{ color: '#00ff00' }} />}
            </div>
            
            {feature.description && (
              <p data-testid={`feature-description-${feature.id}`} className="text-sm mt-2 ml-6" style={{ color: '#888888' }}>
                {feature.description}
              </p>
            )}
            
            {expandedFeatures.has(feature.id) && milestones.length > 0 && (
              <div className="ml-6 mt-3 space-y-3">
                {milestones.map((milestone) => (
                  <div key={milestone.id} className="border rounded p-3" style={{ borderColor: '#333333', backgroundColor: '#0d0d0d' }}>
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleMilestone(milestone.id)}>
                      {expandedMilestones.has(milestone.id) ? (
                        <ChevronDown className="w-3 h-3" style={{ color: '#40e0d0' }} />
                      ) : (
                        <ChevronRight className="w-3 h-3" style={{ color: '#40e0d0' }} />
                      )}
                      <span style={{ color: '#e0e0e0' }}>{milestone.name}</span>
                      {milestone.completed && <CheckCircle className="w-3 h-3" style={{ color: '#00ff00' }} />}
                    </div>
                    
                    {expandedMilestones.has(milestone.id) && (
                      <div className="ml-5 mt-2 space-y-1">
                        {milestone.goals.map((goal) => (
                          <div key={goal.id} className="flex items-center gap-2">
                            {goal.completed ? (
                              <Circle className="w-2 h-2 fill-current" style={{ color: '#00ff00' }} />
                            ) : (
                              <Circle className="w-2 h-2" style={{ color: '#666666' }} />
                            )}
                            <span className="text-sm" style={{ color: goal.completed ? '#e0e0e0' : '#888888' }}>
                              {goal.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {expandedFeatures.has(feature.id) && milestones.length === 0 && (
              <div className="ml-6 mt-3 text-sm" style={{ color: '#888888' }}>
                No milestones defined for this feature yet.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
