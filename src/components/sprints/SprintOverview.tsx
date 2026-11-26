import { useEffect, useState } from 'react';
import { ArrowLeft, Rocket } from 'lucide-react';
import { getProject, type ProjectSummary } from '../../api/projects';
import { getSprintOverview, type SprintOverview as Overview } from '../../api/planning';
import type { Sprint } from '../../api/sprints';
import { useProjectStore } from '../../store/useProjectStore';
import type { AuthUser } from '../common/AuthGate';
import { WorkspaceHeader } from '../common/WorkspaceHeader';
import { formatMinutes } from './time';

function displayDate(date: string) {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

export function SprintOverview({ sprint, user, onLogout, onBack }: {
  sprint: Sprint; user: AuthUser; onLogout: () => void; onBack: () => void;
}) {
  const projects = useProjectStore(state => state.projects);
  const [overview, setOverview] = useState<Overview>({ tasks: [] });
  const [featureNames, setFeatureNames] = useState<Map<string, Map<string, string>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      getSprintOverview(sprint.id),
      Promise.all(sprint.projectIds.map(async id => {
        const project = await getProject(id);
        if (!project) throw new Error('Um projeto vinculado à sprint não foi encontrado.');
        return [id, new Map(project.nodes.filter(node => node.type === 'feature').map(node => [node.id, node.title]))] as const;
      })),
    ]).then(([result, projectFeatures]) => {
      if (active) {
        setOverview(result);
        setFeatureNames(new Map(projectFeatures));
      }
    }).catch(failure => {
      if (active) setError(failure instanceof Error ? failure.message : 'Não foi possível carregar as tarefas da sprint.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [sprint.id, sprint.projectIds, version]);

  const projectNames = new Map(projects.map((project: ProjectSummary) => [project.id, project.name]));
  const planned = overview.tasks.reduce((sum, task) => sum + (task.plannedMinutes ?? 0), 0);
  const actualTasks = overview.tasks.filter(task => task.actualMinutes !== null);
  const actual = actualTasks.reduce((sum, task) => sum + (task.actualMinutes ?? 0), 0);
  const pendingEstimates = overview.tasks.filter(task => task.plannedMinutes === null).length;

  return (
    <div className="min-h-screen bg-canvas">
      <WorkspaceHeader user={user} onLogout={onLogout} />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" /> Voltar às sprints</button>
        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Visão da sprint</p>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900">{sprint.name}</h1>
          <p className="mt-2 text-sm text-slate-500">{displayDate(sprint.startDate)} — {displayDate(sprint.endDate)}</p>
          <p className="mt-4 whitespace-pre-wrap text-sm text-slate-600">{sprint.objective}</p>
        </div>
        {loading ? <p role="status" className="mt-8 text-sm text-slate-500">Carregando tarefas...</p> : error ? (
          <div role="alert" className="mt-8 rounded-2xl border border-rose-200 bg-white p-5 text-sm text-rose-700">
            <p>{error}</p><button type="button" onClick={() => setVersion(value => value + 1)} className="mt-3 font-bold text-brand-600">Tentar novamente</button>
          </div>
        ) : (
          <>
            <section aria-label="Resumo da sprint" className="mt-8 grid gap-3 sm:grid-cols-4">
              {[
                ['Tarefas', String(overview.tasks.length)],
                ['Horas planejadas', formatMinutes(planned)],
                ['Horas realizadas registradas', formatMinutes(actual)],
                ['Estimativas pendentes', String(pendingEstimates)],
              ].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-400">{label}</p><p className="mt-1 text-xl font-bold text-slate-900">{value}</p></div>)}
            </section>
            <section className="mt-8" aria-label="Tarefas da sprint">
              <h2 className="text-sm font-bold text-slate-900">Tarefas da sprint</h2>
              {overview.tasks.length === 0 ? <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">Ainda não há tarefas nesta sprint.</p> : (
                <ul className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white px-5">
                  {overview.tasks.map((task, index) => <li key={`${task.projectId}-${task.taskNumber}-${index}`} className="py-4">
                    <p className="break-words text-sm font-bold text-slate-800">#{task.taskNumber}{task.title && ` · ${task.title}`}</p>
                    <p className="mt-1 text-xs text-slate-500">{projectNames.get(task.projectId) || 'Projeto não encontrado'}</p>
                    {task.deployDate && <p className="mt-1"><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700"><Rocket className="h-3 w-3" aria-hidden="true" /> Deploy em {displayDate(task.deployDate)}</span></p>}
                    {task.featureId && <p className="mt-1 text-xs text-brand-600">Funcionalidade: {featureNames.get(task.projectId)?.get(task.featureId) || 'Não encontrada'}</p>}
                    <p className="mt-1 text-xs text-slate-500">Planejado: {task.plannedMinutes === null ? 'Estimativa pendente' : formatMinutes(task.plannedMinutes)} · Realizado: {task.actualMinutes === null ? 'Sem horas registradas' : formatMinutes(task.actualMinutes)}</p>
                  </li>)}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
