import { useEffect, useRef, useState } from 'react';
import { api } from '../../../api';
import type { ChatMessage } from '../../../types';

interface UseVoiceRecorderOptions {
  token: string | null;
  selectedConversationId: string | null;
  onMessageStored: (message: ChatMessage) => void;
  setAttachmentUploading: (uploading: boolean) => void;
  setError: (message: string | null) => void;
  setStatus: (message: string) => void;
}

export function useVoiceRecorder({
  token,
  selectedConversationId,
  onMessageStored,
  setAttachmentUploading,
  setError,
  setStatus,
}: UseVoiceRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      } catch {
        recorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(10);
      setIsRecording(true);
      setRecordingDuration(0);

      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration((previous) => previous + 1);
      }, 1000);

      setStatus('Recording...');
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not access microphone');
    }
  }

  async function stopRecording(shouldSend: boolean) {
    if (!mediaRecorderRef.current || !isRecording) {
      return;
    }

    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    const stopPromise = new Promise<void>((resolve) => {
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((track) => track.stop());
        resolve();
      };
    });

    recorder.stop();
    await stopPromise;

    setIsRecording(false);
    setStatus('Ready');

    if (shouldSend) {
      const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      if (audioBlob.size === 0) {
        setError('Recording is empty');
        return;
      }

      const fileExtension = recorder.mimeType?.includes('ogg')
        ? 'ogg'
        : recorder.mimeType?.includes('wav')
          ? 'wav'
          : 'webm';
      const file = new File([audioBlob], `voice-message-${Date.now()}.${fileExtension}`, {
        type: audioBlob.type,
      });

      if (!token || !selectedConversationId) {
        return;
      }

      setAttachmentUploading(true);
      setError(null);
      try {
        const sent = await api.sendAttachment(token, {
          conversationId: selectedConversationId,
          file,
        });
        onMessageStored(sent);
        setStatus('Voice message sent');
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Failed to send voice message');
      } finally {
        setAttachmentUploading(false);
      }
    }

    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  }

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  return {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
  };
}
