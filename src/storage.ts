import type { User } from './types';

const TOKEN_KEY = 'realtime-chat:token';
const USER_KEY = 'realtime-chat:user';

export function loadSession(): { token: string; user: User } | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const user = localStorage.getItem(USER_KEY);

  if (!token || !user) {
    return null;
  }

  try {
    return { token, user: JSON.parse(user) as User };
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function saveSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
