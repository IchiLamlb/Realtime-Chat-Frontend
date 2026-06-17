import { type Dispatch, type FormEvent, type SetStateAction, useState } from 'react';
import { api } from '../../../api';
import type { Conversation, User } from '../../../types';
import type { GroupForm } from '../model/types';

type GroupRole = 'OWNER' | 'ADMIN' | 'MEMBER' | null;

interface UseGroupSettingsOptions {
  token: string | null;
  selectedConversation: Conversation | null;
  myGroupRole: GroupRole;
  refreshConversations: () => Promise<void>;
  setSelectedConversationId: Dispatch<SetStateAction<string | null>>;
  setError: (message: string | null) => void;
  setLoading: (loading: boolean) => void;
  setStatus: (message: string) => void;
}

export function useGroupSettings({
  token,
  selectedConversation,
  myGroupRole,
  refreshConversations,
  setSelectedConversationId,
  setError,
  setLoading,
  setStatus,
}: UseGroupSettingsOptions) {
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupForm, setGroupForm] = useState<GroupForm>({
    name: '',
    avatarUrl: '',
  });
  const [groupSearchUser, setGroupSearchUser] = useState('');
  const [groupSearchResult, setGroupSearchResult] = useState<User[]>([]);

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

  async function handleUpdateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      const result = await api.searchUsers(token, groupSearchUser.trim());
      setGroupSearchResult(result);
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
      setGroupSearchResult((current) => current.filter((user) => user.id !== userId));
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

  return {
    show: showGroupModal,
    form: groupForm,
    setForm: setGroupForm,
    searchUser: groupSearchUser,
    setSearchUser: setGroupSearchUser,
    searchResult: groupSearchResult,
    myRole: myGroupRole,
    open: openGroupModal,
    close: () => setShowGroupModal(false),
    submitUpdate: handleUpdateGroup,
    searchUsers: handleSearchGroupUser,
    addMember: handleAddMember,
    removeMember: handleRemoveMember,
    leave: handleLeaveGroup,
    dissolve: handleDissolveGroup,
  };
}
