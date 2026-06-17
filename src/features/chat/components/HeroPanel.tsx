import { Sparkles } from 'lucide-react';
import { useChatControllerContext } from '../model/useChatControllerContext';

export function HeroPanel() {
  const { chat, session } = useChatControllerContext();

  return (
    <section className="hero-panel">
      <div className="brand-mark">
        <Sparkles size={18} />
        <span>Realtime Chat</span>
      </div>
      <h1>Conversations with a signal-first control room.</h1>
      <p>
        React client for the Spring Boot chat backend: JWT auth, direct/group rooms, message history,
        realtime STOMP delivery and typing events.
      </p>
      <div className="status-grid">
        <div>
          <span>Backend</span>
          <strong>localhost:8080</strong>
        </div>
        <div>
          <span>Socket</span>
          <strong>{chat.socketConnected ? 'Live' : 'Fallback REST'}</strong>
        </div>
        <div>
          <span>Session</span>
          <strong>{session.me ? session.me.username : 'Guest'}</strong>
        </div>
      </div>
    </section>
  );
}
