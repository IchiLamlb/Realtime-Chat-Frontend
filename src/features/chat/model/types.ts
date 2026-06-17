import type { ChatMessage } from '../../../types';

export interface ReplyPreview {
  id: string;
  senderName: string;
  content: string;
  type: ChatMessage['type'];
}

export interface ProfileForm {
  displayName: string;
  avatarUrl: string;
  bio: string;
}

export interface GroupForm {
  name: string;
  avatarUrl: string;
}
