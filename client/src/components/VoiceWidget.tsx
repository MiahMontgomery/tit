import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  Loader2,
  Bot,
  User,
  AlertCircle
} from 'lucide-react';

interface VoiceWidgetProps {
  projectId: string;
  onVoiceMessage?: (text: string) => void;
  onVoiceResponse?: (audioUrl: string) => void;
}

export function VoiceWidget({ projectId, onVoiceMessage, onVoiceResponse }: VoiceWidgetProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

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

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript);
          if (onVoiceMessage) {
            onVoiceMessage(finalTranscript);
          }
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };
    }
  }, [onVoiceMessage]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      const chunks: BlobPart[] = [];
      mediaRecorderRef.current.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Here you would send the audio to your backend for processing
        // For now, we'll just use speech recognition
        if (recognitionRef.current) {
          recognitionRef.current.start();
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const startCall = () => {
    setIsCallActive(true);
    // In a real implementation, this would establish a WebRTC connection
    console.log('Starting voice call with Jason...');
  };

  const endCall = () => {
    setIsCallActive(false);
    if (isRecording) {
      stopRecording();
    }
    console.log('Ending voice call...');
  };

  const generateVoiceResponse = async (text: string) => {
    if (!elevenLabsApiKey) {
      console.warn('No ElevenLabs API key available for this project');
      return;
    }

    setIsGeneratingVoice(true);
    try {
      const response = await fetch(`/api/input/${projectId}/voice`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-ElevenLabs-Key': elevenLabsApiKey
        },
        body: JSON.stringify({ text, voiceId: 'jason' })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.voicePath) {
          setCurrentAudio(data.voicePath);
          if (onVoiceResponse) {
            onVoiceResponse(data.voicePath);
          }
        }
      } else {
        console.error('Failed to generate voice response:', response.statusText);
      }
    } catch (error) {
      console.error('Error generating voice response:', error);
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const playAudio = () => {
    if (currentAudio && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
  };

  // Show loading state while fetching API key
  if (isLoadingKey) {
    return (
      <Card className="w-full max-w-md">
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

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Voice Communication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ElevenLabs API Key Status */}
        {!elevenLabsApiKey && (
          <div className="p-3 rounded-lg border border-yellow-200 bg-yellow-50">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Voice features disabled</span>
            </div>
            <p className="text-xs text-yellow-700 mt-1">
              Add an ElevenLabs API key to the project to enable voice communication with Jason.
            </p>
          </div>
        )}
        {/* Call Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={isCallActive ? endCall : startCall}
            variant={isCallActive ? "destructive" : "default"}
            size="lg"
            className="h-12 w-12 rounded-full"
            disabled={!elevenLabsApiKey}
          >
            {isCallActive ? <PhoneOff className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
          </Button>
          
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            variant={isRecording ? "destructive" : "outline"}
            size="lg"
            className="h-12 w-12 rounded-full"
            disabled={!isCallActive || !elevenLabsApiKey}
          >
            {isRecording ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>
        </div>

        {/* Status Indicators */}
        <div className="space-y-2">
          {isCallActive && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Voice call active with Jason
            </div>
          )}
          
          {isRecording && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              Recording your voice...
            </div>
          )}

          {transcript && (
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}>
              <p className="text-sm text-gray-700">
                <strong>You said:</strong> {transcript}
              </p>
            </div>
          )}
        </div>

        {/* Audio Controls */}
        {currentAudio && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                onClick={playAudio}
                variant="outline"
                size="sm"
                disabled={isGeneratingVoice}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              
              <Button
                onClick={toggleMute}
                variant="outline"
                size="sm"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              
              <span className="text-sm text-gray-600">Jason's Response</span>
            </div>
            
            <audio
              ref={audioRef}
              src={currentAudio}
              onEnded={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="w-full"
            />
          </div>
        )}

        {/* Voice Generation */}
        <div className="space-y-2">
          <Button
            onClick={() => generateVoiceResponse("Hello! This is Jason. How can I help you today?")}
            disabled={isGeneratingVoice || !elevenLabsApiKey}
            variant="outline"
            className="w-full"
          >
            {isGeneratingVoice ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Bot className="h-4 w-4 mr-2" />
            )}
            Generate Jason's Voice
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Click the phone to start/end a call with Jason</p>
          <p>• Click the microphone to record your voice</p>
          <p>• Jason will respond with voice and text</p>
        </div>
      </CardContent>
    </Card>
  );
}
