export type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

export interface AuthForm {
  username: string;
  email: string;
  displayName: string;
  usernameOrEmail: string;
  password: string;
}

export interface PasswordResetForm {
  email: string;
  token: string;
  newPassword: string;
}
