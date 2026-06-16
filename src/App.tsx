import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LogOut, MessageCircle, Plus, Radio, Search, Send, Sparkles, Users } from 'lucide-react';
import { api } from './api';
import { clearSession, loadSession, saveSession } from './storage';
import type { ChatMessage, Conversation, TypingEvent, User } from './types';
import { useChatSocket } from './useChatSocket';

type AuthMode = 'login' | 'register';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function renderStatus(status: ChatMessage['status']) {
  switch (status) {
    case 'SENT':
      return <span className="status-check sent" title="Sent">✓</span>;
    case 'DELIVERED':
      return <span className="status-check delivered" title="Delivered">✓✓</span>;
    case 'READ':
      return <span className="status-check read" title="Read">✓✓</span>;
    default:
      return null;
  }
}

function conversationLabel(conversation: Conversation, usersById: Map<string, User>, me: User | null) {
  if (conversation.name) {
    return conversation.name;
  }

  if (conversation.type === 'DIRECT') {
    const other = [...usersById.values()].find((user) => user.id !== me?.id);
    return other?.displayName ?? 'Direct conversation';
  }

  return 'Group conversation';
}

export default function App() {
  const stored = loadSession();
  const [token, setToken] = useState<string | null>(stored?.token ?? null);
  const [me, setMe] = useState<User | null>(stored?.user ?? null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authForm, setAuthForm] = useState({
    username: '',
    email: '',
    displayName: '',
    usernameOrEmail: '',
    password: '',
  });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [status, setStatus] = useState('Ready');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, number>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const usersById = useMemo(() => new Map(users.concat(me ? [me] : []).map((user) => [user.id, user])), [me, users]);
  const selectedConversation = conversations.find((conversation) => conversation.id === selectedConversationId) ?? null;

  const handleSocketMessage = useCallback((message: ChatMessage) => {
    setMessages((current) => {
      if (current.some((item) => item.id === message.id)) {
        return current;
      }
      return [...current, message];
    });
  }, []);

  const handleTyping = useCallback(
    (event: TypingEvent) => {
      if (!event.typing || event.userId === me?.id) {
        return;
      }

      setTypingUsers((current) => new Map(current).set(event.userId, Date.now() + 3500));
    },
    [me?.id],
  );

  const socket = useChatSocket({
    conversationId: selectedConversationId,
    token,
    onMessage: handleSocketMessage,
    onTyping: handleTyping,
  });

  useEffect(() => {
    if (!token || !selectedConversationId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    api
      .messages(token, selectedConversationId)
      .then(setMessages)
      .catch((caught: Error) => setError(caught.message))
      .finally(() => setLoading(false));
  }, [selectedConversationId, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();
      setTypingUsers((current) => new Map([...current].filter(([, expiresAt]) => expiresAt > now)));
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const refreshConversations = useCallback(async () => {
    if (!token) {
      return;
    }

    const data = await api.conversations(token);
    setConversations(data);
    setSelectedConversationId((current) => current ?? data[0]?.id ?? null);
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    void refreshConversations();
  }, [refreshConversations, token]);

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

      saveSession(response.accessToken, response.user);
      setToken(response.accessToken);
      setMe(response.user);
      setStatus(authMode === 'login' ? 'Logged in' : 'Registered');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  async function searchUsers() {
    if (!token || userSearch.trim().length < 2) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await api.searchUsers(token, userSearch.trim());
      setUsers(result.filter((user) => user.id !== me?.id));
      setStatus(`${result.length} user(s) found`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  async function createDirect(userId: string) {
    if (!token) {
      return;
    }

    const conversation = await api.createDirect(token, userId);
    await refreshConversations();
    setSelectedConversationId(conversation.id);
    setStatus('Direct conversation ready');
  }

  async function createGroup() {
    if (!token || !groupName.trim() || users.length === 0) {
      return;
    }

    const conversation = await api.createGroup(token, {
      name: groupName.trim(),
      avatarUrl: null,
      memberIds: users.map((user) => user.id),
    });
    setGroupName('');
    await refreshConversations();
    setSelectedConversationId(conversation.id);
    setStatus('Group created');
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !selectedConversationId || !messageDraft.trim()) {
      return;
    }

    const payload = {
      conversationId: selectedConversationId,
      type: 'TEXT' as const,
      content: messageDraft.trim(),
      metadata: {},
    };

    setMessageDraft('');

    if (socket.connected) {
      socket.sendMessage(payload);
      return;
    }

    try {
      const sent = await api.sendMessage(token, payload);
      handleSocketMessage(sent);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Send failed');
    }
  }

  function handleDraft(value: string) {
    setMessageDraft(value);
    if (selectedConversationId && socket.connected) {
      socket.sendTyping({ conversationId: selectedConversationId, typing: value.length > 0 });
    }
  }

  function logout() {
    clearSession();
    setToken(null);
    setMe(null);
    setConversations([]);
    setMessages([]);
    setUsers([]);
    setSelectedConversationId(null);
    setStatus('Signed out');
  }

  const activeTypers = [...typingUsers.keys()]
    .map((id) => usersById.get(id)?.displayName ?? 'Someone')
    .join(', ');

  return (
    <main className="shell">
      <section className="hero-panel">
        <div className="brand-mark">
          <Sparkles size={18} />
          <span>Realtime Chat</span>
        </div>
        <h1>Conversations with a signal-first control room.</h1>
        <p>
          React client for the Spring Boot chat backend: JWT auth, direct/group rooms, message history,
          realtime STOMP delivery and typing events.
        </p>
        <div className="status-grid">
          <div>
            <span>Backend</span>
            <strong>localhost:8080</strong>
          </div>
          <div>
            <span>Socket</span>
            <strong>{socket.connected ? 'Live' : 'Fallback REST'}</strong>
          </div>
          <div>
            <span>Session</span>
            <strong>{me ? me.username : 'Guest'}</strong>
          </div>
        </div>
      </section>

      {!me || !token ? (
        <section className="auth-card">
          <div className="mode-switch">
            <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>
              Login
            </button>
            <button className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>
              Register
            </button>
          </div>

          <form onSubmit={authenticate} className="stack">
            {authMode === 'register' ? (
              <>
                <label>
                  Username
                  <input value={authForm.username} onChange={(event) => setAuthForm({ ...authForm, username: event.target.value })} minLength={3} required />
                </label>
                <label>
                  Email
                  <input type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} required />
                </label>
                <label>
                  Display name
                  <input value={authForm.displayName} onChange={(event) => setAuthForm({ ...authForm, displayName: event.target.value })} minLength={2} required />
                </label>
              </>
            ) : (
              <label>
                Username or email
                <input value={authForm.usernameOrEmail} onChange={(event) => setAuthForm({ ...authForm, usernameOrEmail: event.target.value })} required />
              </label>
            )}
            <label>
              Password
              <input type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} minLength={8} required />
            </label>
            <button className="primary" disabled={loading}>
              {loading ? 'Working...' : authMode === 'login' ? 'Enter app' : 'Create account'}
            </button>
          </form>
          {error && <p className="error">{error}</p>}
        </section>
      ) : (
        <section className="app-grid">
          <aside className="sidebar">
            <div className="profile-row">
              <div className="avatar">{initials(me.displayName)}</div>
              <div>
                <strong>{me.displayName}</strong>
                <span>@{me.username}</span>
              </div>
              <button className="icon-button" title="Logout" onClick={logout}>
                <LogOut size={18} />
              </button>
            </div>

            <div className="tool-card">
              <div className="section-title">
                <Search size={16} />
                Find people
              </div>
              <div className="inline-form">
                <input placeholder="username/email" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} />
                <button onClick={searchUsers}>Go</button>
              </div>
              <div className="user-list">
                {users.map((user) => (
                  <button key={user.id} onClick={() => void createDirect(user.id)}>
                    <span>{user.displayName}</span>
                    <small>@{user.username}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="tool-card">
              <div className="section-title">
                <Users size={16} />
                Group room
              </div>
              <input placeholder="Group name" value={groupName} onChange={(event) => setGroupName(event.target.value)} />
              <button className="wide-button" onClick={() => void createGroup()}>
                <Plus size={16} />
                Create from search results
              </button>
            </div>

            <div className="conversation-list">
              <div className="section-title">
                <MessageCircle size={16} />
                Conversations
              </div>
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  className={conversation.id === selectedConversationId ? 'active' : ''}
                  onClick={() => setSelectedConversationId(conversation.id)}
                >
                  <strong>{conversationLabel(conversation, usersById, me)}</strong>
                  <span>{conversation.type.toLowerCase()}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className="chat-panel">
            <header className="chat-header">
              <div>
                <span className="eyebrow">Current room</span>
                <h2>{selectedConversation ? conversationLabel(selectedConversation, usersById, me) : 'Select a conversation'}</h2>
              </div>
              <div className={`live-pill ${socket.connected ? 'on' : ''}`}>
                <Radio size={15} />
                {socket.connected ? 'Realtime' : 'REST fallback'}
              </div>
            </header>

            <div className="message-feed">
              {loading && <div className="empty-state">Loading...</div>}
              {!loading && messages.length === 0 && <div className="empty-state">No messages yet. Start the thread.</div>}
              {messages.map((message, index) => {
                const mine = message.senderId === me.id;
                const sender = usersById.get(message.senderId);
                
                const prevMessage = index > 0 ? messages[index - 1] : null;
                const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;

                const isPrevSame = prevMessage && 
                  prevMessage.senderId === message.senderId && 
                  (new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() < 2 * 60 * 1000);
                const isNextSame = nextMessage && 
                  nextMessage.senderId === message.senderId && 
                  (new Date(nextMessage.createdAt).getTime() - new Date(message.createdAt).getTime() < 2 * 60 * 1000);

                let bubbleClass = '';
                if (isPrevSame && isNextSame) {
                  bubbleClass = 'bubble-middle';
                } else if (isPrevSame) {
                  bubbleClass = 'bubble-last';
                } else if (isNextSame) {
                  bubbleClass = 'bubble-first';
                } else {
                  bubbleClass = 'bubble-single';
                }

                return (
                  <div key={message.id} className={`message-row ${mine ? 'mine' : ''} ${isPrevSame ? 'consecutive' : ''}`}>
                    {!mine && !isPrevSame && (
                      <div className="message-avatar" title={sender?.displayName ?? 'Member'}>
                        {initials(sender?.displayName ?? 'Member')}
                      </div>
                    )}
                    <div className="message-bubble-wrapper">
                      {!mine && !isPrevSame && (
                        <span className="message-sender-name">{sender?.displayName ?? 'Member'}</span>
                      )}
                      <article className={`message-bubble ${mine ? 'mine' : ''} ${bubbleClass}`}>
                        <p className="message-content">{message.content}</p>
                        <div className="message-info">
                          <time className="message-time">{formatTime(message.createdAt)}</time>
                          {mine && renderStatus(message.status)}
                        </div>
                      </article>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="typing-line">{activeTypers ? `${activeTypers} is typing...` : status}</div>

            <form className="composer" onSubmit={sendMessage}>
              <input
                placeholder={selectedConversationId ? 'Write a message...' : 'Choose or create a conversation first'}
                value={messageDraft}
                onChange={(event) => handleDraft(event.target.value)}
                disabled={!selectedConversationId}
              />
              <button disabled={!selectedConversationId || !messageDraft.trim()}>
                <Send size={18} />
                Send
              </button>
            </form>
            {error && <p className="error">{error}</p>}
          </section>
        </section>
      )}
    </main>
  );
}
