import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { deleteStaff, deleteTeam, getStaff, getTeams, saveStaff, saveTeam, type Staff, type Team } from '../../api/planning';
import { useAppDialog } from '../common/AppDialog';
import type { AuthUser } from '../common/AuthGate';
import { WorkspaceHeader } from '../common/WorkspaceHeader';

const fieldClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';
const actionClass = 'rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-brand-600 disabled:opacity-50';

export function PeopleManager({ user, onLogout, onBack }: { user: AuthUser; onLogout: () => void; onBack: () => void }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [teamEdit, setTeamEdit] = useState<Team | null>(null);
  const [staffEdit, setStaffEdit] = useState<Staff | null>(null);
  const [teamName, setTeamName] = useState('');
  const [description, setDescription] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [teamId, setTeamId] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const showDialog = useAppDialog();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadFailed(false);
    setError(null);
    Promise.all([getTeams(), getStaff()]).then(([newTeams, newStaff]) => {
      if (active) { setTeams(newTeams); setStaff(newStaff); }
    }).catch(failure => {
      if (active) { setLoadFailed(true); setError(failure instanceof Error ? failure.message : 'Não foi possível carregar os cadastros.'); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [version]);

  const run = async (action: () => Promise<void>, after?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      after?.();
      setVersion(value => value + 1);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível salvar.');
    } finally { setBusy(false); }
  };
  const resetTeam = () => { setTeamEdit(null); setTeamName(''); setDescription(''); };
  const resetStaff = () => { setStaffEdit(null); setStaffName(''); setStaffEmail(''); setTeamId(''); };
  const submitTeam = (event: FormEvent) => {
    event.preventDefault();
    void run(() => saveTeam({ name: teamName, description }, teamEdit?.id), resetTeam);
  };
  const submitStaff = (event: FormEvent) => {
    event.preventDefault();
    void run(() => saveStaff({ name: staffName, email: staffEmail.trim() || null, teamId }, staffEdit?.id), resetStaff);
  };
  const confirm = (kind: 'equipe' | 'colaborador', item: Team | Staff) => showDialog({
    title: `Excluir ${kind}`,
    message: `Excluir "${item.name}"? Esta ação não pode ser desfeita.`,
    confirmLabel: 'Excluir',
    onConfirm: () => { void run(() => kind === 'equipe' ? deleteTeam(item.id) : deleteStaff(item.id)); },
  });

  return (
    <div className="min-h-screen bg-canvas">
      <WorkspaceHeader user={user} onLogout={onLogout} />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" /> Voltar</button>
        <h1 className="mt-6 text-2xl font-extrabold text-slate-900">Equipes e colaboradores</h1>
        <p className="mt-2 text-sm text-slate-500">Cadastre as pessoas que participam das sprints.</p>
        {error && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-white p-3 text-sm text-rose-700">{error} <button type="button" onClick={() => setVersion(value => value + 1)} className="font-bold text-brand-600">Atualizar</button></div>}
        {loading ? <p role="status" className="mt-8 text-sm text-slate-500">Carregando cadastros...</p> : !loadFailed && (
          <div className="mt-8 grid items-start gap-5 md:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">Equipes</h2>
              <form onSubmit={submitTeam} className="mt-4 space-y-3">
                <label className="block text-xs font-bold text-slate-700">Nome <input required value={teamName} onChange={event => setTeamName(event.target.value)} className={`${fieldClass} mt-1`} /></label>
                <label className="block text-xs font-bold text-slate-700">Descrição <input value={description} onChange={event => setDescription(event.target.value)} className={`${fieldClass} mt-1`} /></label>
                <div className="flex gap-2"><button disabled={busy || !teamName.trim()} className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{teamEdit ? 'Salvar equipe' : 'Adicionar equipe'}</button>{teamEdit && <button type="button" onClick={resetTeam} className="text-xs font-bold text-slate-500">Cancelar</button>}</div>
              </form>
              <ul className="mt-5 divide-y divide-slate-100">
                {teams.map(team => <li key={team.id} className="flex items-center gap-2 py-3"><span className="min-w-0 flex-1 break-words text-sm text-slate-700">{team.name}</span><button type="button" disabled={busy} aria-label={`Editar equipe ${team.name}`} onClick={() => { setTeamEdit(team); setTeamName(team.name); setDescription(team.description); }} className={actionClass}><Pencil className="h-4 w-4" /></button><button type="button" disabled={busy} aria-label={`Excluir equipe ${team.name}`} onClick={() => confirm('equipe', team)} className={actionClass}><Trash2 className="h-4 w-4" /></button></li>)}
                {!teams.length && <li className="py-3 text-sm text-slate-400">Nenhuma equipe cadastrada.</li>}
              </ul>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">Colaboradores</h2>
              <form onSubmit={submitStaff} className="mt-4 space-y-3">
                <label className="block text-xs font-bold text-slate-700">Nome <input required value={staffName} onChange={event => setStaffName(event.target.value)} className={`${fieldClass} mt-1`} /></label>
                <label className="block text-xs font-bold text-slate-700">E-mail (usado na importação) <input type="email" value={staffEmail} onChange={event => setStaffEmail(event.target.value)} className={`${fieldClass} mt-1`} /></label>
                <label className="block text-xs font-bold text-slate-700">Equipe <select required value={teamId} onChange={event => setTeamId(event.target.value)} className={`${fieldClass} mt-1`}><option value="">Selecione</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
                <div className="flex gap-2"><button disabled={busy || !staffName.trim() || !teamId} className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{staffEdit ? 'Salvar colaborador' : 'Adicionar colaborador'}</button>{staffEdit && <button type="button" onClick={resetStaff} className="text-xs font-bold text-slate-500">Cancelar</button>}</div>
              </form>
              <ul className="mt-5 divide-y divide-slate-100">
                {staff.map(person => <li key={person.id} className="flex items-center gap-2 py-3"><span className="min-w-0 flex-1 break-words text-sm text-slate-700">{person.name} <span className="text-xs text-slate-400">({teams.find(team => team.id === person.teamId)?.name}{person.email ? ` · ${person.email}` : ''})</span></span><button type="button" disabled={busy} aria-label={`Editar colaborador ${person.name}`} onClick={() => { setStaffEdit(person); setStaffName(person.name); setStaffEmail(person.email ?? ''); setTeamId(person.teamId); }} className={actionClass}><Pencil className="h-4 w-4" /></button><button type="button" disabled={busy} aria-label={`Excluir colaborador ${person.name}`} onClick={() => confirm('colaborador', person)} className={actionClass}><Trash2 className="h-4 w-4" /></button></li>)}
                {!staff.length && <li className="py-3 text-sm text-slate-400">Nenhum colaborador cadastrado.</li>}
              </ul>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
