import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { api } from '../../../api';
import type { ChatMessage, MessageReceipt, TypingEvent, WebRTCSignalEvent } from '../../../types';
import { useChatSocket } from '../../../useChatSocket';
import { useAuthSession } from '../../auth/hooks/useAuthSession';
import { messagePreview } from '../lib/messages';
import type { ReplyPreview } from '../model/types';
import type { ChatController } from '../model/controllerTypes';
import { useConversationDirectory } from './useConversationDirectory';
import { useGroupSettings } from './useGroupSettings';
import { useProfileSettings } from './useProfileSettings';
import { useVoiceRecorder } from './useVoiceRecorder';

const MAX_ATTACHMENT_SIZE = 100 * 1024 * 1024;

export function useChatController(): ChatController {
  const [status, setStatus] = useState('Ready');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const authSession = useAuthSession({ setError, setLoading, setStatus });
  const { token, refreshToken, me, setMe } = authSession;
  const directory = useConversationDirectory({ token, me, setError, setLoading, setStatus });
  const {
    selectedConversation,
    selectedConversationId,
    setSelectedConversationId,
    usersById,
    myGroupRole,
    refreshConversations,
  } = directory;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, number>>(new Map());
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [activeReactionPickerMessageId, setActiveReactionPickerMessageId] = useState<string | null>(null);
  const [activeMessageMenuId, setActiveMessageMenuId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ReplyPreview | null>(null);
  const [hiddenMessageIds, setHiddenMessageIds] = useState<Set<string>>(new Set());
  const [showFullPicker, setShowFullPicker] = useState(false);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [webrtcSignalEvent, setWebrtcSignalEvent] = useState<WebRTCSignalEvent | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const prevConversationIdRef = useRef<string | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const messageFeedRef = useRef<HTMLDivElement | null>(null);
  const acknowledgedReadIds = useRef<Set<string>>(new Set());

  const handleSocketMessage = useCallback((message: ChatMessage) => {
    setMessages((current) => {
      const existingIndex = current.findIndex((item) => item.id === message.id);
      if (existingIndex >= 0) {
        return current.map((item, index) => (index === existingIndex ? { ...item, ...message } : item));
      }
      return [...current, message];
    });
  }, []);

  const voiceRecorder = useVoiceRecorder({
    token,
    selectedConversationId,
    onMessageStored: handleSocketMessage,
    setAttachmentUploading,
    setError,
    setStatus,
  });

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
    onWebRTCSignal: setWebrtcSignalEvent,
  });

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
      .then((response) => {
        setMessages([...response.items].reverse());
        setNextCursor(response.nextCursor);
        setHasMore(response.hasMore);
      })
      .catch((caught: Error) => setError(caught.message))
      .finally(() => setLoading(false));
  }, [selectedConversationId, token]);

  const loadMoreMessages = useCallback(
    async (container?: HTMLDivElement | null, oldScrollHeight?: number) => {
      if (!token || !selectedConversationId || !nextCursor || loading) {
        return;
      }

      setLoading(true);
      try {
        const response = await api.messages(token, selectedConversationId, 50, nextCursor);
        const targetContainer = container || messageFeedRef.current;
        const targetOldScrollHeight = oldScrollHeight || (targetContainer ? targetContainer.scrollHeight : 0);

        setMessages((current) => [...[...response.items].reverse(), ...current]);
        setNextCursor(response.nextCursor);
        setHasMore(response.hasMore);

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
    },
    [loading, nextCursor, selectedConversationId, token],
  );

  const handleScroll = useCallback(() => {
    const container = messageFeedRef.current;
    if (!container) return;

    if (container.scrollTop <= 10 && hasMore && !loading && nextCursor) {
      void loadMoreMessages(container, container.scrollHeight);
    }
  }, [hasMore, loadMoreMessages, loading, nextCursor]);

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
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        const timer = setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }, 50);
        return () => clearTimeout(timer);
      }

      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
  }, [activeMessageMenuId, activeReactionPickerMessageId]);

  const profileSettings = useProfileSettings({
    token,
    refreshToken,
    me,
    setMe,
    setError,
    setLoading,
    setStatus,
  });

  const groupSettings = useGroupSettings({
    token,
    selectedConversation,
    myGroupRole,
    refreshConversations,
    setSelectedConversationId,
    setError,
    setLoading,
    setStatus,
  });

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

    setMessages((current) =>
      current.map((message) => {
        if (message.id !== messageId) return message;

        const currentReactions = message.reactions ?? [];
        const existingReactionIndex = currentReactions.findIndex((reaction) => reaction.userId === me?.id);
        const nextReactions = [...currentReactions];

        if (existingReactionIndex >= 0) {
          const existing = currentReactions[existingReactionIndex];
          if (existing.emoji === emoji) {
            nextReactions.splice(existingReactionIndex, 1);
          } else {
            nextReactions[existingReactionIndex] = { ...existing, emoji };
          }
        } else if (me) {
          nextReactions.push({
            userId: me.id,
            username: me.username,
            displayName: me.displayName,
            avatarUrl: me.avatarUrl,
            emoji,
          });
        }

        return { ...message, reactions: nextReactions };
      }),
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

  function handleDraft(value: string) {
    setMessageDraft(value);
    if (selectedConversationId && socket.connected) {
      socket.sendTyping({ conversationId: selectedConversationId, typing: value.length > 0 });
    }
  }

  function logout() {
    authSession.clearAuthSession();
    directory.clearDirectory();
    setMessages([]);
    setStatus('Signed out');
  }

  const activeTypers = [...typingUsers.keys()]
    .map((id) => usersById.get(id)?.displayName ?? 'Someone')
    .join(', ');

  const visibleMessages = useMemo(
    () => messages.filter((message) => !hiddenMessageIds.has(message.id)),
    [hiddenMessageIds, messages],
  );

  return {
    session: {
      token,
      me,
      isAuthenticated: Boolean(me && token),
      logout,
    },
    auth: authSession.auth,
    sidebar: {
      conversations: directory.conversations,
      selectedConversationId,
      setSelectedConversationId,
      userSearch: directory.userSearch,
      setUserSearch: directory.setUserSearch,
      users: directory.users,
      groupName: directory.groupName,
      setGroupName: directory.setGroupName,
      usersById,
      presenceMap: directory.presenceMap,
      searchUsers: directory.searchUsers,
      createDirect: directory.createDirect,
      createGroup: directory.createGroup,
    },
    chat: {
      selectedConversation,
      messages,
      visibleMessages,
      messageDraft,
      selectedConversationId,
      socketConnected: socket.connected,
      activeTypers,
      status,
      error,
      loading,
      attachmentUploading,
      replyingTo,
      setReplyingTo,
      hiddenMessageIds,
      activeReactionPickerMessageId,
      setActiveReactionPickerMessageId,
      activeMessageMenuId,
      setActiveMessageMenuId,
      showFullPicker,
      setShowFullPicker,
      activeCategoryIndex,
      setActiveCategoryIndex,
      messageFeedRef,
      messagesEndRef,
      fileInputRef,
      isRecording: voiceRecorder.isRecording,
      recordingDuration: voiceRecorder.recordingDuration,
      handleScroll,
      sendMessage,
      handleDraft,
      handleReact,
      handleStartReply,
      handleDeleteForMe,
      handleDeleteForEveryone,
      handleAttachmentSelected,
      startRecording: voiceRecorder.startRecording,
      stopRecording: voiceRecorder.stopRecording,
      webrtcSignalEvent,
      setWebrtcSignalEvent,
      sendWebRTCSignal: socket.sendWebRTCSignal,
    },
    profile: profileSettings,
    group: groupSettings,
  };
}
