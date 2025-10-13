import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Bot,
  AlertCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';

interface ElevenLabsWidgetProps {
  projectId: string;
}

export function ElevenLabsWidget({ projectId }: ElevenLabsWidgetProps) {
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const [widgetError, setWidgetError] = useState<string | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Fetch ElevenLabs API key for this project
  const { data: elevenLabsData, isLoading: isLoadingKey } = useQuery({
    queryKey: ['elevenlabs-key', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/elevenlabs-key`);
      if (!response.ok) {
        throw new Error('Failed to fetch ElevenLabs key');
      }
      return response.json();
    },
    retry: false
  });

  const elevenLabsApiKey = elevenLabsData?.elevenLabsApiKey;

  useEffect(() => {
    if (!elevenLabsApiKey || widgetLoaded) return;

    // Load ElevenLabs widget script and create the widget
    const script = document.createElement('script');
    script.src = 'https://elevenlabs.io/elevenlabs-conversational-ai-widget.js';
    script.async = true;
    
    script.onload = () => {
      try {
        // Create the widget using the ElevenLabs API
        if (window.ElevenLabs && widgetRef.current) {
          // Clear the container first
          widgetRef.current.innerHTML = '';
          
          // Create the widget element
          const widgetElement = document.createElement('div');
          widgetElement.setAttribute('data-elevenlabs-agent-id', 'jason');
          widgetElement.setAttribute('data-elevenlabs-api-key', elevenLabsApiKey);
          widgetElement.setAttribute('data-elevenlabs-theme', 'dark');
          widgetElement.setAttribute('data-elevenlabs-position', 'embedded');
          widgetElement.style.width = '100%';
          widgetElement.style.height = '400px';
          widgetElement.style.borderRadius = '8px';
          
          widgetRef.current.appendChild(widgetElement);
          
          // Initialize the widget
          if (window.ElevenLabs.init) {
            window.ElevenLabs.init();
          }
          
          setWidgetLoaded(true);
        }
      } catch (error) {
        console.error('Error initializing ElevenLabs widget:', error);
        setWidgetError('Failed to initialize voice widget');
      }
    };

    script.onerror = () => {
      setWidgetError('Failed to load ElevenLabs widget script');
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [elevenLabsApiKey, widgetLoaded]);

  // Show loading state while fetching API key
  if (isLoadingKey) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Voice Communication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading voice settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error if no API key
  if (!elevenLabsApiKey) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Voice Communication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-lg border border-yellow-200 bg-yellow-50">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Voice widget disabled</span>
            </div>
            <p className="text-xs text-yellow-700 mt-1">
              Add an ElevenLabs API key to the project to enable voice communication with Jason.
            </p>
            <a 
              href="https://elevenlabs.io" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-yellow-700 hover:text-yellow-800 mt-2"
            >
              Get API key <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error if widget failed to load
  if (widgetError) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Voice Communication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-lg border border-red-200 bg-red-50">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Widget Error</span>
            </div>
            <p className="text-xs text-red-700 mt-1">
              {widgetError}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show the widget container
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Voice Communication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600 mb-2">
          Chat with Jason using voice or text
        </div>
        <div 
          ref={widgetRef}
          className="w-full h-96 border rounded-lg"
          style={{ 
            borderColor: '#333333',
            backgroundColor: '#0f0f0f',
            minHeight: '400px'
          }}
        >
          {!widgetLoaded && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-500">Loading voice widget...</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Extend the Window interface to include ElevenLabs
declare global {
  interface Window {
    ElevenLabs: {
      init: () => void;
    };
  }
}
