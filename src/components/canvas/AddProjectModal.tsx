import { useEffect, useState, type FormEvent } from 'react';
import { FileUp, FolderKanban, X } from 'lucide-react';
import { getProjectApproverOptions, type ProjectApprover } from '../../api/projects';
import { useProjectStore } from '../../store/useProjectStore';
import { useAppDialog } from '../common/AppDialog';

type EditableProject = { id: string; name: string; description: string };

export function AddProjectModal({ onClose, project }: { onClose: () => void; project?: EditableProject }) {
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [approvers, setApprovers] = useState<ProjectApprover[]>([]);
  const [selectedApproverIds, setSelectedApproverIds] = useState<string[]>([]);
  const [loadingApprovers, setLoadingApprovers] = useState(true);
  const [approverError, setApproverError] = useState<string | null>(null);
  const [approverVersion, setApproverVersion] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const createProject = useProjectStore(state => state.createProject);
  const updateProject = useProjectStore(state => state.updateProject);
  const showDialog = useAppDialog();

  useEffect(() => {
    let active = true;
    setLoadingApprovers(true);
    setApproverError(null);
    getProjectApproverOptions(project?.id).then(result => {
      if (!active) return;
      setApprovers(result.approvers);
      setSelectedApproverIds(result.selectedIds);
    }).catch(error => {
      if (active) setApproverError(error instanceof Error ? error.message : 'Não foi possível carregar os aprovadores.');
    }).finally(() => {
      if (active) setLoadingApprovers(false);
    });
    return () => { active = false; };
  }, [project?.id, approverVersion]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || loadingApprovers || approverError) return;
    setSubmitting(true);
    try {
      if (project) await updateProject(project.id, name, description, selectedApproverIds);
      else {
        const json = importFile ? await importFile.text() : undefined;
        if (importFile && !json) throw new Error('O arquivo está vazio.');
        await createProject(name, description, selectedApproverIds, json);
      }
      onClose();
    } catch (error) {
      showDialog({ title: project ? 'Erro ao editar projeto' : 'Erro ao criar projeto', message: error instanceof Error ? error.message : 'Não foi possível salvar o projeto.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="new-project-title" className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 id="new-project-title" className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-brand-600" /> {project ? 'Editar Projeto' : 'Novo Projeto'}
          </h2>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Fechar" className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <label className="block text-xs font-bold text-slate-700">
            Nome do projeto *
            <input autoFocus required value={name} onChange={event => setName(event.target.value)} className="mt-1 w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </label>
          <label className="block text-xs font-bold text-slate-700">
            Descrição
            <textarea rows={3} value={description} onChange={event => setDescription(event.target.value)} className="mt-1 w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          </label>
          {!project && (
            <div>
              <label htmlFor="project-json" className="block text-xs font-bold text-slate-700">Carregar JSON (opcional)</label>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2">
                <FileUp className="h-4 w-4 text-slate-400" />
                <input id="project-json" type="file" accept="application/json,.json" disabled={submitting} onChange={event => setImportFile(event.currentTarget.files?.[0] ?? null)} className="min-w-0 flex-1 text-xs text-slate-600" />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">O conteúdo do arquivo (módulos, funcionalidades e conexões) é usado no novo projeto; nome e descrição vêm deste formulário.</p>
            </div>
          )}
          <div>
            <label htmlFor="project-approvers" className="block text-xs font-bold text-slate-700">Aprovadores (opcional)</label>
            {loadingApprovers ? <p role="status" className="mt-2 text-xs text-slate-500">Carregando usuários aprovadores...</p> : approverError ? (
              <p role="alert" className="mt-2 text-xs text-rose-700">
                {approverError}{' '}
                <button type="button" onClick={() => setApproverVersion(value => value + 1)} className="font-bold text-brand-600">Tentar novamente</button>
              </p>
            ) : approvers.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">Nenhum usuário com papel APPROVER cadastrado.</p>
            ) : (
              <>
                <select
                  id="project-approvers"
                  multiple
                  size={Math.min(approvers.length, 5)}
                  disabled={submitting}
                  value={selectedApproverIds}
                  onChange={event => setSelectedApproverIds(Array.from(event.currentTarget.selectedOptions, option => option.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {approvers.map(approver => <option key={approver.id} value={approver.id}>{approver.name} — {approver.email}</option>)}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">Segure Ctrl (Windows/Linux) ou Command (Mac) para selecionar vários.</p>
              </>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" disabled={submitting} onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
            <button type="submit" disabled={submitting || !name.trim() || loadingApprovers || !!approverError} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50">{project ? 'Salvar alterações' : 'Criar Projeto'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
