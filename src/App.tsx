import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CornerUpLeft, Eye, EyeOff, FileText, LogOut, MessageCircle, MoreHorizontal, Paperclip, Plus, Radio, Search, Send, Settings, Smile, Sparkles, Users, Play, Pause, Mic, Trash2, X } from 'lucide-react';
import { api, setSessionRefreshedHandler } from './api';
import { clearSession, loadSession, saveSession } from './storage';
import type { ChatMessage, Conversation, MessageReceipt, TypingEvent, User } from './types';
import { useChatSocket } from './useChatSocket';

const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    name: 'Mặt cười & Cảm xúc',
    icon: '😃',
    emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😋','😛','😜','🤪','😎','🥳','😏','😒','😔','😢','😭','😡','🤯','😳','😱','🥱','😴','🫠','👀']
  },
  {
    id: 'gestures',
    name: 'Cử chỉ & Cơ thể',
    icon: '👍',
    emojis: ['👋','👌','🤌','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','👇','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','💪','🧠','🫀']
  },
  {
    id: 'animals',
    name: 'Động vật & Tự nhiên',
    icon: '🐼',
    emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🦆','🦅','🦉','🐝','🐛','🦋','🐢','🐍','🐙','🐠','🐬','🐳','🌵','🎄','🌲','🌳','🌴','🌱','☘️','🍀','🍁','🍂','🍃']
  },
  {
    id: 'food',
    name: 'Đồ ăn & Thức uống',
    icon: '🍔',
    emojis: ['🍏','🍊','🍌','🍉','🍇','🍓','🍒','🍑','🥭','🍍','🥥','🍅','🍆','🥑','🥦','🌽','🥕','🍞','🧀','🍖','🍗','🥩','🍔','🍟','🍕','🌭','🍳','🥘','🍲','🥣','🥗','🍿','🍣','cookie','🍩','🍰','🍫','🍬','☕','🍵','🍺','🍷']
  },
  {
    id: 'activities',
    name: 'Hoạt động & Thể thao',
    icon: '⚽',
    emojis: ['⚽','🏀','🏈','⚾','🎾','🎱','🏓','⛳','🎣','🥊','🥋','🛹','🚴','🏆','🥇','🥈','🥉','🎖️','🎟️','🎭','🎨','🎬','🎤','🎧','🎮','🎲','🧩','🎳']
  },
  {
    id: 'travel',
    name: 'Du lịch & Địa điểm',
    icon: '🚗',
    emojis: ['🚗','🚕','🚙','🚌','🚒','🚐','🚚','🚜','🛵','🚲','🚞','✈️','🛫','🛬','🛸','🚁','🛶','⛵','🚢','⚓','🗺️','🗼','🗽','🎡','🎢','🌋','🗻','🏖️','🏡','🏢','🏰','💒']
  },
  {
    id: 'objects',
    name: 'Đồ vật & Biểu tượng',
    icon: '💡',
    emojis: ['⌚','📱','💻','⌨️','🖱️','📷','📸','📞','⏰','⏳','💡','🔦','🕯️','🧪','🔬','📡','💉','💊','🩹','🔑','🗝️','🔨','🪓','🔫','🛡️','🔧','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','🎉','💯','✅','❌','⚠️']
  }
];

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';
const MAX_ATTACHMENT_SIZE = 100 * 1024 * 1024;

interface ReplyPreview {
  id: string;
  senderName: string;
  content: string;
  type: ChatMessage['type'];
}

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

