import type { ApiError, ApiResponse, AuthResponse, ChatMessage, Conversation, Presence, User } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

interface RequestOptions extends RequestInit {
  token?: string | null;
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

  if (!response.ok) {
    const message = body && 'message' in body && body.message ? body.message : `Request failed: ${response.status}`;
    throw new Error(message);
  }

  if (!body || !('data' in body)) {
    throw new Error('Malformed API response');
  }

  return body.data;
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
  messages: async (token: string, conversationId: string, limit = 50) =>
    request<ChatMessage[]>(`/api/v1/conversations/${conversationId}/messages?limit=${limit}`, { token }),
  sendMessage: async (token: string, payload: { conversationId: string; type: 'TEXT'; content: string; metadata: Record<string, unknown> }) =>
    request<ChatMessage>('/api/v1/messages', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
};
