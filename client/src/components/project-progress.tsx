import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { CheckCircle, Clock, AlertCircle, Play, Pause } from 'lucide-react';

interface ProjectProgressProps {
  projectId: string;
  features: any[];
}

interface FeatureProgress {
  featureId: string;
  featureName: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  progress: number;
  lastUpdate: number;
  error?: string;
}

export function ProjectProgress({ projectId, features }: ProjectProgressProps) {
  const { isConnected, getProjectEvents } = useWebSocket();
  const [featureProgress, setFeatureProgress] = useState<Map<string, FeatureProgress>>(new Map());
  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    // Initialize feature progress from features prop
    const initialProgress = new Map<string, FeatureProgress>();
    features.forEach(feature => {
      initialProgress.set(feature.id, {
        featureId: feature.id,
        featureName: feature.name,
        status: feature.status || 'pending',
        progress: feature.status === 'completed' ? 100 : 0,
        lastUpdate: Date.now()
      });
    });
    setFeatureProgress(initialProgress);
  }, [features]);

  useEffect(() => {
    // Listen for WebSocket events for this project
    const projectEvents = getProjectEvents(projectId);
    
    if (projectEvents.length > 0) {
      const latestEvent = projectEvents[projectEvents.length - 1];
      
      if (latestEvent.type === 'feature.work.started') {
        setFeatureProgress(prev => {
          const newMap = new Map(prev);
          const feature = newMap.get(latestEvent.featureId!);
          if (feature) {
            newMap.set(latestEvent.featureId!, {
              ...feature,
              status: 'in-progress',
              progress: 0,
              lastUpdate: latestEvent.timestamp
            });
          }
          return newMap;
        });
      } else if (latestEvent.type === 'feature.work.progress') {
        setFeatureProgress(prev => {
          const newMap = new Map(prev);
          const feature = newMap.get(latestEvent.featureId!);
          if (feature) {
            newMap.set(latestEvent.featureId!, {
              ...feature,
              progress: latestEvent.progress || 0,
              lastUpdate: latestEvent.timestamp
            });
          }
          return newMap;
        });
      } else if (latestEvent.type === 'feature.work.completed') {
        setFeatureProgress(prev => {
          const newMap = new Map(prev);
          const feature = newMap.get(latestEvent.featureId!);
          if (feature) {
            newMap.set(latestEvent.featureId!, {
              ...feature,
              status: 'completed',
              progress: 100,
              lastUpdate: latestEvent.timestamp
            });
          }
          return newMap;
        });
      } else if (latestEvent.type === 'feature.work.error') {
        setFeatureProgress(prev => {
          const newMap = new Map(prev);
          const feature = newMap.get(latestEvent.featureId!);
          if (feature) {
            newMap.set(latestEvent.featureId!, {
              ...feature,
              status: 'failed',
              error: latestEvent.error,
              lastUpdate: latestEvent.timestamp
            });
          }
          return newMap;
        });
      }
    }
  }, [projectId, getProjectEvents]);

  useEffect(() => {
    // Calculate overall progress
    const progressValues = Array.from(featureProgress.values());
    if (progressValues.length > 0) {
      const totalProgress = progressValues.reduce((sum, feature) => sum + feature.progress, 0);
      const averageProgress = totalProgress / progressValues.length;
      setOverallProgress(Math.round(averageProgress));
    }
  }, [featureProgress]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in-progress':
        return <Play className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'in-progress':
        return <Badge variant="default" className="bg-blue-500">In Progress</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const completedFeatures = Array.from(featureProgress.values()).filter(f => f.status === 'completed').length;
  const totalFeatures = featureProgress.size;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Project Progress</span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-500">
              {isConnected ? 'Live Updates' : 'Disconnected'}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
          <div className="text-xs text-gray-500">
            {completedFeatures} of {totalFeatures} features completed
          </div>
        </div>

        {/* Feature Progress */}
        <div className="space-y-4">
          <h4 className="font-medium">Feature Progress</h4>
          <div className="space-y-3">
            {Array.from(featureProgress.values()).map((feature) => (
              <div key={feature.featureId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(feature.status)}
                    <span className="text-sm font-medium">{feature.featureName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{feature.progress}%</span>
                    {getStatusBadge(feature.status)}
                  </div>
                </div>
                
                <Progress value={feature.progress} className="h-1" />
                
                {feature.error && (
                  <div className="text-xs text-red-500 bg-red-50 p-2 rounded">
                    Error: {feature.error}
                  </div>
                )}
                
                <div className="text-xs text-gray-400">
                  Last updated: {new Date(feature.lastUpdate).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Events */}
        {isConnected && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Live Activity</h4>
            <div className="text-xs p-2 rounded" style={{ color: 'var(--muted-foreground)', backgroundColor: 'var(--muted)' }}>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                <span>Receiving real-time updates from autonomous system</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

