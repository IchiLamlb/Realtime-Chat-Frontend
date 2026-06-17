import type { Conversation, User } from '../../../types';

export const assistantUsername = 'app_bot';

export function directConversationPeer(conversation: Conversation, me: User | null) {
  if (conversation.type !== 'DIRECT') {
    return null;
  }

  return conversation.members?.find((member) => member.userId !== me?.id) ?? null;
}

export function isAssistantConversation(conversation: Conversation, me: User | null) {
  return directConversationPeer(conversation, me)?.username === assistantUsername;
}

export function conversationLabel(conversation: Conversation, usersById: Map<string, User>, me: User | null) {
  if (conversation.name) {
    return conversation.name;
  }

  if (conversation.type === 'DIRECT') {
    const other = directConversationPeer(conversation, me);
    return other?.displayName ?? 'Direct conversation';
  }

  return 'Group conversation';
}

export function directConversationPresence(conversation: Conversation, me: User | null, presenceMap: Map<string, string>) {
  if (conversation.type !== 'DIRECT') {
    return null;
  }

  const other = directConversationPeer(conversation, me);
  if (other?.username === assistantUsername) {
    return 'ONLINE';
  }
  return other ? presenceMap.get(other.userId) ?? 'OFFLINE' : 'OFFLINE';
}
