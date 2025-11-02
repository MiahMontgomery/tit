import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, FileText, Target, Shield, Link as LinkIcon, BarChart3 } from 'lucide-react';

interface ReiterationDraft {
  draftId: string;
  version: number;
  title: string;
  intent?: string;
  narrative: string;
  prominentFeatures: any[];
  modes?: any[];
  milestones: any[];
  risks?: any[];
  dependencies?: any[];
  instrumentation?: any[];
  acceptanceCriteria: any[];
}

interface ReiterationPreviewProps {
  draft: ReiterationDraft;
}

export function ReiterationPreview({ draft }: ReiterationPreviewProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4" style={{ borderColor: '#333333' }}>
        <h3 className="text-xl font-bold mb-2" style={{ color: '#e0e0e0' }}>{draft.title}</h3>
        <Badge className="mt-2" style={{ backgroundColor: '#333333', color: '#40e0d0' }}>
          Draft v{draft.version}
        </Badge>
      </div>

      {/* Narrative - Long Detailed Form */}
      <Card style={{ backgroundColor: '#0f0f0f', borderColor: '#333333' }}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2" style={{ color: '#e0e0e0' }}>
            <FileText className="h-5 w-5" style={{ color: '#40e0d0' }} />
            Project Analysis & Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-invert max-w-none">
            <div className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: '#e0e0e0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              {draft.narrative}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prominent Features - Point Form at End */}
      {draft.prominentFeatures && draft.prominentFeatures.length > 0 && (
        <Card style={{ backgroundColor: '#0f0f0f', borderColor: '#333333' }}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2" style={{ color: '#e0e0e0' }}>
              <Target className="h-5 w-5" style={{ color: '#40e0d0' }} />
              Key Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 list-none">
              {draft.prominentFeatures.map((feature: any, idx: number) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-2 h-2 rounded-full mt-2" style={{ backgroundColor: '#40e0d0' }} />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-semibold text-base" style={{ color: '#e0e0e0' }}>
                        {feature.name || feature.title}
                      </h4>
                      {feature.priority && (
                        <Badge className={getPriorityColor(feature.priority)}>
                          {feature.priority}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm mb-1" style={{ color: '#c0c0c0' }}>
                      {feature.description}
                    </p>
                    {feature.rationale && (
                      <p className="text-xs italic" style={{ color: '#888888' }}>
                        Why: {feature.rationale}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Modes - Multiple Approaches */}
      {draft.modes && draft.modes.length > 0 && (
        <Card style={{ backgroundColor: '#0f0f0f', borderColor: '#333333' }}>
          <CardHeader>
            <CardTitle className="text-lg" style={{ color: '#e0e0e0' }}>Implementation Approaches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {draft.modes.map((mode: any, idx: number) => (
              <div 
                key={idx} 
                className={`p-3 rounded border ${mode.selected ? 'border-green-500' : ''}`}
                style={{ 
                  backgroundColor: mode.selected ? '#0a1f0a' : '#050505', 
                  borderColor: mode.selected ? '#22c55e' : '#333333' 
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium" style={{ color: '#e0e0e0' }}>
                      {mode.type === 'development' ? '💡 Smartest Way' :
                       mode.type === 'deployment' ? '⚡ Fastest Way' :
                       mode.type === 'maintenance' ? '💰 Cheapest Way' :
                       mode.type === 'cloud' ? '☁️ Cloud-Based Approach' :
                       mode.type || mode.name}
                    </h4>
                    {mode.selected && (
                      <Badge className="bg-green-500 text-white">Recommended</Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm mb-2" style={{ color: '#c0c0c0' }}>
                  {mode.description}
                </p>
                {mode.rationale && (
                  <p className="text-xs" style={{ color: '#888888' }}>
                    <span className="font-medium">Rationale:</span> {mode.rationale}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Milestones */}
      {draft.milestones && draft.milestones.length > 0 && (
        <Card style={{ backgroundColor: '#0f0f0f', borderColor: '#333333' }}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2" style={{ color: '#e0e0e0' }}>
              <CheckCircle className="h-5 w-5" style={{ color: '#40e0d0' }} />
              Milestones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {draft.milestones.map((milestone: any, idx: number) => (
              <div key={idx} className="p-3 rounded border" style={{ backgroundColor: '#050505', borderColor: '#333333' }}>
                <h4 className="font-medium mb-2" style={{ color: '#e0e0e0' }}>
                  {milestone.title || milestone.name}
                </h4>
                <p className="text-sm mb-2" style={{ color: '#888888' }}>
                  {milestone.description}
                </p>
                {milestone.estimatedCompletion && (
                  <p className="text-xs mb-2" style={{ color: '#666666' }}>
                    Estimated: {milestone.estimatedCompletion}
                  </p>
                )}
                {milestone.acceptanceCriteria && Array.isArray(milestone.acceptanceCriteria) && milestone.acceptanceCriteria.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium mb-1" style={{ color: '#888888' }}>Acceptance Criteria:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {milestone.acceptanceCriteria.map((criterion: string, cIdx: number) => (
                        <li key={cIdx} className="text-xs" style={{ color: '#666666' }}>{criterion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Risks */}
      {draft.risks && draft.risks.length > 0 && (
        <Card style={{ backgroundColor: '#0f0f0f', borderColor: '#333333' }}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2" style={{ color: '#e0e0e0' }}>
              <AlertTriangle className="h-5 w-5" style={{ color: '#dc2626' }} />
              Risks & Mitigation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {draft.risks.map((risk: any, idx: number) => (
              <div key={idx} className="p-3 rounded border" style={{ backgroundColor: '#050505', borderColor: '#333333' }}>
                <div className="flex items-start justify-between mb-2">
                  <p className="font-medium" style={{ color: '#e0e0e0' }}>{risk.risk || risk.name}</p>
                  {risk.severity && (
                    <Badge className={getSeverityColor(risk.severity)}>
                      {risk.severity}
                    </Badge>
                  )}
                </div>
                {risk.mitigation && (
                  <p className="text-sm" style={{ color: '#888888' }}>
                    <span className="font-medium">Mitigation:</span> {risk.mitigation}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Dependencies - With Alternatives */}
      {draft.dependencies && draft.dependencies.length > 0 && (
        <Card style={{ backgroundColor: '#0f0f0f', borderColor: '#333333' }}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2" style={{ color: '#e0e0e0' }}>
              <LinkIcon className="h-5 w-5" style={{ color: '#40e0d0' }} />
              Dependencies & Requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {draft.dependencies.map((dep: any, idx: number) => (
              <div key={idx} className="p-3 rounded border" style={{ backgroundColor: '#050505', borderColor: '#333333' }}>
                <div className="flex items-start justify-between mb-1">
                  <span className="font-medium text-sm" style={{ color: '#e0e0e0' }}>
                    {dep.dependency || dep.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge className="text-xs" style={{ backgroundColor: '#333333', color: '#888888' }}>
                      {dep.type || 'unknown'}
                    </Badge>
                    <Badge className={`text-xs ${dep.status === 'resolved' ? 'bg-green-500' : dep.status === 'optional' ? 'bg-yellow-500' : 'bg-gray-500'}`}>
                      {dep.status || 'pending'}
                    </Badge>
                  </div>
                </div>
                {dep.cost && (
                  <p className="text-xs mb-1" style={{ color: '#888888' }}>
                    Estimated cost: {dep.cost}
                  </p>
                )}
                {dep.alternatives && Array.isArray(dep.alternatives) && dep.alternatives.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium mb-1" style={{ color: '#888888' }}>Alternatives:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {dep.alternatives.map((alt: string, altIdx: number) => (
                        <li key={altIdx} className="text-xs" style={{ color: '#666666' }}>{alt}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Instrumentation */}
      {draft.instrumentation && draft.instrumentation.length > 0 && (
        <Card style={{ backgroundColor: '#0f0f0f', borderColor: '#333333' }}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2" style={{ color: '#e0e0e0' }}>
              <BarChart3 className="h-5 w-5" style={{ color: '#40e0d0' }} />
              Instrumentation & Tracking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {draft.instrumentation.map((inst: any, idx: number) => (
              <div key={idx} className="p-2 rounded border text-sm" style={{ backgroundColor: '#050505', borderColor: '#333333' }}>
                <span className="font-medium" style={{ color: '#e0e0e0' }}>{inst.metric || inst.name}</span>
                <p className="text-xs mt-1" style={{ color: '#888888' }}>
                  {inst.method} - {inst.frequency}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Acceptance Criteria */}
      {draft.acceptanceCriteria && draft.acceptanceCriteria.length > 0 && (
        <Card style={{ backgroundColor: '#0f0f0f', borderColor: '#333333' }}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2" style={{ color: '#e0e0e0' }}>
              <Shield className="h-5 w-5" style={{ color: '#40e0d0' }} />
              Acceptance Criteria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {draft.acceptanceCriteria.map((criterion: any, idx: number) => (
              <div key={idx} className="p-2 rounded border text-sm" style={{ backgroundColor: '#050505', borderColor: '#333333' }}>
                <span className="font-medium" style={{ color: '#e0e0e0' }}>
                  {criterion.criterion || criterion.name || criterion}
                </span>
                {criterion.type && (
                  <Badge className="ml-2 text-xs" style={{ backgroundColor: '#333333', color: '#888888' }}>
                    {criterion.type}
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

