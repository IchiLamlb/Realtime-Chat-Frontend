import { useChatControllerContext } from '../model/useChatControllerContext';
import { MessageItem } from './MessageItem';

export function MessageFeed() {
  const { chat } = useChatControllerContext();

  return (
    <div ref={chat.messageFeedRef} className="message-feed" onScroll={chat.handleScroll}>
      {chat.loading && chat.messages.length > 0 && (
        <div className="pagination-bar">
          <span className="pagination-loader">Loading older messages...</span>
        </div>
      )}
      {chat.loading && chat.messages.length === 0 && <div className="empty-state">Loading...</div>}
      {!chat.loading && chat.visibleMessages.length === 0 && (
        <div className="empty-state">No messages yet. Start the thread.</div>
      )}
      {chat.visibleMessages.map((message, index) => (
        <MessageItem key={message.id} message={message} index={index} />
      ))}
      <div ref={chat.messagesEndRef} />
    </div>
  );
}
