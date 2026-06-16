import type { User } from './types';

const TOKEN_KEY = 'realtime-chat:token';
const REFRESH_TOKEN_KEY = 'realtime-chat:refresh-token';
const USER_KEY = 'realtime-chat:user';

export function loadSession(): { token: string; refreshToken: string | null; user: User } | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  const user = localStorage.getItem(USER_KEY);

  if (!token || !user) {
    return null;
  }

  try {
    return { token, refreshToken, user: JSON.parse(user) as User };
  } catch {
    clearSession();
    return null;
  }
}

export function saveSession(token: string, refreshToken: string | null, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
