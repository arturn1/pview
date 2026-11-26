import { createContext, useContext } from 'react';
import { Layers, LogOut, UserRound } from 'lucide-react';
import type { AuthUser, Role } from './AuthGate';

export const RoleSimulationContext = createContext<{ onRoleChange: (role: Role) => void } | null>(null);

export function WorkspaceHeader({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const roleSimulation = useContext(RoleSimulationContext);

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav aria-label="Navegação principal" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-sm">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-sm font-extrabold tracking-tight text-slate-900">FlowDoc</span>
            <span className="block text-xs text-slate-400">Arquitetura e regras de negócio</span>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <UserRound className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-800">{user.name || user.email || 'Usuário autenticado'}</p>
            {user.email && user.email !== user.name && <p className="truncate text-xs text-slate-500">{user.email}</p>}
            <p className="text-xs font-semibold text-brand-600">{user.role}</p>
          </div>
          {roleSimulation && user.role !== 'ADM' && <button type="button" onClick={() => roleSimulation.onRoleChange('ADM')} title="A API continua usando as permissões reais de ADM." className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100">
            Simulando {user.role} · Voltar ao ADM
          </button>}
          <button type="button" onClick={onLogout} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>
      </nav>
    </header>
  );
}
