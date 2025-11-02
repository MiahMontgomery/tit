import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProjectsOverview } from '../lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Calendar, DollarSign, Target, FileText, ArrowRight } from 'lucide-react';

interface ProjectOverview {
  id: string | number;
  name: string;
  description?: string | null;
  latestRunState?: string;
  budgetTokens?: number;
  budgetUsd?: number;
  spentTokens?: number;
  spentUsd?: number;
  featuresCount?: number;
  recentProofs?: Array<{
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
      <div className="container mx-auto p-6" style={{ backgroundColor: '#050505', color: '#e0e0e0' }}>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg" style={{ color: '#e0e0e0' }}>Loading projects...</div>
        </div>
      </div>
    );
  }

  if (error) {
    const errorData = (error as any)?.response?.data || (error as any)?.data || {};
    const errorCode = errorData.errorCode || 'ERR_UNKNOWN';
    const errorMessage = errorData.message || errorData.error || (error instanceof Error ? error.message : 'Unknown error');
    
    // Error code explanations
    const errorExplanations: Record<string, string> = {
      'ERR_DB_CONNECTION': 'Cannot connect to database. Check DATABASE_URL environment variable and ensure database is running.',
      'ERR_DB_CLIENT_MISSING': 'Database client not initialized. Check server configuration.',
      'ERR_DB_CONSTRAINT': 'Database constraint violation. Data may conflict with existing records.',
      'ERR_DB_NOT_FOUND': 'Requested data not found in database.',
      'ERR_DB_DUPLICATE': 'Duplicate entry detected. A record with this data already exists.',
      'ERR_DB_UNKNOWN': 'Unknown database error occurred. Check database logs for details.',
      'ERR_VALIDATION': 'Request validation failed. Check that all required fields are provided correctly.',
      'ERR_SERVER_INTERNAL': 'Internal server error. Check server logs for details.',
      'ERR_NETWORK': 'Network request failed. Check your internet connection and API base URL configuration.',
      'ERR_API_RESPONSE': 'Server returned an error response. Check server logs for details.',
      'ERR_UNKNOWN': 'An unknown error occurred. Check console for details.'
    };
    
    const explanation = errorExplanations[errorCode] || errorExplanations['ERR_UNKNOWN'];
    
    return (
      <div className="container mx-auto p-6" style={{ backgroundColor: '#050505', color: '#e0e0e0' }}>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 max-w-3xl mx-auto">
          <div className="text-2xl text-red-400 font-bold">Failed to Load Projects</div>
          
          {/* Error Code Display */}
          <div className="w-full p-4 rounded-lg border" style={{ backgroundColor: '#1a1a1a', borderColor: '#dc2626' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="px-3 py-1 rounded font-mono text-sm font-bold" style={{ backgroundColor: '#dc2626', color: '#ffffff' }}>
                {errorCode}
              </div>
              <div className="text-sm text-red-300 font-medium">
                {errorMessage}
              </div>
            </div>
            <div className="text-xs text-gray-400 mt-2 border-t pt-2" style={{ borderColor: '#333333' }}>
              <strong>Explanation:</strong> {explanation}
            </div>
          </div>
          
          {/* Additional Details in Development */}
          {process.env.NODE_ENV === 'development' && errorData.details && (
            <div className="w-full p-4 rounded-lg border text-xs font-mono text-left overflow-auto max-h-48" 
                 style={{ backgroundColor: '#0a0a0a', borderColor: '#333333', color: '#888888' }}>
              <div className="font-bold mb-2 text-red-400">Stack Trace:</div>
              <pre className="whitespace-pre-wrap">{errorData.details}</pre>
            </div>
          )}
          
          {/* Additional Context */}
          {errorData.prismaCode && (
            <div className="text-xs text-gray-500">
              Prisma Error Code: <span className="font-mono">{errorData.prismaCode}</span>
            </div>
          )}
          
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 rounded border font-medium transition-colors hover:opacity-80"
            style={{ borderColor: '#40e0d0', color: '#40e0d0', backgroundColor: 'transparent' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="container mx-auto p-6" style={{ backgroundColor: '#050505', color: '#e0e0e0' }}>
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4" style={{ color: '#e0e0e0' }}>Titan Dashboard</h1>
          <p className="mb-8" style={{ color: '#888888' }}>No projects found. Create your first project to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6" style={{ backgroundColor: '#050505', color: '#e0e0e0' }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#e0e0e0' }}>Titan Dashboard</h1>
        <p style={{ color: '#888888' }}>Monitor and manage all your autonomous projects</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project: any) => {
          // Safely extract values with defaults
          const projectId = String(project.id);
          const projectName = project.name || 'Untitled Project';
          const projectDescription = project.description || 'No description';
          const latestRunState = project.latestRunState || 'PENDING';
          const budgetTokens = project.budgetTokens || 10000;
          const budgetUsd = project.budgetUsd || 50.0;
          const spentTokens = project.spentTokens || 0;
          const spentUsd = project.spentUsd || 0.0;
          const featuresCount = project.featuresCount || 0;
          const recentProofs = project.recentProofs || [];

          const tokenUsagePercent = budgetTokens > 0 
            ? (spentTokens / budgetTokens) * 100 
            : 0;
          const usdUsagePercent = budgetUsd > 0 
            ? (spentUsd / budgetUsd) * 100 
            : 0;

          return (
            <Card key={projectId} className="hover:shadow-lg transition-shadow" style={{ backgroundColor: '#0f0f0f', borderColor: '#333333' }}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1" style={{ color: '#e0e0e0' }}>{projectName}</CardTitle>
                    <CardDescription 
                      className="text-sm line-clamp-2 overflow-wrap-anywhere"
                      style={{ 
                        color: '#888888',
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere'
                      }}
                    >
                      {projectDescription}
                    </CardDescription>
                  </div>
                  <Badge className={`ml-2 ${getStateColor(latestRunState)}`}>
                    {latestRunState}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Budget Usage */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm" style={{ color: '#e0e0e0' }}>
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      Budget Usage
                    </span>
                    <span className="font-medium">
                      {formatCurrency(spentUsd)} / {formatCurrency(budgetUsd)}
                    </span>
                  </div>
                  <Progress value={usdUsagePercent} className="h-2" />
                </div>

                {/* Token Usage */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm" style={{ color: '#e0e0e0' }}>
                    <span className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      Token Usage
                    </span>
                    <span className="font-medium">
                      {spentTokens.toLocaleString()} / {budgetTokens.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={tokenUsagePercent} className="h-2" />
                </div>

                {/* Features Count */}
                <div className="flex items-center gap-2 text-sm" style={{ color: '#888888' }}>
                  <FileText className="h-4 w-4" />
                  <span>{featuresCount} features</span>
                </div>

                {/* Recent Proofs */}
                {recentProofs.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium" style={{ color: '#e0e0e0' }}>Recent Activity</h4>
                    <div className="space-y-1">
                      {recentProofs.map((proof: any, index: number) => (
                        <div key={index} className="text-xs p-2 rounded" style={{ color: '#888888', backgroundColor: '#1a1a1a' }}>
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
                  onClick={() => window.location.href = `/projects/${projectId}`}
                  style={{ backgroundColor: '#40e0d0', color: '#000000' }}
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
