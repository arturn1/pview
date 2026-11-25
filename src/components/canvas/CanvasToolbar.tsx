import React, { useState, useRef } from 'react';
import { FlowNode } from '../../types';
import { useProjectStore } from '../../store/useProjectStore';
import { AddFeatureModal } from './AddFeatureModal';
import { AddModuleModal } from './AddModuleModal';
import { useAppDialog } from '../common/AppDialog';
import { 
  Layers, 
  Search, 
  Maximize, 
  Eye, 
  Edit3,
  FolderKanban,
  Check,
  Plus,
  Download,
  Upload,
  RotateCcw,
  Database
} from 'lucide-react';

interface CanvasToolbarProps {
  selectedModuleId: string | null;
  onFilterModule: (moduleId: string | null) => void;
  onSearchSelectNode: (node: FlowNode) => void;
  onFitView: () => void;
}

export function CanvasToolbar({
  selectedModuleId,
  onFilterModule,
  onSearchSelectNode,
  onFitView,
}: CanvasToolbarProps) {
  const showDialog = useAppDialog();
  const { 
    project, 
    mode, 
    setMode, 
    exportProjectJson, 
    importProjectJson, 
    resetToDefault 
  } = useProjectStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAddFeatureOpen, setIsAddFeatureOpen] = useState(false);
  const [isAddModuleOpen, setIsAddModuleOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const modules = project.nodes.filter(n => n.type === 'module');
  const allFeatures = project.nodes.filter(n => n.type === 'feature');

  const searchResults = searchQuery.trim()
    ? allFeatures.filter(f => 
        f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        f.content.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleExport = () => {
    const json = exportProjectJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}_flowdoc.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content || !importProjectJson(content)) {
        showDialog({ title: 'Arquivo inválido', message: 'Arquivo JSON inválido para projeto FlowDoc.' });
      }
    };
    reader.onerror = () => showDialog({ title: 'Erro ao importar', message: 'Não foi possível ler o arquivo selecionado.' });
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <>
      <header className="absolute top-4 left-4 right-4 z-30 pointer-events-none grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_auto] gap-2 items-start">
        {/* Brand, Nome do Projeto & Status do SQLite */}
        <div className="pointer-events-auto order-1 w-fit max-w-full min-w-0 justify-self-start md:col-start-1 md:row-start-1 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-md rounded-2xl px-4 py-2.5 flex items-center space-x-3.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-sm">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-extrabold text-sm tracking-tight text-slate-900">
                {project.name}
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-200">
                v{project.version}
              </span>
              <span 
                title="Persistência ativa em SQLite local (flowdoc.db via node:sqlite)"
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"
              >
                <Database className="w-2.5 h-2.5" />
                SQLite
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium line-clamp-1 max-w-[260px]">
              {project.description}
            </p>
          </div>
        </div>

        {/* Centro e Direita: Filtros, Ações de Edição, Busca e Modo */}
        <div className="contents">
          {/* Module Filter Pills */}
          <div className="pointer-events-auto order-4 w-fit max-w-full min-w-0 justify-self-start md:col-start-1 md:row-start-2 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-md rounded-2xl p-1.5 flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => onFilterModule(null)}
              className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedModuleId === null
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todos
            </button>

            {modules.map(mod => {
              const isSelected = selectedModuleId === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => onFilterModule(isSelected ? null : mod.id)}
                  className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FolderKanban className="w-3.5 h-3.5" />
                  {mod.title.replace('Módulo: ', '')}
                  {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                </button>
              );
            })}
          </div>

          {/* Botões do Modo Editor */}
          {mode === 'editor' && (
            <div className="pointer-events-auto order-5 min-w-0 md:col-start-2 md:col-span-2 md:row-start-2 bg-white/95 backdrop-blur-md border border-brand-200 shadow-md rounded-2xl p-1.5 flex items-center gap-1.5 overflow-x-auto animate-in fade-in duration-200">
              <button
                onClick={() => setIsAddModuleOpen(true)}
                className="shrink-0 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-black transition-colors flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Módulo
              </button>

              <button
                onClick={() => setIsAddFeatureOpen(true)}
                className="shrink-0 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-600 text-white hover:bg-brand-700 transition-colors flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Funcionalidade
              </button>

              <button
                onClick={handleExport}
                title="Exportar projeto em JSON"
                className="p-1.5 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                title="Importar projeto JSON"
                className="p-1.5 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <Upload className="w-4 h-4" />
              </button>

              <button
                onClick={() => showDialog({
                  title: 'Restaurar projeto padrão',
                  message: 'Deseja restaurar o projeto padrão? Alterações não exportadas serão perdidas.',
                  confirmLabel: 'Restaurar projeto',
                  onConfirm: resetToDefault,
                })}
                title="Restaurar projeto piloto padrão"
                className="p-1.5 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}

          {/* Global Search Bar */}
          <div className="pointer-events-auto order-2 relative md:col-start-2 md:row-start-1">
            <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-md rounded-2xl px-3 py-2.5 flex items-center space-x-2 w-full md:w-56 focus-within:ring-2 focus-within:ring-brand-500 transition-all">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Buscar no sistema..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
              />
            </div>

            {/* Search Dropdown Results */}
            {isSearchOpen && searchResults.length > 0 && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden py-1.5 z-50 animate-in fade-in duration-150 max-h-72 overflow-y-auto">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1 block">
                  Resultados ({searchResults.length})
                </span>
                {searchResults.map(result => (
                  <div
                    key={result.id}
                    onClick={() => {
                      onSearchSelectNode(result);
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="px-3 py-2 hover:bg-brand-50/60 cursor-pointer transition-colors"
                  >
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: result.color }} />
                      {result.title}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                      {result.content.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fit View & Toggle Modo Explorador / Editor */}
          <div className="pointer-events-auto order-3 md:col-start-3 md:row-start-1 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-md rounded-2xl p-1.5 flex items-center space-x-1.5">
            <button
              onClick={onFitView}
              title="Enquadrar todos os componentes"
              className="p-1.5 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <Maximize className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-slate-200" />
            
            {/* Toggle Switch */}
            <button
              onClick={() => setMode(mode === 'explorer' ? 'editor' : 'explorer')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                mode === 'editor'
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              {mode === 'editor' ? (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Modo Editor</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Modo Explorador</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Modais de Criação */}
      <AddModuleModal
        isOpen={isAddModuleOpen}
        onClose={() => setIsAddModuleOpen(false)}
      />
      <AddFeatureModal 
        isOpen={isAddFeatureOpen} 
        onClose={() => setIsAddFeatureOpen(false)} 
      />
    </>
  );
}
