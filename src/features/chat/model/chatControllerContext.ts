import { createContext } from 'react';
import type { ChatController } from './controllerTypes';

export const ChatControllerContext = createContext<ChatController | null>(null);
