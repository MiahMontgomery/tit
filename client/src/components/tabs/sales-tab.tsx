import { useQuery } from "@tanstack/react-query";
import { MessageSquare, FileText, DollarSign, TrendingUp, ShoppingCart, CreditCard } from "lucide-react";
import type { SalesData } from "@shared/schema";

interface SalesTabProps {
  projectId: string;
}

export function SalesTab({ projectId }: SalesTabProps) {
  const { data: salesData, isLoading } = useQuery<SalesData>({
    queryKey: ['/api/projects', projectId, 'sales'],
  });

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  // Mock sales activities for demonstration
  const mockActivities: Array<{
    type: string;
    description: string;
    timestamp: string;
    amount: string;
  }> = [
    // No activities - empty state
  ];

  if (isLoading) {
    return (
      <div data-testid="sales-loading" className="text-center py-12">
        <div style={{ color: '#888888' }}>Loading sales data...</div>
      </div>
    );
  }

  // Default empty data if none provided
  const data = salesData || {
    messagesSent: 0,
    contentCreated: 0,
    income: 0
  };

  return (
    <div data-testid="sales-content">
      {/* Yesterday's Performance Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2" style={{ color: '#e0e0e0' }}>Yesterday's Performance</h3>
        <p className="text-sm" style={{ color: '#888888' }}>Daily metrics and productivity overview</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="border rounded-lg p-4" style={{ backgroundColor: '#0e0e0e', borderColor: '#333333' }}>
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="w-5 h-5" style={{ color: '#40e0d0' }} />
            <h4 className="text-sm font-medium" style={{ color: '#888888' }}>Messages Sent</h4>
          </div>
          <p data-testid="sales-messages-sent" className="text-2xl font-bold" style={{ color: '#40e0d0' }}>
            {data.messagesSent}
          </p>
        </div>
        
        <div className="border rounded-lg p-4" style={{ backgroundColor: '#0e0e0e', borderColor: '#333333' }}>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-5 h-5" style={{ color: '#40e0d0' }} />
            <h4 className="text-sm font-medium" style={{ color: '#888888' }}>Content Created</h4>
          </div>
          <p data-testid="sales-content-created" className="text-2xl font-bold" style={{ color: '#40e0d0' }}>
            {data.contentCreated}
          </p>
        </div>
        
        <div className="border rounded-lg p-4" style={{ backgroundColor: '#0e0e0e', borderColor: '#333333' }}>
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5" style={{ color: '#00ff00' }} />
            <h4 className="text-sm font-medium" style={{ color: '#888888' }}>Income Earned</h4>
          </div>
          <p data-testid="sales-income" className="text-2xl font-bold" style={{ color: '#00ff00' }}>
            {formatCurrency(data.income || 0)}
          </p>
        </div>
      </div>

      {/* Recent Sales Activity */}
      <div className="border rounded-lg p-4" style={{ backgroundColor: '#0e0e0e', borderColor: '#333333' }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5" style={{ color: '#40e0d0' }} />
          <h4 className="text-lg font-semibold" style={{ color: '#e0e0e0' }}>Recent Sales Activity</h4>
        </div>
        
        {mockActivities.length === 0 ? (
          <div data-testid="sales-activity-empty" className="text-center py-8" style={{ color: '#888888' }}>
            No sales activity recorded yet. Revenue tracking will appear here once transactions begin.
          </div>
        ) : (
          <div className="space-y-3">
            {mockActivities.map((activity, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded" style={{ backgroundColor: '#0d0d0d' }}>
                {activity.type === 'sale' ? (
                  <ShoppingCart className="w-4 h-4" style={{ color: '#00ff00' }} />
                ) : (
                  <CreditCard className="w-4 h-4" style={{ color: '#40e0d0' }} />
                )}
                <div className="flex-1">
                  <p className="text-sm" style={{ color: '#e0e0e0' }}>{activity.description}</p>
                  <p className="text-xs" style={{ color: '#666666' }}>{activity.timestamp}</p>
                </div>
                <span className="text-sm font-medium" style={{ color: '#00ff00' }}>
                  {activity.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
