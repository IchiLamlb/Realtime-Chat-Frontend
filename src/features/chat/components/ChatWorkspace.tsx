import { useState } from 'react';
import { ChatHeader } from './ChatHeader';
import { MessageComposer } from './MessageComposer';
import { MessageFeed } from './MessageFeed';
import { Sidebar } from './Sidebar';
import { VideoCallModal } from './VideoCallModal';
import { DirectSettingsModal } from './DirectSettingsModal';
import { useChatControllerContext } from '../model/useChatControllerContext';

export function ChatWorkspace() {
  const { session, chat, sidebar } = useChatControllerContext();
  const [showDirectSettings, setShowDirectSettings] = useState(false);

  return (
    <section className="app-grid">
      <Sidebar />
      <section 
        className="chat-panel"
        data-theme={chat.selectedConversation?.theme ?? 'default'}
        style={chat.selectedConversation?.backgroundColor ? { backgroundColor: chat.selectedConversation.backgroundColor } : {}}
      >
        <ChatHeader startCall={chat.webrtc.startCall} openDirectSettings={() => setShowDirectSettings(true)} />
        <MessageFeed />
        <MessageComposer />
      </section>
      <VideoCallModal {...chat.webrtc} />
      <DirectSettingsModal show={showDirectSettings} onClose={() => setShowDirectSettings(false)} />
    </section>
  );
}
