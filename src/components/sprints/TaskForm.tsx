import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { getProject, type ProjectSummary } from '../../api/projects';
import { saveTask, type SprintTask } from '../../api/planning';
import type { FlowNode } from '../../types';
import { formatMinutes, parseMinutes } from './time';

const fieldClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

export function TaskForm({ participantId, task, projects, onClose, onSaved }: {
  participantId: string; task?: SprintTask; projects: ProjectSummary[]; onClose: () => void; onSaved: () => void;
}) {
  const [projectId, setProjectId] = useState(task?.projectId ?? '');
  const [featureId, setFeatureId] = useState(task?.featureId ?? '');
  const [taskNumber, setTaskNumber] = useState(task ? String(task.taskNumber) : '');
  const [title, setTitle] = useState(task?.title ?? '');
  const [planned, setPlanned] = useState(task?.plannedMinutes != null ? formatMinutes(task.plannedMinutes) : '');
  const [actual, setActual] = useState(task?.actualMinutes != null ? formatMinutes(task.actualMinutes) : '');
  const [lessons, setLessons] = useState(task?.lessons ?? '');
  const [challenges, setChallenges] = useState(task?.challenges ?? '');
  const [reviewNotes, setReviewNotes] = useState(task?.reviewNotes ?? '');
  const [features, setFeatures] = useState<FlowNode[]>([]);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [featureError, setFeatureError] = useState<string | null>(null);
  const [featureVersion, setFeatureVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setFeatures([]);
    setFeatureError(null);
    if (!projectId) { setLoadingFeatures(false); return; }
    setLoadingFeatures(true);
    getProject(projectId).then(project => {
      if (!project) throw new Error('O projeto não foi encontrado.');
      if (active) setFeatures(project.nodes.filter(node => node.type === 'feature'));
    }).catch(failure => {
      if (active) setFeatureError(failure instanceof Error ? failure.message : 'Não foi possível carregar as funcionalidades.');
    }).finally(() => { if (active) setLoadingFeatures(false); });
    return () => { active = false; };
  }, [projectId, featureVersion]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const plannedMinutes = planned.trim() ? parseMinutes(planned) : null;
    const actualMinutes = actual.trim() ? parseMinutes(actual) : null;
    const number = Number(taskNumber);
    if (!projectId || !Number.isSafeInteger(number) || number <= 0 || (planned.trim() && plannedMinutes === null) || (actual.trim() && actualMinutes === null)) {
      setError('Informe projeto, número positivo e horas válidas no formato H:MM.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveTask({ participantId, projectId, featureId: featureId || null, taskNumber: number, title, plannedMinutes, actualMinutes, lessons, challenges, reviewNotes }, task?.id);
      onSaved();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível salvar a tarefa.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div role="dialog" aria-modal="true" aria-labelledby="task-form-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5"><h2 id="task-form-title" className="text-sm font-bold text-slate-900">{task ? 'Editar tarefa e retrospectiva' : 'Atribuir tarefa'}</h2><button type="button" disabled={saving} onClick={onClose} aria-label="Fechar" className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button></div>
        <form onSubmit={submit} className="space-y-4 p-5">
          <label className="block text-xs font-bold text-slate-700">Projeto *<select required value={projectId} onChange={event => { setProjectId(event.target.value); setFeatureId(''); }} className={fieldClass}><option value="">Selecione</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          <label className="block text-xs font-bold text-slate-700">Título <input value={title} onChange={event => setTitle(event.target.value)} className={fieldClass} /></label>
          <label className="block text-xs font-bold text-slate-700">Funcionalidade do canvas (opcional)<select disabled={!projectId || loadingFeatures || !!featureError} value={featureId} onChange={event => setFeatureId(event.target.value)} className={fieldClass}><option value="">Nenhuma</option>{features.map(feature => <option key={feature.id} value={feature.id}>{feature.title}</option>)}</select></label>
          {loadingFeatures && <p role="status" className="text-xs text-slate-500">Carregando funcionalidades...</p>}
          {featureError && <p role="alert" className="text-xs text-rose-700">{featureError} <button type="button" onClick={() => setFeatureVersion(value => value + 1)} className="font-bold text-brand-600">Tentar novamente</button></p>}
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-xs font-bold text-slate-700">Nº da tarefa *<input required type="number" min="1" step="1" value={taskNumber} onChange={event => setTaskNumber(event.target.value)} className={fieldClass} /></label>
            <label className="block text-xs font-bold text-slate-700">Planejado (H:MM)<input placeholder="Pendente" value={planned} onChange={event => setPlanned(event.target.value)} className={fieldClass} /></label>
            <label className="block text-xs font-bold text-slate-700">Real (H:MM)<input placeholder="8:30" value={actual} onChange={event => setActual(event.target.value)} className={fieldClass} /></label>
          </div>
          <label className="block text-xs font-bold text-slate-700">Lições aprendidas<textarea rows={2} value={lessons} onChange={event => setLessons(event.target.value)} className={fieldClass} /></label>
          <label className="block text-xs font-bold text-slate-700">Desafios<textarea rows={2} value={challenges} onChange={event => setChallenges(event.target.value)} className={fieldClass} /></label>
          <label className="block text-xs font-bold text-slate-700">Observações de revisão<textarea rows={2} value={reviewNotes} onChange={event => setReviewNotes(event.target.value)} className={fieldClass} /></label>
          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={onClose} className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button><button disabled={saving || loadingFeatures || !!featureError} className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar tarefa'}</button></div>
        </form>
      </div>
    </div>
  );
}
