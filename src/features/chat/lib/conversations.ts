import type { Conversation, User } from '../../../types';

export function conversationLabel(conversation: Conversation, usersById: Map<string, User>, me: User | null) {
  if (conversation.name) {
    return conversation.name;
  }

  if (conversation.type === 'DIRECT') {
    const other = conversation.members?.find((member) => member.userId !== me?.id);
    return other?.displayName ?? 'Direct conversation';
  }

  return 'Group conversation';
}

export function directConversationPresence(conversation: Conversation, me: User | null, presenceMap: Map<string, string>) {
  if (conversation.type !== 'DIRECT') {
    return null;
  }

  const other = conversation.members?.find((member) => member.userId !== me?.id);
  return other ? presenceMap.get(other.userId) ?? 'OFFLINE' : 'OFFLINE';
}
