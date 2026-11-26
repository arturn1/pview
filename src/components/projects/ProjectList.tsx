import { useState } from 'react';
import { ArrowRight, CalendarDays, FolderKanban, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { getProject, type ProjectSummary } from '../../api/projects';
import type { Project } from '../../types';
import { AddProjectModal } from '../canvas/AddProjectModal';
import type { AuthUser } from '../common/AuthGate';
import { useAppDialog } from '../common/AppDialog';
import { WorkspaceHeader } from '../common/WorkspaceHeader';

export function ProjectList({ user, onLogout, onOpenProject, onOpenSprints, onManageUsers }: { user: AuthUser; onLogout: () => void; onOpenProject: () => void; onOpenSprints: (projectId?: string) => void; onManageUsers: () => void }) {
  const { project: currentProject, projects, isLoading, loadError, loadFromRepository, selectProject, deleteProject, saveError, isSaving, saveToRepository } = useProjectStore();
  const showDialog = useAppDialog();
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const canManage = user.role === 'ADM' || user.role === 'DIGITAL';

  const openProject = async (id: string) => {
    setSelectionError(null);
    try {
      await selectProject(id);
      onOpenProject();
    } catch (error) {
      setSelectionError(error instanceof Error ? error.message : 'Não foi possível abrir o projeto.');
    }
  };

  const editProject = async (id: string) => {
    setLoadingEdit(true);
    try {
      const project = currentProject.id === id ? currentProject : await getProject(id);
      if (!project) throw new Error('O projeto não foi encontrado.');
      setEditing(project);
    } catch (error) {
      showDialog({ title: 'Erro ao editar projeto', message: error instanceof Error ? error.message : 'Não foi possível carregar o projeto.' });
    } finally {
      setLoadingEdit(false);
    }
  };

  const confirmDelete = (project: ProjectSummary) => {
    showDialog({
      title: 'Excluir projeto',
      message: `Excluir "${project.name}" e todo o seu conteúdo? A exclusão será bloqueada se houver tarefas de sprint vinculadas. Caso contrário, as sprints perderão o vínculo com este projeto. Esta ação não pode ser desfeita.${projects.length === 1 ? ' Se nenhum outro projeto for criado, o piloto será recriado no próximo carregamento.' : ''}`,
      confirmLabel: 'Excluir projeto',
      onConfirm: () => {
        deleteProject(project.id).catch((error: unknown) =>
          showDialog({ title: 'Erro ao excluir projeto', message: error instanceof Error ? error.message : 'Não foi possível excluir o projeto.' })
        );
      },
    });
  };

  return (
    <div className="min-h-screen bg-canvas">
      <WorkspaceHeader user={user} onLogout={onLogout} />

      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Seu espaço de trabalho</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Projetos</h1>
            <p className="mt-2 text-sm text-slate-500">Escolha um projeto para explorar sua arquitetura e regras.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {user.role === 'ADM' && <button type="button" onClick={onManageUsers} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700"><Users className="h-4 w-4" /> Usuários</button>}
            <button type="button" disabled={isLoading || loadingEdit || !!loadError} onClick={() => onOpenSprints()} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <CalendarDays className="h-4 w-4" /> Todas as sprints
            </button>
            {canManage && <button type="button" disabled={isLoading || loadingEdit || !!loadError} onClick={() => setCreating(true)} className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50">
              <Plus className="h-4 w-4" /> Novo Projeto
            </button>}
          </div>
        </div>

        {loadError && (
          <div role="alert" className="mt-8 rounded-2xl border border-rose-200 bg-white p-5 text-sm text-rose-700">
            <p className="font-bold">Não foi possível carregar os projetos</p>
            <p className="mt-1">{loadError}</p>
            <button type="button" onClick={() => void loadFromRepository()} className="mt-3 font-bold text-brand-600 hover:text-brand-700">Tentar novamente</button>
          </div>
        )}
        {saveError && (
          <div role="alert" className="mt-8 rounded-2xl border border-rose-200 bg-white p-5 text-sm text-rose-700">
            <p>{saveError}</p>
            <button type="button" disabled={isSaving} onClick={() => {
              saveToRepository().then(() => setSelectionError(null)).catch((error: unknown) => console.error('Erro ao tentar salvar novamente:', error));
            }} className="mt-3 font-bold text-brand-600 hover:text-brand-700 disabled:opacity-50">
              {isSaving ? 'Salvando...' : 'Tentar salvar novamente'}
            </button>
          </div>
        )}
        {selectionError && <p role="alert" className="mt-6 text-sm text-rose-700">{selectionError}</p>}
        {isLoading ? (
          <p role="status" className="mt-8 text-sm font-medium text-slate-500">Carregando projetos...</p>
        ) : !loadError && projects.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">Nenhum projeto encontrado.</p>
        ) : !loadError && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map(project => (
              <article
                key={project.id}
                className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-brand-300 hover:shadow-md"
              >
                <button type="button" disabled={loadingEdit} onClick={() => void openProject(project.id)} className="group flex w-full min-w-0 flex-1 items-start gap-4 rounded-t-2xl p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><FolderKanban className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-bold text-slate-900">{project.name}</span>
                    {projects.some(other => other.id !== project.id && other.name === project.name) && <span className="mt-1 block text-xs text-slate-400">ID: {project.id.slice(-8)}</span>}
                    <span className="mt-2 block text-xs font-semibold text-slate-400 group-hover:text-brand-600">Abrir projeto</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-brand-600" />
                </button>
                <div className="flex flex-wrap justify-end gap-1 border-t border-slate-100 px-4 py-2">
                  <button type="button" disabled={loadingEdit} onClick={() => onOpenSprints(project.id)} aria-label={`Sprints de ${project.name}`} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-brand-600 disabled:opacity-50">
                    <CalendarDays className="h-3.5 w-3.5" /> Sprints
                  </button>
                  {canManage && <><button type="button" disabled={loadingEdit} onClick={() => void editProject(project.id)} aria-label={`Editar ${project.name}`} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-brand-600 disabled:opacity-50">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button type="button" disabled={loadingEdit} onClick={() => confirmDelete(project)} aria-label={`Excluir ${project.name}`} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50">
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </button></>}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      {creating && <AddProjectModal onClose={() => setCreating(false)} />}
      {editing && <AddProjectModal project={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
