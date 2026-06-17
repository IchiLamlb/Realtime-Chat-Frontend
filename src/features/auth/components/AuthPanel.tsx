import { Eye, EyeOff } from 'lucide-react';
import { useChatControllerContext } from '../../chat/model/useChatControllerContext';

export function AuthPanel() {
  const { auth, chat } = useChatControllerContext();
  const { form, passwordResetForm } = auth;

  return (
    <section className="auth-card">
      <div className="mode-switch">
        <button
          type="button"
          className={auth.mode === 'login' ? 'active' : ''}
          onClick={() => auth.setMode('login')}
        >
          Login
        </button>
        <button
          type="button"
          className={auth.mode === 'register' ? 'active' : ''}
          onClick={() => auth.setMode('register')}
        >
          Register
        </button>
      </div>

      {auth.mode === 'forgot' ? (
        <form onSubmit={auth.requestPasswordReset} className="stack">
          <label>
            Registered email
            <input
              type="email"
              value={passwordResetForm.email}
              onChange={(event) =>
                auth.setPasswordResetForm({ ...passwordResetForm, email: event.target.value })
              }
              required
            />
          </label>
          <button className="primary" disabled={chat.loading}>
            {chat.loading ? 'Sending...' : 'Send reset email'}
          </button>
          <button type="button" className="link-button" onClick={() => auth.setMode('login')}>
            Back to login
          </button>
        </form>
      ) : auth.mode === 'reset' ? (
        <form onSubmit={auth.resetPassword} className="stack">
          <label>
            Reset token
            <input
              value={passwordResetForm.token}
              onChange={(event) =>
                auth.setPasswordResetForm({ ...passwordResetForm, token: event.target.value })
              }
              required
            />
          </label>
          <label>
            New password
            <div className="password-input-wrapper">
              <input
                type={auth.showResetPassword ? 'text' : 'password'}
                value={passwordResetForm.newPassword}
                onChange={(event) =>
                  auth.setPasswordResetForm({ ...passwordResetForm, newPassword: event.target.value })
                }
                minLength={8}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => auth.setShowResetPassword(!auth.showResetPassword)}
                aria-label={auth.showResetPassword ? 'Hide password' : 'Show password'}
              >
                {auth.showResetPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <button className="primary" disabled={chat.loading}>
            {chat.loading ? 'Working...' : 'Reset password'}
          </button>
          <button type="button" className="link-button" onClick={() => auth.setMode('login')}>
            Back to login
          </button>
        </form>
      ) : (
        <form onSubmit={auth.authenticate} className="stack">
          {auth.mode === 'register' ? (
            <>
              <label>
                Username
                <input
                  value={form.username}
                  onChange={(event) => auth.setForm({ ...form, username: event.target.value })}
                  minLength={3}
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => auth.setForm({ ...form, email: event.target.value })}
                  required
                />
              </label>
              <label>
                Display name
                <input
                  value={form.displayName}
                  onChange={(event) => auth.setForm({ ...form, displayName: event.target.value })}
                  minLength={2}
                  required
                />
              </label>
            </>
          ) : (
            <label>
              Username or email
              <input
                value={form.usernameOrEmail}
                onChange={(event) => auth.setForm({ ...form, usernameOrEmail: event.target.value })}
                required
              />
            </label>
          )}
          <label>
            Password
            <div className="password-input-wrapper">
              <input
                type={auth.showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(event) => auth.setForm({ ...form, password: event.target.value })}
                minLength={8}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => auth.setShowPassword(!auth.showPassword)}
                aria-label={auth.showPassword ? 'Hide password' : 'Show password'}
              >
                {auth.showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <button className="primary" disabled={chat.loading}>
            {chat.loading ? 'Working...' : auth.mode === 'login' ? 'Enter app' : 'Create account'}
          </button>
          {auth.mode === 'login' && (
            <button type="button" className="link-button" onClick={() => auth.setMode('forgot')}>
              Forgot password?
            </button>
          )}
        </form>
      )}
      {chat.error && <p className="error">{chat.error}</p>}
    </section>
  );
}
