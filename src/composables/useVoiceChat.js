import { ref } from 'vue';
import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';

export function useVoiceChat() {
  const isRecording = ref(false);
  const isConnected = ref(false);
  const isSpeaking = ref(false);
  const transcript = ref('');
  
  let session = null;

  const connect = async () => {
    try {
      // Get ephemeral token from backend
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/voice/session`, {
        method: 'POST',
      });
      
      const { ephemeralKey } = await response.json();
      
      // Create agent with CV context
      const agent = new RealtimeAgent({
        name: "Oka's Assistant",
        instructions: 'You are a helpful assistant for Oka\'s portfolio website.',
      });

      // Create session
      session = new RealtimeSession(agent, {
        model: 'gpt-realtime',
      });

      // Set up event listeners
      session.on('connected', () => {
        console.log('Connected to Realtime API');
        isConnected.value = true;
      });

      session.on('disconnected', () => {
        console.log('Disconnected from Realtime API');
        isConnected.value = false;
      });

      session.on('input_audio_buffer.speech_started', () => {
        console.log('User started speaking');
      });

      session.on('input_audio_buffer.speech_stopped', () => {
        console.log('User stopped speaking');
      });

      session.on('response.audio_transcript.delta', (event) => {
        transcript.value = event.delta;
      });

      session.on('response.audio.delta', () => {
        isSpeaking.value = true;
      });

      session.on('response.done', () => {
        isSpeaking.value = false;
      });

      // Connect to the API (automatically handles microphone and audio in browser via WebRTC)
      await session.connect({ apiKey: ephemeralKey });
      
    } catch (error) {
      console.error('Error connecting:', error);
    }
  };

  const startRecording = () => {
    // RealtimeSession automatically handles microphone access
    // Just update UI state
    isRecording.value = true;
  };

  const stopRecording = () => {
    // RealtimeSession automatically handles recording
    // Just update UI state
    isRecording.value = false;
  };

  const disconnect = async () => {
    if (session) {
      await session.disconnect();
      session = null;
    }
  };

  return {
    isRecording,
    isConnected,
    isSpeaking,
    transcript,
    connect,
    disconnect,
    startRecording,
    stopRecording,
  };
}