import { ref } from 'vue';

export function useVoiceChat() {
  const isRecording = ref(false);
  const isConnected = ref(false);
  const isSpeaking = ref(false);
  const transcript = ref('');
  
  let peerConnection = null;
  let dataChannel = null;
  let audioElement = null;

  const connect = async () => {
    try {
      // Get ephemeral token and instructions from backend
      const apiUrl = process.env.VUE_APP_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/voice/session`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to get session token');
      }
      
      const { ephemeralKey, instructions } = await response.json();
      console.log('Got ephemeral key, connecting to OpenAI...');
      
      // Create RTCPeerConnection
      peerConnection = new RTCPeerConnection();
      
      // Set up audio element for playback
      audioElement = document.createElement('audio');
      audioElement.autoplay = true;
      
      // Add audio handling
      peerConnection.ontrack = (event) => {
        console.log('Received audio track');
        audioElement.srcObject = event.streams[0];
        isSpeaking.value = true;
      };
      
      // Create data channel for messages
      dataChannel = peerConnection.createDataChannel('oai-events');
      
      dataChannel.onopen = () => {
        console.log('Data channel opened');
        isConnected.value = true;
        
        // Send session update with instructions
        const sessionUpdate = {
          type: 'session.update',
          session: {
            instructions: instructions,
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            turn_detection: {
              type: 'server_vad'
            }
          }
        };
        dataChannel.send(JSON.stringify(sessionUpdate));
      };
      
      dataChannel.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log('Received message:', message.type);
        
        if (message.type === 'response.audio_transcript.delta') {
          transcript.value += message.delta;
        } else if (message.type === 'response.audio.done') {
          isSpeaking.value = false;
        }
      };
      
      // Add microphone track
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });
      
      // Create and set local description
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      // Send offer to OpenAI
      const sdpResponse = await fetch('https://api.openai.com/v1/realtime', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp'
        },
        body: offer.sdp
      });
      
      if (!sdpResponse.ok) {
        throw new Error('Failed to connect to OpenAI Realtime API');
      }
      
      const answerSdp = await sdpResponse.text();
      await peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp
      });
      
      console.log('Connected to OpenAI Realtime API');
      
    } catch (error) {
      console.error('Error connecting:', error);
      isConnected.value = false;
    }
  };

  const startRecording = () => {
    isRecording.value = true;
  };

  const stopRecording = () => {
    isRecording.value = false;
  };

  const disconnect = async () => {
    if (dataChannel) {
      dataChannel.close();
    }
    if (peerConnection) {
      peerConnection.close();
    }
    if (audioElement) {
      audioElement.srcObject = null;
    }
    isConnected.value = false;
    isSpeaking.value = false;
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