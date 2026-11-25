import { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { X, FolderKanban } from 'lucide-react';

interface AddModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COLOR_PRESETS = [
  { name: 'Índigo', hex: '#6366F1' },
  { name: 'Azul', hex: '#0EA5E9' },
  { name: 'Esmeralda', hex: '#10B981' },
  { name: 'Âmbar', hex: '#F59E0B' },
  { name: 'Violeta', hex: '#8B5CF6' },
  { name: 'Rosa', hex: '#EC4899' },
];

export function AddModuleModal({ isOpen, onClose }: AddModuleModalProps) {
  const { addModuleNode } = useProjectStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0].hex);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addModuleNode(title, description, selectedColor);
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
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: selectedColor }}
            >
              <FolderKanban className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">
              Criar Novo Módulo Agrupador
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
          {/* Nome do Módulo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nome do Módulo *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Faturamento & Emissão de Notas"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Cor Temática */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Cor Temática do Módulo
            </label>
            <div className="flex items-center gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => setSelectedColor(preset.hex)}
                  className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center ${
                    selectedColor === preset.hex ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: preset.hex }}
                  title={preset.name}
                />
              ))}
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Descrição do Módulo
            </label>
            <textarea
              rows={3}
              placeholder="Descreva o propósito geral deste módulo..."
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
              disabled={!title.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-black disabled:opacity-50 transition-colors shadow-sm"
            >
              Criar Módulo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
