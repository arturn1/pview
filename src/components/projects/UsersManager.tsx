import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { request } from '../../api/request';
import type { AuthUser, Role } from '../common/AuthGate';
import { WorkspaceHeader } from '../common/WorkspaceHeader';

type UserRecord = { id: string; email: string; name: string; role: Role };
const roles: Role[] = ['USER', 'DEV', 'DIGITAL', 'ADM'];

export function UsersManager({ user, onLogout, onBack }: { user: AuthUser; onLogout: () => void; onBack: () => void }) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    request<{ users: UserRecord[] }>('/api/users').then(result => {
      if (active) { setUsers(result.users); setError(null); }
    }).catch(failure => {
      if (active) setError(failure instanceof Error ? failure.message : 'Não foi possível carregar os usuários.');
    });
    return () => { active = false; };
  }, [version]);
  const changeRole = async (id: string, role: Role) => {
    setBusy(true);
    setError(null);
    try {
      await request(`/api/users?id=${encodeURIComponent(id)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }),
      });
      if (users.find(item => item.id === id)?.email === user.email) window.location.reload();
      else setVersion(value => value + 1);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível alterar o papel.');
    } finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen bg-canvas">
      <WorkspaceHeader user={user} onLogout={onLogout} />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-slate-500"><ArrowLeft className="h-4 w-4" /> Voltar</button>
        <h1 className="mt-6 text-2xl font-extrabold text-slate-900">Usuários e papéis</h1>
        <p className="mt-2 text-sm text-slate-500">Novos usuários são cadastrados no primeiro login com acesso de leitura.</p>
        {error && <p role="alert" className="mt-4 text-sm text-rose-700">{error} <button type="button" onClick={() => setVersion(value => value + 1)}>Atualizar</button></p>}
        <div className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {users.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0"><p className="font-bold text-slate-800">{item.name}</p><p className="break-all text-xs text-slate-500">{item.email}</p></div>
            <label className="text-xs font-bold text-slate-600">Papel
              <select aria-label={`Papel de ${item.email}`} disabled={busy} value={item.role} onChange={event => {
                const role = roles.find(option => option === event.target.value);
                if (role) void changeRole(item.id, role);
                else setError('Papel inválido.');
              }} className="ml-2 rounded-lg border border-slate-200 p-2 text-sm">
                {roles.map(role => <option key={role} value={role}>{role}</option>)}
              </select>
            </label>
          </div>)}
        </div>
      </main>
    </div>
  );
}
