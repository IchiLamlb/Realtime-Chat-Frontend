import { useState } from 'react';
import { X } from 'lucide-react';
import { initials } from '../../../shared/lib/formatters';
import { useChatControllerContext } from '../model/useChatControllerContext';
import { ImageCropper } from './ImageCropper';

export function GroupSettingsModal() {
  const { chat, group, session } = useChatControllerContext();
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const selectedConversation = chat.selectedConversation;

  if (!group.show || !selectedConversation) {
    return null;
  }

  const canManageGroup = group.myRole === 'OWNER' || group.myRole === 'ADMIN';

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
    group.setForm({ ...group.form, avatarUrl: base64 });
    setCropImageSrc(null);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Group Settings</h3>
          <button className="icon-button" onClick={() => {
            setCropImageSrc(null);
            group.close();
          }} aria-label="Close group settings">
            <X size={18} />
          </button>
        </div>
        
        {cropImageSrc ? (
          <div className="modal-body">
            <ImageCropper 
              imageSrc={cropImageSrc} 
              onCropComplete={handleCropComplete} 
              onCancel={() => setCropImageSrc(null)} 
            />
          </div>
        ) : (
          <div className="modal-body">
            {canManageGroup ? (
              <form onSubmit={group.submitUpdate} className="stack">
                <label>
                  Group Name
                  <input
                    value={group.form.name}
                    onChange={(event) => group.setForm({ ...group.form, name: event.target.value })}
                    required
                  />
                </label>
                <label>
                  Group Avatar
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                    {group.form.avatarUrl ? (
                      <img 
                        src={group.form.avatarUrl} 
                        alt="Group Avatar preview" 
                        style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} 
                      />
                    ) : (
                      <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#eee' }} />
                    )}
                    <input type="file" accept="image/*" onChange={handleFileChange} />
                  </div>
                </label>
                <button type="submit" className="primary" disabled={chat.loading}>
                  Update Group Profile
                </button>
              </form>
            ) : (
              <div>
                <strong>{selectedConversation.name}</strong>
                <p>You are a member of this group. Details can only be edited by admins or owners.</p>
              </div>
            )}

            <hr className="modal-separator" />

            <h4>Members ({selectedConversation.members?.length || 0})</h4>
            <div className="stack modal-scroll-list">
              {selectedConversation.members?.map((member) => (
                <div key={member.userId} className="member-list-item">
                  <div className="member-info">
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt={member.displayName} className="avatar-small" style={{ objectFit: 'cover' }} />
                    ) : (
                      <div className="avatar-small">{initials(member.displayName)}</div>
                    )}
                    <div>
                      <strong>{member.displayName}</strong>
                      <span>@{member.username}</span>
                    </div>
                  </div>
                  <div className="member-row-actions">
                    <span className={`member-role-badge ${member.role.toLowerCase()}`}>{member.role}</span>
                    {canManageGroup && member.userId !== session.me?.id && (
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => void group.removeMember(member.userId)}
                        disabled={member.role === 'OWNER' || (member.role === 'ADMIN' && group.myRole !== 'OWNER')}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {canManageGroup && (
              <>
                <hr className="modal-separator" />
                <h4>Add Member</h4>
                <div className="inline-form">
                  <input
                    placeholder="Search username/email"
                    value={group.searchUser}
                    onChange={(event) => group.setSearchUser(event.target.value)}
                  />
                  <button onClick={() => void group.searchUsers()}>Search</button>
                </div>
                <div className="stack modal-scroll-list compact">
                  {group.searchResult
                    .filter((user) => !selectedConversation.members?.some((member) => member.userId === user.id))
                    .map((user) => (
                      <div key={user.id} className="member-list-item search-result-item">
                        <div>
                          <strong>{user.displayName}</strong>
                          <span className="search-result-username">@{user.username}</span>
                        </div>
                        <button
                          type="button"
                          className="primary add-member-button"
                          onClick={() => void group.addMember(user.id)}
                        >
                          Add
                        </button>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        )}
        
        {!cropImageSrc && (
          <div className="modal-footer split">
            <div>
              {group.myRole === 'OWNER' ? (
                <button type="button" className="danger-button" onClick={() => void group.dissolve()}>
                  Dissolve Group
                </button>
              ) : (
                <button type="button" className="danger-button" onClick={() => void group.leave()}>
                  Leave Group
                </button>
              )}
            </div>
            <button className="secondary" onClick={group.close}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
