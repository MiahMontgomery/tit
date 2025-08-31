import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, FileText, Image, Video, Music, File } from "lucide-react";
import type { Deliverable } from "@shared/schema";

interface OutputTabProps {
  projectId: string;
}

export function OutputTab({ projectId }: OutputTabProps) {
  const { data: deliverables = [], isLoading } = useQuery<Deliverable[]>({
    queryKey: ['/api/projects', projectId, 'deliverables'],
  });

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'document':
      case 'pdf':
        return FileText;
      case 'image':
      case 'screenshot':
        return Image;
      case 'video':
        return Video;
      case 'audio':
        return Music;
      default:
        return File;
    }
  };

  const handleApprove = (deliverableId: string) => {
    // TODO: Implement approval logic
    console.log('Approving deliverable:', deliverableId);
  };

  const handleReject = (deliverableId: string) => {
    // TODO: Implement rejection logic
    console.log('Rejecting deliverable:', deliverableId);
  };

  if (isLoading) {
    return (
      <div data-testid="output-loading" className="text-center py-12">
        <div style={{ color: '#888888' }}>Loading deliverables...</div>
      </div>
    );
  }

  if (deliverables.length === 0) {
    return (
      <div data-testid="output-empty" className="text-center py-12">
        <div style={{ color: '#888888' }}>
          No deliverables ready for review. Completed work will appear here for approval.
        </div>
      </div>
    );
  }

  return (
    <div data-testid="output-content" className="space-y-6 max-h-96 overflow-y-auto">
      {deliverables.map((deliverable) => {
        const IconComponent = getTypeIcon(deliverable.type);
        const isApproved = deliverable.status === 'approved';
        const isRejected = deliverable.status === 'rejected';
        const isPending = deliverable.status === 'review';

        return (
          <div
            key={deliverable.id}
            data-testid={`deliverable-${deliverable.id}`}
            className="border rounded-lg p-4"
            style={{ backgroundColor: '#0e0e0e', borderColor: '#333333' }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                <IconComponent className="w-5 h-5 mt-0.5" style={{ color: '#40e0d0' }} />
                <div>
                  <h4 data-testid={`deliverable-name-${deliverable.id}`} className="font-semibold" style={{ color: '#e0e0e0' }}>
                    {deliverable.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span 
                      data-testid={`deliverable-type-${deliverable.id}`} 
                      className="text-xs px-2 py-1 rounded" 
                      style={{ backgroundColor: '#333333', color: '#888888' }}
                    >
                      {deliverable.type}
                    </span>
                    <span 
                      data-testid={`deliverable-status-${deliverable.id}`}
                      className="text-xs px-2 py-1 rounded"
                      style={{
                        backgroundColor: isApproved ? 'rgba(0, 255, 0, 0.2)' : 
                                        isRejected ? 'rgba(255, 107, 107, 0.2)' :
                                        'rgba(255, 193, 7, 0.2)',
                        color: isApproved ? '#00ff00' : 
                               isRejected ? '#ff6b6b' : '#ffc107'
                      }}
                    >
                      {deliverable.status}
                    </span>
                  </div>
                </div>
              </div>
              
              {isPending && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(deliverable.id)}
                    className="flex items-center gap-1 px-3"
                    style={{ backgroundColor: '#00ff00', color: '#000000' }}
                  >
                    <CheckCircle className="w-3 h-3" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleReject(deliverable.id)}
                    className="flex items-center gap-1 px-3"
                    style={{ backgroundColor: '#ff6b6b', color: '#000000' }}
                  >
                    <XCircle className="w-3 h-3" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
            
            {/* Preview Area */}
            <div 
              className="rounded p-3 mb-3 text-sm"
              style={{ backgroundColor: '#0d0d0d', borderColor: '#333333', border: '1px solid #333333' }}
            >
              <div data-testid={`deliverable-content-${deliverable.id}`} style={{ color: '#e0e0e0' }}>
                {deliverable.content.length > 200 
                  ? `${deliverable.content.substring(0, 200)}...` 
                  : deliverable.content
                }
              </div>
            </div>
            
            {/* Preview Button for Media */}
            {['image', 'video', 'audio'].includes(deliverable.type.toLowerCase()) && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                style={{ borderColor: '#333333', color: '#888888' }}
              >
                Preview {deliverable.type}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
