import { type FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useChatControllerContext } from '../model/useChatControllerContext';
import { directConversationPeer } from '../lib/conversations';

interface DirectSettingsModalProps {
  show: boolean;
  onClose: () => void;
}

export function DirectSettingsModal({ show, onClose }: DirectSettingsModalProps) {
  const { chat, session, sidebar } = useChatControllerContext();
  const { selectedConversation } = chat;

  const [theme, setTheme] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('');
  const [nickname, setNickname] = useState('');

  const otherPeer = selectedConversation ? directConversationPeer(selectedConversation, session.me) : null;

  useEffect(() => {
    if (show && selectedConversation) {
      setTheme(selectedConversation.theme || '');
      setBackgroundColor(selectedConversation.backgroundColor || '');
      setNickname(otherPeer?.nickname || '');
    }
  }, [show, selectedConversation, otherPeer]);

  if (!show || !selectedConversation || selectedConversation.type !== 'DIRECT') return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await sidebar.updateSettings(theme, backgroundColor);
      if (otherPeer) {
        await sidebar.updateNickname(otherPeer.userId, nickname.trim() || null);
      }
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Chat Settings</h3>
          <button className="icon-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <form id="direct-settings-form" onSubmit={(e) => void handleSubmit(e)}>
            <div className="form-group">
              <label>Theme</label>
              <select value={theme} onChange={(e) => setTheme(e.target.value)}>
                <option value="">Default</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="ocean">Ocean</option>
                <option value="sunset">Sunset</option>
              </select>
            </div>
            <div className="form-group">
              <label>Background Color (Hex code)</label>
              <input
                type="color"
                value={backgroundColor || '#ffffff'}
                onChange={(e) => setBackgroundColor(e.target.value)}
              />
              <button
                type="button"
                className="secondary"
                style={{ marginTop: '0.5rem', width: '100%' }}
                onClick={() => setBackgroundColor('')}
              >
                Clear Custom Color
              </button>
            </div>
            <div className="form-group">
              <label>Nickname for {otherPeer?.displayName}</label>
              <input
                type="text"
                placeholder="Enter nickname..."
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="direct-settings-form">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
