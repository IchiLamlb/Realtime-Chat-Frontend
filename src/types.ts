export type UserStatus = 'ONLINE' | 'OFFLINE' | 'AWAY';
export type ConversationType = 'DIRECT' | 'GROUP';
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ' | 'DELETED';

export interface ApiResponse<T> {
  timestamp: string;
  message: string;
  data: T;
}

export interface ApiError {
  timestamp?: string;
  status?: number;
  code?: string;
  message?: string;
  path?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  status: UserStatus;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: User;
}

export interface ConversationMember {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string | null;
  avatarUrl: string | null;
  createdBy: string;
  createdAt: string;
  members: ConversationMember[];
}

export interface MessageReaction {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  emoji: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string;
  metadata: Record<string, unknown> | null;
  status: MessageStatus;
  createdAt: string;
  reactions?: MessageReaction[];
}

export interface MessageHistoryResponse {
  items: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface MessageReceipt {
  messageId: string;
  conversationId: string;
  userId: string;
  status: 'DELIVERED' | 'READ';
  createdAt: string;
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
  typing: boolean;
  occurredAt: string;
}

export interface Presence {
  userId: string;
  status: UserStatus;
  lastSeenAt: string | null;
}

export interface WebRTCSignalEvent {
  conversationId: string;
  senderId: string;
  type: 'OFFER' | 'ANSWER' | 'ICE_CANDIDATE' | 'HANGUP' | 'REJECT';
  payload: string;
  timestamp: string;
}
