import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { FlowNode } from '../../types';
import { useProjectStore } from '../../store/useProjectStore';
import { useAppDialog } from '../common/AppDialog';
import { 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  Calculator, 
  ArrowRight, 
  Layers,
  Sparkles,
  Trash2
} from 'lucide-react';

interface FeatureNodeData {
  node: FlowNode;
  onSelectNode?: (node: FlowNode) => void;
  isSelected?: boolean;
}

export const FeatureNode = memo(({ data }: NodeProps) => {
  const { node, onSelectNode, isSelected = false } = (data || {}) as unknown as FeatureNodeData;
  const { mode, deleteNode, updateNodeExpanded } = useProjectStore();
  const showDialog = useAppDialog();

  if (!node) return null;

  const isExpanded = node.expanded || false;
  const color = node.color || '#6366F1';
  const rulesCount = node.content.rules.length;
  const calcsCount = node.content.calculations.length;

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelectNode) {
      onSelectNode(node);
    }
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateNodeExpanded(node.id, !isExpanded);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`rounded-2xl bg-white border transition-all duration-200 cursor-pointer shadow-sm relative group ${
        isSelected
          ? 'ring-2 ring-brand-500 shadow-node-selected border-brand-500'
          : 'border-slate-200/90 hover:border-slate-300 hover:shadow-node-hover'
      }`}
      style={{
        width: isExpanded ? '340px' : '320px',
      }}
    >
      {/* Handles de Conexão com hit-area generosa para facilitar arrastar e soltar */}
      {/* Top: Entrada de fluxo vertical */}
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        isConnectable={true}
        className="!w-4 !h-4 !-top-2 !bg-white !border-2 !border-slate-400 hover:!border-brand-600 hover:!scale-125 transition-all !cursor-crosshair z-30"
      />

      {/* Bottom: Saída de fluxo vertical */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        isConnectable={true}
        className="!w-4 !h-4 !-bottom-2 !bg-white !border-2 !border-slate-400 hover:!border-brand-600 hover:!scale-125 transition-all !cursor-crosshair z-30"
      />

      {/* Left: Entrada de fluxo horizontal */}
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        isConnectable={true}
        className="!w-4 !h-4 !-left-2 !bg-white !border-2 !border-slate-400 hover:!border-brand-600 hover:!scale-125 transition-all !cursor-crosshair z-30"
      />

      {/* Right: Saída de fluxo horizontal */}
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        isConnectable={true}
        className="!w-4 !h-4 !-right-2 !bg-white !border-2 !border-slate-400 hover:!border-brand-600 hover:!scale-125 transition-all !cursor-crosshair z-30"
      />

      {/* Faixa colorida superior */}
      <div 
        className="h-1.5 w-full rounded-t-2xl transition-all"
        style={{ backgroundColor: color }}
      />

      {/* Cabeçalho do Card */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center space-x-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
              style={{ backgroundColor: color }}
            >
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Funcionalidade
              </span>
              <h3 className="text-sm font-bold text-slate-800 leading-snug">
                {node.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {mode === 'editor' && (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  showDialog({
                    title: 'Excluir funcionalidade',
                    message: `Excluir a funcionalidade "${node.title}" e suas conexões?`,
                    confirmLabel: 'Excluir',
                    onConfirm: () => {
                      deleteNode(node.id).catch((error: unknown) => showDialog({ title: 'Erro ao excluir funcionalidade', message: error instanceof Error ? error.message : 'Não foi possível excluir a funcionalidade.' }));
                    },
                  });
                }}
                title="Excluir funcionalidade"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={toggleExpand}
              title={isExpanded ? 'Recolher detalhes' : 'Expandir no canvas'}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Resumo da Descrição */}
        <p className={`text-xs text-slate-500 mt-2.5 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
          {node.content.description}
        </p>

        {/* Badges de Regras e Cálculos */}
        <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100 flex-wrap">
          {rulesCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60">
              <AlertCircle className="w-3 h-3 text-amber-500" />
              {rulesCount} {rulesCount === 1 ? 'regra' : 'regras'}
            </span>
          )}

          {calcsCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <Calculator className="w-3 h-3 text-emerald-600" />
              {calcsCount} {calcsCount === 1 ? 'cálculo' : 'cálculos'}
            </span>
          )}

          <button 
            onClick={handleCardClick}
            className="ml-auto text-[11px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-0.5 transition-colors"
          >
            Ver mais
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* EXPANSÃO IN-PLACE NO CANVAS */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-dashed border-slate-200 space-y-3 animate-in fade-in duration-200">
            {/* Regras Expandidas */}
            {rulesCount > 0 && (
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
                  Regras de Negócio:
                </span>
                <div className="space-y-1.5">
                  {node.content.rules.map(rule => (
                    <div 
                      key={rule.id}
                      className={`p-2 rounded-lg text-[11px] leading-snug border ${
                        rule.severity === 'critical'
                          ? 'bg-rose-50/60 border-rose-200 text-rose-900'
                          : 'bg-amber-50/60 border-amber-200 text-amber-900'
                      }`}
                    >
                      <strong className="block text-[10px] uppercase tracking-wide">
                        {rule.severity === 'critical' ? '🔴 Bloqueio' : '🟡 Alerta'}:
                      </strong>
                      <span>
                        {({
                          if: 'SE',
                          when: 'QUANDO',
                          unless: 'A MENOS QUE',
                          while: 'ENQUANTO',
                          before: 'ANTES DE',
                          after: 'APÓS',
                        } as const)[rule.conditional || 'if']}{' '}
                        {rule.logicalOperator === 'not' ? 'NÃO (' : ''}
                        {rule.condition}
                        {rule.logicalOperator === 'not' ? ')' : ''}
                        {(rule.logicalOperator === 'and' || rule.logicalOperator === 'or') && rule.secondaryCondition
                          ? ` ${rule.logicalOperator === 'and' ? 'E' : 'OU'} ${rule.secondaryCondition}`
                          : ''}
                        {rule.crudOperation
                          ? ` → ${rule.crudOperation === 'create' ? 'CRIAR' : rule.crudOperation === 'read' ? 'LER' : rule.crudOperation === 'update' ? 'ATUALIZAR' : 'EXCLUIR'}`
                          : ' →'}
                        {' '}<strong>{rule.consequence}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fórmulas Expandidas */}
            {calcsCount > 0 && (
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
                  Cálculos:
                </span>
                <ul className="space-y-1">
                  {node.content.calculations.map(calc => (
                    <li
                      key={calc.id}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-50/60 border border-emerald-200 text-[11px] font-semibold text-emerald-900"
                    >
                      {calc.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rodapé do Card */}
      <div className="px-4 py-1.5 bg-slate-50/80 rounded-b-2xl border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-brand-500" />
          Clique para abrir painel
        </span>
        <span className="font-medium text-slate-500">ID: {node.id.split('_').slice(1).join('_')}</span>
      </div>
    </div>
  );
});

FeatureNode.displayName = 'FeatureNode';
