import { Project } from '../types';

/**
 * Mock em Árvore Hierárquica Top-Down:
 * Layout limpo e objetivo, sem textos técnicos ou redundantes.
 */
export const pilotProject: Project = {
  id: 'proj_gestor_projetos',
  name: 'Gestor de Projetos e Alocação de Equipes',
  description: 'Mapeamento visual e funcional das regras de gestão de projetos, colaboradores e atribuição de horas com cálculo automático de custos.',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  tags: ['Gestão', 'Financeiro', 'Equipes', 'Custos'],
  isPublic: true,
  canvasSettings: {
    defaultZoom: 0.7,
    backgroundColor: '#F8F9FC',
    gridVisible: true,
    snapToGrid: false,
    miniMapVisible: true,
    initialViewport: { x: 100, y: 30, zoom: 0.7 }
  },
  nodes: [
    // =============================================================
    // 1. MÓDULO GESTÃO DE PROJETOS
    // =============================================================
    {
      id: 'mod_projects',
      projectId: 'proj_gestor_projetos',
      parentId: null,
      type: 'module',
      title: 'Módulo: Gestão de Projetos',
      icon: 'FolderKanban',
      color: '#6366F1',
      tags: ['Projetos', 'Ciclo de Vida'],
      position: { x: 200, y: 40 },
      size: { width: 840, height: 330 },
      expanded: true,
      content: {
        description: 'Responsável pelo ciclo de vida dos projetos: criação, acompanhamento de prazos, orçamento e encerramento.',
        rules: [
          {
            id: 'rule_proj_global_1',
            condition: 'Projeto com status "encerrado"',
            consequence: 'Bloqueia novas atribuições de horas e desativa lançamentos.',
            severity: 'critical'
          }
        ],
        calculations: [],
        inputs: [],
        outputs: []
      }
    },
    {
      id: 'feat_create_project',
      projectId: 'proj_gestor_projetos',
      parentId: 'mod_projects',
      type: 'feature',
      title: 'Criar Projeto',
      icon: 'PlusCircle',
      color: '#6366F1',
      tags: ['Criação', 'Formulário'],
      position: { x: 260, y: 130 },
      size: { width: 320, height: 180 },
      expanded: false,
      content: {
        description: 'Permite criar um novo projeto com nome único, prazo e orçamento estimado.',
        rules: [
          {
            id: 'rule_cp_1',
            condition: 'Nome já existente para o mesmo cliente',
            consequence: 'Bloquear criação e alertar duplicidade',
            severity: 'critical'
          },
          {
            id: 'rule_cp_2',
            condition: 'Data de Prazo <= Data de Início',
            consequence: 'Bloquear — o prazo deve ser posterior ao início',
            severity: 'critical'
          }
        ],
        calculations: [],
        inputs: [],
        outputs: []
      }
    },
    {
      id: 'feat_detail_project',
      projectId: 'proj_gestor_projetos',
      parentId: 'mod_projects',
      type: 'feature',
      title: 'Detalhes & Orçamento',
      icon: 'BarChart3',
      color: '#6366F1',
      tags: ['Dashboard', 'Consumo'],
      position: { x: 660, y: 130 },
      size: { width: 320, height: 180 },
      expanded: false,
      content: {
        description: 'Visão consolidada com custos acumulados e percentual de orçamento consumido.',
        rules: [
          {
            id: 'rule_dp_1',
            condition: 'Custo acumulado > Orçamento planejado',
            consequence: 'Exibir alerta de "Orçamento Excedido"',
            severity: 'critical'
          }
        ],
        calculations: [
          {
            id: 'calc_dp_1',
            name: 'Percentual do Orçamento Consumido',
            formula: 'P = (C_{total} / O) \\times 100',
            variables: [
              { symbol: 'P', name: 'Percentual consumido', unit: '%' },
              { symbol: 'C_total', name: 'Custo acumulado das horas', unit: 'R$' },
              { symbol: 'O', name: 'Orçamento definido', unit: 'R$' }
            ],
            example: 'R$ 45.000 de R$ 50.000 = 90% consumido'
          }
        ],
        inputs: [],
        outputs: []
      }
    },

    // =============================================================
    // 2. MÓDULO GESTÃO DE STAFFS
    // =============================================================
    {
      id: 'mod_staffs',
      projectId: 'proj_gestor_projetos',
      parentId: null,
      type: 'module',
      title: 'Módulo: Gestão de Staffs',
      icon: 'Users',
      color: '#0EA5E9',
      tags: ['Colaboradores', 'Capacidade'],
      position: { x: 200, y: 440 },
      size: { width: 840, height: 330 },
      expanded: true,
      content: {
        description: 'Cadastro e manutenção dos colaboradores, suas competências técnicas e taxa/hora de trabalho.',
        rules: [],
        calculations: [],
        inputs: [],
        outputs: []
      }
    },
    {
      id: 'feat_register_staff',
      projectId: 'proj_gestor_projetos',
      parentId: 'mod_staffs',
      type: 'feature',
      title: 'Cadastrar Staff',
      icon: 'UserPlus',
      color: '#0EA5E9',
      tags: ['Cadastro', 'Colaborador'],
      position: { x: 260, y: 530 },
      size: { width: 320, height: 180 },
      expanded: false,
      content: {
        description: 'Registra o profissional e define sua taxa/hora, que alimentará os cálculos.',
        rules: [
          {
            id: 'rule_rs_1',
            condition: 'E-mail informado já cadastrado',
            consequence: 'Bloquear cadastro impedindo duplicidade',
            severity: 'critical'
          },
          {
            id: 'rule_rs_2',
            condition: 'Valor por hora <= 0 ou nulo',
            consequence: 'Bloquear — a taxa horária é obrigatória para os cálculos posteriores',
            severity: 'critical'
          }
        ],
        calculations: [],
        inputs: [],
        outputs: []
      }
    },
    {
      id: 'feat_capacity_staff',
      projectId: 'proj_gestor_projetos',
      parentId: 'mod_staffs',
      type: 'feature',
      title: 'Disponibilidade & Carga',
      icon: 'CalendarClock',
      color: '#0EA5E9',
      tags: ['Capacidade', 'Alocação'],
      position: { x: 660, y: 530 },
      size: { width: 320, height: 180 },
      expanded: false,
      content: {
        description: 'Monitora a carga horária mensal para evitar sobrecarga de trabalho.',
        rules: [
          {
            id: 'rule_cs_1',
            condition: 'Horas alocadas no mês > Carga semanal × 4',
            consequence: 'Sinalizar alerta visual de sobrecarga na equipe',
            severity: 'warning'
          }
        ],
        calculations: [
          {
            id: 'calc_cs_1',
            name: 'Saldo de Horas Disponíveis',
            formula: 'H_{disp} = (CargaSemanal \\times 4) - H_{alocadas}',
            variables: [
              { symbol: 'H_disp', name: 'Horas livres no mês', unit: 'h' },
              { symbol: 'CargaSemanal', name: 'Carga semanal acordada', unit: 'h' },
              { symbol: 'H_alocadas', name: 'Horas atribuídas no mês', unit: 'h' }
            ],
            example: '(40h × 4) - 130h = 30h livres'
          }
        ],
        inputs: [],
        outputs: []
      }
    },

    // =============================================================
    // 3. MÓDULO ATRIBUIÇÃO DE HORAS & CUSTOS
    // =============================================================
    {
      id: 'mod_hours',
      projectId: 'proj_gestor_projetos',
      parentId: null,
      type: 'module',
      title: 'Módulo: Atribuição de Horas & Custos',
      icon: 'Calculator',
      color: '#10B981',
      tags: ['Cálculos', 'Atribuições'],
      position: { x: 200, y: 840 },
      size: { width: 840, height: 330 },
      expanded: true,
      content: {
        description: 'Vincula colaboradores aos projetos, computa horas e calcula custos automáticos.',
        rules: [],
        calculations: [],
        inputs: [],
        outputs: []
      }
    },
    {
      id: 'feat_assign_hours',
      projectId: 'proj_gestor_projetos',
      parentId: 'mod_hours',
      type: 'feature',
      title: 'Atribuir Horas de Trabalho',
      icon: 'Timer',
      color: '#10B981',
      tags: ['Atribuição', 'Lançamento'],
      position: { x: 260, y: 930 },
      size: { width: 320, height: 180 },
      expanded: false,
      content: {
        description: 'Aloca as horas a serem trabalhadas por um staff no projeto durante um mês.',
        rules: [
          {
            id: 'rule_ah_1',
            condition: 'Projeto com status "encerrado"',
            consequence: 'Bloqueio estrito: projetos concluídos não aceitam novos lançamentos',
            severity: 'critical'
          },
          {
            id: 'rule_ah_2',
            condition: 'Staff sem taxa horária cadastrada',
            consequence: 'Bloqueio: impossível atribuir sem valor por hora',
            severity: 'critical'
          }
        ],
        calculations: [],
        inputs: [],
        outputs: []
      }
    },
    {
      id: 'feat_calculate_cost',
      projectId: 'proj_gestor_projetos',
      parentId: 'mod_hours',
      type: 'feature',
      title: 'Motor de Cálculo de Custos',
      icon: 'Coins',
      color: '#10B981',
      tags: ['Fórmula', 'Financeiro'],
      position: { x: 660, y: 930 },
      size: { width: 320, height: 180 },
      expanded: false,
      content: {
        description: 'Multiplica horas lançadas pelo valor/hora do staff e atualiza o orçamento.',
        rules: [],
        calculations: [
          {
            id: 'calc_cc_1',
            name: 'Custo Total da Alocação',
            formula: 'C = H \\times V_{hora}',
            variables: [
              { symbol: 'C', name: 'Custo Total Calculado', unit: 'R$' },
              { symbol: 'H', name: 'Horas trabalhadas alocadas', unit: 'h' },
              { symbol: 'V_hora', name: 'Taxa por hora do colaborador', unit: 'R$/h' }
            ],
            example: '80 horas × R$ 65,00/h = R$ 5.200,00'
          }
        ],
        inputs: [],
        outputs: []
      }
    }
  ],
  connections: [
    {
      id: 'conn_proj_to_staff',
      projectId: 'proj_gestor_projetos',
      fromId: 'feat_create_project',
      toId: 'feat_register_staff',
      sourceHandle: 'source-bottom',
      targetHandle: 'target-top',
      type: 'sync',
      description: 'O projeto criado demanda a definição e alocação de colaboradores',
      style: {
        color: '#6366F1',
        animated: true,
        thickness: 3
      }
    },
    {
      id: 'conn_staff_to_hours',
      projectId: 'proj_gestor_projetos',
      fromId: 'feat_register_staff',
      toId: 'feat_assign_hours',
      sourceHandle: 'source-bottom',
      targetHandle: 'target-top',
      type: 'sync',
      description: 'O colaborador cadastrado é disponibilizado para o lançamento de horas',
      style: {
        color: '#0EA5E9',
        animated: true,
        thickness: 3
      }
    },
    {
      id: 'conn_assign_to_calc',
      projectId: 'proj_gestor_projetos',
      fromId: 'feat_assign_hours',
      toId: 'feat_calculate_cost',
      sourceHandle: 'source-right',
      targetHandle: 'target-left',
      type: 'sync',
      description: 'As horas atribuídas alimentam a fórmula do motor de cálculo financeiro',
      style: {
        color: '#10B981',
        animated: false,
        thickness: 3
      }
    },
    {
      id: 'conn_calc_to_project_detail',
      projectId: 'proj_gestor_projetos',
      fromId: 'feat_calculate_cost',
      toId: 'feat_detail_project',
      sourceHandle: 'source-right',
      targetHandle: 'target-top',
      type: 'async',
      description: 'O custo calculado sobe para atualizar o orçamento consumido do projeto',
      style: {
        color: '#6366F1',
        animated: true,
        thickness: 2.5
      }
    }
  ]
};
