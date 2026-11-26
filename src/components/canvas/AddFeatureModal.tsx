import { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { X, Plus, FolderKanban } from 'lucide-react';

interface AddFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddFeatureModal({ isOpen, onClose }: AddFeatureModalProps) {
  const { project, addFeatureNode } = useProjectStore();
  const modules = project.nodes.filter((n) => n.type === 'module');

  const [selectedModuleId, setSelectedModuleId] = useState<string>(
    modules[0]?.id || ''
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const activeModuleId = modules.some(module => module.id === selectedModuleId)
    ? selectedModuleId
    : modules[0]?.id || '';

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !activeModuleId) return;

    addFeatureNode(activeModuleId, title, description);
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">
              Adicionar Nova Funcionalidade
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Módulo Pai */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Módulo Pertencente
            </label>
            <div className="relative">
              <select
                value={activeModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
                className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title.replace('Módulo: ', '')}
                  </option>
                ))}
              </select>
              <FolderKanban className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
            {modules.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">Crie um módulo antes de adicionar uma funcionalidade.</p>
            )}
          </div>

          {/* Nome da Funcionalidade */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nome da Funcionalidade *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Emitir Relatório Financeiro"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Descrição do Comportamento
            </label>
            <textarea
              rows={3}
              placeholder="Explique o que essa funcionalidade executa..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !activeModuleId}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              Criar Funcionalidade
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
