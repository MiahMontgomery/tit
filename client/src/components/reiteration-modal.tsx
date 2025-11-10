import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Check, Edit, Loader2 } from 'lucide-react';
import { fetchApi } from '@/lib/queryClient';
import { ReiterationPreview } from './reiteration-preview';
import { EditPanel } from './edit-panel';

type State = 'idle' | 'collecting_input' | 'generating_draft' | 'draft_ready' | 'editing' | 'confirming' | 'creating_project' | 'done';

interface ReiterationDraft {
  draftId: string;
  version: number;
  title: string;
  context?: any;
  narrative: string;
  prominentFeatures: any[];
  modes?: any[];
  milestones: any[];
  risks?: any[];
  dependencies?: any[];
  instrumentation?: any[];
  acceptanceCriteria: any[];
  userEdits?: string;
  createdAt: string;
}

interface ReiterationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReiterationModal({ isOpen, onClose }: ReiterationModalProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [state, setState] = useState<State>('idle');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [draft, setDraft] = useState<ReiterationDraft | null>(null);
  const [userEdits, setUserEdits] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (state === 'creating_project') return; // Prevent closing during creation
    setState('idle');
    setTitle('');
    setDescription('');
    setDraft(null);
    setUserEdits('');
    setError(null);
    onClose();
  };

  const handleDraftPlan = async () => {
    if (title.trim()) {
      setError(null);
      setState('generating_draft');
      
      try {
          const response = await fetchApi('/api/projects/reiterate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            context: description.trim() ? { text: description.trim() } : undefined,
            previousDraftId: draft?.draftId,
            userEdits: userEdits.trim() || undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to generate draft');
        }

        const data = await response.json();
        setDraft(data.draft);
        setState('draft_ready');
      } catch (err) {
        console.error('Error generating draft:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate draft');
        setState('collecting_input');
      }
    }
  };

  const handleRequestChanges = () => {
    setState('editing');
  };

  const handleRegenerate = () => {
    handleDraftPlan();
  };

  const handleConfirmCreate = async () => {
    if (!draft) return;

    setState('confirming');
    
    try {
      const response = await fetchApi('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.title,
          description: description.trim() || draft.narrative.substring(0, 500),
          charter: {
            narrative: draft.narrative,
            prominentFeatures: draft.prominentFeatures,
            modes: draft.modes,
            milestones: draft.milestones,
            risks: draft.risks,
            dependencies: draft.dependencies,
            instrumentation: draft.instrumentation,
            acceptanceCriteria: draft.acceptanceCriteria,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || `Failed to create project (${response.status})`;
        const errorCode = errorData.errorCode || errorData.prismaCode || '';
        const fullError = errorCode ? `${errorMessage} [${errorCode}]` : errorMessage;
        throw new Error(fullError);
      }

      const data = await response.json();
      const project = data.project || data.data || data;
      const projectId = project.id;

      if (!projectId) {
        throw new Error('Project created but no ID returned');
      }

      // Invalidate projects query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['projects-overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });

      setState('done');
      handleClose();
      
      // Small delay to ensure query invalidation completes
      setTimeout(() => {
        setLocation(`/projects/${projectId}`);
      }, 100);
    } catch (err) {
      console.error('Error creating project:', err);
      let errorMessage = 'Failed to create project';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        errorMessage = (err as any).message || JSON.stringify(err);
      }
      setError(errorMessage);
      setState('draft_ready');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold" style={{ color: '#e0e0e0' }}>
              {state === 'idle' || state === 'collecting_input' ? 'Create New Project' :
               state === 'generating_draft' ? 'Generating Plan...' :
               state === 'draft_ready' ? 'Review Project Plan' :
               state === 'editing' ? 'Request Changes' :
               state === 'confirming' || state === 'creating_project' ? 'Creating Project...' :
               'Project Created'}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={state === 'creating_project' || state === 'confirming'}
              style={{ color: '#888888' }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-700 text-red-300">
              {error}
            </div>
          )}

          {/* Input Collection */}
          {(state === 'idle' || state === 'collecting_input') && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="title" className="text-sm font-medium" style={{ color: '#e0e0e0' }}>
                  Project Title *
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter project title"
                  className="mt-1"
                  style={{ 
                    backgroundColor: '#111111', 
                    borderColor: '#333333', 
                    color: '#e0e0e0' 
                  }}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium" style={{ color: '#e0e0e0' }}>
                  Description (Optional)
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Project description, goals, or requirements"
                  className="mt-1 min-h-[120px]"
                  style={{ 
                    backgroundColor: '#111111', 
                    borderColor: '#333333', 
                    color: '#e0e0e0' 
                  }}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  style={{
                    borderColor: '#333333',
                    color: '#e0e0e0'
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (title.trim()) {
                      setState('collecting_input');
                      handleDraftPlan();
                    }
                  }}
                  disabled={!title.trim() || state === 'generating_draft'}
                  style={{
                    backgroundColor: '#40e0d0',
                    color: '#000000'
                  }}
                >
                  {state === 'generating_draft' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Drafting Plan...
                    </>
                  ) : (
                    'Draft Plan'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Generating Draft */}
          {state === 'generating_draft' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mb-4" style={{ color: '#40e0d0' }} />
              <p style={{ color: '#888888' }}>Generating project plan...</p>
            </div>
          )}

          {/* Draft Ready */}
          {state === 'draft_ready' && draft && (
            <div className="space-y-6">
              <div className="mb-4 p-4 rounded-lg border" style={{ backgroundColor: '#0a1f1f', borderColor: '#40e0d0' }}>
                <p className="text-sm" style={{ color: '#e0e0e0' }}>
                  <strong style={{ color: '#40e0d0' }}>Review the plan above.</strong> The system has analyzed your project and provided a detailed analysis with recommended approaches. 
                  Scroll through the narrative and features. If you'd like changes, click "Request Changes" and tell the system what to adjust in simple language.
                </p>
              </div>
              
              <ReiterationPreview draft={draft} />
              
              <div className="flex justify-end space-x-3 pt-4 border-t" style={{ borderColor: '#333333' }}>
                <Button
                  onClick={handleRequestChanges}
                  variant="outline"
                  disabled={state === 'confirming'}
                  style={{
                    borderColor: '#dc2626',
                    color: '#dc2626'
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Request Changes
                </Button>
                <Button
                  onClick={handleConfirmCreate}
                  disabled={state === 'confirming'}
                  style={{
                    backgroundColor: '#40e0d0',
                    color: '#000000'
                  }}
                >
                  {state === 'confirming' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      ✓ Confirm & Create
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Editing / Request Changes */}
          {state === 'editing' && draft && (
            <div className="space-y-6">
              <EditPanel
                draft={draft}
                userEdits={userEdits}
                onEditsChange={setUserEdits}
              />
              
              <div className="flex justify-end space-x-3 pt-4 border-t" style={{ borderColor: '#333333' }}>
                <Button
                  onClick={() => {
                    setState('draft_ready');
                    setUserEdits('');
                  }}
                  variant="outline"
                  style={{
                    borderColor: '#333333',
                    color: '#e0e0e0'
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setState('generating_draft');
                    handleRegenerate();
                  }}
                  disabled={state === 'generating_draft'}
                  style={{
                    backgroundColor: '#40e0d0',
                    color: '#000000'
                  }}
                >
                  {state === 'generating_draft' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    'Regenerate Draft'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

