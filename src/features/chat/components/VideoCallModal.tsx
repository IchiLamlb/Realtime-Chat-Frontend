import { useEffect, useRef, useState } from 'react';
import { PhoneOff, Phone, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import type { CallStatus } from '../hooks/useWebRTC';

interface VideoCallModalProps {
  callStatus: CallStatus;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callerName: string;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
}

export function VideoCallModal({
  callStatus,
  localStream,
  remoteStream,
  callerName,
  acceptCall,
  rejectCall,
  endCall,
}: VideoCallModalProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  if (callStatus === 'IDLE') {
    return null;
  }

  return (
    <div className="webrtc-modal-overlay">
      <div className="webrtc-video-container">
        {callStatus === 'CONNECTED' ? (
          <>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="webrtc-remote-video"
            />
            <div className="webrtc-local-video-wrapper">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="webrtc-local-video"
              />
            </div>
          </>
        ) : (
          <div className="webrtc-call-status-screen">
            {callStatus === 'RINGING_OUT' && (
              <>
                <p className="webrtc-pulse-text">Calling...</p>
                <div className="webrtc-action-buttons" style={{ marginTop: '20px' }}>
                  <button onClick={endCall} className="webrtc-btn reject" title="Hủy cuộc gọi">
                    <PhoneOff size={32} />
                  </button>
                </div>
              </>
            )}
            {callStatus === 'RINGING_IN' && (
              <>
                <h2>{callerName} is calling...</h2>
                <div className="webrtc-action-buttons">
                  <button onClick={acceptCall} className="webrtc-btn accept">
                    <Phone size={32} />
                  </button>
                  <button onClick={rejectCall} className="webrtc-btn reject">
                    <PhoneOff size={32} />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {callStatus === 'CONNECTED' && (
        <div className="webrtc-controls">
          <button 
            onClick={toggleMute}
            className={`webrtc-control-btn ${isMuted ? 'active' : ''}`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
          <button 
            onClick={toggleVideo}
            className={`webrtc-control-btn ${isVideoOff ? 'active' : ''}`}
            title={isVideoOff ? "Turn on camera" : "Turn off camera"}
          >
            {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
          </button>
          <button 
            onClick={endCall}
            className="webrtc-btn hangup"
            title="End Call"
            style={{ marginLeft: '16px' }}
          >
            <PhoneOff size={28} />
          </button>
        </div>
      )}
    </div>
  );
}
