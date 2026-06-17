import type { ChatMessage, MessageReaction } from '../../../types';
import type { ReplyPreview } from '../model/types';

export function messagePreview(message: ChatMessage) {
  if (message.status === 'DELETED') {
    return 'Tin nhắn đã bị xóa';
  }
  if (message.type === 'IMAGE') {
    return message.content || 'Hình ảnh';
  }
  if (message.type === 'FILE') {
    return message.content || 'Tệp đính kèm';
  }
  return message.content;
}

export function parseReplyPreview(value: unknown): ReplyPreview | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const reply = value as Partial<ReplyPreview>;
  if (typeof reply.id !== 'string' || typeof reply.senderName !== 'string') {
    return null;
  }

  return {
    id: reply.id,
    senderName: reply.senderName,
    content: typeof reply.content === 'string' ? reply.content : '',
    type: reply.type ?? 'TEXT',
  };
}

export function replyFallbackLabel(type: ChatMessage['type']) {
  return type === 'IMAGE' ? 'Hình ảnh' : 'Tệp đính kèm';
}

export function groupReactions(reactions: MessageReaction[] = []) {
  const reactionsMap = new Map<string, MessageReaction[]>();
  reactions.forEach((reaction) => {
    const list = reactionsMap.get(reaction.emoji) ?? [];
    list.push(reaction);
    reactionsMap.set(reaction.emoji, list);
  });
  return reactionsMap;
}

export function isSameSenderCluster(current: ChatMessage, adjacent: ChatMessage | null) {
  return Boolean(
    adjacent &&
      adjacent.senderId === current.senderId &&
      Math.abs(new Date(current.createdAt).getTime() - new Date(adjacent.createdAt).getTime()) < 2 * 60 * 1000,
  );
}

export function bubbleClass(isPrevSame: boolean, isNextSame: boolean) {
  if (isPrevSame && isNextSame) return 'bubble-middle';
  if (isPrevSame) return 'bubble-last';
  if (isNextSame) return 'bubble-first';
  return 'bubble-single';
}
