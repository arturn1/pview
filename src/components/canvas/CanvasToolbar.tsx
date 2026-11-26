import React, { useState, useRef, useEffect } from 'react';
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
  GripVertical,
  Plus,
  Download,
  Upload,
  RotateCcw,
  Database,
  ArrowLeft,
  CalendarDays,
  LogOut
} from 'lucide-react';

interface CanvasToolbarProps {
  onBackToProjects: () => void;
  onOpenSprints: () => void;
  onLogout: () => void;
  selectedModuleId: string | null;
  onFilterModule: (moduleId: string | null) => void;
  onSearchSelectNode: (node: FlowNode) => void;
  onFitView: () => void;
}

export function CanvasToolbar({
  onBackToProjects,
  onOpenSprints,
  onLogout,
  selectedModuleId,
  onFilterModule,
  onSearchSelectNode,
  onFitView,
}: CanvasToolbarProps) {
  const showDialog = useAppDialog();
  const { 
    project,
    canWrite,
    projects,
    mode, 
    setMode, 
    exportProjectJson, 
    importProjectJson,
    selectProject,
    openPilotProject,
    reorderModules
  } = useProjectStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAddFeatureOpen, setIsAddFeatureOpen] = useState(false);
  const [isAddModuleOpen, setIsAddModuleOpen] = useState(false);
  const [draggedModuleId, setDraggedModuleId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSearchQuery('');
    setIsSearchOpen(false);
  }, [project.id]);

  const modules = project.nodes
    .filter(n => n.type === 'module')
    .map((node, index) => ({ node, index }))
    .sort((a, b) => (a.node.order ?? Infinity) - (b.node.order ?? Infinity) || a.index - b.index)
    .map(({ node }) => node);
  const allFeatures = project.nodes.filter(n => n.type === 'feature');

  const searchResults = searchQuery.trim()
    ? allFeatures.filter(f => 
        f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        f.content.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const moveModule = (moduleId: string, targetId: string) => {
    if (moduleId === targetId) return;
    const ids = modules.map(mod => mod.id).filter(id => id !== moduleId);
    ids.splice(ids.indexOf(targetId), 0, moduleId);
    reorderModules(ids);
  };

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
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      try {
        if (!content) throw new Error('O arquivo está vazio.');
        await importProjectJson(content);
      } catch (error) {
        showDialog({ title: 'Erro ao importar projeto', message: error instanceof Error ? error.message : 'Não foi possível importar o projeto.' });
      }
    };
    reader.onerror = () => showDialog({ title: 'Erro ao importar', message: 'Não foi possível ler o arquivo selecionado.' });
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <>
      <header className="absolute top-4 left-4 right-4 z-30 pointer-events-none grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_auto] gap-2 items-start">
        {/* Brand, nome do projeto e status da API */}
        <div className="pointer-events-auto order-1 w-fit max-w-full min-w-0 justify-self-start md:col-start-1 md:row-start-1 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-md rounded-2xl px-4 py-2.5 flex items-center space-x-3.5">
          <button type="button" onClick={onBackToProjects} title="Voltar aos projetos" aria-label="Voltar aos projetos" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-sm">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-extrabold text-sm tracking-tight text-slate-900">
                <label className="sr-only" htmlFor="project-selector">Projeto atual</label>
                <select
                  id="project-selector"
                  value={project.id}
                  onChange={event => {
                    selectProject(event.target.value).catch((error: unknown) =>
                      showDialog({ title: 'Erro ao abrir projeto', message: error instanceof Error ? error.message : 'Não foi possível abrir o projeto.' })
                    );
                  }}
                  className="max-w-[220px] bg-transparent text-sm font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded"
                >
                  {projects.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name}{projects.filter(other => other.name === item.name).length > 1 ? ` (${item.id.slice(-8)})` : ''}
                    </option>
                  ))}
                </select>
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-200">
                v{project.version}
              </span>
              <span 
                title="Persistência pela API"
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"
              >
                <Database className="w-2.5 h-2.5" />
                API
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium line-clamp-1 max-w-[260px]">
              {project.description}
            </p>
          </div>
          <button type="button" onClick={onOpenSprints} title="Sprints do projeto" aria-label="Sprints do projeto" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600">
            <CalendarDays className="h-4 w-4" />
          </button>
          <button type="button" onClick={onLogout} title="Sair" aria-label="Sair" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-rose-600">
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {/* Centro e Direita: Filtros, Ações de Edição, Busca e Modo */}
        <div className="contents">
          {/* Module Filter Pills */}
          <div role="group" aria-label="Filtrar por módulo" className="pointer-events-auto order-4 w-56 max-w-full min-w-0 max-h-[30vh] justify-self-start md:col-start-1 md:row-start-2 md:max-h-[calc(100vh-10rem)] bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-md rounded-2xl p-1.5 flex flex-col items-stretch gap-1 overflow-y-auto">
            <button
              onClick={() => onFilterModule(null)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-left text-xs font-semibold transition-all ${
                selectedModuleId === null
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todos
            </button>

            {modules.map(mod => {
              const isSelected = selectedModuleId === mod.id;
              const reorderable = mode === 'editor';
              return (
                <button
                  key={mod.id}
                  draggable={reorderable}
                  onDragStart={reorderable ? () => setDraggedModuleId(mod.id) : undefined}
                  onDragOver={reorderable && draggedModuleId ? event => { event.preventDefault(); setDropTargetId(mod.id); } : undefined}
                  onDrop={reorderable && draggedModuleId ? event => { event.preventDefault(); moveModule(draggedModuleId, mod.id); setDraggedModuleId(null); setDropTargetId(null); } : undefined}
                  onDragEnd={() => { setDraggedModuleId(null); setDropTargetId(null); }}
                  onKeyDown={reorderable ? event => {
                    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
                    event.preventDefault();
                    const position = modules.findIndex(item => item.id === mod.id) + (event.key === 'ArrowUp' ? -1 : 1);
                    if (modules[position]) moveModule(mod.id, modules[position].id);
                  } : undefined}
                  onClick={() => onFilterModule(isSelected ? null : mod.id)}
                  title={reorderable ? 'Arraste para reordenar (ou Alt + setas)' : undefined}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-left text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  } ${draggedModuleId === mod.id ? 'opacity-40' : ''} ${dropTargetId === mod.id && draggedModuleId !== mod.id ? 'ring-2 ring-brand-400' : ''}`}
                >
                  {reorderable && <GripVertical className="w-3 h-3 shrink-0 opacity-50 cursor-grab" aria-hidden="true" />}
                  <FolderKanban className="w-3.5 h-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 break-words">{mod.title.replace('Módulo: ', '')}</span>
                  {isSelected && <Check className="w-3 h-3 ml-0.5 shrink-0" />}
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
                onClick={() => {
                  openPilotProject().catch((error: unknown) =>
                    showDialog({ title: 'Erro ao abrir projeto piloto', message: error instanceof Error ? error.message : 'Não foi possível abrir o projeto piloto.' })
                  );
                }}
                title="Abrir projeto piloto"
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
            {canWrite && <button
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
            </button>}
          </div>
        </div>
      </header>

      {/* Modais de Criação */}
      <AddModuleModal
        isOpen={isAddModuleOpen}
        onClose={() => setIsAddModuleOpen(false)}
      />
      <AddFeatureModal 
        key={project.id}
        isOpen={isAddFeatureOpen} 
        onClose={() => setIsAddFeatureOpen(false)} 
      />
    </>
  );
}
