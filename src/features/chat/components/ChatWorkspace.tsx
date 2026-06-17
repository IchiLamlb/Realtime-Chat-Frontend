import { useState } from 'react';
import { ChatHeader } from './ChatHeader';
import { MessageComposer } from './MessageComposer';
import { MessageFeed } from './MessageFeed';
import { Sidebar } from './Sidebar';
import { VideoCallModal } from './VideoCallModal';
import { DirectSettingsModal } from './DirectSettingsModal';
import { useWebRTC } from '../hooks/useWebRTC';
import { useChatControllerContext } from '../model/useChatControllerContext';

export function ChatWorkspace() {
  const { session, chat, sidebar } = useChatControllerContext();
  const [showDirectSettings, setShowDirectSettings] = useState(false);
  
  const webrtc = useWebRTC({
    me: session.me,
    webrtcSignalEvent: chat.webrtcSignalEvent,
    setWebrtcSignalEvent: chat.setWebrtcSignalEvent,
    sendWebRTCSignal: chat.sendWebRTCSignal,
    selectedConversationId: chat.selectedConversationId,
    usersById: sidebar.usersById,
  });

  return (
    <section className="app-grid">
      <Sidebar />
      <section 
        className="chat-panel"
        data-theme={chat.selectedConversation?.theme ?? 'default'}
        style={chat.selectedConversation?.backgroundColor ? { backgroundColor: chat.selectedConversation.backgroundColor } : {}}
      >
        <ChatHeader startCall={webrtc.startCall} openDirectSettings={() => setShowDirectSettings(true)} />
        <MessageFeed />
        <MessageComposer />
      </section>
      <VideoCallModal {...webrtc} />
      <DirectSettingsModal show={showDirectSettings} onClose={() => setShowDirectSettings(false)} />
    </section>
  );
}
