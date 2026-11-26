import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ChevronDown, ExternalLink, FileUp, Pencil, Plus, Rocket, Trash2, Users } from 'lucide-react';
import { addParticipant, deleteParticipant, deleteTask, getPlan, getStaff, setTasksDeployDate, updateCapacity, type Participant, type SprintPlan as Plan, type SprintTask, type Staff } from '../../api/planning';
import type { Sprint } from '../../api/sprints';
import { useProjectStore } from '../../store/useProjectStore';
import { getProject } from '../../api/projects';
import { useAppDialog } from '../common/AppDialog';
import type { AuthUser } from '../common/AuthGate';
import { WorkspaceHeader } from '../common/WorkspaceHeader';
import { TaskForm } from './TaskForm';
import { DevOpsImport } from './DevOpsImport';
import { formatMinutes, parseMinutes } from './time';

const buttonClass = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50';
const fieldClass = 'rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

export function ParticipantCard({ participant, tasks, projectNames, featureNames, busy, expanded, onToggle, onCapacity, onRemove, onTask, onDeleteTask, canManage = true, canEditTasks = true, canDeploy = false, selectedTaskIds, onToggleTask }: {
  participant: Participant; tasks: SprintTask[]; projectNames: Map<string, string>; busy: boolean;
  featureNames: Map<string, Map<string, string>>;
  expanded: boolean; onToggle: () => void;
  onCapacity: (id: string, value: number) => void; onRemove: (participant: Participant) => void;
  onTask: (participantId: string, task?: SprintTask) => void; onDeleteTask: (task: SprintTask) => void;
  canManage?: boolean; canEditTasks?: boolean;
  canDeploy?: boolean; selectedTaskIds?: Set<string>; onToggleTask?: (taskId: string) => void;
}) {
  const [capacity, setCapacity] = useState(formatMinutes(participant.totalMinutes));
  const [error, setError] = useState('');
  useEffect(() => { setCapacity(formatMinutes(participant.totalMinutes)); }, [participant.totalMinutes]);
  const allocated = tasks.reduce((sum, task) => sum + (task.plannedMinutes ?? 0), 0);
  const pendingEstimates = tasks.filter(task => task.plannedMinutes === null).length;
  const submitCapacity = (event: FormEvent) => {
    event.preventDefault();
    const value = parseMinutes(capacity);
    if (value === null) { setError('Use o formato H:MM, por exemplo 40:30.'); return; }
    setError('');
    onCapacity(participant.id, value);
  };
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1">
          <button type="button" aria-expanded={expanded} aria-controls={`participant-details-${participant.id}`} onClick={onToggle} className="flex w-full items-center gap-3 text-left">
            <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            <span className="min-w-0">
              <span className="block break-words font-bold text-slate-900">{participant.staffName}</span>
              <span className="block text-xs text-slate-400">{participant.teamName}</span>
              {!expanded && <span className="mt-2 block text-xs font-normal text-slate-500">
                Capacidade: {formatMinutes(participant.totalMinutes)} · Atribuído: {formatMinutes(allocated)} · Restante: {formatMinutes(participant.totalMinutes - allocated)} · {tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}{pendingEstimates > 0 && ` · ${pendingEstimates} ${pendingEstimates === 1 ? 'estimativa pendente' : 'estimativas pendentes'}`}
              </span>}
            </span>
          </button>
        </h3>
        {canManage && <button type="button" disabled={busy} onClick={() => onRemove(participant)} className={`${buttonClass} text-rose-600`}>Remover participante</button>}
      </div>
      <div id={`participant-details-${participant.id}`} hidden={!expanded}>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          {canManage && <form onSubmit={submitCapacity} className="flex items-end gap-2">
            <label className="text-xs font-bold text-slate-600">Capacidade (H:MM)<input required value={capacity} onChange={event => setCapacity(event.target.value)} className={`${fieldClass} mt-1 block w-28`} /></label>
            <button disabled={busy} className={buttonClass}>Salvar</button>
          </form>}
          <p className="pb-2 text-xs text-slate-500">Atribuído: <strong>{formatMinutes(allocated)}</strong> · Restante: <strong>{formatMinutes(participant.totalMinutes - allocated)}</strong></p>
        </div>
        {error && <p role="alert" className="mt-2 text-xs text-rose-700">{error}</p>}
        <div className="mt-5 flex items-center justify-between gap-2"><h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Tarefas</h4>{canManage && <button type="button" disabled={busy} onClick={() => onTask(participant.id)} className={`${buttonClass} flex items-center gap-1`}><Plus className="h-3.5 w-3.5" /> Atribuir tarefa</button>}</div>
        {tasks.length === 0 ? <p className="mt-3 text-sm text-slate-400">Nenhuma tarefa atribuída.</p> : (
          <ul className="mt-3 divide-y divide-slate-100">
            {tasks.map(task => <li key={task.id} className="flex flex-wrap items-center gap-2 py-3">
              {canDeploy && <input type="checkbox" checked={selectedTaskIds?.has(task.id) ?? false} onChange={() => onToggleTask?.(task.id)} aria-label={`Selecionar tarefa ${task.taskNumber} para deploy`} className="h-4 w-4 shrink-0 accent-brand-600" />}
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-bold text-slate-800">#{task.taskNumber}{task.title && ` · ${task.title}`}</p>
                <p className="mt-1 text-xs text-slate-500">{projectNames.get(task.projectId) || 'Projeto não encontrado'}</p>
                {task.deployDate && <p className="mt-1"><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700"><Rocket className="h-3 w-3" aria-hidden="true" /> Deploy em {task.deployDate.split('-').reverse().join('/')}</span></p>}
                {task.featureId && <p className="mt-1 text-xs text-brand-600">Funcionalidade: {featureNames.get(task.projectId)?.get(task.featureId) || 'Não encontrada'}</p>}
                <p className="mt-1 text-xs text-slate-500">Planejado: {task.plannedMinutes === null ? 'Pendente' : formatMinutes(task.plannedMinutes)}{task.actualMinutes !== null && ` · Real: ${formatMinutes(task.actualMinutes)}`}</p>
                {task.lessons && <p className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-600"><strong>Lições:</strong> {task.lessons}</p>}
                {task.challenges && <p className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-600"><strong>Desafios:</strong> {task.challenges}</p>}
                {task.reviewNotes && <p className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-600"><strong>Revisão:</strong> {task.reviewNotes}</p>}
              </div>
              {task.devOpsUrl && <a href={task.devOpsUrl} target="_blank" rel="noopener noreferrer" aria-label={`Abrir tarefa ${task.taskNumber} no DevOps (nova aba)`} className={`${buttonClass} flex items-center gap-1`}><ExternalLink className="h-4 w-4" /> DevOps</a>}
              {canEditTasks && <button type="button" disabled={busy} onClick={() => onTask(participant.id, task)} aria-label={`Editar tarefa ${task.taskNumber}`} className={buttonClass}><Pencil className="h-4 w-4" /></button>}
              {canManage && <button type="button" disabled={busy} onClick={() => onDeleteTask(task)} aria-label={`Excluir tarefa ${task.taskNumber}`} className={`${buttonClass} text-rose-600`}><Trash2 className="h-4 w-4" /></button>}
            </li>)}
          </ul>
        )}
      </div>
    </article>
  );
}

export function SprintPlan({ sprint, user, onLogout, onBack, onPeople }: { sprint: Sprint; user: AuthUser; onLogout: () => void; onBack: () => void; onPeople: () => void }) {
  const projects = useProjectStore(state => state.projects);
  const showDialog = useAppDialog();
  const [plan, setPlan] = useState<Plan>({ participants: [], tasks: [] });
  const [staff, setStaff] = useState<Staff[]>([]);
  const [featureNames, setFeatureNames] = useState<Map<string, Map<string, string>>>(new Map());
  const [staffId, setStaffId] = useState('');
  const [capacity, setCapacity] = useState('0:00');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [deployDate, setDeployDate] = useState('');
  const [form, setForm] = useState<{ participantId: string; task?: SprintTask } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [expandedParticipants, setExpandedParticipants] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadFailed(false);
    setError(null);
    Promise.all([getPlan(sprint.id), getStaff(), Promise.all(sprint.projectIds.map(async id => {
      const project = await getProject(id);
      if (!project) throw new Error('Um projeto vinculado à sprint não foi encontrado.');
      return [id, new Map(project.nodes.filter(node => node.type === 'feature').map(node => [node.id, node.title]))] as const;
    }))]).then(([newPlan, newStaff, projectFeatures]) => {
      if (active) { setPlan(newPlan); setStaff(newStaff); setFeatureNames(new Map(projectFeatures)); }
    }).catch(failure => {
      if (active) { setLoadFailed(true); setError(failure instanceof Error ? failure.message : 'Não foi possível carregar o planejamento.'); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sprint.id, sprint.projectIds, version]);

  const run = async (action: () => Promise<void>, after?: () => void) => {
    setBusy(true);
    setError(null);
    try { await action(); after?.(); setVersion(value => value + 1); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível salvar.'); }
    finally { setBusy(false); }
  };
  const add = (event: FormEvent) => {
    event.preventDefault();
    const value = parseMinutes(capacity);
    if (!staffId || value === null) { setError('Selecione um colaborador e informe a capacidade no formato H:MM.'); return; }
    void run(() => addParticipant(sprint.id, staffId, value), () => { setStaffId(''); setCapacity('0:00'); });
  };
  const confirmRemove = (title: string, message: string, action: () => Promise<void>) => showDialog({
    title, message, confirmLabel: 'Excluir', onConfirm: () => {
      void run(async () => {
        try { await action(); }
        catch (failure) {
          showDialog({ title: 'Não foi possível excluir', message: failure instanceof Error ? failure.message : 'Não foi possível excluir.' });
          throw failure;
        }
      });
    },
  });
  const total = plan.participants.reduce((sum, item) => sum + item.totalMinutes, 0);
  const allocated = plan.tasks.reduce((sum, item) => sum + (item.plannedMinutes ?? 0), 0);
  const projectNames = new Map(projects.map(project => [project.id, project.name]));
  const availableStaff = staff.filter(person => !plan.participants.some(item => item.staffId === person.id));
  const canManage = user.role === 'ADM' || user.role === 'DIGITAL';
  const canDeploy = user.role === 'ADM';
  const taskIds = new Set(plan.tasks.map(task => task.id));
  const selectedIds = [...selectedTasks].filter(id => taskIds.has(id));
  const toggleTask = (taskId: string) => setSelectedTasks(current => {
    const next = new Set(current);
    if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
    return next;
  });
  const applyDeploy = (date: string | null) => {
    if (!selectedIds.length || (date !== null && !date)) return;
    void run(() => setTasksDeployDate(selectedIds, date), () => setSelectedTasks(new Set()));
  };

  return (
    <div className="min-h-screen bg-canvas">
      <WorkspaceHeader user={user} onLogout={onLogout} />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" /> Voltar às sprints</button>
        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-widest text-brand-600">Planejamento da sprint</p><h1 className="mt-2 text-2xl font-extrabold text-slate-900">{sprint.name}</h1><p className="mt-2 text-sm text-slate-500">{sprint.objective}</p></div>
          <div className="flex flex-wrap gap-2">
            {canManage && <><button type="button" disabled={loading || loadFailed || sprint.projectIds.length === 0} onClick={() => setImportOpen(true)} className={`${buttonClass} flex items-center gap-2`}><FileUp className="h-4 w-4" /> Importar DevOps</button>
            <button type="button" onClick={onPeople} className={`${buttonClass} flex items-center gap-2`}><Users className="h-4 w-4" /> Equipes e colaboradores</button></>}
          </div>
        </div>
        {importMessage && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-white p-3 text-sm text-emerald-700">{importMessage}</p>}
        {error && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-white p-3 text-sm text-rose-700">{error} <button type="button" onClick={() => setVersion(value => value + 1)} className="font-bold text-brand-600">Atualizar</button></div>}
        {loading ? <p role="status" className="mt-8 text-sm text-slate-500">Carregando planejamento...</p> : !loadFailed && (
          <>
            <section aria-label="Resumo da sprint" className="mt-8 grid gap-3 sm:grid-cols-4">
              {[['Capacidade', formatMinutes(total)], ['Atribuído', formatMinutes(allocated)], ['Restante', formatMinutes(total - allocated)], ['Utilização', total ? `${Math.round(allocated / total * 100)}%` : '—']].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-400">{label}</p><p className="mt-1 text-xl font-bold text-slate-900">{value}</p></div>)}
            </section>
            {plan.tasks.length > 0 && <p className="mt-4 text-xs text-slate-500">Por projeto: {sprint.projectIds.map(id => `${projectNames.get(id) || 'Projeto não encontrado'}: ${formatMinutes(plan.tasks.filter(task => task.projectId === id).reduce((sum, task) => sum + (task.plannedMinutes ?? 0), 0))}`).join(' · ')} · Estimativas pendentes: {plan.tasks.filter(task => task.plannedMinutes === null).length}</p>}
            {canManage && <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-bold text-slate-900">Adicionar participante</h2>
              <form onSubmit={add} className="mt-3 flex flex-wrap items-end gap-3">
                <label className="min-w-[180px] flex-1 text-xs font-bold text-slate-600">Colaborador<select required value={staffId} onChange={event => setStaffId(event.target.value)} className={`${fieldClass} mt-1 block w-full`}><option value="">Selecione</option>{availableStaff.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
                <label className="text-xs font-bold text-slate-600">Capacidade (H:MM)<input required value={capacity} onChange={event => setCapacity(event.target.value)} className={`${fieldClass} mt-1 block w-28`} /></label>
                <button disabled={busy || !staffId} className="rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Adicionar</button>
              </form>
              {!staff.length && <p className="mt-3 text-xs text-slate-500">Cadastre uma equipe e um colaborador para começar.</p>}
            </section>}
            {canDeploy && plan.tasks.length > 0 && <section aria-label="Data de deploy" className="mt-5 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="min-w-[200px] flex-1">
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900"><Rocket className="h-4 w-4 text-emerald-600" aria-hidden="true" /> Data de deploy</h2>
                <p className="mt-1 text-xs text-slate-500">{selectedIds.length ? `${selectedIds.length} ${selectedIds.length === 1 ? 'tarefa selecionada' : 'tarefas selecionadas'}` : 'Marque uma ou mais tarefas nos participantes para definir o deploy.'}</p>
              </div>
              <label className="text-xs font-bold text-slate-600">Data<input type="date" value={deployDate} onChange={event => setDeployDate(event.target.value)} className={`${fieldClass} mt-1 block`} /></label>
              <button type="button" disabled={busy || !selectedIds.length || !deployDate} onClick={() => applyDeploy(deployDate)} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Definir deploy</button>
              <button type="button" disabled={busy || !selectedIds.length} onClick={() => applyDeploy(null)} className={buttonClass}>Limpar deploy</button>
              <button type="button" disabled={busy || plan.tasks.length === 0} onClick={() => setSelectedTasks(selectedIds.length === plan.tasks.length ? new Set() : new Set(plan.tasks.map(task => task.id)))} className={buttonClass}>{selectedIds.length === plan.tasks.length ? 'Desmarcar todas' : 'Selecionar todas'}</button>
            </section>}
            <div className="mt-5 space-y-4">
              {plan.participants.map(person => <ParticipantCard key={person.id} participant={person} tasks={plan.tasks.filter(task => task.participantId === person.id)} projectNames={projectNames} featureNames={featureNames} busy={busy} canManage={canManage} canDeploy={canDeploy} selectedTaskIds={selectedTasks} onToggleTask={toggleTask} canEditTasks={canManage || (user.role === 'DEV' && staff.some(item => item.id === person.staffId && item.email === user.email))} expanded={expandedParticipants.has(person.id)} onToggle={() => setExpandedParticipants(current => {
                const next = new Set(current);
                if (next.has(person.id)) next.delete(person.id); else next.add(person.id);
                return next;
              })} onCapacity={(id, value) => void run(() => updateCapacity(id, value))} onRemove={item => confirmRemove('Remover participante', `Remover ${item.staffName} da sprint?`, () => deleteParticipant(item.id))} onTask={(participantId, task) => setForm({ participantId, task })} onDeleteTask={task => confirmRemove('Excluir tarefa', `Excluir a tarefa #${task.taskNumber} e sua retrospectiva?`, () => deleteTask(task.id))} />)}
              {!plan.participants.length && <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">Nenhum participante nesta sprint.</p>}
            </div>
          </>
        )}
      </main>
      {form && <TaskForm participantId={form.participantId} task={form.task} projects={projects.filter(project => sprint.projectIds.includes(project.id))} onClose={() => setForm(null)} onSaved={() => { setForm(null); setVersion(value => value + 1); }} />}
      {importOpen && <DevOpsImport sprintId={sprint.id} projects={projects.filter(project => sprint.projectIds.includes(project.id))} onClose={() => setImportOpen(false)} onImported={result => { setImportOpen(false); setImportMessage(`Importação concluída: ${result.created} tarefa(s) criada(s), ${result.updated} atualizada(s), ${result.createdStaff} colaborador(es) criado(s), ${result.pendingEstimates} estimativa(s) pendente(s).`); setVersion(value => value + 1); }} />}
    </div>
  );
}
