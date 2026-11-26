import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { getTeams, importDevOps, previewDevOps, type DevOpsPreview as Preview, type ImportResult, type Team } from '../../api/planning';
import type { ProjectSummary } from '../../api/projects';
import { formatMinutes } from './time';

const fieldClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

export function DevOpsPreview({ preview, projectName, teamName, fileName, saving, error, onBack, onConfirm }: {
  preview: Preview; projectName: string; teamName: string; fileName: string; saving: boolean; error: string | null;
  onBack: () => void; onConfirm: () => void;
}) {
  const { summary, tasks } = preview;
  return (
    <div className="space-y-4 p-5">
      <div>
        <h3 className="text-sm font-bold text-slate-900">Pré-visualização da importação</h3>
        <p className="mt-1 break-words text-xs text-slate-500">Arquivo: {fileName} · Projeto: {projectName} · Equipe para novos colaboradores: {teamName}</p>
        <p className="mt-2 text-sm text-slate-600">{tasks.length} tarefa(s): {summary.created} nova(s), {summary.updated} atualização(ões), {summary.createdStaff} novo(s) colaborador(es) e {summary.pendingEstimates} estimativa(s) pendente(s).</p>
        <p className="mt-1 text-xs text-slate-500">Nenhuma alteração foi salva. Os dados serão revalidados ao confirmar; a retrospectiva será preservada.</p>
      </div>
      <div className="max-h-80 overflow-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-slate-50 text-slate-600">
            <tr><th className="p-3">ID</th><th className="p-3">Título</th><th className="p-3">Responsável na planilha</th><th className="p-3">Planejado</th><th className="p-3">Ação</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.map(task => <tr key={task.taskNumber}>
              <td className="whitespace-nowrap p-3">{task.devOpsUrl ? <a href={task.devOpsUrl} target="_blank" rel="noopener noreferrer" aria-label={`Abrir tarefa ${task.taskNumber} no DevOps (nova aba)`} className="font-bold text-brand-600 hover:underline">#{task.taskNumber}</a> : `#${task.taskNumber}`}</td>
              <td className="min-w-48 break-words p-3 text-slate-800">{task.title}</td>
              <td className="min-w-40 break-words p-3 text-slate-600">{task.name}<span className="block text-slate-400">{task.email}</span></td>
              <td className="whitespace-nowrap p-3 text-slate-600">{task.plannedMinutes === null ? 'Pendente' : formatMinutes(task.plannedMinutes)}</td>
              <td className="whitespace-nowrap p-3 text-slate-600">{task.action === 'create' ? 'Criar' : 'Atualizar'}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={onBack} className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600">Voltar</button><button type="button" disabled={saving} onClick={onConfirm} className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Importando...' : 'Confirmar importação'}</button></div>
    </div>
  );
}

export function DevOpsImport({ sprintId, projects, onClose, onImported }: {
  sprintId: string; projects: ProjectSummary[]; onClose: () => void; onImported: (result: ImportResult) => void;
}) {
  const [projectId, setProjectId] = useState(projects.length === 1 ? projects[0].id : '');
  const [teamId, setTeamId] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(0);
  const [preview, setPreview] = useState<{ data: Preview; file: string } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getTeams().then(result => { if (active) setTeams(result); })
      .catch(failure => { if (active) setError(failure instanceof Error ? failure.message : 'Não foi possível carregar as equipes.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [version]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file || !projectId || !teamId) { setError('Selecione o arquivo, projeto e equipe.'); return; }
    if (!file.name.toLowerCase().endsWith('.xlsx') || file.size > 3 * 1024 * 1024) {
      setError('Selecione um arquivo XLSX de até 3 MB.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = '';
      for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      const encodedFile = btoa(binary);
      const data = await previewDevOps(sprintId, projectId, teamId, encodedFile);
      setPreview({ data, file: encodedFile });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível pré-visualizar as tarefas.');
    } finally { setSaving(false); }
  };

  const confirm = async () => {
    if (!preview) return;
    setSaving(true);
    setError(null);
    try {
      const result = await importDevOps(sprintId, projectId, teamId, preview.file, preview.data.fingerprint);
      onImported(result);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível importar as tarefas.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div role="dialog" aria-modal="true" aria-labelledby="devops-import-title" className={`max-h-[90vh] w-full ${preview ? 'max-w-4xl' : 'max-w-lg'} overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-slate-100 p-5"><h2 id="devops-import-title" className="text-sm font-bold text-slate-900">Importar tarefas do DevOps</h2><button type="button" disabled={saving} onClick={onClose} aria-label="Fechar" className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button></div>
        <form onSubmit={submit} hidden={!!preview} className="space-y-4 p-5">
          <p className="text-sm text-slate-600">Importa a primeira aba do XLSX. IDs existentes nesta sprint serão atualizados; a retrospectiva será preservada.</p>
          <label className="block text-xs font-bold text-slate-700">Projeto <select required disabled={saving} value={projectId} onChange={event => setProjectId(event.target.value)} className={fieldClass}><option value="">Selecione</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          <label className="block text-xs font-bold text-slate-700">Equipe para novos colaboradores <select required disabled={saving} value={teamId} onChange={event => setTeamId(event.target.value)} className={fieldClass}><option value="">Selecione</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
          {!loading && !teams.length && !error && <p className="text-xs text-slate-500">Cadastre uma equipe antes de importar.</p>}
          <label className="block text-xs font-bold text-slate-700">Arquivo XLSX <input required disabled={saving} type="file" accept=".xlsx" onChange={event => setFile(event.target.files?.[0] ?? null)} className={fieldClass} /></label>
          <p className="text-xs text-slate-500">Novos participantes começam com capacidade 0:00, que pode ser ajustada depois. Estimativas vazias ficam pendentes.</p>
          {error && <p role="alert" className="text-sm text-rose-700">{error} {!teams.length && <button type="button" onClick={() => setVersion(value => value + 1)} className="font-bold text-brand-600">Tentar novamente</button>}</p>}
          <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={onClose} className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600">Cancelar</button><button disabled={saving || loading || !teamId || !projectId || !file} className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Carregando...' : 'Pré-visualizar'}</button></div>
        </form>
        {preview && <DevOpsPreview preview={preview.data} projectName={projects.find(project => project.id === projectId)?.name ?? projectId} teamName={teams.find(team => team.id === teamId)?.name ?? teamId} fileName={file?.name ?? ''} saving={saving} error={error} onBack={() => { setError(null); setPreview(null); }} onConfirm={() => void confirm()} />}
      </div>
    </div>
  );
}
