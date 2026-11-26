import { useState, type FormEvent } from 'react';
import { CalendarDays, X } from 'lucide-react';
import type { ProjectSummary } from '../../api/projects';
import { saveSprint, type Sprint } from '../../api/sprints';

export function SprintForm({ sprint, projectId, projects, onClose, onSaved }: {
  sprint?: Sprint;
  projectId?: string;
  projects: ProjectSummary[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(sprint?.name ?? '');
  const [objective, setObjective] = useState(sprint?.objective ?? '');
  const [startDate, setStartDate] = useState(sprint?.startDate ?? '');
  const [endDate, setEndDate] = useState(sprint?.endDate ?? '');
  const [projectIds, setProjectIds] = useState<string[]>(sprint?.projectIds ?? (projectId ? [projectId] : []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !objective.trim() || !startDate || !endDate || endDate < startDate || projectIds.length === 0) {
      setError('Informe nome, objetivo, datas válidas e ao menos um projeto.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveSprint({ name, objective, startDate, endDate, projectIds }, sprint?.id);
      onSaved();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível salvar a sprint.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div role="dialog" aria-modal="true" aria-labelledby="sprint-form-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-5">
          <h2 id="sprint-form-title" className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <CalendarDays className="h-4 w-4 text-brand-600" /> {sprint ? 'Editar sprint' : 'Nova sprint'}
          </h2>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Fechar" className="p-1 text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-5">
          <label className="block text-xs font-bold text-slate-700">
            Nome *
            <input autoFocus required value={name} onChange={event => setName(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </label>
          <label className="block text-xs font-bold text-slate-700">
            Objetivo *
            <textarea required rows={3} value={objective} onChange={event => setObjective(event.target.value)} className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold text-slate-700">Início *
              <input required type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" />
            </label>
            <label className="block text-xs font-bold text-slate-700">Fim *
              <input required type="date" min={startDate || undefined} value={endDate} onChange={event => setEndDate(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" />
            </label>
          </div>
          <fieldset>
            <legend className="text-xs font-bold text-slate-700">Projetos *</legend>
            <div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
              {projects.length === 0 && <p className="text-xs text-slate-500">Crie um projeto antes de cadastrar uma sprint.</p>}
              {projects.map(project => (
                <label key={project.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={projectIds.includes(project.id)} onChange={event => setProjectIds(ids => event.target.checked ? [...ids, project.id] : ids.filter(id => id !== project.id))} />
                  <span>{project.name}{projects.some(other => other.id !== project.id && other.name === project.name) ? ` (${project.id.slice(-8)})` : ''}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" disabled={saving} onClick={onClose} className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
            <button type="submit" disabled={saving || projects.length === 0} className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar sprint'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
