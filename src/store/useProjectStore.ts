import { create } from 'zustand';
import { Project, FlowNode, FlowConnection, Rule, Calculation } from '../types';
import { pilotProject } from '../data/pilotProject';
import { projectRepository } from '../repositories';

export type AppMode = 'explorer' | 'editor';

interface ProjectStore {
  project: Project;
  mode: AppMode;
  selectedNodeId: string | null;
  isSaving: boolean;
  isLoading: boolean;

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
  deleteNode: (nodeId: string) => void;

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

  // Persistência com SQLite (via Repository Pattern)
  loadFromRepository: () => Promise<void>;
  saveToRepository: () => Promise<void>;

  // Export/Import JSON & Reset
  exportProjectJson: () => string;
  importProjectJson: (jsonString: string) => boolean;
  resetToDefault: () => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: pilotProject,
  mode: 'explorer',
  selectedNodeId: null,
  isSaving: false,
  isLoading: false,

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

      // Dispara salvamento automático em background no SQLite
      projectRepository.saveProject(updatedProject).catch(console.error);

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

      projectRepository.saveProject(updatedProject).catch(console.error);

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

      projectRepository.saveProject(updatedProject).catch(console.error);

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

      projectRepository.saveProject(updatedProject).catch(console.error);

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

      projectRepository.saveProject(updatedProject).catch(console.error);
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

      projectRepository.saveProject(updatedProject).catch(console.error);

      return { project: updatedProject };
    });
  },

  deleteNode: (nodeId) => {
    set((state) => {
      const updatedProject = {
        ...state.project,
        nodes: state.project.nodes.filter((n) => n.id !== nodeId && n.parentId !== nodeId),
        connections: state.project.connections.filter(
          (c) => c.fromId !== nodeId && c.toId !== nodeId
        ),
        updatedAt: new Date().toISOString(),
      };

      projectRepository.saveProject(updatedProject).catch(console.error);

      return {
        project: updatedProject,
        selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      };
    });
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

      projectRepository.saveProject(updatedProject).catch(console.error);

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

      projectRepository.saveProject(updatedProject).catch(console.error);

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

      projectRepository.saveProject(updatedProject).catch(console.error);
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

      projectRepository.saveProject(updatedProject).catch(console.error);

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

      projectRepository.saveProject(updatedProject).catch(console.error);

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

      projectRepository.saveProject(updatedProject).catch(console.error);
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

      projectRepository.saveProject(updatedProject).catch(console.error);

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

      projectRepository.saveProject(updatedProject).catch(console.error);

      return { project: updatedProject };
    });
  },

  // Carrega do SQLite ou fallback para pilotProject
  loadFromRepository: async () => {
    set({ isLoading: true });
    try {
      const saved = await projectRepository.getProject('proj_gestor_projetos');
      if (saved && saved.nodes && saved.nodes.length > 0) {
        set({ project: saved, isLoading: false });
      } else {
        // Se ainda não salvo, salva o estado inicial
        await projectRepository.saveProject(pilotProject);
        set({ project: pilotProject, isLoading: false });
      }
    } catch (e) {
      console.warn('Erro ao carregar do SQLite, usando dados padrão:', e);
      set({ project: pilotProject, isLoading: false });
    }
  },

  saveToRepository: async () => {
    set({ isSaving: true });
    try {
      await projectRepository.saveProject(get().project);
    } finally {
      set({ isSaving: false });
    }
  },

  exportProjectJson: () => {
    return JSON.stringify(get().project, null, 2);
  },

  importProjectJson: (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.id && Array.isArray(parsed.nodes) && Array.isArray(parsed.connections)) {
        set({ project: parsed, selectedNodeId: null });
        projectRepository.saveProject(parsed).catch(console.error);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  resetToDefault: () => {
    set({ project: pilotProject, selectedNodeId: null });
    projectRepository.saveProject(pilotProject).catch(console.error);
  },
}));
