import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { deleteSprint, listSprints, type Sprint, type SprintPage } from '../../api/sprints';
import type { ProjectSummary } from '../../api/projects';
import { useProjectStore } from '../../store/useProjectStore';
import type { AuthUser } from '../common/AuthGate';
import { useAppDialog } from '../common/AppDialog';
import { WorkspaceHeader } from '../common/WorkspaceHeader';
import { SprintForm } from './SprintForm';
import { SprintPlan } from './SprintPlan';
import { SprintOverview } from './SprintOverview';
import { PeopleManager } from './PeopleManager';

function displayDate(date: string) {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

export function SprintCard({ sprint, projects, disabled, onOpen, onEdit, onRemove, canManage = true, viewOnly = false }: {
  sprint: Sprint; projects: ProjectSummary[]; disabled: boolean;
  onOpen: (sprint: Sprint) => void; onEdit: (sprint: Sprint) => void; onRemove: (sprint: Sprint) => void;
  canManage?: boolean; viewOnly?: boolean;
}) {
  return (
    <article className="relative flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors hover:border-brand-300">
      <button type="button" disabled={disabled} onClick={() => onOpen(sprint)} aria-label={`${viewOnly ? 'Ver tarefas de' : 'Abrir planejamento de'} ${sprint.name}`} className="absolute inset-0 w-full rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed" />
      <div className="pointer-events-none relative flex-1 p-5">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-brand-50 p-2.5 text-brand-600"><CalendarDays className="h-5 w-5" /></span>
          <div className="min-w-0"><h2 className="break-words text-sm font-bold text-slate-900">{sprint.name}</h2><p className="mt-1 text-xs text-slate-500">{displayDate(sprint.startDate)} — {displayDate(sprint.endDate)}</p></div>
        </div>
        <p className="mt-4 whitespace-pre-wrap break-words text-sm text-slate-600">{sprint.objective}</p>
        <p className="mt-4 text-xs text-slate-400">{sprint.projectIds.map(id => projects.find(project => project.id === id)?.name || 'Projeto não encontrado').join(', ') || 'Sem projeto vinculado'}</p>
      </div>
      <div className="pointer-events-none relative flex flex-wrap justify-end gap-1 border-t border-slate-100 px-4 py-2">
        <button type="button" disabled={disabled} onClick={() => onOpen(sprint)} aria-label={`${viewOnly ? 'Ver tarefas de' : 'Organizar'} ${sprint.name}`} className="pointer-events-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-brand-600 disabled:opacity-50"><Users className="h-3.5 w-3.5" /> {viewOnly ? 'Ver tarefas' : 'Organizar'}</button>
        {canManage && <><button type="button" disabled={disabled} onClick={() => onEdit(sprint)} aria-label={`Editar ${sprint.name}`} className="pointer-events-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-brand-600 disabled:opacity-50"><Pencil className="h-3.5 w-3.5" /> Editar</button>
        <button type="button" disabled={disabled} onClick={() => onRemove(sprint)} aria-label={`Excluir ${sprint.name}`} className="pointer-events-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /> Excluir</button></>}
      </div>
    </article>
  );
}

export function SprintList({ user, onLogout, onBack, projectId }: { user: AuthUser; onLogout: () => void; onBack: () => void; projectId?: string }) {
  const projects = useProjectStore(state => state.projects);
  const showDialog = useAppDialog();
  const [result, setResult] = useState<SprintPage>({ sprints: [], total: 0, page: 1, pageSize: 12 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState({ search: '', page: 1 });
  const [version, setVersion] = useState(0);
  const [form, setForm] = useState<{ sprint?: Sprint } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const projectName = projects.find(project => project.id === projectId)?.name;
  const canManage = user.role === 'ADM' || user.role === 'DIGITAL';
  const viewOnly = user.role === 'USER' || user.role === 'APPROVER';

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const value = search.trim();
      setQuery(current => current.search === value ? current : { search: value, page: 1 });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    listSprints(projectId, query.search, query.page).then(page => {
      if (active) setResult(page);
    }).catch(failure => {
      if (active) setError(failure instanceof Error ? failure.message : 'Não foi possível carregar as sprints.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [projectId, query.search, query.page, version]);

  const remove = (sprint: Sprint) => showDialog({
    title: 'Excluir sprint',
    message: `Excluir a sprint "${sprint.name}"? Esta ação não pode ser desfeita. Sprints com tarefas não podem ser excluídas.`,
    confirmLabel: 'Excluir sprint',
    onConfirm: () => {
      setDeleting(true);
      deleteSprint(sprint.id).then(() => setVersion(value => value + 1)).catch(failure => {
        showDialog({ title: 'Erro ao excluir sprint', message: failure instanceof Error ? failure.message : 'Não foi possível excluir a sprint.' });
      }).finally(() => setDeleting(false));
    },
  });

  const searchPending = search.trim() !== query.search;
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));
  if (peopleOpen) return <PeopleManager user={user} onLogout={onLogout} onBack={() => setPeopleOpen(false)} />;
  if (selectedSprint) return viewOnly
    ? <SprintOverview sprint={selectedSprint} user={user} onLogout={onLogout} onBack={() => { setSelectedSprint(null); setVersion(value => value + 1); }} />
    : <SprintPlan sprint={selectedSprint} user={user} onLogout={onLogout} onBack={() => { setSelectedSprint(null); setVersion(value => value + 1); }} onPeople={() => setPeopleOpen(true)} />;
  return (
    <div className="min-h-screen bg-canvas">
      <WorkspaceHeader user={user} onLogout={onLogout} />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" /> Voltar</button>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{projectId ? projectName || 'Projeto' : 'Todos os projetos'}</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Sprints</h1>
            <p className="mt-2 text-sm text-slate-500">{projectId ? 'Sprints vinculadas a este projeto.' : 'Sprints de todos os projetos.'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManage && <><button type="button" onClick={() => setPeopleOpen(true)} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"><Users className="h-4 w-4" /> Equipes e colaboradores</button>
            <button type="button" disabled={loading || deleting || !!error || projects.length === 0} onClick={() => setForm({})} className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"><Plus className="h-4 w-4" /> Nova sprint</button></>}
          </div>
        </div>
        <label className="relative mt-8 block max-w-sm">
          <span className="sr-only">Buscar sprint por nome</span>
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar sprint por nome" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </label>
        {loading || searchPending ? <p role="status" className="mt-8 text-sm text-slate-500">Carregando sprints...</p> : error ? (
          <div role="alert" className="mt-8 rounded-2xl border border-rose-200 bg-white p-5 text-sm text-rose-700">
            <p>{error}</p><button type="button" onClick={() => setVersion(value => value + 1)} className="mt-3 font-bold text-brand-600">Tentar novamente</button>
          </div>
        ) : result.sprints.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">{search.trim() ? 'Nenhuma sprint encontrada para esta busca.' : 'Nenhuma sprint cadastrada.'}</p>
        ) : (
          <>
            <p className="mt-8 text-sm text-slate-500" role="status">Mostrando {(result.page - 1) * result.pageSize + 1}–{Math.min(result.page * result.pageSize, result.total)} de {result.total} {result.total === 1 ? 'sprint' : 'sprints'}.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.sprints.map(sprint => <SprintCard key={sprint.id} sprint={sprint} projects={projects} disabled={deleting} onOpen={setSelectedSprint} onEdit={item => setForm({ sprint: item })} onRemove={remove} canManage={canManage} viewOnly={viewOnly} />)}
            </div>
            {pageCount > 1 && <nav aria-label="Paginação de sprints" className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-600">
              <button type="button" disabled={deleting || result.page <= 1} onClick={() => setQuery(current => ({ ...current, page: result.page - 1 }))} className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold disabled:opacity-50">Anterior</button>
              <span>Página {result.page} de {pageCount}</span>
              <button type="button" disabled={deleting || result.page >= pageCount} onClick={() => setQuery(current => ({ ...current, page: result.page + 1 }))} className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold disabled:opacity-50">Próxima</button>
            </nav>}
          </>
        )}
      </main>
      {form && <SprintForm sprint={form.sprint} projectId={projectId} projects={projects} onClose={() => setForm(null)} onSaved={() => { setForm(null); setVersion(value => value + 1); }} />}
    </div>
  );
}
