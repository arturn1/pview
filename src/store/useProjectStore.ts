import { create } from 'zustand';
import { Project, FlowNode, FlowConnection, Rule, Calculation } from '../types';
import { pilotProject } from '../data/pilotProject';
import { deleteProject as deleteProjectRequest, getProject, listProjects, saveProject, type ProjectSummary } from '../api/projects';
import { copyImportedProject, parseImportedProject } from '../imports/importProject';

export type AppMode = 'explorer' | 'editor';

interface ProjectStore {
  project: Project;
  mode: AppMode;
  selectedNodeId: string | null;
  isSaving: boolean;
  isLoading: boolean;
  loadError: string | null;
  saveError: string | null;
  projects: ProjectSummary[];
  canWrite: boolean;
  setCanWrite: (value: boolean) => void;

  // Modos e Seleção
  setMode: (mode: AppMode) => void;
  setSelectedNodeId: (id: string | null) => void;

  // CRUD de Módulos & Nós
  addModuleNode: (title: string, description: string, color?: string) => void;
  addFeatureNode: (parentId: string, title: string, description: string) => void;
  updateNodeInfo: (nodeId: string, title: string, description: string) => void;
  updateNodeExpanded: (nodeId: string, expanded: boolean) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  updateNodeSize: (nodeId: string, size: { width: number; height: number }) => void;
  deleteNode: (nodeId: string) => Promise<void>;

  // CRUD de Regras
  addRule: (nodeId: string, rule: Omit<Rule, 'id'>) => void;
  updateRule: (nodeId: string, ruleId: string, rule: Omit<Rule, 'id'>) => void;
  deleteRule: (nodeId: string, ruleId: string) => void;

  // CRUD de Cálculos
  addCalculation: (nodeId: string, calculation: Omit<Calculation, 'id'>) => void;
  updateCalculation: (nodeId: string, calcId: string, calculation: Omit<Calculation, 'id'>) => void;
  deleteCalculation: (nodeId: string, calcId: string) => void;

  // CRUD de Conexões
  addConnection: (fromId: string, toId: string, sourceHandle?: string, targetHandle?: string) => void;
  deleteConnection: (connectionId: string) => void;

