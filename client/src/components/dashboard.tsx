import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProjectsOverview } from '../lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Calendar, DollarSign, Target, FileText, ArrowRight } from 'lucide-react';

interface ProjectOverview {
  id: string;
  name: string;
  description: string;
  latestRunState: string;
  budgetTokens: number;
  budgetUsd: number;
  spentTokens: number;
  spentUsd: number;
  featuresCount: number;
  recentProofs: Array<{
    summary: string;
    createdAt: string;
  }>;
}

const getStateColor = (state: string) => {
  switch (state) {
    case 'DONE': return 'bg-green-100 text-green-800';
    case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
    case 'FAILED': return 'bg-red-100 text-red-800';
    case 'PLANNING': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-800 text-gray-200';
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function Dashboard() {
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['projects-overview'],
    queryFn: getProjectsOverview,
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading projects...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">Failed to load projects</div>
        </div>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Titan Dashboard</h1>
          <p className="text-gray-600 mb-8">No projects found. Create your first project to get started.</p>
          <Button>Create Project</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6" style={{ backgroundColor: 'var(--background)' }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>Titan Dashboard</h1>
        <p style={{ color: 'var(--muted-foreground)' }}>Monitor and manage all your autonomous projects</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project: ProjectOverview) => {
          const tokenUsagePercent = project.budgetTokens > 0 
            ? (project.spentTokens / project.budgetTokens) * 100 
            : 0;
          const usdUsagePercent = project.budgetUsd > 0 
            ? (project.spentUsd / project.budgetUsd) * 100 
            : 0;

          return (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{project.name}</CardTitle>
                    <CardDescription 
                      className="text-sm line-clamp-2 overflow-wrap-anywhere"
                      style={{ 
                        color: 'var(--muted-foreground)',
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere'
                      }}
                    >
                      {project.description}
                    </CardDescription>
                  </div>
                  <Badge className={`ml-2 ${getStateColor(project.latestRunState)}`}>
                    {project.latestRunState}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Budget Usage */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      Budget Usage
                    </span>
                    <span className="font-medium">
                      {formatCurrency(project.spentUsd)} / {formatCurrency(project.budgetUsd)}
                    </span>
                  </div>
                  <Progress value={usdUsagePercent} className="h-2" />
                </div>

                {/* Token Usage */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      Token Usage
                    </span>
                    <span className="font-medium">
                      {project.spentTokens.toLocaleString()} / {project.budgetTokens.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={tokenUsagePercent} className="h-2" />
                </div>

                {/* Features Count */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileText className="h-4 w-4" />
                  <span>{project.featuresCount} features</span>
                </div>

                {/* Recent Proofs */}
                {project.recentProofs.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Recent Activity</h4>
                    <div className="space-y-1">
                      {project.recentProofs.map((proof, index) => (
                        <div key={index} className="text-xs p-2 rounded" style={{ color: 'var(--muted-foreground)', backgroundColor: 'var(--muted)' }}>
                          <div className="font-medium">{proof.summary}</div>
                          <div className="flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(proof.createdAt)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <Button 
                  className="w-full mt-4" 
                  onClick={() => window.location.href = `/projects/${project.id}`}
                >
                  Open Project
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
