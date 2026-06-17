import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../../api';
import type { Conversation, User } from '../../../types';
import { assistantUsername } from '../lib/conversations';

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
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);
  const [groupSearch, setGroupSearch] = useState('');
  const [groupSearchResults, setGroupSearchResults] = useState<User[]>([]);
  const [groupVisibleCount, setGroupVisibleCount] = useState(10);
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

  const groupCandidates = useMemo(() => {
    const map = new Map<string, User>();
    [...usersById.values(), ...groupSearchResults].forEach((user) => {
      if (user.id !== me?.id && user.username !== assistantUsername) {
        map.set(user.id, user);
      }
    });
    return [...map.values()].sort((first, second) => first.displayName.localeCompare(second.displayName));
  }, [groupSearchResults, me?.id, usersById]);

  const visibleGroupCandidates = groupCandidates.slice(0, groupVisibleCount);

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
          if (member.userId !== me?.id && member.username !== assistantUsername) {
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

  async function openAssistant() {
    if (!token) {
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const conversation = await api.assistantConversation(token);
      await refreshConversations();
      setSelectedConversationId(conversation.id);
      setStatus('Assistant conversation ready');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Assistant conversation failed');
    } finally {
      setLoading(false);
    }
  }

  async function createGroup() {
    if (!token) {
      return;
    }

    if (!groupName.trim()) {
      setError('Enter a group name');
      return;
    }
    if (groupMemberIds.length === 0) {
      setError('Search and choose at least one member');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const conversation = await api.createGroup(token, {
        name: groupName.trim(),
        avatarUrl: null,
        memberIds: groupMemberIds,
      });
      setGroupName('');
      setGroupMemberIds([]);
      setGroupSearch('');
      setGroupSearchResults([]);
      setGroupVisibleCount(10);
      setShowCreateGroupModal(false);
      await refreshConversations();
      setSelectedConversationId(conversation.id);
      setStatus('Group created');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to create group');
    } finally {
      setLoading(false);
    }
  }

  function toggleGroupMember(userId: string) {
    setGroupMemberIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  }

  function openCreateGroupModal() {
    setGroupName('');
    setGroupMemberIds([]);
    setGroupSearch('');
    setGroupSearchResults([]);
    setGroupVisibleCount(10);
    setError(null);
    setShowCreateGroupModal(true);
  }

  function closeCreateGroupModal() {
    setShowCreateGroupModal(false);
  }

  async function searchGroupUsers() {
    if (!token || groupSearch.trim().length < 2) {
      setGroupSearchResults([]);
      setGroupVisibleCount(10);
      return;
    }

    setError(null);
    try {
      const result = await api.searchUsers(token, groupSearch.trim());
      setGroupSearchResults(result.filter((user) => user.id !== me?.id));
      setGroupVisibleCount(10);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Search failed');
    }
  }

  function loadMoreGroupCandidates() {
    setGroupVisibleCount((current) => current + 10);
  }

  function clearDirectory() {
    setConversations([]);
    setUsers([]);
    setShowCreateGroupModal(false);
    setGroupMemberIds([]);
    setGroupSearch('');
    setGroupSearchResults([]);
    setGroupVisibleCount(10);
    setSelectedConversationId(null);
    setPresenceMap(new Map());
  }

  async function updateSettings(theme: string, backgroundColor: string) {
    if (!token || !selectedConversationId) return;
    setError(null);
    try {
      await api.updateConversationSettings(token, selectedConversationId, { theme, backgroundColor });
      await refreshConversations();
      setStatus('Settings updated');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to update settings');
    }
  }

  async function updateNickname(targetUserId: string, nickname: string | null) {
    if (!token || !selectedConversationId) return;
    setError(null);
    try {
      await api.updateNickname(token, selectedConversationId, targetUserId, nickname);
      await refreshConversations();
      setStatus('Nickname updated');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to update nickname');
    }
  }

  return {
    conversations,
    selectedConversation,
    selectedConversationId,
    setSelectedConversationId,
    userSearch,
    setUserSearch,
    users,
    showCreateGroupModal,
    groupCandidates,
    visibleGroupCandidates,
    groupName,
    setGroupName,
    groupMemberIds,
    groupSearch,
    setGroupSearch,
    groupVisibleCount,
    usersById,
    presenceMap,
    myGroupRole,
    refreshConversations,
    searchUsers,
    createDirect,
    openAssistant,
    openCreateGroupModal,
    closeCreateGroupModal,
    createGroup,
    toggleGroupMember,
    searchGroupUsers,
    loadMoreGroupCandidates,
    clearDirectory,
    updateSettings,
    updateNickname,
  };
}
