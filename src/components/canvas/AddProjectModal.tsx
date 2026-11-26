import { useState, type FormEvent } from 'react';
import { FolderKanban, X } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useAppDialog } from '../common/AppDialog';

type EditableProject = { id: string; name: string; description: string };

export function AddProjectModal({ onClose, project }: { onClose: () => void; project?: EditableProject }) {
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [submitting, setSubmitting] = useState(false);
  const createProject = useProjectStore(state => state.createProject);
  const updateProject = useProjectStore(state => state.updateProject);
  const showDialog = useAppDialog();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      if (project) await updateProject(project.id, name, description);
      else await createProject(name, description);
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
          <div className="flex justify-end gap-2">
            <button type="button" disabled={submitting} onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
            <button type="submit" disabled={submitting || !name.trim()} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50">{project ? 'Salvar alterações' : 'Criar Projeto'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
