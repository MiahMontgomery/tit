import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Check, X } from 'lucide-react';
import { fetchApi } from '@/lib/queryClient';
import './project-modal.css';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectModal({ isOpen, onClose }: ProjectModalProps) {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    setName("");
    setPrompt("");
    setElevenLabsApiKey("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !prompt.trim()) return;

    setIsLoading(true);
    try {
      // Create project directly - backend will generate features and hierarchy
      const response = await fetchApi(`/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: `Project: ${name}\n\n${prompt}`,
          prompt: prompt.trim(),
          elevenLabsApiKey: elevenLabsApiKey.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to create project');
      }

      const data = await response.json();
      console.log('Project created:', data);
      
      // Extract project from response (handles both { ok: true, project } and { project } formats)
      const project = data.project || data.data || data;
      const projectId = project.id;
      
      if (!projectId) {
        throw new Error('Project created but no ID returned');
      }
      
      // Close modal and navigate to the project page
      handleClose();
      setLocation(`/projects/${projectId}`);
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold" style={{ color: '#e0e0e0' }}>Create New Project</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              style={{ color: '#888888' }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name" className="text-sm font-medium" style={{ color: '#e0e0e0' }}>
                Project Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter project name"
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
              <Label htmlFor="prompt" className="text-sm font-medium" style={{ color: '#e0e0e0' }}>
                Project Description
              </Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to build..."
                className="mt-1 min-h-[120px]"
                style={{ 
                  backgroundColor: '#111111', 
                  borderColor: '#333333', 
                  color: '#e0e0e0' 
                }}
                required
              />
            </div>

            <div>
              <Label htmlFor="elevenLabsApiKey" className="text-sm font-medium" style={{ color: '#e0e0e0' }}>
                ElevenLabs API Key (Optional)
              </Label>
              <Input
                id="elevenLabsApiKey"
                type="password"
                value={elevenLabsApiKey}
                onChange={(e) => setElevenLabsApiKey(e.target.value)}
                placeholder="Enter your ElevenLabs API key for voice features"
                className="mt-1"
                style={{ 
                  backgroundColor: '#111111', 
                  borderColor: '#333333', 
                  color: '#e0e0e0' 
                }}
              />
              <p className="text-xs mt-1" style={{ color: '#888888' }}>
                Get your API key from <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" style={{ color: '#40e0d0' }}>elevenlabs.io</a> to enable voice communication with Jason
              </p>
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
                type="submit"
                disabled={isLoading}
                style={{
                  backgroundColor: '#40e0d0',
                  color: '#000000'
                }}
              >
                {isLoading ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}