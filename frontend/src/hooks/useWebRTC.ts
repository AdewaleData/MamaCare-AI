import { useRef, useState, useCallback, useEffect } from 'react';

interface UseWebRTCProps {
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  onCallStateChange?: (state: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended') => void;
  sendSignalingMessage: (message: any) => void;
}

export function useWebRTC({
  localVideoRef,
  remoteVideoRef,
  onCallStateChange,
  sendSignalingMessage,
}: UseWebRTCProps) {
  const [callState, setCallState] = useState<'idle' | 'calling' | 'ringing' | 'connected' | 'ended'>('idle');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const isInitiatorRef = useRef(false);

  // ICE servers configuration (using free STUN servers)
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  const updateCallState = useCallback((newState: typeof callState) => {
    setCallState(newState);
    onCallStateChange?.(newState);
  }, [onCallStateChange]);

  // Initialize peer connection
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(iceServers);
    peerConnectionRef.current = pc;

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingMessage({
          type: 'ice-candidate',
          candidate: event.candidate,
        });
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteStreamRef.current = event.streams[0];
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        updateCallState('connected');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        endCall();
      }
    };

    return pc;
  }, [sendSignalingMessage, remoteVideoRef, updateCallState]);

  // Get user media (audio/video)
  const getUserMedia = useCallback(async (video: boolean, audio: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { facingMode: 'user' } : false,
        audio: audio,
      });
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Add tracks to peer connection
      if (peerConnectionRef.current) {
        stream.getTracks().forEach((track) => {
          peerConnectionRef.current?.addTrack(track, stream);
        });
      }

      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }, [localVideoRef]);

  // End call - defined first to avoid initialization order issues
  const endCall = useCallback(() => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Stop remote stream
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    // Send hangup message
    sendSignalingMessage({
      type: 'hangup',
    });

    updateCallState('ended');
    isInitiatorRef.current = false;
  }, [localVideoRef, remoteVideoRef, sendSignalingMessage, updateCallState]);

  // Start a call (initiator)
  const startCall = useCallback(async (video: boolean, audio: boolean) => {
    try {
      isInitiatorRef.current = true;
      updateCallState('calling');
      
      const pc = createPeerConnection();
      await getUserMedia(video, audio);
      setIsVideoEnabled(video);
      setIsAudioEnabled(audio);

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer to remote peer
      sendSignalingMessage({
        type: 'offer',
        offer: offer,
      });
    } catch (error) {
      console.error('Error starting call:', error);
      updateCallState('ended');
      endCall();
    }
  }, [createPeerConnection, getUserMedia, sendSignalingMessage, updateCallState, endCall]);

  // Handle incoming offer
  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit, isVideo: boolean = true) => {
    try {
      updateCallState('ringing');
      
      const pc = createPeerConnection();
      await getUserMedia(isVideo, true); // Accept with audio, video based on call type
      setIsVideoEnabled(isVideo);
      setIsAudioEnabled(true);

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send answer to remote peer
      sendSignalingMessage({
        type: 'answer',
        answer: answer,
      });
    } catch (error) {
      console.error('Error handling offer:', error);
      updateCallState('ended');
      endCall();
    }
  }, [createPeerConnection, getUserMedia, sendSignalingMessage, updateCallState, endCall]);

  // Handle incoming answer
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        updateCallState('connected');
      }
    } catch (error) {
      console.error('Error handling answer:', error);
      updateCallState('ended');
      endCall();
    }
  }, [updateCallState, endCall]);

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, []);


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  return {
    callState,
    isVideoEnabled,
    isAudioEnabled,
    startCall,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    toggleVideo,
    toggleAudio,
    endCall,
  };
}

