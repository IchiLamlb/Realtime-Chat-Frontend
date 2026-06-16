import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LogOut, MessageCircle, Plus, Radio, Search, Send, Settings, Sparkles, Users } from 'lucide-react';
import { api, setSessionRefreshedHandler } from './api';
import { clearSession, loadSession, saveSession } from './storage';
import type { ChatMessage, Conversation, TypingEvent, User } from './types';
import { useChatSocket } from './useChatSocket';

type AuthMode = 'login' | 'register';

function initials(name: string) {
  if (!name) return '?';
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
    const other = conversation.members?.find((m) => m.userId !== me?.id);
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

  // Pagination states
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Presence states
  const [presenceMap, setPresenceMap] = useState<Map<string, string>>(new Map());

  // Profile modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    avatarUrl: '',
    bio: '',
  });

  // Group modal states
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupForm, setGroupForm] = useState({
    name: '',
    avatarUrl: '',
  });
  const [groupSearchUser, setGroupSearchUser] = useState('');
  const [groupSearchResult, setGroupSearchResult] = useState<User[]>([]);

  // Dynamically resolve usersById from searched users, current user, and conversation members
  const usersById = useMemo(() => {
    const map = new Map<string, User>();
    users.forEach((user) => map.set(user.id, user));
    if (me) {
      map.set(me.id, me);
    }
    conversations.forEach((conv) => {
      if (conv.members) {
        conv.members.forEach((member) => {
          if (!map.has(member.userId)) {
            map.set(member.userId, {
              id: member.userId,
              username: member.username,
              displayName: member.displayName,
              avatarUrl: member.avatarUrl,
              bio: '',
              status: 'OFFLINE',
              createdAt: '',
            } as User);
          }
        });
      }
    });
    return map;
  }, [me, users, conversations]);

  const selectedConversation = conversations.find((conversation) => conversation.id === selectedConversationId) ?? null;

  useEffect(() => {
    setSessionRefreshedHandler((session) => {
      setToken(session.token);
      setMe(session.user);
    });
    return () => setSessionRefreshedHandler(null);
  }, []);

  const myGroupRole = useMemo(() => {
    if (!selectedConversation || !me) return null;
    const m = selectedConversation.members?.find((member) => member.userId === me.id);
    return m?.role ?? null;
  }, [selectedConversation, me]);

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

  // Load message history with pagination
  useEffect(() => {
    if (!token || !selectedConversationId) {
      setMessages([]);
      setNextCursor(null);
      setHasMore(false);
      return;
    }

    setLoading(true);
    api
      .messages(token, selectedConversationId)
      .then((res) => {
        setMessages(res.items);
        setNextCursor(res.nextCursor);
        setHasMore(res.hasMore);
      })
      .catch((caught: Error) => setError(caught.message))
      .finally(() => setLoading(false));
  }, [selectedConversationId, token]);

  // Load older messages
  async function loadMoreMessages() {
    if (!token || !selectedConversationId || !nextCursor || loading) {
      return;
    }

    setLoading(true);
    try {
      const res = await api.messages(token, selectedConversationId, 50, nextCursor);
      setMessages((current) => [...res.items, ...current]);
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to load older messages');
    } finally {
      setLoading(false);
    }
  }

  // Periodic Presence Status Checker
  useEffect(() => {
    if (!token || conversations.length === 0) {
      return;
    }

    const fetchPresences = async () => {
      const uniqueUserIds = new Set<string>();
      conversations.forEach((conv) => {
        conv.members?.forEach((member) => {
          if (member.userId !== me?.id) {
            uniqueUserIds.add(member.userId);
          }
        });
      });

      const nextMap = new Map(presenceMap);
      for (const userId of uniqueUserIds) {
        try {
          const presenceResult = await api.presence(token, userId);
          nextMap.set(userId, presenceResult.status);
        } catch {
          // ignore
        }
      }
      setPresenceMap(nextMap);
    };

    void fetchPresences();
    const interval = window.setInterval(() => {
      void fetchPresences();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [conversations, token, me?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]); // trigger scroll only when new messages are added, not during pagination prepend

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

      saveSession(response.accessToken, response.refreshToken, response.user);
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

  // Profile modal operations
  function openProfileModal() {
    if (!me) return;
    setProfileForm({
      displayName: me.displayName || '',
      avatarUrl: me.avatarUrl || '',
      bio: me.bio || '',
    });
    setShowProfileModal(true);
  }

  async function handleUpdateProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token || !me) return;
    setError(null);
    setLoading(true);
    try {
      const updatedUser = await api.updateMe(token, {
        displayName: profileForm.displayName,
        avatarUrl: profileForm.avatarUrl || undefined,
        bio: profileForm.bio || undefined,
      });
      setMe(updatedUser);
      saveSession(token, stored?.refreshToken ?? null, updatedUser);
      setShowProfileModal(false);
      setStatus('Profile updated');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  }

  // Group modal operations
  function openGroupModal() {
    if (!selectedConversation) return;
    setGroupForm({
      name: selectedConversation.name || '',
      avatarUrl: selectedConversation.avatarUrl || '',
    });
    setGroupSearchUser('');
    setGroupSearchResult([]);
    setShowGroupModal(true);
  }

  async function handleUpdateGroup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token || !selectedConversation) return;
    setError(null);
    setLoading(true);
    try {
      await api.updateGroup(token, selectedConversation.id, {
        name: groupForm.name,
        avatarUrl: groupForm.avatarUrl || null,
      });
      await refreshConversations();
      setShowGroupModal(false);
      setStatus('Group updated');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to update group');
    } finally {
      setLoading(false);
    }
  }

  async function handleSearchGroupUser() {
    if (!token || groupSearchUser.trim().length < 2) return;
    try {
      const res = await api.searchUsers(token, groupSearchUser.trim());
      setGroupSearchResult(res);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to search users');
    }
  }

  async function handleAddMember(userId: string) {
    if (!token || !selectedConversation) return;
    setError(null);
    try {
      await api.addMember(token, selectedConversation.id, userId);
      await refreshConversations();
      setStatus('Group member added');
      setGroupSearchResult((current) => current.filter((u) => u.id !== userId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to add member');
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!token || !selectedConversation) return;
    if (!confirm('Are you sure you want to remove this member?')) return;
    setError(null);
    try {
      await api.removeMember(token, selectedConversation.id, memberId);
      await refreshConversations();
      setStatus('Group member removed');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to remove member');
    }
  }

  async function handleLeaveGroup() {
    if (!token || !selectedConversation) return;
    if (!confirm('Are you sure you want to leave this group?')) return;
    setError(null);
    try {
      await api.leaveGroup(token, selectedConversation.id);
      setSelectedConversationId(null);
      await refreshConversations();
      setShowGroupModal(false);
      setStatus('Left group');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to leave group');
    }
  }

  async function handleDissolveGroup() {
    if (!token || !selectedConversation) return;
    if (!confirm('Are you sure you want to dissolve this group? This cannot be undone.')) return;
    setError(null);
    try {
      await api.dissolveGroup(token, selectedConversation.id);
      setSelectedConversationId(null);
      await refreshConversations();
      setShowGroupModal(false);
      setStatus('Group dissolved');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to dissolve group');
    }
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
              <button className="icon-button settings-btn" title="Edit Profile" onClick={openProfileModal}>
                <Settings size={18} />
              </button>
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
              {conversations.map((conversation) => {
                const isSelected = conversation.id === selectedConversationId;
                let presenceStatus: string | null = null;
                if (conversation.type === 'DIRECT') {
                  const other = conversation.members?.find((m) => m.userId !== me?.id);
                  if (other) {
                    presenceStatus = presenceMap.get(other.userId) ?? 'OFFLINE';
                  }
                }

                return (
                  <button
                    key={conversation.id}
                    className={isSelected ? 'active' : ''}
                    onClick={() => setSelectedConversationId(conversation.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div>
                        <strong>{conversationLabel(conversation, usersById, me)}</strong>
                        <span>{conversation.type.toLowerCase()}</span>
                      </div>
                      {presenceStatus && (
                        <span
                          className={`presence-dot ${presenceStatus.toLowerCase()}`}
                          title={presenceStatus}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="chat-panel">
            <header className="chat-header">
              <div>
                <span className="eyebrow">Current room</span>
                <h2>{selectedConversation ? conversationLabel(selectedConversation, usersById, me) : 'Select a conversation'}</h2>
                {selectedConversation && selectedConversation.type === 'DIRECT' && (
                  <div className="presence-container">
                    {(() => {
                      const other = selectedConversation.members?.find((m) => m.userId !== me?.id);
                      const status = other ? presenceMap.get(other.userId) ?? 'OFFLINE' : 'OFFLINE';
                      return (
                        <span className="presence-text">
                          <span className={`presence-dot ${status.toLowerCase()}`} />
                          {status.toLowerCase()}
                        </span>
                      );
                    })()}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {selectedConversation && selectedConversation.type === 'GROUP' && (
                  <button className="icon-button" title="Group Settings" onClick={openGroupModal}>
                    <Settings size={18} />
                  </button>
                )}
                <div className={`live-pill ${socket.connected ? 'on' : ''}`}>
                  <Radio size={15} />
                  {socket.connected ? 'Realtime' : 'REST fallback'}
                </div>
              </div>
            </header>

            <div className="message-feed">
              {hasMore && (
                <div className="pagination-bar">
                  <button className="load-more-button" onClick={loadMoreMessages} disabled={loading}>
                    {loading ? 'Loading...' : 'Load older messages'}
                  </button>
                </div>
              )}
              {loading && messages.length === 0 && <div className="empty-state">Loading...</div>}
              {!loading && messages.length === 0 && <div className="empty-state">No messages yet. Start the thread.</div>}
              {messages.map((message, index) => {
                if (message.type === 'SYSTEM') {
                  return (
                    <div key={message.id} className="system-message-row">
                      <span>{message.content}</span>
                    </div>
                  );
                }

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

      {/* Edit Profile Modal */}
      {showProfileModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Profile</h3>
              <button className="icon-button" onClick={() => setShowProfileModal(false)}>✕</button>
            </div>
            <form onSubmit={handleUpdateProfile}>
              <div className="modal-body">
                <label>
                  Display Name
                  <input
                    value={profileForm.displayName}
                    onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Avatar URL
                  <input
                    value={profileForm.avatarUrl}
                    onChange={(e) => setProfileForm({ ...profileForm, avatarUrl: e.target.value })}
                  />
                </label>
                <label>
                  Bio
                  <input
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  />
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="secondary" onClick={() => setShowProfileModal(false)}>Cancel</button>
                <button type="submit" className="primary" disabled={loading}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Settings Modal */}
      {showGroupModal && selectedConversation && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Group Settings</h3>
              <button className="icon-button" onClick={() => setShowGroupModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Group Profiling */}
              {(myGroupRole === 'OWNER' || myGroupRole === 'ADMIN') ? (
                <form onSubmit={handleUpdateGroup} className="stack">
                  <label>
                    Group Name
                    <input
                      value={groupForm.name}
                      onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Group Avatar URL
                    <input
                      value={groupForm.avatarUrl}
                      onChange={(e) => setGroupForm({ ...groupForm, avatarUrl: e.target.value })}
                    />
                  </label>
                  <button type="submit" className="primary" disabled={loading}>Update Group Profile</button>
                </form>
              ) : (
                <div>
                  <strong>{selectedConversation.name}</strong>
                  <p>You are a member of this group. Details can only be edited by admins or owners.</p>
                </div>
              )}

              <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '10px 0' }} />

              <h4>Members ({selectedConversation.members?.length || 0})</h4>
              <div className="stack" style={{ maxHeight: '200px', overflowY: 'auto', gap: '8px' }}>
                {selectedConversation.members?.map((member) => (
                  <div key={member.userId} className="member-list-item">
                    <div className="member-info">
                      <div className="avatar-small">{initials(member.displayName)}</div>
                      <div>
                        <strong>{member.displayName}</strong>
                        <span>@{member.username}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`member-role-badge ${member.role.toLowerCase()}`}>
                        {member.role}
                      </span>
                      {(myGroupRole === 'OWNER' || myGroupRole === 'ADMIN') && member.userId !== me?.id && (
                        <button
                          className="danger-button"
                          onClick={() => handleRemoveMember(member.userId)}
                          disabled={
                            member.role === 'OWNER' || 
                            (member.role === 'ADMIN' && myGroupRole !== 'OWNER')
                          }
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add member section */}
              {(myGroupRole === 'OWNER' || myGroupRole === 'ADMIN') && (
                <>
                  <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '10px 0' }} />
                  <h4>Add Member</h4>
                  <div className="inline-form">
                    <input
                      placeholder="Search username/email"
                      value={groupSearchUser}
                      onChange={(e) => setGroupSearchUser(e.target.value)}
                    />
                    <button onClick={handleSearchGroupUser}>Search</button>
                  </div>
                  <div className="stack" style={{ maxHeight: '150px', overflowY: 'auto', gap: '6px', marginTop: '6px' }}>
                    {groupSearchResult
                      .filter((u) => !selectedConversation.members?.some((m) => m.userId === u.id))
                      .map((u) => (
                        <div key={u.id} className="member-list-item" style={{ background: 'transparent' }}>
                          <div>
                            <strong>{u.displayName}</strong>
                            <span style={{ fontSize: '0.75rem', display: 'block', color: 'var(--muted)' }}>@{u.username}</span>
                          </div>
                          <button
                            className="primary"
                            style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '10px' }}
                            onClick={() => handleAddMember(u.id)}
                          >
                            Add
                          </button>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <div>
                {myGroupRole === 'OWNER' ? (
                  <button className="danger-button" onClick={handleDissolveGroup}>Dissolve Group</button>
                ) : (
                  <button className="danger-button" onClick={handleLeaveGroup}>Leave Group</button>
                )}
              </div>
              <button className="secondary" onClick={() => setShowGroupModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
