import type { PropsWithChildren } from 'react';
import type { ChatController } from '../model/controllerTypes';
import { ChatControllerContext } from '../model/chatControllerContext';

interface ChatControllerProviderProps {
  value: ChatController;
}

export function ChatControllerProvider({ value, children }: PropsWithChildren<ChatControllerProviderProps>) {
  return <ChatControllerContext.Provider value={value}>{children}</ChatControllerContext.Provider>;
}
