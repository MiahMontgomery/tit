import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export class VoiceService {
  private elevenlabs: ElevenLabsClient;
  private voiceCache: Map<string, string> = new Map();

  constructor() {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ ElevenLabs API key not found. Voice features will be disabled.');
      this.elevenlabs = null as any;
    } else {
      this.elevenlabs = new ElevenLabsClient({
        apiKey: apiKey
      });
    }
  }

  async generateVoice(text: string, voiceId: string = 'jason', projectId?: string, apiKey?: string): Promise<string | null> {
    try {
      // Use project-specific API key if provided, otherwise fall back to global key
      const effectiveApiKey = apiKey || process.env.ELEVENLABS_API_KEY;
      
      if (!effectiveApiKey) {
        console.warn('ElevenLabs API key not configured for project');
        return null;
      }

      // Create a new client instance with the effective API key
      const elevenlabsClient = new ElevenLabsClient({
        apiKey: effectiveApiKey
      });

      // Check cache first
      const cacheKey = `${voiceId}-${text.substring(0, 50)}`;
      if (this.voiceCache.has(cacheKey)) {
        return this.voiceCache.get(cacheKey)!;
      }

      console.log(`🎙️ Generating voice for text: ${text.substring(0, 50)}...`);

      // Generate audio
      const audio = await elevenlabsClient.textToSpeech.convert({
        voice_id: voiceId,
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
          style: 0.0,
          use_speaker_boost: true
        }
      });

      // Create voices directory
      const voicesDir = join(process.cwd(), 'data', 'voices', projectId || 'default');
      mkdirSync(voicesDir, { recursive: true });

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `voice_${voiceId}_${timestamp}.mp3`;
      const filePath = join(voicesDir, filename);

      // Convert audio to buffer and save
      const audioBuffer = Buffer.from(await audio.arrayBuffer());
      writeFileSync(filePath, audioBuffer);

      // Cache the result
      const webPath = `/voices/${projectId || 'default'}/${filename}`;
      this.voiceCache.set(cacheKey, webPath);

      console.log(`✅ Voice generated: ${webPath}`);
      return webPath;

    } catch (error) {
      console.error('Error generating voice:', error);
      return null;
    }
  }

  async generateJasonVoice(text: string, projectId?: string, apiKey?: string): Promise<string | null> {
    // Use a specific voice ID for Jason (you can configure this)
    const jasonVoiceId = process.env.JASON_VOICE_ID || 'jason';
    return this.generateVoice(text, jasonVoiceId, projectId, apiKey);
  }

  async generateStatusUpdate(status: any, projectId?: string, apiKey?: string): Promise<string | null> {
    const statusText = this.formatStatusUpdate(status);
    return this.generateJasonVoice(statusText, projectId, apiKey);
  }

  private formatStatusUpdate(status: any): string {
    const { projects, totalFeatures, completedFeatures, completionRate, systemHealth, recentDecisions } = status;
    
    let text = `Good day! This is Jason with your Titan status update.\n\n`;
    
    text += `I'm currently managing ${projects} active project${projects !== 1 ? 's' : ''} with ${totalFeatures} total features.\n`;
    text += `${completedFeatures} features have been completed, giving us a ${completionRate}% completion rate.\n\n`;
    
    text += `System health is ${systemHealth}. I've made ${recentDecisions.length} key decisions recently.\n\n`;
    
    if (recentDecisions.length > 0) {
      text += `Recent decisions include:\n`;
      recentDecisions.slice(0, 3).forEach((decision: any, index: number) => {
        text += `${index + 1}. ${decision.situation}: ${decision.decision}\n`;
      });
      text += `\n`;
    }
    
    text += `I'm continuing to optimize the system and ensure all projects are progressing smoothly.\n`;
    text += `No immediate action is required from you at this time.\n\n`;
    
    text += `I'll continue monitoring and will reach out if I need your input.`;
    
    return text;
  }

  // Get available voices
  async getVoices(): Promise<any[]> {
    try {
      if (!this.elevenlabs || !process.env.ELEVENLABS_API_KEY) {
        return [];
      }

      const voices = await this.elevenlabs.voices.getAll();
      return voices.voices || [];
    } catch (error) {
      console.error('Error fetching voices:', error);
      return [];
    }
  }

  // Clear cache
  clearCache(): void {
    this.voiceCache.clear();
  }
}

export const voiceService = new VoiceService();
