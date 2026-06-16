export type UserStatus = 'ONLINE' | 'OFFLINE' | 'AWAY';
export type ConversationType = 'DIRECT' | 'GROUP';
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

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

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string;
  metadata: Record<string, unknown> | null;
  status: MessageStatus;
  createdAt: string;
}

export interface MessageHistoryResponse {
  items: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
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