  // Persistência de projetos
  loadFromRepository: () => Promise<void>;
  saveToRepository: () => Promise<void>;
  selectProject: (id: string) => Promise<void>;
  createProject: (name: string, description: string) => Promise<void>;
  updateProject: (id: string, name: string, description: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  openPilotProject: () => Promise<void>;

  // Export/Import JSON & Reset
  exportProjectJson: () => string;
  importProjectJson: (jsonString: string) => Promise<void>;
}

let initialLoad: Promise<void> | null = null;
const pendingSaves = new Map<string, Promise<void>>();

function persistProject(project: Project) {
  const pending = saveProject(project);
  pendingSaves.set(project.id, pending);
  pending.then(() => {
    if (pendingSaves.get(project.id) === pending) {
      pendingSaves.delete(project.id);
      useProjectStore.setState({ saveError: null });
    }
  }, (error: unknown) => {
    console.error('Erro ao salvar projeto:', error);
    if (pendingSaves.get(project.id) === pending) {
      useProjectStore.setState({
        saveError: `Não foi possível salvar "${project.name}". Tente salvar novamente antes de trocar de projeto.`,
      });
    }
  });
}

async function waitForCurrentSave(project: Project) {
  await pendingSaves.get(project.id);
  const { saveError } = useProjectStore.getState();
  if (saveError) throw new Error(saveError);
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: pilotProject,
  mode: 'explorer',
  selectedNodeId: null,
  isSaving: false,
  isLoading: true,
  loadError: null,
  saveError: null,
  projects: [],
  canWrite: true,
  setCanWrite: (value) => set({ canWrite: value, ...(value ? {} : { mode: 'explorer' }) }),

  setMode: (mode) => set({ mode }),

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  // Adicionar novo Módulo Agrupador no Canvas
  addModuleNode: (title, description, color = '#6366F1') => {
    set((state) => {
      const existingModules = state.project.nodes.filter(n => n.type === 'module');
      const newId = `mod_${Date.now()}`;

      // Posiciona abaixo dos módulos existentes
      const posY = 40 + existingModules.length * 400;

      const newModuleNode: FlowNode = {
        id: newId,
        projectId: state.project.id,
        parentId: null,
        type: 'module',
        title: `Módulo: ${title.trim() || 'Novo Módulo'}`,
        icon: 'FolderKanban',
        color,
        tags: ['Módulo'],
        position: { x: 200, y: posY },
        size: { width: 840, height: 330 },
        expanded: true,
        content: {
          description: description.trim() || 'Descrição do novo módulo...',
          rules: [],
          calculations: [],
          inputs: [],
          outputs: [],
        },
      };

      const updatedProject = {
        ...state.project,
        nodes: [...state.project.nodes, newModuleNode],
        updatedAt: new Date().toISOString(),
      };

      // Dispara salvamento automático em background
      persistProject(updatedProject);

      return {
        project: updatedProject,
        selectedNodeId: newId,
      };
    });
  },

  addFeatureNode: (parentId, title, description) => {
    set((state) => {
      const parentNode = state.project.nodes.find((n) => n.id === parentId);
      const parentColor = parentNode?.color || '#6366F1';
      const siblings = state.project.nodes.filter((n) => n.parentId === parentId);

      const newId = `feat_${Date.now()}`;
      // Posição calculada com base no pai
      const posX = (parentNode?.position.x || 200) + 60 + (siblings.length % 2) * 400;
      const posY = (parentNode?.position.y || 100) + 90 + Math.floor(siblings.length / 2) * 220;

      // Auto-expande a altura do módulo se novos cards ultrapassarem o tamanho atual
      const rowIndex = Math.floor(siblings.length / 2);
      const minHeightNeeded = 90 + (rowIndex + 1) * 220 + 80;
      const currentModuleHeight = parentNode?.size?.height || 330;
      const finalModuleHeight = Math.max(currentModuleHeight, minHeightNeeded);

      const newNode: FlowNode = {
        id: newId,
        projectId: state.project.id,
        parentId,
        type: 'feature',
        title: title.trim() || 'Nova Funcionalidade',
        icon: 'Layers',
        color: parentColor,
        tags: ['Nova'],
        position: { x: posX, y: posY },
        size: { width: 320, height: 180 },
        expanded: false,
        content: {
          description: description.trim() || 'Descreva o comportamento desta funcionalidade...',
          rules: [],
          calculations: [],
          inputs: [],
          outputs: [],
        },
      };

      const updatedNodes = state.project.nodes.map((n) => {
        if (n.id === parentId && finalModuleHeight > currentModuleHeight) {
          return {
            ...n,
            size: {
              width: n.size?.width || 840,
              height: finalModuleHeight,
            },
          };
        }
        return n;
      });

      const updatedProject = {
        ...state.project,
        nodes: [...updatedNodes, newNode],
        updatedAt: new Date().toISOString(),
      };

      persistProject(updatedProject);

      return {
        project: updatedProject,
        selectedNodeId: newId,
      };
    });
  },

  updateNodeSize: (nodeId, size) => {
    set((state) => {
      const updatedProject = {
        ...state.project,
        nodes: state.project.nodes.map((n) => {
          if (n.id === nodeId) {
            return {
              ...n,
              size: {
                width: Math.round(size.width),
                height: Math.round(size.height),
              },
              updatedAt: new Date().toISOString(),
            };
          }
          return n;
        }),
        updatedAt: new Date().toISOString(),
      };

      persistProject(updatedProject);

      return { project: updatedProject };
    });
  },

  updateNodeInfo: (nodeId, title, description) => {
    set((state) => {
      const updatedProject = {
        ...state.project,
        nodes: state.project.nodes.map((n) => {
          if (n.id === nodeId) {
            return {
              ...n,
              title: title.trim() || n.title,
              content: {
                ...n.content,
                description: description.trim(),
              },
              updatedAt: new Date().toISOString(),
            };
          }
          return n;
        }),
        updatedAt: new Date().toISOString(),
      };

      persistProject(updatedProject);

      return { project: updatedProject };
    });
  },

  updateNodeExpanded: (nodeId, expanded) => {
    set((state) => {
      const maxExpandedZIndex = state.project.nodes.reduce((max, node) => {
        if (node.id === nodeId || !node.expanded) return max;
        return Math.max(max, node.zIndex ?? 10);
      }, 10);

      const updatedProject = {
        ...state.project,
        nodes: state.project.nodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                expanded,
                zIndex: expanded ? maxExpandedZIndex + 1 : 10,
              }
            : node
        ),
        updatedAt: new Date().toISOString(),
      };

      if (state.canWrite) persistProject(updatedProject);
      return { project: updatedProject };
    });
  },

  updateNodePosition: (nodeId, position) => {
    set((state) => {
      const updatedProject = {
        ...state.project,
        nodes: state.project.nodes.map((n) => {
          if (n.id === nodeId) {
            return { ...n, position };
          }
          return n;
        }),
      };

      persistProject(updatedProject);

      return { project: updatedProject };
    });
  },

  deleteNode: async (nodeId) => {
    set({ isLoading: true });
    try {
      await waitForCurrentSave(get().project);
      const state = get();
      const removedIds = new Set(state.project.nodes.filter(node => node.id === nodeId || node.parentId === nodeId).map(node => node.id));
      const updatedProject = {
        ...state.project,
        nodes: state.project.nodes.filter((n) => !removedIds.has(n.id)),
        connections: state.project.connections.filter(
          (c) => !removedIds.has(c.fromId) && !removedIds.has(c.toId)
        ),
        updatedAt: new Date().toISOString(),
      };
      await saveProject(updatedProject);
      set({
        project: updatedProject,
        selectedNodeId: state.selectedNodeId && removedIds.has(state.selectedNodeId) ? null : state.selectedNodeId,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  addRule: (nodeId, ruleData) => {
    set((state) => {
      const newRule: Rule = {
        id: `rule_${Date.now()}`,
        ...ruleData,
      };

      const updatedProject = {
        ...state.project,
        nodes: state.project.nodes.map((n) => {
          if (n.id === nodeId) {
            return {
              ...n,
              content: {
                ...n.content,
                rules: [...n.content.rules, newRule],
              },
            };
          }
          return n;
        }),
      };

      persistProject(updatedProject);

      return { project: updatedProject };
    });
  },

  deleteRule: (nodeId, ruleId) => {
    set((state) => {
      const updatedProject = {
        ...state.project,
        nodes: state.project.nodes.map((n) => {
          if (n.id === nodeId) {
            return {
              ...n,
              content: {
                ...n.content,
                rules: n.content.rules.filter((r) => r.id !== ruleId),
              },
            };
          }
          return n;
        }),
      };

      persistProject(updatedProject);

      return { project: updatedProject };
    });
  },

  updateRule: (nodeId, ruleId, ruleData) => {
    set((state) => {
      const updatedProject = {
        ...state.project,
        nodes: state.project.nodes.map((n) => {
          if (n.id === nodeId) {
            return {
              ...n,
              content: {
                ...n.content,
                rules: n.content.rules.map((rule) =>
                  rule.id === ruleId ? { ...rule, ...ruleData } : rule
                ),
              },
              updatedAt: new Date().toISOString(),
            };
          }
          return n;
        }),
        updatedAt: new Date().toISOString(),
      };

      persistProject(updatedProject);
      return { project: updatedProject };
    });
  },

  addCalculation: (nodeId, calcData) => {
    set((state) => {
      const newCalc: Calculation = {
        id: `calc_${Date.now()}`,
        ...calcData,
      };

      const updatedProject = {
        ...state.project,
        nodes: state.project.nodes.map((n) => {
          if (n.id === nodeId) {
            return {
              ...n,
              content: {
                ...n.content,
                calculations: [...n.content.calculations, newCalc],
              },
            };
          }
          return n;
        }),
      };

      persistProject(updatedProject);

      return { project: updatedProject };
    });
  },

  deleteCalculation: (nodeId, calcId) => {
    set((state) => {
      const updatedProject = {
        ...state.project,
        nodes: state.project.nodes.map((n) => {
          if (n.id === nodeId) {
            return {
              ...n,
              content: {
                ...n.content,
                calculations: n.content.calculations.filter((c) => c.id !== calcId),
              },
            };
          }
          return n;
        }),
      };

      persistProject(updatedProject);

      return { project: updatedProject };
    });
  },

  updateCalculation: (nodeId, calcId, calcData) => {
    set((state) => {
      const updatedProject = {
        ...state.project,
        nodes: state.project.nodes.map((n) => {
          if (n.id === nodeId) {
            return {
              ...n,
              content: {
                ...n.content,
                calculations: n.content.calculations.map((calc) =>
                  calc.id === calcId
                    ? { ...calc, ...calcData, variables: calcData.variables }
                    : calc
                ),
              },
              updatedAt: new Date().toISOString(),
            };
          }
          return n;
        }),
        updatedAt: new Date().toISOString(),
      };

      persistProject(updatedProject);
      return { project: updatedProject };
    });
  },

  addConnection: (fromId, toId, sourceHandle, targetHandle) => {
    if (fromId === toId) return;

    set((state) => {
      // Evita duplicatas com os mesmos nós e handles
      const exists = state.project.connections.some(
        (c) => c.fromId === fromId && c.toId === toId && c.sourceHandle === sourceHandle && c.targetHandle === targetHandle
      );
      if (exists) return state;

      const newConnection: FlowConnection = {
        id: `conn_${Date.now()}`,
        projectId: state.project.id,
        fromId,
        toId,
        sourceHandle: sourceHandle || 'source-bottom',
        targetHandle: targetHandle || 'target-top',
        type: 'sync',
        description: 'Fluxo interligado via editor',
        style: {
          color: '#6366F1',
          animated: true,
          thickness: 3,
        },
      };

      const updatedProject = {
        ...state.project,
        connections: [...state.project.connections, newConnection],
        updatedAt: new Date().toISOString(),
      };

      persistProject(updatedProject);

      return { project: updatedProject };
    });
  },

  deleteConnection: (connectionId) => {
    set((state) => {
      const updatedProject = {
        ...state.project,
        connections: state.project.connections.filter((c) => c.id !== connectionId),
        updatedAt: new Date().toISOString(),
      };

      persistProject(updatedProject);

      return { project: updatedProject };
    });
  },

  loadFromRepository: () => {
    if (initialLoad) return initialLoad;
    set({ isLoading: true, loadError: null });
    initialLoad = (async () => {
      try {
        let projects = await listProjects();
        if (projects.length === 0) {
          if (!get().canWrite) {
            set({ projects: [], selectedNodeId: null, isLoading: false });
            return;
          }
          await saveProject(pilotProject);
          projects = [{ id: pilotProject.id, name: pilotProject.name }];
        }
        const currentId = get().project.id;
        const id = projects.some(project => project.id === currentId) ? currentId : projects[0].id;
        if (!id) throw new Error('Nenhum projeto disponível.');
        const project = await getProject(id);
        if (!project) throw new Error('O projeto selecionado não foi encontrado.');
        set({ project, projects, selectedNodeId: null, isLoading: false });
      } catch (error) {
        console.error('Erro ao carregar projetos:', error);
        set({ loadError: error instanceof Error ? error.message : 'Erro ao carregar projetos.', isLoading: false });
      } finally {
        initialLoad = null;
      }
    })();
    return initialLoad;
  },

  saveToRepository: async () => {
    set({ isSaving: true });
    try {
      const project = get().project;
      persistProject(project);
      await waitForCurrentSave(project);
    } finally {
      set({ isSaving: false });
    }
  },

  selectProject: async (id) => {
    set({ isLoading: true });
    try {
      await waitForCurrentSave(get().project);
      const project = await getProject(id);
      if (!project) throw new Error('O projeto selecionado não foi encontrado.');
      set({ project, selectedNodeId: null });
    } finally {
      set({ isLoading: false });
    }
  },

  createProject: async (name, description) => {
    if (!name.trim()) throw new Error('Informe o nome do projeto.');
    const now = new Date().toISOString();
    const project: Project = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      version: '1.0.0',
      createdAt: now,
      updatedAt: now,
      tags: [],
      isPublic: false,
      canvasSettings: { ...pilotProject.canvasSettings },
      nodes: [],
      connections: [],
    };
    set({ isLoading: true });
    try {
      await waitForCurrentSave(get().project);
      await saveProject(project);
      const projects = await listProjects();
      set({ project, projects, selectedNodeId: null });
    } finally {
      set({ isLoading: false });
    }
  },

  updateProject: async (id, name, description) => {
    if (!name.trim()) throw new Error('Informe o nome do projeto.');
    set({ isLoading: true });
    try {
      await waitForCurrentSave(get().project);
      const current = get().project;
      const project = current.id === id ? current : await getProject(id);
      if (!project || !get().projects.some(item => item.id === id)) throw new Error('O projeto não foi encontrado.');
      const updatedProject = { ...project, name: name.trim(), description: description.trim(), updatedAt: new Date().toISOString() };
      await saveProject(updatedProject);
      set(state => ({
        project: state.project.id === id ? updatedProject : state.project,
        projects: state.projects.map(item => item.id === id ? { ...item, name: updatedProject.name } : item),
      }));
    } finally {
      set({ isLoading: false });
    }
  },

  deleteProject: async (id) => {
    set({ isLoading: true });
    try {
      await waitForCurrentSave(get().project);
      const { project, projects } = get();
      if (!projects.some(item => item.id === id)) throw new Error('O projeto não foi encontrado.');
      const remaining = projects.filter(item => item.id !== id);
      let nextProject = project;
      if (project.id === id && remaining.length > 0) {
        const next = await getProject(remaining[0].id);
        if (!next) throw new Error('Não foi possível carregar o próximo projeto.');
        nextProject = next;
      }
      await deleteProjectRequest(id);
      if (project.id === id && remaining.length === 0) nextProject = pilotProject;
      set({ project: nextProject, projects: remaining, selectedNodeId: project.id === id ? null : get().selectedNodeId });
    } finally {
      set({ isLoading: false });
    }
  },

  openPilotProject: async () => {
    set({ isLoading: true });
    try {
      await waitForCurrentSave(get().project);
      let project = await getProject(pilotProject.id);
      if (!project) {
        await saveProject(pilotProject);
        project = pilotProject;
      }
      const projects = await listProjects();
      set({ project, projects, selectedNodeId: null });
    } finally {
      set({ isLoading: false });
    }
  },

  exportProjectJson: () => {
    return JSON.stringify(get().project, null, 2);
  },

  importProjectJson: async (jsonString) => {
    const project = copyImportedProject(parseImportedProject(jsonString));
    set({ isLoading: true });
    try {
      await waitForCurrentSave(get().project);
      await saveProject(project);
      const projects = await listProjects();
      set({ project, projects, selectedNodeId: null });
    } finally {
      set({ isLoading: false });
    }
  },
}));
