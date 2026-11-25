// ==========================================
// FLOWDOC - CONTRATOS E MODELOS DE DADOS
// ==========================================

export type NodeType = 'module' | 'feature' | 'rule';

export type ConnectionType = 'sync' | 'async' | 'batch' | 'optional';

export type RuleSeverity = 'critical' | 'warning' | 'info';

export type RuleConditional = 'if' | 'when' | 'unless' | 'while' | 'before' | 'after';

export type RuleLogicalOperator = 'none' | 'and' | 'or' | 'not';

export type RuleCrudOperation = 'create' | 'read' | 'update' | 'delete';

export type NoteType = 'observation' | 'warning' | 'tip' | 'deprecated';

/**
 * Campo de Entrada (Input) ou Saída (Output) de uma funcionalidade
 */
export interface DataField {
  id: string;
  name: string;
  type: string;
  required: boolean;
  description?: string;
  example?: string;
  validation?: string;
}

/**
 * Variável utilizada em uma fórmula de cálculo
 */
export interface CalculationVariable {
  symbol: string;
  name: string;
  unit?: string;
  source?: string;
}

/**
 * Fórmula e especificação de cálculo de negócio
 */
export interface Calculation {
  id: string;
  name: string;
  description?: string;
  formula: string; // Ex: "C = H \times V" ou fórmula legível
  variables: CalculationVariable[];
  example?: string;
}

/**
 * Regra de negócio atômica
 */
export interface Rule {
  id: string;
  conditional?: RuleConditional;
  condition: string;    // "SE / QUANDO"
  logicalOperator?: RuleLogicalOperator;
  secondaryCondition?: string;
  crudOperation?: RuleCrudOperation;
  consequence: string;  // "ENTÃO / RESULTADO"
  severity: RuleSeverity;
  tags?: string[];
}

/**
 * Anotação / Observação do módulo ou funcionalidade
 */
export interface Note {
  id: string;
  text: string;
  type: NoteType;
  createdAt: string;
  author?: string;
}

/**
 * Conteúdo rico exposto ao clicar/expandir o componente
 */
export interface NodeContent {
  description: string;
  rules: Rule[];
  calculations: Calculation[];
  inputs: DataField[];
  outputs: DataField[];
  notes?: Note[];
}

/**
 * Representação de um Nó/Componente no Canvas
 */
export interface FlowNode {
  id: string;
  projectId: string;
  parentId: string | null; // Se preenchido, é filho de outro nó (ex: feature dentro de módulo)
  type: NodeType;
  title: string;
  icon?: string;
  color?: string;
  tags: string[];
  position: {
    x: number;
    y: number;
  };
  size?: {
    width: number;
    height: number;
  };
  expanded?: boolean;
  locked?: boolean;
  visible?: boolean;
  zIndex?: number;
  content: NodeContent;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Conexão direcionada entre dois nós (arestas no canvas)
 */
export interface FlowConnection {
  id: string;
  projectId: string;
  fromId: string;
  toId: string;
  sourceHandle?: string;
  targetHandle?: string;
  type: ConnectionType;
  label?: string;
  description?: string;
  payload?: {
    name: string;
    type: string;
    description?: string;
  };
  style?: {
    color?: string;
    animated?: boolean;
    thickness?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Configurações visuais e de navegação do Canvas
 */
export interface CanvasSettings {
  defaultZoom: number;
  backgroundColor: string;
  gridVisible: boolean;
  snapToGrid: boolean;
  miniMapVisible: boolean;
  initialViewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

/**
 * Entidade raiz: Projeto mapeado
 */
export interface Project {
  id: string;
  name: string;
  description: string;
  version: string;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  canvasSettings: CanvasSettings;
  nodes: FlowNode[];
  connections: FlowConnection[];
  tags: string[];
  isPublic: boolean;
}
