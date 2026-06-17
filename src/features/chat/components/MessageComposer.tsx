import { Mic, Paperclip, Send, Trash2, X } from 'lucide-react';
import { formatDuration } from '../../../shared/lib/formatters';
import { replyFallbackLabel } from '../lib/messages';
import { useChatControllerContext } from '../model/useChatControllerContext';

export function MessageComposer() {
  const { chat } = useChatControllerContext();
  const composerStatus = chat.activeTypers ? `${chat.activeTypers} is typing...` : chat.status;

  return (
    <>
      <div className="typing-line">{composerStatus}</div>

      {chat.isRecording ? (
        <div className="composer recording-mode">
          <button
            type="button"
            className="recording-cancel-btn"
            title="Hủy ghi âm"
            onClick={() => void chat.stopRecording(false)}
          >
            <Trash2 size={18} />
          </button>
          <div className="recording-status">
            <span className="recording-indicator" />
            <span className="recording-timer">{formatDuration(chat.recordingDuration)}</span>
          </div>
          <button
            type="button"
            className="recording-send-btn animate-pulse"
            title="Gửi ghi âm"
            onClick={() => void chat.stopRecording(true)}
            disabled={chat.attachmentUploading}
          >
            {chat.attachmentUploading ? 'Sending...' : <Send size={18} />}
            Gửi
          </button>
        </div>
      ) : (
        <form className="composer" onSubmit={chat.sendMessage}>
          {chat.replyingTo && (
            <div className="composer-reply-preview">
              <div>
                <strong>Đang trả lời {chat.replyingTo.senderName}</strong>
                <span>{chat.replyingTo.content || replyFallbackLabel(chat.replyingTo.type)}</span>
              </div>
              <button type="button" title="Hủy trả lời" onClick={() => chat.setReplyingTo(null)}>
                <X size={16} />
              </button>
            </div>
          )}
          <button
            type="button"
            className="attach-button"
            title="Attach file"
            disabled={!chat.selectedConversationId || chat.attachmentUploading}
            onClick={() => chat.fileInputRef.current?.click()}
          >
            <Paperclip size={18} />
          </button>
          <button
            type="button"
            className="attach-button mic-button"
            title="Ghi âm"
            disabled={!chat.selectedConversationId || chat.attachmentUploading}
            onClick={() => void chat.startRecording()}
          >
            <Mic size={18} />
          </button>
          <input
            ref={chat.fileInputRef}
            className="file-input"
            type="file"
            onChange={chat.handleAttachmentSelected}
            disabled={!chat.selectedConversationId || chat.attachmentUploading}
          />
          <input
            placeholder={chat.selectedConversationId ? 'Write a message...' : 'Choose or create a conversation first'}
            value={chat.messageDraft}
            onChange={(event) => chat.handleDraft(event.target.value)}
            disabled={!chat.selectedConversationId}
          />
          <button disabled={!chat.selectedConversationId || !chat.messageDraft.trim() || chat.attachmentUploading}>
            <Send size={18} />
            Send
          </button>
        </form>
      )}
      {chat.error && <p className="error">{chat.error}</p>}
    </>
  );
}
