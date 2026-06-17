import { type Dispatch, type FormEvent, type SetStateAction, useState } from 'react';
import { api } from '../../../api';
import { saveSession } from '../../../storage';
import type { User } from '../../../types';
import type { ProfileForm } from '../model/types';

interface UseProfileSettingsOptions {
  token: string | null;
  refreshToken: string | null;
  me: User | null;
  setMe: Dispatch<SetStateAction<User | null>>;
  setError: (message: string | null) => void;
  setLoading: (loading: boolean) => void;
  setStatus: (message: string) => void;
}

export function useProfileSettings({
  token,
  refreshToken,
  me,
  setMe,
  setError,
  setLoading,
  setStatus,
}: UseProfileSettingsOptions) {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    displayName: '',
    avatarUrl: '',
    bio: '',
  });

  function openProfileModal() {
    if (!me) return;
    setProfileForm({
      displayName: me.displayName || '',
      avatarUrl: me.avatarUrl || '',
      bio: me.bio || '',
    });
    setShowProfileModal(true);
  }

  async function handleUpdateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      saveSession(token, refreshToken, updatedUser);
      setShowProfileModal(false);
      setStatus('Profile updated');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  }

  return {
    show: showProfileModal,
    form: profileForm,
    setForm: setProfileForm,
    open: openProfileModal,
    close: () => setShowProfileModal(false),
    submit: handleUpdateProfile,
  };
}
