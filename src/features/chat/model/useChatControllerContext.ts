import { useContext } from 'react';
import { ChatControllerContext } from './chatControllerContext';

export function useChatControllerContext() {
  const controller = useContext(ChatControllerContext);
  if (!controller) {
    throw new Error('useChatControllerContext must be used inside ChatControllerProvider');
  }
  return controller;
}
