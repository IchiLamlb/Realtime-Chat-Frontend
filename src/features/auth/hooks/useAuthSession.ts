import { type Dispatch, type FormEvent, type SetStateAction, useEffect, useMemo, useState } from 'react';
import { api, setSessionRefreshedHandler } from '../../../api';
import { clearSession, loadSession, saveSession } from '../../../storage';
import type { User } from '../../../types';
import type { AuthForm, AuthMode, PasswordResetForm } from '../model/types';

interface UseAuthSessionOptions {
  setError: (message: string | null) => void;
  setLoading: (loading: boolean) => void;
  setStatus: (message: string) => void;
}

export function useAuthSession({ setError, setLoading, setStatus }: UseAuthSessionOptions) {
  const stored = useMemo(() => loadSession(), []);
  const [token, setToken] = useState<string | null>(stored?.token ?? null);
  const [refreshToken, setRefreshToken] = useState<string | null>(stored?.refreshToken ?? null);
  const [me, setMe] = useState<User | null>(stored?.user ?? null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [authForm, setAuthForm] = useState<AuthForm>({
    username: '',
    email: '',
    displayName: '',
    usernameOrEmail: '',
    password: '',
  });
  const [passwordResetForm, setPasswordResetForm] = useState<PasswordResetForm>({
    email: '',
    token: '',
    newPassword: '',
  });

  useEffect(() => {
    const resetToken = new URLSearchParams(window.location.search).get('resetToken');
    if (resetToken) {
      setPasswordResetForm((current) => ({ ...current, token: resetToken }));
      setAuthMode('reset');
    }

    setSessionRefreshedHandler((session) => {
      setToken(session.token);
      setRefreshToken(session.refreshToken);
      setMe(session.user);
    });
    return () => setSessionRefreshedHandler(null);
  }, []);

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response =
        authMode === 'login'
          ? await api.login({ usernameOrEmail: authForm.usernameOrEmail, password: authForm.password })
          : await api.register({
              username: authForm.username,
              email: authForm.email,
              password: authForm.password,
              displayName: authForm.displayName,
            });

      saveSession(response.accessToken, response.refreshToken, response.user);
      setToken(response.accessToken);
      setRefreshToken(response.refreshToken);
      setMe(response.user);
      setStatus(authMode === 'login' ? 'Logged in' : 'Registered');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  async function requestPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.forgotPassword({ email: passwordResetForm.email });
      setStatus('Password reset email sent if the address is registered');
      setAuthMode('login');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Password reset request failed');
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.resetPassword({
        token: passwordResetForm.token,
        newPassword: passwordResetForm.newPassword,
      });
      window.history.replaceState({}, document.title, window.location.pathname);
      setPasswordResetForm({ email: '', token: '', newPassword: '' });
      setAuthMode('login');
      setStatus('Password reset. You can log in now');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Password reset failed');
    } finally {
      setLoading(false);
    }
  }

  function clearAuthSession() {
    clearSession();
    setToken(null);
    setRefreshToken(null);
    setMe(null);
  }

  return {
    token,
    refreshToken,
    me,
    setMe: setMe as Dispatch<SetStateAction<User | null>>,
    clearAuthSession,
    auth: {
      mode: authMode,
      setMode: setAuthMode,
      form: authForm,
      setForm: setAuthForm,
      passwordResetForm,
      setPasswordResetForm,
      showPassword,
      setShowPassword,
      showResetPassword,
      setShowResetPassword,
      authenticate,
      requestPasswordReset,
      resetPassword,
    },
  };
}
