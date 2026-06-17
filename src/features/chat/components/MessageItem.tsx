import { CornerUpLeft, FileText, MoreHorizontal, Smile } from 'lucide-react';
import type { ChatMessage } from '../../../types';
import { AudioPlayer } from '../../../shared/components/AudioPlayer';
import { formatClockTime, formatFileSize, initials } from '../../../shared/lib/formatters';
import {
  bubbleClass,
  groupReactions,
  isSameSenderCluster,
  parseReplyPreview,
  replyFallbackLabel,
} from '../lib/messages';
import { useChatControllerContext } from '../model/useChatControllerContext';
import { MessageStatusMark } from './MessageStatusMark';
import { ReactionPicker } from './ReactionPicker';

interface MessageItemProps {
  message: ChatMessage;
  index: number;
}

export function MessageItem({ message, index }: MessageItemProps) {
  const { chat, session, sidebar } = useChatControllerContext();
  const me = session.me;

  if (!me) {
    return null;
  }

  if (message.type === 'SYSTEM') {
    return (
      <div className="system-message-row">
        <span>{message.content}</span>
      </div>
    );
  }

  const mine = message.senderId === me.id;
  const sender = sidebar.usersById.get(message.senderId);
  const metadata = message.metadata ?? {};
  const attachmentUrl = typeof metadata.url === 'string' ? metadata.url : '';
  const attachmentName = typeof metadata.originalName === 'string' ? metadata.originalName : message.content;
  const attachmentSize = formatFileSize(metadata.size);
  const contentType = typeof metadata.contentType === 'string' ? metadata.contentType : '';
  const replyTo = parseReplyPreview(metadata.replyTo);
  const deleted = message.status === 'DELETED';
  const previousMessage = index > 0 ? chat.visibleMessages[index - 1] : null;
  const nextMessage = index < chat.visibleMessages.length - 1 ? chat.visibleMessages[index + 1] : null;
  const isPrevSame = isSameSenderCluster(message, previousMessage);
  const isNextSame = isSameSenderCluster(message, nextMessage);
  const messageReactions = message.reactions ?? [];
  const reactionsMap = groupReactions(messageReactions);

  return (
    <div
      id={`message-${message.id}`}
      className={`message-row ${mine ? 'mine' : ''} ${isPrevSame ? 'consecutive' : ''}`}
    >
      {!mine && !isPrevSame && (
        <div className="message-avatar" title={sender?.displayName ?? 'Member'}>
          {sender?.avatarUrl ? (
            <img src={sender.avatarUrl} alt={sender.displayName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            initials(sender?.displayName ?? 'Member')
          )}
        </div>
      )}
      <div className="message-bubble-wrapper">
        {!mine && !isPrevSame && <span className="message-sender-name">{sender?.displayName ?? 'Member'}</span>}

        <div className="message-bubble-container">
          <article className={`message-bubble ${mine ? 'mine' : ''} ${bubbleClass(isPrevSame, isNextSame)}`}>
            {replyTo && (
              <button
                type="button"
                className="message-reply-preview"
                onClick={() =>
                  document.getElementById(`message-${replyTo.id}`)?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                  })
                }
              >
                <strong>{replyTo.senderName}</strong>
                <span>{replyTo.content || replyFallbackLabel(replyTo.type)}</span>
              </button>
            )}
            {deleted ? (
              <p className="message-content deleted-message">Tin nhắn đã bị xóa</p>
            ) : message.type === 'IMAGE' && attachmentUrl ? (
              <a className="image-attachment" href={attachmentUrl} target="_blank" rel="noreferrer">
                <img src={attachmentUrl} alt={attachmentName} />
                {message.content && message.content !== attachmentName && (
                  <span className="message-content">{message.content}</span>
                )}
              </a>
            ) : message.type === 'FILE' && attachmentUrl ? (
              contentType.startsWith('audio/') ? (
                <AudioPlayer src={attachmentUrl} />
              ) : (
                <a
                  className="file-attachment"
                  href={attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={attachmentName}
                >
                  <FileText size={22} />
                  <span>
                    <strong>{attachmentName}</strong>
                    {attachmentSize && <small>{attachmentSize}</small>}
                  </span>
                </a>
              )
            ) : (
              <p className="message-content">{message.content}</p>
            )}
            <div className="message-info">
              <time className="message-time">{formatClockTime(message.createdAt)}</time>
              {mine && <MessageStatusMark status={message.status} />}
            </div>
          </article>

          {!deleted && (
            <div
              className={`message-actions ${
                chat.activeMessageMenuId === message.id || chat.activeReactionPickerMessageId === message.id
                  ? 'active'
                  : ''
              }`}
            >
              <button
                type="button"
                className="message-action-btn"
                title="Trả lời"
                onClick={() => chat.handleStartReply(message)}
              >
                <CornerUpLeft size={16} />
              </button>
              <button
                type="button"
                className="message-action-btn reaction-trigger-btn"
                title="Thả cảm xúc"
                onClick={() => {
                  if (chat.activeReactionPickerMessageId === message.id) {
                    chat.setActiveReactionPickerMessageId(null);
                    chat.setShowFullPicker(false);
                  } else {
                    chat.setActiveReactionPickerMessageId(message.id);
                    chat.setActiveMessageMenuId(null);
                    chat.setShowFullPicker(false);
                    chat.setActiveCategoryIndex(0);
                  }
                }}
              >
                <Smile size={16} />
              </button>
              <div className="message-menu-wrap">
                <button
                  type="button"
                  className="message-action-btn message-menu-trigger"
                  title="Tùy chọn"
                  onClick={() => {
                    chat.setActiveMessageMenuId(chat.activeMessageMenuId === message.id ? null : message.id);
                    chat.setActiveReactionPickerMessageId(null);
                    chat.setShowFullPicker(false);
                  }}
                >
                  <MoreHorizontal size={17} />
                </button>
                {chat.activeMessageMenuId === message.id && (
                  <div className="message-more-menu">
                    <button type="button" onClick={() => chat.handleDeleteForMe(message.id)}>
                      Xóa phía mình
                    </button>
                    <button
                      type="button"
                      className="danger"
                      disabled={!mine}
                      title={mine ? 'Xóa tin nhắn với mọi người' : 'Chỉ người gửi mới xóa được với tất cả'}
                      onClick={() => void chat.handleDeleteForEveryone(message.id)}
                    >
                      Xóa tất cả
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {chat.activeReactionPickerMessageId === message.id && (
            <ReactionPicker message={message} reactions={messageReactions} />
          )}
        </div>

        {!deleted && reactionsMap.size > 0 && (
          <div className={`message-reactions ${mine ? 'mine' : ''}`}>
            {[...reactionsMap.entries()].map(([emoji, list]) => {
              const hasReacted = list.some((reaction) => reaction.userId === me.id);
              const names = list.map((reaction) => reaction.displayName).join(', ');
              return (
                <button
                  key={emoji}
                  className={`reaction-badge ${hasReacted ? 'reacted' : ''}`}
                  title={names}
                  onClick={() => void chat.handleReact(message.id, emoji)}
                >
                  <span className="reaction-emoji">{emoji}</span>
                  <span className="reaction-count">{list.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
