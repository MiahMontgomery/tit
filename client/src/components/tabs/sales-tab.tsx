import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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

  if (isLoading) {
    return (
      <div data-testid="sales-loading" className="text-center py-12">
        <div className="text-muted-foreground">Loading sales data...</div>
      </div>
    );
  }

  if (!salesData) {
    return (
      <div data-testid="sales-error" className="text-center py-12">
        <div className="text-muted-foreground">Sales data not found.</div>
      </div>
    );
  }

  return (
    <div data-testid="sales-content">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Messages Sent</h4>
            <p data-testid="sales-messages-sent" className="text-2xl font-bold">
              {salesData.messagesSent}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Content Created</h4>
            <p data-testid="sales-content-created" className="text-2xl font-bold">
              {salesData.contentCreated}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Income Earned</h4>
            <p data-testid="sales-income" className="text-2xl font-bold text-secondary">
              {formatCurrency(salesData.income)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div>
        <h4 className="text-lg font-semibold mb-4">Recent Activity</h4>
        <div data-testid="sales-activity-empty" className="text-muted-foreground text-center py-8">
          No sales activity recorded yet.
        </div>
      </div>
    </div>
  );
}
