import { LogOut, MessageCircle, Plus, Search, Settings, Users } from 'lucide-react';
import { initials } from '../../../shared/lib/formatters';
import { conversationLabel, directConversationPresence } from '../lib/conversations';
import { useChatControllerContext } from '../model/useChatControllerContext';

export function Sidebar() {
  const { profile, session, sidebar } = useChatControllerContext();
  const { me } = session;

  if (!me) {
    return null;
  }

  return (
    <aside className="sidebar">
      <div className="profile-row">
        <div className="avatar">{initials(me.displayName)}</div>
        <div>
          <strong>{me.displayName}</strong>
          <span>@{me.username}</span>
        </div>
        <button className="icon-button settings-btn" title="Edit Profile" onClick={profile.open}>
          <Settings size={18} />
        </button>
        <button className="icon-button" title="Logout" onClick={session.logout}>
          <LogOut size={18} />
        </button>
      </div>

      <div className="tool-card">
        <div className="section-title">
          <Search size={16} />
          Find people
        </div>
        <div className="inline-form">
          <input
            placeholder="username/email"
            value={sidebar.userSearch}
            onChange={(event) => sidebar.setUserSearch(event.target.value)}
          />
          <button onClick={() => void sidebar.searchUsers()}>Go</button>
        </div>
        <div className="user-list">
          {sidebar.users.map((user) => (
            <button key={user.id} onClick={() => void sidebar.createDirect(user.id)}>
              <span>{user.displayName}</span>
              <small>@{user.username}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="tool-card">
        <div className="section-title">
          <Users size={16} />
          Group room
        </div>
        <input
          placeholder="Group name"
          value={sidebar.groupName}
          onChange={(event) => sidebar.setGroupName(event.target.value)}
        />
        <button className="wide-button" onClick={() => void sidebar.createGroup()}>
          <Plus size={16} />
          Create from search results
        </button>
      </div>

      <div className="conversation-list">
        <div className="section-title">
          <MessageCircle size={16} />
          Conversations
        </div>
        {sidebar.conversations.map((conversation) => {
          const isSelected = conversation.id === sidebar.selectedConversationId;
          const presenceStatus = directConversationPresence(conversation, me, sidebar.presenceMap);

          return (
            <button
              key={conversation.id}
              className={isSelected ? 'active' : ''}
              onClick={() => sidebar.setSelectedConversationId(conversation.id)}
            >
              <div className="conversation-list-item-body">
                <div>
                  <strong>{conversationLabel(conversation, sidebar.usersById, me)}</strong>
                  <span>{conversation.type.toLowerCase()}</span>
                </div>
                {presenceStatus && (
                  <span className={`presence-dot ${presenceStatus.toLowerCase()}`} title={presenceStatus} />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
