import { Radio, Settings, Video } from 'lucide-react';
import { conversationLabel, directConversationPresence } from '../lib/conversations';
import { useChatControllerContext } from '../model/useChatControllerContext';

interface ChatHeaderProps {
  startCall?: () => void;
}

export function ChatHeader({ startCall }: ChatHeaderProps = {}) {
  const { chat, group, session, sidebar } = useChatControllerContext();
  const { selectedConversation } = chat;

  return (
    <header className="chat-header">
      <div>
        <span className="eyebrow">Current room</span>
        <h2>
          {selectedConversation
            ? conversationLabel(selectedConversation, sidebar.usersById, session.me)
            : 'Select a conversation'}
        </h2>
        {selectedConversation && selectedConversation.type === 'DIRECT' && (
          <div className="presence-container">
            {(() => {
              const status = directConversationPresence(selectedConversation, session.me, sidebar.presenceMap) ?? 'OFFLINE';
              return (
                <span className="presence-text">
                  <span className={`presence-dot ${status.toLowerCase()}`} />
                  {status.toLowerCase()}
                </span>
              );
            })()}
          </div>
        )}
      </div>
      <div className="chat-header-actions">
        {selectedConversation && selectedConversation.type === 'DIRECT' && startCall && (
          <button className="icon-button" title="Video Call" onClick={startCall}>
            <Video size={18} />
          </button>
        )}
        {selectedConversation && selectedConversation.type === 'GROUP' && (
          <button className="icon-button" title="Group Settings" onClick={group.open}>
            <Settings size={18} />
          </button>
        )}
        <div className={`live-pill ${chat.socketConnected ? 'on' : ''}`}>
          <Radio size={15} />
          {chat.socketConnected ? 'Realtime' : 'REST fallback'}
        </div>
      </div>
    </header>
  );
}
