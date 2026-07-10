import { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { useChatControllerContext } from '../model/useChatControllerContext';
import { ImageCropper } from './ImageCropper';

const APP_ADMIN_EMAIL = 'admin@gmail.com';

export function ProfileModal() {
  const { adminPanel, chat, profile, session } = useChatControllerContext();
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const canManageApp = session.me?.email.toLowerCase() === APP_ADMIN_EMAIL;

  if (!profile.show) {
    return null;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setCropImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (base64: string) => {
    profile.setForm({ ...profile.form, avatarUrl: base64 });
    setCropImageSrc(null);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Edit Profile</h3>
          <button className="icon-button" onClick={() => {
            setCropImageSrc(null);
            profile.close();
          }} aria-label="Close profile modal">
            <X size={18} />
          </button>
        </div>
        {cropImageSrc ? (
          <ImageCropper 
            imageSrc={cropImageSrc} 
            onCropComplete={handleCropComplete} 
            onCancel={() => setCropImageSrc(null)} 
          />
        ) : (
          <form onSubmit={profile.submit}>
            <div className="modal-body stack">
              <label>
                Display Name
                <input
                  value={profile.form.displayName}
                  onChange={(event) => profile.setForm({ ...profile.form, displayName: event.target.value })}
                  required
                />
              </label>
              <label>
                Avatar
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                  {profile.form.avatarUrl ? (
                    <img 
                      src={profile.form.avatarUrl} 
                      alt="Avatar preview" 
                      style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#eee' }} />
                  )}
                  <input type="file" accept="image/*" onChange={handleFileChange} />
                </div>
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
              {canManageApp ? (
                <button
                  type="button"
                  className="admin-manage-button"
                  onClick={() => {
                    profile.close();
                    adminPanel.open();
                  }}
                >
                  <ShieldCheck size={16} />
                  Quản lý ứng dụng
                </button>
              ) : null}
              <button type="button" className="secondary" onClick={profile.close}>
                Cancel
              </button>
              <button type="submit" className="primary" disabled={chat.loading}>
                Save
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
