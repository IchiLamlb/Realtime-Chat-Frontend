import type { ApiError, ApiResponse, AuthResponse, ChatMessage, Conversation, MessageHistoryResponse, MessageReceipt, Presence, User } from './types';
import { clearSession, loadSession, saveSession } from './storage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

let onSessionRefreshed: ((session: { token: string; refreshToken: string; user: User }) => void) | null = null;

export function setSessionRefreshedHandler(handler: typeof onSessionRefreshed) {
  onSessionRefreshed = handler;
}

interface RequestOptions extends RequestInit {
  token?: string | null;
  skipRefresh?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const body = (await response.json().catch(() => null)) as ApiResponse<T> | ApiError | null;

  if (response.status === 401 && options.token && !options.skipRefresh) {
    const refreshed = await refreshExpiredSession();
    if (refreshed) {
      return request<T>(path, { ...options, token: refreshed.accessToken, skipRefresh: true });
    }
  }

  if (!response.ok) {
    const message = body && 'message' in body && body.message ? body.message : `Request failed: ${response.status}`;
    throw new Error(message);
  }

  if (!body || !('data' in body)) {
    throw new Error('Malformed API response');
  }

  return body.data;
}

async function refreshExpiredSession(): Promise<AuthResponse | null> {
  const session = loadSession();
  if (!session?.refreshToken) {
    clearSession();
    return null;
  }

  try {
    const response = await request<AuthResponse>('/api/v1/auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: session.refreshToken }),
      skipRefresh: true,
    });
    saveSession(response.accessToken, response.refreshToken, response.user);
    onSessionRefreshed?.({
      token: response.accessToken,
      refreshToken: response.refreshToken,
      user: response.user,
    });
    return response;
  } catch {
    clearSession();
    return null;
  }
}

export const api = {
  health: async () => request<Record<string, unknown>>('/actuator/health', { method: 'GET' }),
  register: async (payload: { username: string; email: string; password: string; displayName: string }) =>
    request<AuthResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  login: async (payload: { usernameOrEmail: string; password: string }) =>
    request<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  forgotPassword: async (payload: { email: string }) =>
    request<void>('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  resetPassword: async (payload: { token: string; newPassword: string }) =>
    request<void>('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  me: async (token: string) => request<User>('/api/v1/users/me', { token }),
  updateMe: async (token: string, payload: { displayName?: string; avatarUrl?: string; bio?: string }) =>
    request<User>('/api/v1/users/me', {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload),
    }),
  searchUsers: async (token: string, keyword: string) =>
    request<User[]>(`/api/v1/users/search?keyword=${encodeURIComponent(keyword)}`, { token }),
  presence: async (token: string, userId: string) =>
    request<Presence>(`/api/v1/users/${userId}/presence`, { token }),
  conversations: async (token: string) => request<Conversation[]>('/api/v1/conversations', { token }),
  createDirect: async (token: string, targetUserId: string) =>
    request<Conversation>('/api/v1/conversations/direct', {
      method: 'POST',
      token,
      body: JSON.stringify({ targetUserId }),
    }),
  createGroup: async (token: string, payload: { name: string; avatarUrl?: string | null; memberIds: string[] }) =>
    request<Conversation>('/api/v1/conversations/group', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
  messages: async (token: string, conversationId: string, limit = 50, cursor?: string) =>
    request<MessageHistoryResponse>(
      `/api/v1/conversations/${conversationId}/messages?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`,
      { token }
    ),
  sendMessage: async (token: string, payload: { conversationId: string; type: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM'; content: string; metadata: Record<string, unknown> }) =>
    request<ChatMessage>('/api/v1/messages', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
  markDelivered: async (token: string, messageId: string) =>
    request<MessageReceipt>(`/api/v1/messages/${messageId}/delivered`, {
      method: 'POST',
      token,
    }),
  markRead: async (token: string, messageId: string) =>
    request<MessageReceipt>(`/api/v1/messages/${messageId}/read`, {
      method: 'POST',
      token,
    }),
  updateGroup: async (token: string, conversationId: string, payload: { name: string; avatarUrl?: string | null }) =>
    request<Conversation>(`/api/v1/conversations/${conversationId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload),
    }),
  addMember: async (token: string, conversationId: string, userId: string) =>
    request<Conversation>(`/api/v1/conversations/${conversationId}/members`, {
      method: 'POST',
      token,
      body: JSON.stringify({ userId }),
    }),
  removeMember: async (token: string, conversationId: string, memberId: string) =>
    request<Conversation>(`/api/v1/conversations/${conversationId}/members/${memberId}`, {
      method: 'DELETE',
      token,
    }),
  leaveGroup: async (token: string, conversationId: string) =>
    request<void>(`/api/v1/conversations/${conversationId}/members/me`, {
      method: 'DELETE',
      token,
    }),
  dissolveGroup: async (token: string, conversationId: string) =>
    request<void>(`/api/v1/conversations/${conversationId}`, {
      method: 'DELETE',
      token,
    }),
};
