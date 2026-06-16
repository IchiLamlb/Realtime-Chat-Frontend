import { Client, type IMessage } from '@stomp/stompjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage, MessageReceipt, TypingEvent } from './types';

interface UseChatSocketOptions {
  conversationId: string | null;
  token: string | null;
  onMessage: (message: ChatMessage) => void;
  onReceipt: (receipt: MessageReceipt) => void;
  onTyping: (event: TypingEvent) => void;
}

function socketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

function isChatMessage(payload: unknown): payload is ChatMessage {
  return Boolean(payload && typeof payload === 'object' && 'id' in payload && 'content' in payload);
}

function isTypingEvent(payload: unknown): payload is TypingEvent {
  return Boolean(payload && typeof payload === 'object' && 'typing' in payload);
}

function isMessageReceipt(payload: unknown): payload is MessageReceipt {
  return Boolean(payload && typeof payload === 'object' && 'messageId' in payload && 'status' in payload);
}

export function useChatSocket({ conversationId, token, onMessage, onReceipt, onTyping }: UseChatSocketOptions) {
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!conversationId || !token) {
      setConnected(false);
      return;
    }

    const client = new Client({
      brokerURL: socketUrl(),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 2500,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        setConnected(true);
        client.subscribe(`/topic/conversations/${conversationId}`, (frame: IMessage) => {
          const payload = JSON.parse(frame.body) as ChatMessage | MessageReceipt | TypingEvent;
          if (isChatMessage(payload)) {
            onMessage(payload);
            return;
          }
          if (isMessageReceipt(payload)) {
            onReceipt(payload);
            return;
          }
          if (isTypingEvent(payload)) {
            onTyping(payload);
          }
        });
      },
      onDisconnect: () => setConnected(false),
      onWebSocketClose: () => setConnected(false),
      onStompError: () => setConnected(false),
    });

    clientRef.current = client;
    client.activate();

    return () => {
      void client.deactivate();
      clientRef.current = null;
      setConnected(false);
    };
  }, [conversationId, token, onMessage, onReceipt, onTyping]);

  const sendMessage = useCallback((payload: { conversationId: string; type: 'TEXT'; content: string; metadata: Record<string, unknown> }) => {
    clientRef.current?.publish({
      destination: '/app/chat.sendMessage',
      body: JSON.stringify(payload),
    });
  }, []);

  const sendTyping = useCallback((payload: { conversationId: string; typing: boolean }) => {
    clientRef.current?.publish({
      destination: '/app/chat.typing',
      body: JSON.stringify(payload),
    });
  }, []);

  const sendDelivered = useCallback((messageId: string) => {
    clientRef.current?.publish({
      destination: '/app/chat.deliverMessage',
      body: JSON.stringify({ messageId }),
    });
  }, []);

  const sendRead = useCallback((messageId: string) => {
    clientRef.current?.publish({
      destination: '/app/chat.readMessage',
      body: JSON.stringify({ messageId }),
    });
  }, []);

  return useMemo(
    () => ({ connected, sendMessage, sendTyping, sendDelivered, sendRead }),
    [connected, sendDelivered, sendMessage, sendRead, sendTyping],
  );
}
