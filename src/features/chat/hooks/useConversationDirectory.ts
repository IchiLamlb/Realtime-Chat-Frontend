import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../../api';
import type { Conversation, User } from '../../../types';

interface UseConversationDirectoryOptions {
  token: string | null;
  me: User | null;
  setError: (message: string | null) => void;
  setLoading: (loading: boolean) => void;
  setStatus: (message: string) => void;
}

export function useConversationDirectory({
  token,
  me,
  setError,
  setLoading,
  setStatus,
}: UseConversationDirectoryOptions) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [presenceMap, setPresenceMap] = useState<Map<string, string>>(new Map());

  const usersById = useMemo(() => {
    const map = new Map<string, User>();
    users.forEach((user) => map.set(user.id, user));
    if (me) {
      map.set(me.id, me);
    }
    conversations.forEach((conversation) => {
      conversation.members?.forEach((member) => {
        if (!map.has(member.userId)) {
          map.set(member.userId, {
            id: member.userId,
            username: member.username,
            email: '',
            displayName: member.displayName,
            avatarUrl: member.avatarUrl,
            bio: '',
            status: 'OFFLINE',
            createdAt: '',
          });
        }
      });
    });
    return map;
  }, [conversations, me, users]);

  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedConversationId) ?? null;

  const myGroupRole = useMemo(() => {
    if (!selectedConversation || !me) return null;
    const member = selectedConversation.members?.find((item) => item.userId === me.id);
    return member?.role ?? null;
  }, [me, selectedConversation]);

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

  useEffect(() => {
    if (!token || conversations.length === 0) {
      return;
    }

    const fetchPresences = async () => {
      const uniqueUserIds = new Set<string>();
      conversations.forEach((conversation) => {
        conversation.members?.forEach((member) => {
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
          // Presence is best-effort; stale values are safer than noisy UI errors.
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
  }, [conversations, me?.id, token]);

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

  function clearDirectory() {
    setConversations([]);
    setUsers([]);
    setSelectedConversationId(null);
    setPresenceMap(new Map());
  }

  return {
    conversations,
    selectedConversation,
    selectedConversationId,
    setSelectedConversationId,
    userSearch,
    setUserSearch,
    users,
    groupName,
    setGroupName,
    usersById,
    presenceMap,
    myGroupRole,
    refreshConversations,
    searchUsers,
    createDirect,
    createGroup,
    clearDirectory,
  };
}
