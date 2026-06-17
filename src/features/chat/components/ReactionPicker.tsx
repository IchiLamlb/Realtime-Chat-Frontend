import type { ChatMessage, MessageReaction } from '../../../types';
import { EMOJI_CATEGORIES } from '../constants/emojiCategories';
import { useChatControllerContext } from '../model/useChatControllerContext';

interface ReactionPickerProps {
  message: ChatMessage;
  reactions: MessageReaction[];
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export function ReactionPicker({ message, reactions }: ReactionPickerProps) {
  const { chat, session } = useChatControllerContext();
  const userReaction = reactions.find((reaction) => reaction.userId === session.me?.id);

  const selectReaction = (emoji: string) => {
    void chat.handleReact(message.id, emoji);
    chat.setActiveReactionPickerMessageId(null);
    chat.setShowFullPicker(false);
  };

  return (
    <div className="reaction-picker-popover">
      <div className="quick-reactions">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className={`picker-emoji-btn ${userReaction?.emoji === emoji ? 'active' : ''}`}
            onClick={() => selectReaction(emoji)}
          >
            {emoji}
          </button>
        ))}
        <button
          type="button"
          className={`picker-expand-btn ${chat.showFullPicker ? 'active' : ''}`}
          title="Thêm cảm xúc khác"
          onClick={() => chat.setShowFullPicker(!chat.showFullPicker)}
        >
          +
        </button>
      </div>

      {chat.showFullPicker && (
        <div className="full-emoji-picker">
          <div className="picker-tabs">
            {EMOJI_CATEGORIES.map((category, index) => (
              <button
                key={category.id}
                type="button"
                className={`picker-tab-btn ${chat.activeCategoryIndex === index ? 'active' : ''}`}
                title={category.name}
                onClick={() => chat.setActiveCategoryIndex(index)}
              >
                {category.icon}
              </button>
            ))}
          </div>
          <div className="picker-emojis">
            {EMOJI_CATEGORIES[chat.activeCategoryIndex].emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={`picker-emoji-btn ${userReaction?.emoji === emoji ? 'active' : ''}`}
                onClick={() => selectReaction(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
