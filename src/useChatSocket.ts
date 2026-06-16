import { Client, type IMessage } from '@stomp/stompjs';
import { useEffect, useRef, useState } from 'react';
import type { ChatMessage, TypingEvent } from './types';

interface UseChatSocketOptions {
  conversationId: string | null;
  token: string | null;
  onMessage: (message: ChatMessage) => void;
  onTyping: (event: TypingEvent) => void;
}

function socketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

export function useChatSocket({ conversationId, token, onMessage, onTyping }: UseChatSocketOptions) {
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
          const payload = JSON.parse(frame.body) as ChatMessage | TypingEvent;
          if ('content' in payload) {
            onMessage(payload);
            return;
          }
          if ('typing' in payload) {
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
  }, [conversationId, token, onMessage, onTyping]);

  function sendMessage(payload: { conversationId: string; type: 'TEXT'; content: string; metadata: Record<string, unknown> }) {
    clientRef.current?.publish({
      destination: '/app/chat.sendMessage',
      body: JSON.stringify(payload),
    });
  }

  function sendTyping(payload: { conversationId: string; typing: boolean }) {
    clientRef.current?.publish({
      destination: '/app/chat.typing',
      body: JSON.stringify(payload),
    });
  }

  return { connected, sendMessage, sendTyping };
}
