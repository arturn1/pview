import { useEffect, useState } from 'react';
import { FlowCanvas } from './components/canvas/FlowCanvas';
import { AppDialogProvider } from './components/common/AppDialog';
import { AuthGate, type AuthUser, type Role } from './components/common/AuthGate';
import { RoleSimulationContext } from './components/common/WorkspaceHeader';
import { ProjectList } from './components/projects/ProjectList';
import { UsersManager } from './components/projects/UsersManager';
import { SprintList } from './components/sprints/SprintList';
import { useProjectStore } from './store/useProjectStore';

function ProjectWorkspace({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [view, setView] = useState<{ page: 'home' } | { page: 'canvas' } | { page: 'users' } | { page: 'sprints'; projectId?: string; returnTo: 'home' | 'canvas' }>({ page: 'home' });
  const [simulatedRole, setSimulatedRole] = useState<Role | null>(null);
  const loadFromRepository = useProjectStore(state => state.loadFromRepository);
  const setCanWrite = useProjectStore(state => state.setCanWrite);
  const projectId = useProjectStore(state => state.project.id);
  const displayedUser = simulatedRole ? { ...user, role: simulatedRole } : user;
  const changeSimulatedRole = (role: Role) => {
    if (user.role !== 'ADM') return;
    setSimulatedRole(role === 'ADM' ? null : role);
    setView({ page: 'home' });
  };

  useEffect(() => {
    setCanWrite(displayedUser.role === 'ADM' || displayedUser.role === 'DIGITAL');
    void loadFromRepository();
  }, [displayedUser.role, loadFromRepository, setCanWrite]);

  const content = view.page === 'canvas'
    ? <FlowCanvas onBackToProjects={() => setView({ page: 'home' })} onOpenSprints={() => setView({ page: 'sprints', projectId, returnTo: 'canvas' })} onLogout={onLogout} />
    : view.page === 'users'
      ? <UsersManager user={displayedUser} onLogout={onLogout} onBack={() => setView({ page: 'home' })} />
      : view.page === 'sprints'
        ? <SprintList user={displayedUser} onLogout={onLogout} projectId={view.projectId} onBack={() => setView({ page: view.returnTo })} />
        : <ProjectList user={displayedUser} onLogout={onLogout} onOpenProject={() => setView({ page: 'canvas' })} onOpenSprints={id => setView({ page: 'sprints', projectId: id, returnTo: 'home' })} onManageUsers={() => setView({ page: 'users' })} />;

  return <RoleSimulationContext.Provider value={user.role === 'ADM' ? { onRoleChange: changeSimulatedRole } : null}>{content}</RoleSimulationContext.Provider>;
}

export default function App() {
  return <AuthGate>{(user, logout) => <AppDialogProvider><ProjectWorkspace user={user} onLogout={logout} /></AppDialogProvider>}</AuthGate>;
}
