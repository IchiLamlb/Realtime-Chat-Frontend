import { ChatHeader } from './ChatHeader';
import { MessageComposer } from './MessageComposer';
import { MessageFeed } from './MessageFeed';
import { Sidebar } from './Sidebar';
import { VideoCallModal } from './VideoCallModal';
import { useWebRTC } from '../hooks/useWebRTC';
import { useChatControllerContext } from '../model/useChatControllerContext';

export function ChatWorkspace() {
  const { session, chat, sidebar } = useChatControllerContext();
  
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
      <section className="chat-panel">
        <ChatHeader startCall={webrtc.startCall} />
        <MessageFeed />
        <MessageComposer />
      </section>
      <VideoCallModal {...webrtc} />
    </section>
  );
}
