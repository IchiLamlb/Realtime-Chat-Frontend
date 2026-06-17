import { useState, useEffect, useRef, useCallback, Dispatch, SetStateAction } from 'react';
import type { WebRTCSignalEvent, User } from '../../../types';

export type CallStatus = 'IDLE' | 'RINGING_OUT' | 'RINGING_IN' | 'CONNECTED';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const formatCallDuration = (seconds: number) => {
  if (seconds < 60) {
    return `${seconds} giây`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

interface UseWebRTCOptions {
  me: User | null;
  webrtcSignalEvent: WebRTCSignalEvent | null;
  setWebrtcSignalEvent: Dispatch<SetStateAction<WebRTCSignalEvent | null>>;
  sendWebRTCSignal: (payload: { conversationId: string; type: string; payload: string }) => void;
  selectedConversationId: string | null;
  usersById: Map<string, User>;
  onCallLog: (content: string) => void;
}

export function useWebRTC({
  me,
  webrtcSignalEvent,
  setWebrtcSignalEvent,
  sendWebRTCSignal,
  selectedConversationId,
  usersById,
  onCallLog,
}: UseWebRTCOptions) {
  const [callStatus, setCallStatus] = useState<CallStatus>('IDLE');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callerName, setCallerName] = useState<string>('');
  
  const remoteUserIdRef = useRef<string | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);

  const isCallerRef = useRef<boolean>(false);
  const callConnectedTimeRef = useRef<number>(0);
  const callStatusRef = useRef<CallStatus>('IDLE');

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  const logCall = useCallback(() => {
    if (!isCallerRef.current) return;
    
    const prevStatus = callStatusRef.current;
    if (prevStatus === 'IDLE') return;

    let logContent = 'Cuộc gọi thoại bị nhỡ';
    if (prevStatus === 'CONNECTED' && callConnectedTimeRef.current > 0) {
      const durationSeconds = Math.max(0, Math.floor((Date.now() - callConnectedTimeRef.current) / 1000));
      logContent = `Cuộc gọi thoại - ${formatCallDuration(durationSeconds)}`;
    }

    onCallLog(logContent);
  }, [onCallLog]);

  const cleanup = useCallback(() => {
    logCall();

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus('IDLE');
    setCallerName('');
    remoteUserIdRef.current = null;
    callConnectedTimeRef.current = 0;
  }, [localStream, logCall]);

  const initPeerConnection = useCallback(() => {
    if (peerConnection.current) {
      peerConnection.current.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnection.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && selectedConversationId) {
        sendWebRTCSignal({
          conversationId: selectedConversationId,
          type: 'ICE_CANDIDATE',
          payload: JSON.stringify(event.candidate),
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    return pc;
  }, [selectedConversationId, sendWebRTCSignal]);

  const startCall = useCallback(async () => {
    if (!selectedConversationId || !me) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      
      const pc = initPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendWebRTCSignal({
        conversationId: selectedConversationId,
        type: 'OFFER',
        payload: JSON.stringify(offer),
      });

      isCallerRef.current = true;
      callConnectedTimeRef.current = 0;

      setCallStatus('RINGING_OUT');
    } catch (err) {
      console.error('Error starting call:', err);
      cleanup();
    }
  }, [initPeerConnection, me, selectedConversationId, sendWebRTCSignal, cleanup]);

  const acceptCall = useCallback(async () => {
    if (!selectedConversationId || !peerConnection.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      
      const pc = peerConnection.current;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendWebRTCSignal({
        conversationId: selectedConversationId,
        type: 'ANSWER',
        payload: JSON.stringify(answer),
      });

      callConnectedTimeRef.current = Date.now();
      setCallStatus('CONNECTED');
    } catch (err) {
      console.error('Error accepting call:', err);
      cleanup();
    }
  }, [selectedConversationId, sendWebRTCSignal, cleanup]);

  const rejectCall = useCallback(() => {
    if (selectedConversationId) {
      sendWebRTCSignal({
        conversationId: selectedConversationId,
        type: 'REJECT',
        payload: '{}',
      });
    }
    cleanup();
  }, [selectedConversationId, sendWebRTCSignal, cleanup]);

  const endCall = useCallback(() => {
    if (selectedConversationId && callStatus !== 'IDLE') {
      sendWebRTCSignal({
        conversationId: selectedConversationId,
        type: 'HANGUP',
        payload: '{}',
      });
    }
    cleanup();
  }, [callStatus, selectedConversationId, sendWebRTCSignal, cleanup]);

  // Handle incoming signals
  useEffect(() => {
    if (!webrtcSignalEvent || !me || webrtcSignalEvent.senderId === me.id) {
      return;
    }

    if (webrtcSignalEvent.conversationId !== selectedConversationId) {
      return;
    }

    const handleSignal = async () => {
      const { type, payload, senderId } = webrtcSignalEvent;
      let data: any = {};
      try {
        data = JSON.parse(payload);
      } catch (e) {
        console.error('Failed to parse WebRTC signal payload', e);
        return;
      }

      const pc = peerConnection.current;

      switch (type) {
        case 'OFFER': {
          if (callStatus !== 'IDLE') return;
          
          remoteUserIdRef.current = senderId;
          const caller = usersById.get(senderId);
          setCallerName(caller?.displayName || 'Someone');
          
          isCallerRef.current = false;
          callConnectedTimeRef.current = 0;

          const newPc = initPeerConnection();
          await newPc.setRemoteDescription(new RTCSessionDescription(data));
          setCallStatus('RINGING_IN');
          break;
        }
        case 'ANSWER': {
          if (callStatus === 'RINGING_OUT' && pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(data));
            callConnectedTimeRef.current = Date.now();
            setCallStatus('CONNECTED');
          }
          break;
        }
        case 'ICE_CANDIDATE': {
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(data));
          }
          break;
        }
        case 'REJECT':
        case 'HANGUP': {
          cleanup();
          break;
        }
      }
    };

    void handleSignal();
    setWebrtcSignalEvent(null);
  }, [webrtcSignalEvent, me, selectedConversationId, callStatus, initPeerConnection, setWebrtcSignalEvent, usersById, cleanup]);

  return {
    callStatus,
    localStream,
    remoteStream,
    callerName,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
  };
}
