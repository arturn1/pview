import React, { useState, useMemo, useEffect } from 'react';
import {
  Project,
  Rule,
  RuleSeverity,
  RuleConditional,
  RuleLogicalOperator,
  RuleCrudOperation,
  CalculationVariable,
} from '../../types';
import { useProjectStore } from '../../store/useProjectStore';
import { FormulaRenderer } from '../common/FormulaRenderer';
import { FormulaSimulator } from '../common/FormulaSimulator';
import { useAppDialog } from '../common/AppDialog';
import { 
  X, 
  Layers, 
  AlertCircle, 
  Calculator, 
  ArrowRight, 
  Tag, 
  FileText,
  Sparkles,
  SlidersHorizontal,
  Trash2,
  Plus,
  Save,
  Pencil,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface NodeDetailDrawerProps {
  nodeId: string | null;
  project: Project;
  onClose: () => void;
  onSelectOtherNode?: (nodeId: string) => void;
}

export function NodeDetailDrawer({
  nodeId,
  project,
  onClose,
  onSelectOtherNode
}: NodeDetailDrawerProps) {
  const showDialog = useAppDialog();
  const { 
    mode, 
    updateNodeInfo, 
    deleteNode, 
    addRule, 
    updateRule,
    deleteRule, 
    addCalculation, 
    updateCalculation,
    deleteCalculation,
    deleteConnection
  } = useProjectStore();

  const node = project.nodes.find(n => n.id === nodeId) || null;

  const [activeTab, setActiveTab] = useState<'rules' | 'calculations' | 'connections'>('rules');
  const [ruleSeverityFilter, setRuleSeverityFilter] = useState<RuleSeverity | 'all'>('all');

  // Estados de Edição
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Formulário Nova Regra
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newRuleConditional, setNewRuleConditional] = useState<RuleConditional>('if');
  const [newRuleCondition, setNewRuleCondition] = useState('');
  const [newRuleLogicalOperator, setNewRuleLogicalOperator] = useState<RuleLogicalOperator>('none');
  const [newRuleSecondaryCondition, setNewRuleSecondaryCondition] = useState('');
  const [newRuleCrudOperation, setNewRuleCrudOperation] = useState<RuleCrudOperation | ''>('');
  const [newRuleConsequence, setNewRuleConsequence] = useState('');
  const [newRuleSeverity, setNewRuleSeverity] = useState<RuleSeverity>('critical');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editRuleConditional, setEditRuleConditional] = useState<RuleConditional>('if');
  const [editRuleCondition, setEditRuleCondition] = useState('');
  const [editRuleLogicalOperator, setEditRuleLogicalOperator] = useState<RuleLogicalOperator>('none');
  const [editRuleSecondaryCondition, setEditRuleSecondaryCondition] = useState('');
  const [editRuleCrudOperation, setEditRuleCrudOperation] = useState<RuleCrudOperation | ''>('');
  const [editRuleConsequence, setEditRuleConsequence] = useState('');
  const [editRuleSeverity, setEditRuleSeverity] = useState<RuleSeverity>('critical');

  // Formulário Novo Cálculo
  const [isAddingCalc, setIsAddingCalc] = useState(false);
  const [newCalcName, setNewCalcName] = useState('');
  const [newCalcFormula, setNewCalcFormula] = useState('');
  const [newCalcExample, setNewCalcExample] = useState('');
  const [newCalcVariables, setNewCalcVariables] = useState<CalculationVariable[]>([]);
  const [editingCalcId, setEditingCalcId] = useState<string | null>(null);
  const [editCalcName, setEditCalcName] = useState('');
  const [editCalcFormula, setEditCalcFormula] = useState('');
  const [editCalcExample, setEditCalcExample] = useState('');
  const [editCalcDescription, setEditCalcDescription] = useState('');
  const [editCalcVariables, setEditCalcVariables] = useState<CalculationVariable[]>([]);
  const [expandedCalculationIds, setExpandedCalculationIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (node) {
      setEditTitle(node.title);
      setEditDescription(node.content.description);
      setEditingRuleId(null);
      setEditingCalcId(null);
    }
  }, [node]);

  const rules = node?.content.rules || [];

  const filteredRules = useMemo(() => {
    if (ruleSeverityFilter === 'all') return rules;
    return rules.filter(r => r.severity === ruleSeverityFilter);
  }, [rules, ruleSeverityFilter]);

  if (!node) return null;

  const color = node.color || '#6366F1';
  const parentModule = project.nodes.find(n => n.id === node.parentId);

  const relatedConnections = project.connections.filter(
    c => c.fromId === node.id || c.toId === node.id
  );

  const criticalRulesCount = rules.filter(r => r.severity === 'critical').length;
  const warningRulesCount = rules.filter(r => r.severity === 'warning').length;

  const conditionalLabels: Record<RuleConditional, string> = {
    if: 'SE',
    when: 'QUANDO',
    unless: 'A MENOS QUE',
    while: 'ENQUANTO',
    before: 'ANTES DE',
    after: 'APÓS',
  };

  const logicalOperatorLabels: Record<RuleLogicalOperator, string> = {
    none: 'Sem operador',
    and: 'E (AND)',
    or: 'OU (OR)',
    not: 'NÃO (NOT)',
  };

  const crudOperationLabels: Record<RuleCrudOperation, string> = {
    create: 'CRIAR',
    read: 'LER',
    update: 'ATUALIZAR',
    delete: 'EXCLUIR',
  };

  const handleSaveInfo = () => {
    updateNodeInfo(node.id, editTitle, editDescription);
  };

  const handleAddRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleCondition.trim() || !newRuleConsequence.trim()) return;

    addRule(node.id, {
      conditional: newRuleConditional,
      condition: newRuleCondition.trim(),
      logicalOperator: newRuleLogicalOperator,
      secondaryCondition:
        newRuleLogicalOperator === 'and' || newRuleLogicalOperator === 'or'
          ? newRuleSecondaryCondition.trim()
          : undefined,
      crudOperation: newRuleCrudOperation || undefined,
      consequence: newRuleConsequence.trim(),
      severity: newRuleSeverity,
    });

    setNewRuleConditional('if');
    setNewRuleCondition('');
    setNewRuleLogicalOperator('none');
    setNewRuleSecondaryCondition('');
    setNewRuleCrudOperation('');
    setNewRuleConsequence('');
    setIsAddingRule(false);
  };

  const handleAddCalcSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCalcName.trim() || !newCalcFormula.trim()) return;
    const variables = newCalcVariables
      .filter((variable) => variable.symbol.trim() && variable.name.trim())
      .map((variable) => ({
        symbol: variable.symbol.trim(),
        name: variable.name.trim(),
        unit: variable.unit?.trim() || undefined,
        source: variable.source?.trim() || undefined,
      }));

    addCalculation(node.id, {
      name: newCalcName.trim(),
      formula: newCalcFormula.trim(),
      variables,
      example: newCalcExample.trim(),
    });

    setNewCalcName('');
    setNewCalcFormula('');
    setNewCalcExample('');
    setNewCalcVariables([]);
    setIsAddingCalc(false);
  };

  const addNewCalcVariable = () => {
    setNewCalcVariables((variables) => [
      ...variables,
      { symbol: '', name: '', unit: '', source: '' },
    ]);
  };

  const updateNewCalcVariable = (
    index: number,
    field: keyof CalculationVariable,
    value: string
  ) => {
    setNewCalcVariables((variables) =>
      variables.map((variable, variableIndex) =>
        variableIndex === index ? { ...variable, [field]: value } : variable
      )
    );
  };

  const removeNewCalcVariable = (index: number) => {
    setNewCalcVariables((variables) =>
      variables.filter((_, variableIndex) => variableIndex !== index)
    );
  };

  const startEditingRule = (rule: Rule) => {
    setEditingRuleId(rule.id);
    setEditRuleConditional(rule.conditional || 'if');
    setEditRuleCondition(rule.condition);
    setEditRuleLogicalOperator(rule.logicalOperator || 'none');
    setEditRuleSecondaryCondition(rule.secondaryCondition || '');
    setEditRuleCrudOperation(rule.crudOperation || '');
    setEditRuleConsequence(rule.consequence);
    setEditRuleSeverity(rule.severity);
  };

  const handleUpdateRule = (ruleId: string) => {
    if (!editRuleCondition.trim() || !editRuleConsequence.trim()) return;
    updateRule(node.id, ruleId, {
      conditional: editRuleConditional,
      condition: editRuleCondition.trim(),
      logicalOperator: editRuleLogicalOperator,
      secondaryCondition:
        editRuleLogicalOperator === 'and' || editRuleLogicalOperator === 'or'
          ? editRuleSecondaryCondition.trim()
          : undefined,
      crudOperation: editRuleCrudOperation || undefined,
      consequence: editRuleConsequence.trim(),
      severity: editRuleSeverity,
    });
    setEditingRuleId(null);
  };

  const startEditingCalculation = (calc: typeof node.content.calculations[number]) => {
    setEditingCalcId(calc.id);
    setEditCalcName(calc.name);
    setEditCalcFormula(calc.formula);
    setEditCalcExample(calc.example || '');
    setEditCalcDescription(calc.description || '');
    setEditCalcVariables(calc.variables.map((variable) => ({ ...variable })));
  };

  const handleUpdateCalculation = (calcId: string) => {
    if (!editCalcName.trim() || !editCalcFormula.trim()) return;
    const variables = editCalcVariables
      .filter((variable) => variable.symbol.trim() && variable.name.trim())
      .map((variable) => ({
        symbol: variable.symbol.trim(),
        name: variable.name.trim(),
        unit: variable.unit?.trim() || undefined,
        source: variable.source?.trim() || undefined,
      }));
    updateCalculation(node.id, calcId, {
      name: editCalcName.trim(),
      description: editCalcDescription.trim(),
      formula: editCalcFormula.trim(),
      variables,
      example: editCalcExample.trim(),
    });
    setEditingCalcId(null);
  };

  const addEditCalcVariable = () => {
    setEditCalcVariables((variables) => [
      ...variables,
      { symbol: '', name: '', unit: '', source: '' },
    ]);
  };

  const updateEditCalcVariable = (
    index: number,
    field: keyof CalculationVariable,
    value: string
  ) => {
    setEditCalcVariables((variables) =>
      variables.map((variable, variableIndex) =>
        variableIndex === index ? { ...variable, [field]: value } : variable
      )
    );
  };

  const removeEditCalcVariable = (index: number) => {
    setEditCalcVariables((variables) =>
      variables.filter((_, variableIndex) => variableIndex !== index)
    );
  };

  const toggleCalculation = (calcId: string) => {
    setExpandedCalculationIds((expandedIds) => {
      const next = new Set(expandedIds);
      if (next.has(calcId)) {
        next.delete(calcId);
      } else {
        next.add(calcId);
      }
      return next;
    });
  };

  const handleDeleteNode = () => {
    showDialog({
      title: node.type === 'module' ? 'Excluir módulo' : 'Excluir funcionalidade',
      message: node.type === 'module'
        ? `Tem certeza que deseja excluir "${node.title}" e suas funcionalidades?`
        : `Tem certeza que deseja excluir "${node.title}" e suas conexões?`,
      confirmLabel: 'Excluir',
      onConfirm: () => {
        deleteNode(node.id);
        onClose();
      },
    });
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[490px] bg-white border-l border-slate-200/90 shadow-2xl z-40 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Top Header */}
      <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
        <div className="flex items-start space-x-3.5 pr-4 flex-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
            style={{ backgroundColor: color }}
          >
            <Layers className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              {parentModule ? parentModule.title.replace('Módulo: ', '') : 'Componente'}
            </span>

            {mode === 'editor' ? (
              <div className="mt-1">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={handleSaveInfo}
                  className="w-full text-base font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            ) : (
              <h2 className="text-lg font-bold text-slate-900 leading-snug">
                {node.title}
              </h2>
            )}

            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {node.tags.map(tag => (
                <span 
                  key={tag} 
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1"
                >
                  <Tag className="w-2.5 h-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Descrição do Componente */}
      <div className="px-6 py-4 bg-white border-b border-slate-100 text-xs text-slate-600 leading-relaxed">
        <div className="flex items-center justify-between mb-1">
          <span className="flex items-center gap-1 font-bold text-slate-400 text-[10px] uppercase tracking-wider">
            <FileText className="w-3 h-3" />
            O que este componente faz
          </span>
          {mode === 'editor' && (
            <button
              onClick={handleSaveInfo}
              className="text-[10px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <Save className="w-3 h-3" />
              Salvar
            </button>
          )}
        </div>

        {mode === 'editor' ? (
          <textarea
            rows={2}
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            onBlur={handleSaveInfo}
            className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        ) : (
          node.content.description
        )}
      </div>

      {/* Navegação por Abas */}
      <div className="px-6 border-b border-slate-200 flex items-center gap-6 bg-slate-50/60 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('rules')}
          className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'rules'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          Regras ({node.content.rules.length})
        </button>

        <button
          onClick={() => setActiveTab('calculations')}
          className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'calculations'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calculator className="w-3.5 h-3.5 text-emerald-600" />
          Cálculos ({node.content.calculations.length})
        </button>

        <button
          onClick={() => setActiveTab('connections')}
          className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'connections'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
          Fluxo ({relatedConnections.length})
        </button>
      </div>

      {/* Conteúdo da Aba */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* ABA: REGRAS DE NEGÓCIO */}
        {activeTab === 'rules' && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1">
                  <SlidersHorizontal className="w-3 h-3" />
                  Filtrar:
                </span>
                <button
                  onClick={() => setRuleSeverityFilter('all')}
                  className={`text-[11px] px-2 py-0.5 rounded-md font-semibold transition-all ${
                    ruleSeverityFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todas ({node.content.rules.length})
                </button>
                {criticalRulesCount > 0 && (
                  <button
                    onClick={() => setRuleSeverityFilter('critical')}
                    className={`text-[11px] px-2 py-0.5 rounded-md font-semibold transition-all flex items-center gap-1 ${
                      ruleSeverityFilter === 'critical'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    🔴 ({criticalRulesCount})
                  </button>
                )}
                {warningRulesCount > 0 && (
                  <button
                    onClick={() => setRuleSeverityFilter('warning')}
                    className={`text-[11px] px-2 py-0.5 rounded-md font-semibold transition-all flex items-center gap-1 ${
                      ruleSeverityFilter === 'warning'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                    }`}
                  >
                    🟡 ({warningRulesCount})
                  </button>
                )}
              </div>

              {mode === 'editor' && (
                <button
                  onClick={() => setIsAddingRule(!isAddingRule)}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 bg-brand-50 px-2 py-1 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova Regra
                </button>
              )}
            </div>

            {/* Formulário Inline Nova Regra (Modo Editor) */}
            {mode === 'editor' && isAddingRule && (
              <form onSubmit={handleAddRuleSubmit} className="p-3.5 bg-slate-50 border border-brand-200 rounded-xl space-y-2.5">
                <span className="text-xs font-bold text-slate-800 block">Adicionar Regra</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Condicional</label>
                    <select
                      value={newRuleConditional}
                      onChange={(event) => setNewRuleConditional(event.target.value as RuleConditional)}
                      className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1.5"
                    >
                      {(Object.keys(conditionalLabels) as RuleConditional[]).map((value) => (
                        <option key={value} value={value}>{conditionalLabels[value]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Operador lógico</label>
                    <select
                      value={newRuleLogicalOperator}
                      onChange={(event) => setNewRuleLogicalOperator(event.target.value as RuleLogicalOperator)}
                      className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1.5"
                    >
                      {(Object.keys(logicalOperatorLabels) as RuleLogicalOperator[]).map((value) => (
                        <option key={value} value={value}>{logicalOperatorLabels[value]}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">
                    {newRuleLogicalOperator === 'not' ? 'Condição a negar (NOT)' : 'Primeira condição'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Usuário sem permissão de gestor"
                    value={newRuleCondition}
                    onChange={(e) => setNewRuleCondition(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                {(newRuleLogicalOperator === 'and' || newRuleLogicalOperator === 'or') && (
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">
                      Segunda condição ({newRuleLogicalOperator === 'and' ? 'AND' : 'OR'})
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Registro já estiver vinculado"
                      value={newRuleSecondaryCondition}
                      onChange={(event) => setNewRuleSecondaryCondition(event.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Operação CRUD</label>
                  <select
                    value={newRuleCrudOperation}
                    onChange={(event) => setNewRuleCrudOperation(event.target.value as RuleCrudOperation | '')}
                    className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1.5"
                  >
                    <option value="">Sem operação específica</option>
                    {(Object.keys(crudOperationLabels) as RuleCrudOperation[]).map((value) => (
                      <option key={value} value={value}>{crudOperationLabels[value]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Comportamento (ENTÃO)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Bloquear alteração e exibir alerta"
                    value={newRuleConsequence}
                    onChange={(e) => setNewRuleConsequence(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <select
                    value={newRuleSeverity}
                    onChange={(e) => setNewRuleSeverity(e.target.value as RuleSeverity)}
                    className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1"
                  >
                    <option value="critical">🔴 Bloqueio Estrito</option>
                    <option value="warning">🟡 Alerta / Validação</option>
                  </select>

                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsAddingRule(false)}
                      className="text-xs px-2.5 py-1 rounded text-slate-500 hover:bg-slate-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="text-xs font-bold px-3 py-1 rounded bg-brand-600 text-white hover:bg-brand-700"
                    >
                      Salvar Regra
                    </button>
                  </div>
                </div>
              </form>
            )}

            {filteredRules.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Nenhuma regra cadastrada.</p>
            ) : (
              filteredRules.map(rule => {
                const isCritical = rule.severity === 'critical';
                if (editingRuleId === rule.id && mode === 'editor') {
                  return (
                    <form
                      key={rule.id}
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleUpdateRule(rule.id);
                      }}
                      className="p-3.5 rounded-xl border border-brand-200 bg-brand-50/40 space-y-2.5"
                    >
                      <span className="text-xs font-bold text-slate-800">Editar Regra</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Condicional</label>
                            <select
                              value={editRuleConditional}
                              onChange={(event) => setEditRuleConditional(event.target.value as RuleConditional)}
                              className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1.5"
                            >
                              {(Object.keys(conditionalLabels) as RuleConditional[]).map((value) => (
                                <option key={value} value={value}>{conditionalLabels[value]}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Operador lógico</label>
                            <select
                              value={editRuleLogicalOperator}
                              onChange={(event) => setEditRuleLogicalOperator(event.target.value as RuleLogicalOperator)}
                              className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1.5"
                            >
                              {(Object.keys(logicalOperatorLabels) as RuleLogicalOperator[]).map((value) => (
                                <option key={value} value={value}>{logicalOperatorLabels[value]}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      <div>
                          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">
                            {editRuleLogicalOperator === 'not' ? 'Condição a negar (NOT)' : 'Primeira condição'}
                          </label>
                        <input
                          type="text"
                          required
                          value={editRuleCondition}
                          onChange={(event) => setEditRuleCondition(event.target.value)}
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                        {(editRuleLogicalOperator === 'and' || editRuleLogicalOperator === 'or') && (
                          <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">
                              Segunda condição ({editRuleLogicalOperator === 'and' ? 'AND' : 'OR'})
                            </label>
                            <input
                              type="text"
                              required
                              value={editRuleSecondaryCondition}
                              onChange={(event) => setEditRuleSecondaryCondition(event.target.value)}
                              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                          </div>
                        )}
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Operação CRUD</label>
                          <select
                            value={editRuleCrudOperation}
                            onChange={(event) => setEditRuleCrudOperation(event.target.value as RuleCrudOperation | '')}
                            className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1.5"
                          >
                            <option value="">Sem operação específica</option>
                            {(Object.keys(crudOperationLabels) as RuleCrudOperation[]).map((value) => (
                              <option key={value} value={value}>{crudOperationLabels[value]}</option>
                            ))}
                          </select>
                        </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Comportamento (ENTÃO)</label>
                        <input
                          type="text"
                          required
                          value={editRuleConsequence}
                          onChange={(event) => setEditRuleConsequence(event.target.value)}
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <select
                          value={editRuleSeverity}
                          onChange={(event) => setEditRuleSeverity(event.target.value as RuleSeverity)}
                          className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1"
                        >
                          <option value="critical">🔴 Bloqueio Estrito</option>
                          <option value="warning">🟡 Alerta / Validação</option>
                        </select>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingRuleId(null)}
                            className="text-xs px-2.5 py-1 rounded text-slate-500 hover:bg-slate-200"
                          >
                            Cancelar
                          </button>
                          <button type="submit" className="text-xs font-bold px-3 py-1 rounded bg-brand-600 text-white hover:bg-brand-700">
                            Salvar
                          </button>
                        </div>
                      </div>
                    </form>
                  );
                }
                return (
                  <div
                    key={rule.id}
                    className={`p-3.5 rounded-xl border text-xs leading-relaxed relative group ${
                      isCritical
                        ? 'bg-rose-50/40 border-rose-200'
                        : 'bg-amber-50/40 border-amber-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        isCritical ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {isCritical ? '🔴 Bloqueio Estrito' : '🟡 Alerta / Validação'}
                      </span>

                      {mode === 'editor' && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => startEditingRule(rule)}
                            title="Editar regra"
                            className="text-slate-400 hover:text-brand-600 p-1"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteRule(node.id, rule.id)}
                            title="Excluir regra"
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="text-slate-700">
                      <strong className="text-slate-900">{conditionalLabels[rule.conditional || 'if']}:</strong>{' '}
                      {rule.logicalOperator === 'not' ? 'NÃO (' : ''}
                      {rule.condition}
                      {rule.logicalOperator === 'not' ? ')' : ''}
                      {(rule.logicalOperator === 'and' || rule.logicalOperator === 'or') && rule.secondaryCondition
                        ? ` ${rule.logicalOperator === 'and' ? 'E' : 'OU'} ${rule.secondaryCondition}`
                        : ''}
                    </div>
                    <div className="mt-1 font-semibold text-slate-900">
                      <strong className="text-brand-600">
                        {rule.crudOperation ? `${crudOperationLabels[rule.crudOperation]} / ` : ''}
                        Resultado:
                      </strong>{' '}
                      {rule.consequence}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ABA: CÁLCULOS */}
        {activeTab === 'calculations' && (
          <div className="space-y-5">
            {mode === 'editor' && (
              <div className="flex justify-end pb-2 border-b border-slate-100">
                <button
                  onClick={() => setIsAddingCalc(!isAddingCalc)}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 bg-brand-50 px-2.5 py-1 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Novo Cálculo
                </button>
              </div>
            )}

            {/* Formulário Novo Cálculo */}
            {mode === 'editor' && isAddingCalc && (
              <form onSubmit={handleAddCalcSubmit} className="p-3.5 bg-slate-50 border border-brand-200 rounded-xl space-y-2.5">
                <span className="text-xs font-bold text-slate-800 block">Adicionar Cálculo</span>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Nome do Cálculo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Custo com Adicional Noturno"
                    value={newCalcName}
                    onChange={(e) => setNewCalcName(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Fórmula</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Total = Horas * Taxa * 1.2"
                    value={newCalcFormula}
                    onChange={(e) => setNewCalcFormula(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Exemplo Prático</label>
                  <input
                    type="text"
                    placeholder="Ex: 40h * R$ 50 * 1.2 = R$ 2.400"
                    value={newCalcExample}
                    onChange={(e) => setNewCalcExample(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div className="border-t border-slate-200 pt-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Variáveis da Fórmula
                    </span>
                    <button
                      type="button"
                      onClick={addNewCalcVariable}
                      className="text-[11px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Adicionar variável
                    </button>
                  </div>
                  {newCalcVariables.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">
                      Nenhuma variável cadastrada. O simulador tentará detectá-las pela fórmula.
                    </p>
                  ) : (
                    newCalcVariables.map((variable, index) => (
                      <div key={index} className="grid grid-cols-[70px_1fr_70px_24px] gap-1.5 items-end">
                        <div>
                          <label className="text-[9px] font-bold uppercase text-slate-400">Símbolo</label>
                          <input
                            type="text"
                            required
                            placeholder="H"
                            value={variable.symbol}
                            onChange={(event) => updateNewCalcVariable(index, 'symbol', event.target.value)}
                            className="w-full text-xs font-mono bg-white border border-slate-200 rounded-lg px-2 py-1.5"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase text-slate-400">Nome</label>
                          <input
                            type="text"
                            required
                            placeholder="Horas trabalhadas"
                            value={variable.name}
                            onChange={(event) => updateNewCalcVariable(index, 'name', event.target.value)}
                            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase text-slate-400">Unidade</label>
                          <input
                            type="text"
                            placeholder="h"
                            value={variable.unit || ''}
                            onChange={(event) => updateNewCalcVariable(index, 'unit', event.target.value)}
                            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeNewCalcVariable(index)}
                          title="Remover variável"
                          className="w-6 h-7 mb-px rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 mx-auto" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingCalc(false)}
                    className="text-xs px-2.5 py-1 rounded text-slate-500 hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="text-xs font-bold px-3 py-1 rounded bg-brand-600 text-white hover:bg-brand-700"
                  >
                    Salvar Cálculo
                  </button>
                </div>
              </form>
            )}

            {node.content.calculations.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Nenhum cálculo cadastrado.</p>
            ) : (
              node.content.calculations.map(calc => (
                editingCalcId === calc.id && mode === 'editor' ? (
                  <form
                    key={calc.id}
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleUpdateCalculation(calc.id);
                    }}
                    className="p-4 rounded-2xl bg-brand-50/40 border border-brand-200 space-y-2.5"
                  >
                    <span className="text-xs font-bold text-slate-800 block">Editar Cálculo</span>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Nome</label>
                      <input
                        type="text"
                        required
                        value={editCalcName}
                        onChange={(event) => setEditCalcName(event.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Descrição</label>
                      <input
                        type="text"
                        value={editCalcDescription}
                        onChange={(event) => setEditCalcDescription(event.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Fórmula</label>
                      <input
                        type="text"
                        required
                        value={editCalcFormula}
                        onChange={(event) => setEditCalcFormula(event.target.value)}
                        className="w-full text-xs font-mono bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Exemplo Prático</label>
                      <input
                        type="text"
                        value={editCalcExample}
                        onChange={(event) => setEditCalcExample(event.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                    <div className="border-t border-brand-200/70 pt-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Variáveis da Fórmula
                        </span>
                        <button
                          type="button"
                          onClick={addEditCalcVariable}
                          className="text-[11px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Adicionar variável
                        </button>
                      </div>
                      {editCalcVariables.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">Nenhuma variável cadastrada.</p>
                      ) : (
                        editCalcVariables.map((variable, index) => (
                          <div key={index} className="grid grid-cols-[70px_1fr_70px_24px] gap-1.5 items-end">
                            <div>
                              <label className="text-[9px] font-bold uppercase text-slate-400">Símbolo</label>
                              <input
                                type="text"
                                required
                                value={variable.symbol}
                                onChange={(event) => updateEditCalcVariable(index, 'symbol', event.target.value)}
                                className="w-full text-xs font-mono bg-white border border-slate-200 rounded-lg px-2 py-1.5"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold uppercase text-slate-400">Nome</label>
                              <input
                                type="text"
                                required
                                value={variable.name}
                                onChange={(event) => updateEditCalcVariable(index, 'name', event.target.value)}
                                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold uppercase text-slate-400">Unidade</label>
                              <input
                                type="text"
                                value={variable.unit || ''}
                                onChange={(event) => updateEditCalcVariable(index, 'unit', event.target.value)}
                                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeEditCalcVariable(index)}
                              title="Remover variável"
                              className="w-6 h-7 mb-px rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingCalcId(null)}
                        className="text-xs px-2.5 py-1 rounded text-slate-500 hover:bg-slate-200"
                      >
                        Cancelar
                      </button>
                      <button type="submit" className="text-xs font-bold px-3 py-1 rounded bg-brand-600 text-white hover:bg-brand-700">
                        Salvar Cálculo
                      </button>
                    </div>
                  </form>
                ) : (
                <div key={calc.id} className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-4 relative group">
                  <div className={`relative flex items-center justify-between ${!expandedCalculationIds.has(calc.id) ? 'min-h-8' : 'items-start'}`}>
                    <div className={!expandedCalculationIds.has(calc.id) ? 'absolute inset-x-10 text-center' : ''}>
                      <h3 className="font-bold text-sm text-slate-900">{calc.name}</h3>
                      {calc.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{calc.description}</p>
                      )}
                    </div>
                    <div className="relative z-10 ml-auto flex items-center gap-0.5">
                      {mode === 'editor' && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => startEditingCalculation(calc)}
                          title="Editar cálculo"
                          className="text-slate-400 hover:text-brand-600 p-1"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteCalculation(node.id, calc.id)}
                          title="Excluir cálculo"
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleCalculation(calc.id)}
                        aria-expanded={expandedCalculationIds.has(calc.id)}
                        aria-label={expandedCalculationIds.has(calc.id) ? `Recolher cálculo ${calc.name}` : `Expandir cálculo ${calc.name}`}
                        title={expandedCalculationIds.has(calc.id) ? 'Recolher cálculo' : 'Expandir cálculo'}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        {expandedCalculationIds.has(calc.id)
                          ? <ChevronUp className="w-4 h-4" />
                          : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {expandedCalculationIds.has(calc.id) && (
                    <>
                      {/* Fórmula */}
                      <div className="py-2.5 px-4 bg-slate-50 border border-slate-200/80 rounded-xl shadow-xs">
                        <FormulaRenderer formula={calc.formula} />
                      </div>

                      {/* Variáveis */}
                      {calc.variables.length > 0 && (
                        <div className="text-xs text-slate-600 space-y-1">
                          <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block mb-1">
                            Variáveis da Fórmula:
                          </span>
                          {calc.variables.map(v => (
                            <div key={v.symbol} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                              <span className="font-mono font-bold text-slate-800">{v.symbol}</span>
                              <span className="text-slate-600">{v.name} {v.unit ? `(${v.unit})` : ''}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Simulador Interativo */}
                      <FormulaSimulator calculation={calc} />
                    </>
                  )}
                </div>
                )
              ))
            )}
          </div>
        )}

        {/* ABA: FLUXO E CONEXÕES */}
        {activeTab === 'connections' && (
          <div className="space-y-3">
            {relatedConnections.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Este nó não possui conexões com outros componentes.</p>
            ) : (
              relatedConnections.map(conn => {
                const isOrigin = conn.fromId === node.id;
                const otherNodeId = isOrigin ? conn.toId : conn.fromId;
                const otherNode = project.nodes.find(n => n.id === otherNodeId);

                return (
                  <div
                    key={conn.id}
                    onClick={() => onSelectOtherNode && otherNode && onSelectOtherNode(otherNode.id)}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 transition-all cursor-pointer text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        isOrigin ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {isOrigin ? '→ Aponta para' : '← Vem de'}
                      </span>

                      {mode === 'editor' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            showDialog({
                              title: 'Excluir conexão',
                              message: 'Deseja excluir esta conexão?',
                              confirmLabel: 'Excluir',
                              onConfirm: () => deleteConnection(conn.id),
                            });
                          }}
                          title="Excluir conexão"
                          className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="font-bold text-slate-900 mt-1 flex items-center justify-between">
                      <span>{otherNode?.title}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Footer Info & Ações do Modo Editor */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
        {mode === 'editor' ? (
          <button
            onClick={handleDeleteNode}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir {node.type === 'module' ? 'Módulo' : 'Funcionalidade'}
          </button>
        ) : (
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            FlowDoc
          </span>
        )}

        <button
          onClick={onClose}
          className="text-xs font-bold text-slate-700 hover:text-slate-900"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
