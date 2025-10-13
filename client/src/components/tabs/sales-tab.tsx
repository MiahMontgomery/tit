import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  MessageSquare, 
  Calendar,
  Target,
  BarChart3,
  PieChart,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';

interface SalesMetrics {
  daily: {
    messagesSent: number;
    contentCreated: number;
    revenueGenerated: number;
    contactsReached: number;
    responseRate: number;
  };
  weekly: {
    totalRevenue: number;
    growthRate: number;
    activeProjects: number;
    completedMilestones: number;
  };
  monthly: {
    projectedRevenue: number;
    targetRevenue: number;
    completionRate: number;
    efficiencyScore: number;
  };
}

interface RevenueAction {
  id: string;
  type: 'sale' | 'subscription' | 'service' | 'product';
  description: string;
  amount: number;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  projectId?: string;
}

interface SalesTabProps {
  projectId: string;
}

export function SalesTab({ projectId }: SalesTabProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Fetch sales metrics
  const { data: salesMetrics, isLoading } = useQuery({
    queryKey: ['sales-metrics', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/sales`);
      if (!response.ok) throw new Error('Failed to fetch sales metrics');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch revenue actions
  const { data: revenueActions = [] } = useQuery({
    queryKey: ['revenue-actions', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/revenue-actions`);
      if (!response.ok) throw new Error('Failed to fetch revenue actions');
      return response.json();
    },
    refetchInterval: 30000,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-800 text-gray-200 border-gray-600';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sale': return <DollarSign className="h-4 w-4" />;
      case 'subscription': return <TrendingUp className="h-4 w-4" />;
      case 'service': return <Users className="h-4 w-4" />;
      case 'product': return <Target className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading sales data...</span>
      </div>
    );
  }

  const metrics = salesMetrics || {
    daily: { messagesSent: 0, contentCreated: 0, revenueGenerated: 0, contactsReached: 0, responseRate: 0 },
    weekly: { totalRevenue: 0, growthRate: 0, activeProjects: 0, completedMilestones: 0 },
    monthly: { projectedRevenue: 0, targetRevenue: 0, completionRate: 0, efficiencyScore: 0 }
  };

  return (
    <div className="h-full flex flex-col space-y-6 p-6" style={{ backgroundColor: '#050505' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#e0e0e0' }}>Sales Dashboard</h2>
          <p style={{ color: '#888888' }}>Revenue tracking and performance metrics</p>
        </div>
      </div>

      {/* Not Integrated Message */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <DollarSign className="h-16 w-16 mx-auto mb-4" style={{ color: '#40e0d0' }} />
          <h3 className="text-xl font-semibold mb-2" style={{ color: '#e0e0e0' }}>Sales Integration Not Available</h3>
          <p style={{ color: '#888888' }}>
            Sales metrics will be available once payment processing and revenue tracking are integrated.
          </p>
          <div className="mt-4 p-4 rounded-lg border" style={{ 
            backgroundColor: '#0f0f0f', 
            borderColor: '#333333' 
          }}>
            <h4 className="text-lg font-medium mb-2" style={{ color: '#e0e0e0' }}>Integration Status</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
                <span style={{ color: '#888888' }}>Payment Processing: Not Connected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
                <span style={{ color: '#888888' }}>Revenue Tracking: Not Connected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
                <span style={{ color: '#888888' }}>Customer Analytics: Not Connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}