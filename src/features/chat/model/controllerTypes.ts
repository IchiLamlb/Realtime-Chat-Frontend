import type {
  ChangeEvent,
  Dispatch,
  FormEvent,
  MutableRefObject,
  SetStateAction,
} from 'react';
import type { AuthForm, AuthMode, PasswordResetForm } from '../../auth/model/types';
import type { ChatMessage, Conversation, User } from '../../../types';
import type { GroupForm, ProfileForm, ReplyPreview } from './types';
import type { WebRTCSignalEvent } from '../../../types';

export interface ChatController {
  session: {
    token: string | null;
    me: User | null;
    isAuthenticated: boolean;
    logout: () => void;
  };
  auth: {
    mode: AuthMode;
    setMode: Dispatch<SetStateAction<AuthMode>>;
    form: AuthForm;
    setForm: Dispatch<SetStateAction<AuthForm>>;
    passwordResetForm: PasswordResetForm;
    setPasswordResetForm: Dispatch<SetStateAction<PasswordResetForm>>;
    showPassword: boolean;
    setShowPassword: Dispatch<SetStateAction<boolean>>;
    showResetPassword: boolean;
    setShowResetPassword: Dispatch<SetStateAction<boolean>>;
    authenticate: (event: FormEvent<HTMLFormElement>) => Promise<void>;
    requestPasswordReset: (event: FormEvent<HTMLFormElement>) => Promise<void>;
    resetPassword: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  };
  sidebar: {
    conversations: Conversation[];
    selectedConversationId: string | null;
    setSelectedConversationId: Dispatch<SetStateAction<string | null>>;
    userSearch: string;
    setUserSearch: Dispatch<SetStateAction<string>>;
    users: User[];
    showCreateGroupModal: boolean;
    groupCandidates: User[];
    visibleGroupCandidates: User[];
    groupName: string;
    setGroupName: Dispatch<SetStateAction<string>>;
    groupMemberIds: string[];
    groupSearch: string;
    setGroupSearch: Dispatch<SetStateAction<string>>;
    groupVisibleCount: number;
    usersById: Map<string, User>;
    presenceMap: Map<string, string>;
    searchUsers: () => Promise<void>;
    createDirect: (userId: string) => Promise<void>;
    openAssistant: () => Promise<void>;
    openCreateGroupModal: () => void;
    closeCreateGroupModal: () => void;
    createGroup: () => Promise<void>;
    toggleGroupMember: (userId: string) => void;
    searchGroupUsers: () => Promise<void>;
    loadMoreGroupCandidates: () => void;
  };
  chat: {
    selectedConversation: Conversation | null;
    messages: ChatMessage[];
    visibleMessages: ChatMessage[];
    messageDraft: string;
    selectedConversationId: string | null;
    socketConnected: boolean;
    activeTypers: string;
    status: string;
    error: string | null;
    loading: boolean;
    attachmentUploading: boolean;
    replyingTo: ReplyPreview | null;
    setReplyingTo: Dispatch<SetStateAction<ReplyPreview | null>>;
    hiddenMessageIds: Set<string>;
    activeReactionPickerMessageId: string | null;
    setActiveReactionPickerMessageId: Dispatch<SetStateAction<string | null>>;
    activeMessageMenuId: string | null;
    setActiveMessageMenuId: Dispatch<SetStateAction<string | null>>;
    showFullPicker: boolean;
    setShowFullPicker: Dispatch<SetStateAction<boolean>>;
    activeCategoryIndex: number;
    setActiveCategoryIndex: Dispatch<SetStateAction<number>>;
    messageFeedRef: MutableRefObject<HTMLDivElement | null>;
    messagesEndRef: MutableRefObject<HTMLDivElement | null>;
    fileInputRef: MutableRefObject<HTMLInputElement | null>;
    isRecording: boolean;
    recordingDuration: number;
    handleScroll: () => void;
    sendMessage: (event: FormEvent<HTMLFormElement>) => Promise<void>;
    handleDraft: (value: string) => void;
    handleReact: (messageId: string, emoji: string) => Promise<void>;
    handleStartReply: (message: ChatMessage) => void;
    handleDeleteForMe: (messageId: string) => void;
    handleDeleteForEveryone: (messageId: string) => Promise<void>;
    handleAttachmentSelected: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
    startRecording: () => Promise<void>;
    stopRecording: (shouldSend: boolean) => Promise<void>;
    webrtcSignalEvent: WebRTCSignalEvent | null;
    setWebrtcSignalEvent: Dispatch<SetStateAction<WebRTCSignalEvent | null>>;
    sendWebRTCSignal: (payload: { conversationId: string; type: string; payload: string }) => void;
  };
  profile: {
    show: boolean;
    form: ProfileForm;
    setForm: Dispatch<SetStateAction<ProfileForm>>;
    open: () => void;
    close: () => void;
    submit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  };
  group: {
    show: boolean;
    form: GroupForm;
    setForm: Dispatch<SetStateAction<GroupForm>>;
    searchUser: string;
    setSearchUser: Dispatch<SetStateAction<string>>;
    searchResult: User[];
    myRole: 'OWNER' | 'ADMIN' | 'MEMBER' | null;
    open: () => void;
    close: () => void;
    submitUpdate: (event: FormEvent<HTMLFormElement>) => Promise<void>;
    searchUsers: () => Promise<void>;
    addMember: (userId: string) => Promise<void>;
    removeMember: (memberId: string) => Promise<void>;
    leave: () => Promise<void>;
    dissolve: () => Promise<void>;
  };
}