function formatFileSize(value: unknown) {
  const size = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(size) || size < 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function messagePreview(message: ChatMessage) {
  if (message.status === 'DELETED') {
    return 'Tin nhắn đã bị xóa';
  }
  if (message.type === 'IMAGE') {
    return message.content || 'Hình ảnh';
  }
  if (message.type === 'FILE') {
    return message.content || 'Tệp đính kèm';
  }
  return message.content;
}

function parseReplyPreview(value: unknown): ReplyPreview | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const reply = value as Partial<ReplyPreview>;
  if (typeof reply.id !== 'string' || typeof reply.senderName !== 'string') {
    return null;
  }

  return {
    id: reply.id,
    senderName: reply.senderName,
    content: typeof reply.content === 'string' ? reply.content : '',
    type: reply.type ?? 'TEXT',
  };
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

interface AudioPlayerProps {
  src: string;
}

function AudioPlayer({ src }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    if (isFinite(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = Number(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatAudioTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="custom-audio-player">
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleLoadedMetadata}
        onEnded={handleAudioEnded}
        preload="metadata"
      />
      <button type="button" className="audio-play-btn" onClick={togglePlay}>
        {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
      </button>
      <div className="audio-progress-container">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="audio-seeker"
        />
        <div className="audio-time-row">
          <span>{formatAudioTime(currentTime)}</span>
          <span>{formatAudioTime(duration)}</span>
        </div>
      </div>
    </div>
  );
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
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [authForm, setAuthForm] = useState({
    username: '',
    email: '',
    displayName: '',
    usernameOrEmail: '',
    password: '',
  });
  const [passwordResetForm, setPasswordResetForm] = useState({
    email: '',
    token: '',
    newPassword: '',
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
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, number>>(new Map());
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const prevConversationIdRef = useRef<string | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const messageFeedRef = useRef<HTMLDivElement | null>(null);

  // Pagination states
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Presence states
  const [presenceMap, setPresenceMap] = useState<Map<string, string>>(new Map());
  const acknowledgedReadIds = useRef<Set<string>>(new Set());

  // Profile modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    avatarUrl: '',
    bio: '',
  });

  const [activeReactionPickerMessageId, setActiveReactionPickerMessageId] = useState<string | null>(null);
  const [activeMessageMenuId, setActiveMessageMenuId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ReplyPreview | null>(null);
  const [hiddenMessageIds, setHiddenMessageIds] = useState<Set<string>>(new Set());
  const [showFullPicker, setShowFullPicker] = useState(false);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);

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
    const resetToken = new URLSearchParams(window.location.search).get('resetToken');
    if (resetToken) {
      setPasswordResetForm((current) => ({ ...current, token: resetToken }));
      setAuthMode('reset');
    }

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
      const existingIndex = current.findIndex((item) => item.id === message.id);
      if (existingIndex >= 0) {
        return current.map((item, index) => index === existingIndex ? { ...item, ...message } : item);
      }
      return [...current, message];
    });
  }, []);

  const handleReceipt = useCallback((receipt: MessageReceipt) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === receipt.messageId ? { ...message, status: receipt.status } : message,
      ),
    );
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
    onReceipt: handleReceipt,
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
        setMessages([...res.items].reverse());
        setNextCursor(res.nextCursor);
        setHasMore(res.hasMore);
      })
      .catch((caught: Error) => setError(caught.message))
      .finally(() => setLoading(false));
  }, [selectedConversationId, token]);

  // Load older messages
  async function loadMoreMessages(container?: HTMLDivElement | null, oldScrollHeight?: number) {
    if (!token || !selectedConversationId || !nextCursor || loading) {
      return;
    }

    setLoading(true);
    try {
      const res = await api.messages(token, selectedConversationId, 50, nextCursor);
      
      const targetContainer = container || messageFeedRef.current;
      const targetOldScrollHeight = oldScrollHeight || (targetContainer ? targetContainer.scrollHeight : 0);

      setMessages((current) => [...[...res.items].reverse(), ...current]);
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);

      if (targetContainer && targetOldScrollHeight > 0) {
        requestAnimationFrame(() => {
          const newScrollHeight = targetContainer.scrollHeight;
          targetContainer.scrollTop = newScrollHeight - targetOldScrollHeight;
        });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to load older messages');
    } finally {
      setLoading(false);
    }
  }

  function handleScroll() {
    const container = messageFeedRef.current;
    if (!container) return;

    if (container.scrollTop <= 10 && hasMore && !loading && nextCursor) {
      const oldScrollHeight = container.scrollHeight;
      void loadMoreMessages(container, oldScrollHeight);
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

      const updates = new Map<string, string>();
      for (const userId of uniqueUserIds) {
        try {
          const presenceResult = await api.presence(token, userId);
          updates.set(userId, presenceResult.status);
        } catch {
          // ignore
        }
      }
      setPresenceMap((current) => {
        const nextMap = new Map(current);
        updates.forEach((value, key) => nextMap.set(key, value));
        return nextMap;
      });
    };

    void fetchPresences();
    const interval = window.setInterval(() => {
      void fetchPresences();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [conversations, token, me?.id]);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    const newestMessage = messages[messages.length - 1];
    const hasNewMessage = newestMessage?.id !== lastMessageIdRef.current;

    if (hasNewMessage) {
      const isNewRoom = prevConversationIdRef.current !== selectedConversationId;
      prevConversationIdRef.current = selectedConversationId;
      lastMessageIdRef.current = newestMessage?.id;

      if (isNewRoom) {
        // Scroll instantly when switching rooms
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        // Scroll again after a brief layout/image render pass
        const timer = setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }, 50);
        return () => clearTimeout(timer);
      } else {
        // Smooth scroll for new incoming/outgoing messages
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages, selectedConversationId]);

  useEffect(() => {
    acknowledgedReadIds.current.clear();
  }, [selectedConversationId]);

  useEffect(() => {
    if (!token || !me || !selectedConversationId || messages.length === 0) {
      return;
    }

    const unreadIncoming = messages.filter(
      (message) =>
        message.conversationId === selectedConversationId &&
        message.senderId !== me.id &&
        message.status !== 'READ' &&
        !acknowledgedReadIds.current.has(message.id),
    );

    unreadIncoming.forEach((message) => {
      acknowledgedReadIds.current.add(message.id);

      if (socket.connected) {
        socket.sendRead(message.id);
        return;
      }

      void api
        .markRead(token, message.id)
        .then(handleReceipt)
        .catch(() => {
          acknowledgedReadIds.current.delete(message.id);
        });
    });
  }, [handleReceipt, me, messages, selectedConversationId, socket, token]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();
      setTypingUsers((current) => new Map([...current].filter(([, expiresAt]) => expiresAt > now)));
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeReactionPickerMessageId && !activeMessageMenuId) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.reaction-picker-popover') && !target.closest('.reaction-trigger-btn')) {
        setActiveReactionPickerMessageId(null);
        setShowFullPicker(false);
      }
      if (!target.closest('.message-more-menu') && !target.closest('.message-menu-trigger')) {
        setActiveMessageMenuId(null);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [activeReactionPickerMessageId, activeMessageMenuId]);

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
      metadata: replyingTo ? { replyTo: replyingTo } : {},
    };

    setMessageDraft('');
    setReplyingTo(null);

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

  async function handleReact(messageId: string, emoji: string) {
    if (!token) return;

    // Optimistic UI update
    setMessages((current) =>
      current.map((msg) => {
        if (msg.id !== messageId) return msg;

        const currentReactions = msg.reactions || [];
        const existingReactionIndex = currentReactions.findIndex((r) => r.userId === me?.id);

        let newReactions = [...currentReactions];
        if (existingReactionIndex >= 0) {
          const existing = currentReactions[existingReactionIndex];
          if (existing.emoji === emoji) {
            newReactions.splice(existingReactionIndex, 1);
          } else {
            newReactions[existingReactionIndex] = {
              ...existing,
              emoji: emoji
            };
          }
        } else if (me) {
          newReactions.push({
            userId: me.id,
            username: me.username,
            displayName: me.displayName,
            avatarUrl: me.avatarUrl,
            emoji: emoji
          });
        }

        return { ...msg, reactions: newReactions };
      })
    );

    if (socket.connected) {
      socket.sendReaction(messageId, emoji);
      return;
    }

    try {
      const updated = await api.react(token, messageId, emoji);
      handleSocketMessage(updated);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to react');
    }
  }

  function handleStartReply(message: ChatMessage) {
    const sender = usersById.get(message.senderId);
    setReplyingTo({
      id: message.id,
      senderName: sender?.displayName ?? 'Member',
      content: messagePreview(message),
      type: message.type,
    });
    setActiveMessageMenuId(null);
  }

  function handleDeleteForMe(messageId: string) {
    setHiddenMessageIds((current) => new Set(current).add(messageId));
    setActiveMessageMenuId(null);
    if (replyingTo?.id === messageId) {
      setReplyingTo(null);
    }
  }

  async function handleDeleteForEveryone(messageId: string) {
    if (!token) return;

    setActiveMessageMenuId(null);
    try {
      const deleted = await api.deleteMessage(token, messageId);
      handleSocketMessage(deleted);
      if (replyingTo?.id === messageId) {
        setReplyingTo(null);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to delete message');
    }
  }

  async function handleAttachmentSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !token || !selectedConversationId) {
      return;
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      setError('File must be 100MB or smaller');
      return;
    }

    setError(null);
    setAttachmentUploading(true);
    try {
      const sent = await api.sendAttachment(token, {
        conversationId: selectedConversationId,
        file,
        content: messageDraft,
      });
      setMessageDraft('');
      handleSocketMessage(sent);
      setStatus('Attachment sent');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Upload failed');
    } finally {
      setAttachmentUploading(false);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      } catch (e) {
        recorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(10);
      setIsRecording(true);
      setRecordingDuration(0);

      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
      
      setStatus('Recording...');
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not access microphone');
    }
  }

  async function stopRecording(shouldSend: boolean) {
    if (!mediaRecorderRef.current || !isRecording) {
      return;
    }

    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    const stopPromise = new Promise<void>((resolve) => {
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((track) => track.stop());
        resolve();
      };
    });

    recorder.stop();
    await stopPromise;

    setIsRecording(false);
    setStatus('Ready');

    if (shouldSend) {
      const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      if (audioBlob.size === 0) {
        setError('Recording is empty');
        return;
      }
      
      const fileExtension = recorder.mimeType?.includes('ogg') ? 'ogg' : recorder.mimeType?.includes('wav') ? 'wav' : 'webm';
      const file = new File([audioBlob], `voice-message-${Date.now()}.${fileExtension}`, {
        type: audioBlob.type,
      });

      if (!token || !selectedConversationId) {
        return;
      }

      setAttachmentUploading(true);
      setError(null);
      try {
        const sent = await api.sendAttachment(token, {
          conversationId: selectedConversationId,
          file,
        });
        handleSocketMessage(sent);
        setStatus('Voice message sent');
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Failed to send voice message');
      } finally {
        setAttachmentUploading(false);
      }
    }
    
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  }

  function formatDuration(seconds: number) {
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

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

  const visibleMessages = useMemo(
    () => messages.filter((message) => !hiddenMessageIds.has(message.id)),
    [hiddenMessageIds, messages],
  );

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

          {authMode === 'forgot' ? (
            <form onSubmit={requestPasswordReset} className="stack">
              <label>
                Registered email
                <input
                  type="email"
                  value={passwordResetForm.email}
                  onChange={(event) => setPasswordResetForm({ ...passwordResetForm, email: event.target.value })}
                  required
                />
              </label>
              <button className="primary" disabled={loading}>
                {loading ? 'Sending...' : 'Send reset email'}
              </button>
              <button type="button" className="link-button" onClick={() => setAuthMode('login')}>
                Back to login
              </button>
            </form>
          ) : authMode === 'reset' ? (
            <form onSubmit={resetPassword} className="stack">
              <label>
                Reset token
                <input
                  value={passwordResetForm.token}
                  onChange={(event) => setPasswordResetForm({ ...passwordResetForm, token: event.target.value })}
                  required
                />
              </label>
              <label>
                New password
                <div className="password-input-wrapper">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    value={passwordResetForm.newPassword}
                    onChange={(event) => setPasswordResetForm({ ...passwordResetForm, newPassword: event.target.value })}
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    aria-label={showResetPassword ? 'Hide password' : 'Show password'}
                  >
                    {showResetPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
              <button className="primary" disabled={loading}>
                {loading ? 'Working...' : 'Reset password'}
              </button>
              <button type="button" className="link-button" onClick={() => setAuthMode('login')}>
                Back to login
              </button>
            </form>
          ) : (
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
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={authForm.password}
                  onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            <button className="primary" disabled={loading}>
              {loading ? 'Working...' : authMode === 'login' ? 'Enter app' : 'Create account'}
            </button>
              {authMode === 'login' && (
                <button type="button" className="link-button" onClick={() => setAuthMode('forgot')}>
                  Forgot password?
                </button>
              )}
            </form>
          )}
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

            <div ref={messageFeedRef} className="message-feed" onScroll={handleScroll}>
              {loading && messages.length > 0 && (
                <div className="pagination-bar">
                  <span className="pagination-loader">Loading older messages...</span>
                </div>
              )}
              {loading && messages.length === 0 && <div className="empty-state">Loading...</div>}
              {!loading && visibleMessages.length === 0 && <div className="empty-state">No messages yet. Start the thread.</div>}
              {visibleMessages.map((message, index) => {
                if (message.type === 'SYSTEM') {
                  return (
                    <div key={message.id} className="system-message-row">
                      <span>{message.content}</span>
                    </div>
                  );
                }

                const mine = message.senderId === me.id;
                const sender = usersById.get(message.senderId);
                const metadata = message.metadata ?? {};
                const attachmentUrl = typeof metadata.url === 'string' ? metadata.url : '';
                const attachmentName = typeof metadata.originalName === 'string' ? metadata.originalName : message.content;
                const attachmentSize = formatFileSize(metadata.size);
                const contentType = typeof metadata.contentType === 'string' ? metadata.contentType : '';
                const replyTo = parseReplyPreview(metadata.replyTo);
                const deleted = message.status === 'DELETED';
                
                const prevMessage = index > 0 ? visibleMessages[index - 1] : null;
                const nextMessage = index < visibleMessages.length - 1 ? visibleMessages[index + 1] : null;

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

                const msgReactions = message.reactions || [];
                const reactionsMap = new Map<string, typeof msgReactions>();
                msgReactions.forEach((r) => {
                  const list = reactionsMap.get(r.emoji) || [];
                  list.push(r);
                  reactionsMap.set(r.emoji, list);
                });

                return (
                  <div id={`message-${message.id}`} key={message.id} className={`message-row ${mine ? 'mine' : ''} ${isPrevSame ? 'consecutive' : ''}`}>
                    {!mine && !isPrevSame && (
                      <div className="message-avatar" title={sender?.displayName ?? 'Member'}>
                        {initials(sender?.displayName ?? 'Member')}
                      </div>
                    )}
                    <div className="message-bubble-wrapper">
                      {!mine && !isPrevSame && (
                        <span className="message-sender-name">{sender?.displayName ?? 'Member'}</span>
                      )}
                      
                      <div className="message-bubble-container">
                        <article className={`message-bubble ${mine ? 'mine' : ''} ${bubbleClass}`}>
                          {replyTo && (
                            <button
                              type="button"
                              className="message-reply-preview"
                              onClick={() => document.getElementById(`message-${replyTo.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                            >
                              <strong>{replyTo.senderName}</strong>
                              <span>{replyTo.content || (replyTo.type === 'IMAGE' ? 'Hình ảnh' : 'Tệp đính kèm')}</span>
                            </button>
                          )}
                          {deleted ? (
                            <p className="message-content deleted-message">Tin nhắn đã bị xóa</p>
                          ) : message.type === 'IMAGE' && attachmentUrl ? (
                            <a className="image-attachment" href={attachmentUrl} target="_blank" rel="noreferrer">
                              <img src={attachmentUrl} alt={attachmentName} />
                              {message.content && message.content !== attachmentName && (
                                <span className="message-content">{message.content}</span>
                              )}
                            </a>
                          ) : message.type === 'FILE' && attachmentUrl ? (
                            contentType.startsWith('audio/') ? (
                              <AudioPlayer src={attachmentUrl} />
                            ) : (
                              <a className="file-attachment" href={attachmentUrl} target="_blank" rel="noreferrer" download={attachmentName}>
                                <FileText size={22} />
                                <span>
                                  <strong>{attachmentName}</strong>
                                  {attachmentSize && <small>{attachmentSize}</small>}
                                </span>
                              </a>
                            )
                          ) : (
                            <p className="message-content">{message.content}</p>
                          )}
                          <div className="message-info">
                            <time className="message-time">{formatTime(message.createdAt)}</time>
                            {mine && renderStatus(message.status)}
                          </div>
                        </article>

                        {!deleted && (
                          <div className={`message-actions ${activeMessageMenuId === message.id || activeReactionPickerMessageId === message.id ? 'active' : ''}`}>
                            <button
                              type="button"
                              className="message-action-btn"
                              title="Trả lời"
                              onClick={() => handleStartReply(message)}
                            >
                              <CornerUpLeft size={16} />
                            </button>
                            <button
                              type="button"
                              className="message-action-btn reaction-trigger-btn"
                              title="Thả cảm xúc"
                              onClick={() => {
                                if (activeReactionPickerMessageId === message.id) {
                                  setActiveReactionPickerMessageId(null);
                                  setShowFullPicker(false);
                                } else {
                                  setActiveReactionPickerMessageId(message.id);
                                  setActiveMessageMenuId(null);
                                  setShowFullPicker(false);
                                  setActiveCategoryIndex(0);
                                }
                              }}
                            >
                              <Smile size={16} />
                            </button>
                            <div className="message-menu-wrap">
                              <button
                                type="button"
                                className="message-action-btn message-menu-trigger"
                                title="Tùy chọn"
                                onClick={() => {
                                  setActiveMessageMenuId(activeMessageMenuId === message.id ? null : message.id);
                                  setActiveReactionPickerMessageId(null);
                                  setShowFullPicker(false);
                                }}
                              >
                                <MoreHorizontal size={17} />
                              </button>
                              {activeMessageMenuId === message.id && (
                                <div className="message-more-menu">
                                  <button type="button" onClick={() => handleDeleteForMe(message.id)}>
                                    Xóa phía mình
                                  </button>
                                  <button
                                    type="button"
                                    className="danger"
                                    disabled={!mine}
                                    title={mine ? 'Xóa tin nhắn với mọi người' : 'Chỉ người gửi mới xóa được với tất cả'}
                                    onClick={() => void handleDeleteForEveryone(message.id)}
                                  >
                                    Xóa tất cả
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {activeReactionPickerMessageId === message.id && (
                          <div className="reaction-picker-popover">
                            <div className="quick-reactions">
                              {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => {
                                const userReaction = msgReactions.find((r) => r.userId === me?.id);
                                const isCurrent = userReaction?.emoji === emoji;
                                return (
                                  <button
                                    key={emoji}
                                    type="button"
                                    className={`picker-emoji-btn ${isCurrent ? 'active' : ''}`}
                                    onClick={() => {
                                      void handleReact(message.id, emoji);
                                      setActiveReactionPickerMessageId(null);
                                      setShowFullPicker(false);
                                    }}
                                  >
                                    {emoji}
                                  </button>
                                );
                              })}
                              <button
                                type="button"
                                className={`picker-expand-btn ${showFullPicker ? 'active' : ''}`}
                                title="Thêm cảm xúc khác"
                                onClick={() => setShowFullPicker(!showFullPicker)}
                              >
                                ＋
                              </button>
                            </div>

                            {showFullPicker && (
                              <div className="full-emoji-picker">
                                <div className="picker-tabs">
                                  {EMOJI_CATEGORIES.map((cat, idx) => (
                                    <button
                                      key={cat.id}
                                      type="button"
                                      className={`picker-tab-btn ${activeCategoryIndex === idx ? 'active' : ''}`}
                                      title={cat.name}
                                      onClick={() => setActiveCategoryIndex(idx)}
                                    >
                                      {cat.icon}
                                    </button>
                                  ))}
                                </div>
                                <div className="picker-emojis">
                                  {EMOJI_CATEGORIES[activeCategoryIndex].emojis.map((emoji) => {
                                    const userReaction = msgReactions.find((r) => r.userId === me?.id);
                                    const isCurrent = userReaction?.emoji === emoji;
                                    return (
                                      <button
                                        key={emoji}
                                        type="button"
                                        className={`picker-emoji-btn ${isCurrent ? 'active' : ''}`}
                                        onClick={() => {
                                          void handleReact(message.id, emoji);
                                          setActiveReactionPickerMessageId(null);
                                          setShowFullPicker(false);
                                        }}
                                      >
                                        {emoji}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {!deleted && reactionsMap.size > 0 && (
                        <div className={`message-reactions ${mine ? 'mine' : ''}`}>
                          {[...reactionsMap.entries()].map(([emoji, list]) => {
                            const hasReacted = list.some((r) => r.userId === me?.id);
                            const names = list.map((r) => r.displayName).join(', ');
                            return (
                              <button
                                key={emoji}
                                className={`reaction-badge ${hasReacted ? 'reacted' : ''}`}
                                title={names}
                                onClick={() => void handleReact(message.id, emoji)}
                              >
                                <span className="reaction-emoji">{emoji}</span>
                                <span className="reaction-count">{list.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="typing-line">{activeTypers ? `${activeTypers} is typing...` : status}</div>

            {isRecording ? (
              <div className="composer recording-mode">
                <button
                  type="button"
                  className="recording-cancel-btn"
                  title="Hủy ghi âm"
                  onClick={() => void stopRecording(false)}
                >
                  <Trash2 size={18} />
                </button>
                <div className="recording-status">
                  <span className="recording-indicator" />
                  <span className="recording-timer">{formatDuration(recordingDuration)}</span>
                </div>
                <button
                  type="button"
                  className="recording-send-btn animate-pulse"
                  title="Gửi ghi âm"
                  onClick={() => void stopRecording(true)}
                  disabled={attachmentUploading}
                >
                  {attachmentUploading ? 'Sending...' : <Send size={18} />}
                  Gửi
                </button>
              </div>
            ) : (
              <form className="composer" onSubmit={sendMessage}>
                {replyingTo && (
                  <div className="composer-reply-preview">
                    <div>
                      <strong>Đang trả lời {replyingTo.senderName}</strong>
                      <span>{replyingTo.content || (replyingTo.type === 'IMAGE' ? 'Hình ảnh' : 'Tệp đính kèm')}</span>
                    </div>
                    <button type="button" title="Hủy trả lời" onClick={() => setReplyingTo(null)}>
                      <X size={16} />
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  className="attach-button"
                  title="Attach file"
                  disabled={!selectedConversationId || attachmentUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip size={18} />
                </button>
                <button
                  type="button"
                  className="attach-button mic-button"
                  title="Ghi âm"
                  disabled={!selectedConversationId || attachmentUploading}
                  onClick={() => void startRecording()}
                >
                  <Mic size={18} />
                </button>
                <input
                  ref={fileInputRef}
                  className="file-input"
                  type="file"
                  onChange={handleAttachmentSelected}
                  disabled={!selectedConversationId || attachmentUploading}
                />
                <input
                  placeholder={selectedConversationId ? 'Write a message...' : 'Choose or create a conversation first'}
                  value={messageDraft}
                  onChange={(event) => handleDraft(event.target.value)}
                  disabled={!selectedConversationId}
                />
                <button disabled={!selectedConversationId || !messageDraft.trim() || attachmentUploading}>
                  <Send size={18} />
                  Send
                </button>
              </form>
            )}
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
