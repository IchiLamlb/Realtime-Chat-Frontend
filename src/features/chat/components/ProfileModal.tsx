import { X } from 'lucide-react';
import { useChatControllerContext } from '../model/useChatControllerContext';

export function ProfileModal() {
  const { chat, profile } = useChatControllerContext();

  if (!profile.show) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Edit Profile</h3>
          <button className="icon-button" onClick={profile.close} aria-label="Close profile modal">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={profile.submit}>
          <div className="modal-body">
            <label>
              Display Name
              <input
                value={profile.form.displayName}
                onChange={(event) => profile.setForm({ ...profile.form, displayName: event.target.value })}
                required
              />
            </label>
            <label>
              Avatar URL
              <input
                value={profile.form.avatarUrl}
                onChange={(event) => profile.setForm({ ...profile.form, avatarUrl: event.target.value })}
              />
            </label>
            <label>
              Bio
              <input
                value={profile.form.bio}
                onChange={(event) => profile.setForm({ ...profile.form, bio: event.target.value })}
              />
            </label>
          </div>
          <div className="modal-footer">
            <button type="button" className="secondary" onClick={profile.close}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={chat.loading}>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
