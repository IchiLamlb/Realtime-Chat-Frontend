import { AuthPanel } from '../auth/components/AuthPanel';
import { AdminPanelModal } from './components/AdminPanelModal';
import { ChatControllerProvider } from './components/ChatControllerProvider';
import { useChatController } from './hooks/useChatController';
import { ChatWorkspace } from './components/ChatWorkspace';
import { CreateGroupModal } from './components/CreateGroupModal';
import { GroupSettingsModal } from './components/GroupSettingsModal';
import { HeroPanel } from './components/HeroPanel';
import { ProfileModal } from './components/ProfileModal';

export function ChatApp() {
  const controller = useChatController();

  return (
    <ChatControllerProvider value={controller}>
      <main className="shell">
        <HeroPanel />
        {controller.session.isAuthenticated ? <ChatWorkspace /> : <AuthPanel />}
        <ProfileModal />
        <AdminPanelModal />
        <CreateGroupModal />
        <GroupSettingsModal />
      </main>
    </ChatControllerProvider>
  );
}
