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
  resourcesAndGaps?: {
    hardware: string[];
    infrastructure: string[];
    skills: string[];
    other: string[];
  };
  assumptions?: string[];
  questionsForUser?: string[];
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
        console.log('[ReiterationModal] Starting draft generation for:', title.trim());
        
        // Add timeout handling - match server timeout (2.5 min) with client buffer
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.error('[ReiterationModal] Client-side timeout triggered after 2.5 minutes');
          controller.abort();
        }, 150000); // 2.5 minute timeout to match server
        
        // Also add a warning timeout at 2 minutes
        const warningTimeoutId = setTimeout(() => {
          console.warn('[ReiterationModal] Draft generation taking longer than expected (2 minutes)');
          setError('AI generation is taking longer than expected. You can cancel and use "Create Project" to skip AI planning.');
        }, 120000);
        
        try {
          console.log('[ReiterationModal] Making request to /api/projects/reiterate');
          const response = await fetchApi('/api/projects/reiterate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: title.trim(),
              context: description.trim() ? { text: description.trim() } : undefined,
              previousDraftId: draft?.draftId,
              userEdits: userEdits.trim() || undefined,
            }),
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          clearTimeout(warningTimeoutId);

          console.log('[ReiterationModal] Response received:', { 
            status: response.status, 
            statusText: response.statusText,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries())
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[ReiterationModal] Error response:', errorData);
            
            // Provide user-friendly error messages based on error code
            let errorMessage = errorData.message || errorData.error || `Failed to generate draft (${response.status})`;
            
            if (errorData.errorCode === 'ERR_LLM_NOT_CONFIGURED') {
              errorMessage = 'AI planning is not available. Please use "Create Project" to create a project without AI planning.';
            } else if (errorData.errorCode === 'ERR_LLM_TIMEOUT') {
              errorMessage = 'The AI plan generation took too long. Please try again or use "Create Project" to skip AI planning.';
            } else if (errorData.errorCode === 'ERR_LLM_AUTH') {
              errorMessage = 'AI service authentication failed. Please check API key configuration. You can use "Create Project" to skip AI planning.';
            } else if (errorData.errorCode === 'ERR_LLM_NETWORK') {
              errorMessage = 'Network error connecting to AI service. Please check your connection. You can use "Create Project" to skip AI planning.';
            } else if (errorData.errorCode === 'ERR_LLM_INVALID_RESPONSE') {
              errorMessage = 'The AI returned an invalid response. Please try again or use "Create Project" to skip AI planning.';
            }
            
            throw new Error(errorMessage);
          }

          console.log('[ReiterationModal] Parsing response JSON...');
          const data = await response.json().catch((parseError) => {
            console.error('[ReiterationModal] Failed to parse response JSON:', parseError);
            throw new Error('Invalid response format from server');
          });
          
          console.log('[ReiterationModal] Draft data received:', { 
            ok: data.ok,
            draftId: data.draft?.draftId, 
            version: data.draft?.version,
            hasDraft: !!data.draft,
            dataKeys: Object.keys(data),
            hasResourcesAndGaps: !!data.draft?.resourcesAndGaps,
            resourcesAndGapsKeys: data.draft?.resourcesAndGaps ? Object.keys(data.draft.resourcesAndGaps) : [],
            hardwareCount: data.draft?.resourcesAndGaps?.hardware?.length || 0,
            infrastructureCount: data.draft?.resourcesAndGaps?.infrastructure?.length || 0,
            skillsCount: data.draft?.resourcesAndGaps?.skills?.length || 0,
            assumptionsCount: data.draft?.assumptions?.length || 0,
            questionsCount: data.draft?.questionsForUser?.length || 0,
          });
          
          if (!data.draft) {
            console.error('[ReiterationModal] Response missing draft:', data);
            throw new Error('Invalid response: missing draft data');
          }
          
          console.log('[ReiterationModal] Setting draft and updating state to draft_ready');
          console.log('[ReiterationModal] Full draft object:', JSON.stringify(data.draft, null, 2));
          setDraft(data.draft);
          setState('draft_ready');
          console.log('[ReiterationModal] State updated successfully');
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          clearTimeout(warningTimeoutId);
          console.error('[ReiterationModal] Fetch error:', {
            name: fetchError.name,
            message: fetchError.message,
            stack: fetchError.stack
          });
          if (fetchError.name === 'AbortError' || fetchError.message?.includes('aborted')) {
            throw new Error('Request timed out after 2.5 minutes. The AI plan generation is taking too long. Please use "Create Project" to skip AI planning, or try again later.');
          }
          if (fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('network') || fetchError.message?.includes('NetworkError')) {
            throw new Error('Network error: Could not reach server. Please check your connection and try again. You can use "Create Project" to skip AI planning.');
          }
          throw fetchError;
        }
      } catch (err) {
        console.error('[ReiterationModal] Error generating draft:', err);
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

  // Simple project creation without AI planning
  const handleSimpleCreate = async () => {
    if (!title.trim()) return;

    setState('creating_project');
    setError(null);
    
    try {
      const response = await fetchApi('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: title.trim(),
          description: description.trim() || null,
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
      setState('collecting_input');
    }
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
                  disabled={state === 'creating_project'}
                  style={{
                    borderColor: '#333333',
                    color: '#e0e0e0'
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSimpleCreate}
                  disabled={!title.trim() || state === 'creating_project'}
                  style={{
                    backgroundColor: '#40e0d0',
                    color: '#000000'
                  }}
                >
                  {state === 'creating_project' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Project'
                  )}
                </Button>
                <Button
                  onClick={() => {
                    if (title.trim()) {
                      setState('collecting_input');
                      handleDraftPlan();
                    }
                  }}
                  disabled={!title.trim() || state === 'generating_draft' || state === 'creating_project'}
                  variant="outline"
                  style={{
                    borderColor: '#40e0d0',
                    color: '#40e0d0',
                    backgroundColor: 'transparent'
                  }}
                >
                  {state === 'generating_draft' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Drafting Plan...
                    </>
                  ) : (
                    'Draft Plan (AI)'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Creating Project (Simple) */}
          {state === 'creating_project' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mb-4" style={{ color: '#40e0d0' }} />
              <p style={{ color: '#888888' }}>Creating project...</p>
            </div>
          )}

          {/* Generating Draft */}
          {state === 'generating_draft' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mb-4" style={{ color: '#40e0d0' }} />
              <p style={{ color: '#888888' }}>Generating project plan...</p>
              <p className="text-xs" style={{ color: '#666666' }}>
                This may take up to 2.5 minutes. If it takes too long, you can cancel and use "Create Project" to skip AI planning.
              </p>
              <Button
                onClick={() => {
                  setState('collecting_input');
                  setError(null);
                }}
                variant="outline"
                style={{
                  borderColor: '#333333',
                  color: '#e0e0e0',
                  marginTop: '1rem'
                }}
              >
                Cancel & Use "Create Project" Instead
              </Button>
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

