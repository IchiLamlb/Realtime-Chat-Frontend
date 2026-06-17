import { useEffect } from 'react';
import { Check, Search, UserPlus, X } from 'lucide-react';
import { initials } from '../../../shared/lib/formatters';
import { useChatControllerContext } from '../model/useChatControllerContext';

export function CreateGroupModal() {
  const { chat, sidebar } = useChatControllerContext();

  useEffect(() => {
    if (!sidebar.showCreateGroupModal) {
      return;
    }

    const query = sidebar.groupSearch.trim();
    if (query.length < 2) {
      return;
    }

    const timer = window.setTimeout(() => {
      void sidebar.searchGroupUsers();
    }, 350);

    return () => window.clearTimeout(timer);
  }, [sidebar.groupSearch, sidebar.showCreateGroupModal]);

  if (!sidebar.showCreateGroupModal) {
    return null;
  }

  const hasMore = sidebar.groupCandidates.length > sidebar.visibleGroupCandidates.length;

  return (
    <div className="modal-overlay">
      <div className="modal-content create-group-modal">
        <div className="modal-header">
          <h3>Create Group</h3>
          <button className="icon-button" onClick={sidebar.closeCreateGroupModal} aria-label="Close create group">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <label>
            Group Name
            <input
              placeholder="Enter group name"
              value={sidebar.groupName}
              onChange={(event) => sidebar.setGroupName(event.target.value)}
            />
          </label>

          <div className="inline-form">
            <input
              placeholder="Search username/email"
              value={sidebar.groupSearch}
              onChange={(event) => sidebar.setGroupSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void sidebar.searchGroupUsers();
                }
              }}
            />
            <button type="button" onClick={() => void sidebar.searchGroupUsers()}>
              <Search size={16} />
              Search
            </button>
          </div>

          <div className="selected-member-strip">
            {sidebar.groupMemberIds.length} selected
          </div>

          <div
            className="create-group-member-list"
            onScroll={(event) => {
              const target = event.currentTarget;
              if (hasMore && target.scrollTop + target.clientHeight >= target.scrollHeight - 16) {
                sidebar.loadMoreGroupCandidates();
              }
            }}
          >
            {sidebar.visibleGroupCandidates.length === 0 ? (
              <div className="empty-picker-state">Type at least 2 characters to search username, email, or name</div>
            ) : (
              sidebar.visibleGroupCandidates.map((user) => {
                const selected = sidebar.groupMemberIds.includes(user.id);

                return (
                  <button
                    key={user.id}
                    type="button"
                    className={`create-group-member ${selected ? 'selected' : ''}`}
                    onClick={() => sidebar.toggleGroupMember(user.id)}
                    aria-pressed={selected}
                  >
                    <span className="avatar-tiny">{initials(user.displayName)}</span>
                    <span>
                      <strong>{user.displayName}</strong>
                      <small>@{user.username}</small>
                    </span>
                    {selected ? <Check size={18} /> : <UserPlus size={18} />}
                  </button>
                );
              })
            )}
          </div>

          {hasMore && (
            <button type="button" className="secondary wide-button load-group-members" onClick={sidebar.loadMoreGroupCandidates}>
              Load more
            </button>
          )}
        </div>

        <div className="modal-footer">
          <button className="secondary" onClick={sidebar.closeCreateGroupModal}>
            Cancel
          </button>
          <button className="primary create-group-submit" onClick={() => void sidebar.createGroup()} disabled={chat.loading}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
