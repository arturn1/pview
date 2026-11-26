import { memo } from 'react';
import { NodeProps, NodeResizer } from '@xyflow/react';
import { FlowNode } from '../../types';
import { useProjectStore } from '../../store/useProjectStore';
import { useAppDialog } from '../common/AppDialog';
import { FolderKanban, Users, Calculator, Box, Trash2 } from 'lucide-react';

interface ModuleNodeData {
  node: FlowNode;
  childCount?: number;
  onSelectNode?: (node: FlowNode) => void;
}

const getModuleIcon = (iconName?: string) => {
  switch (iconName) {
    case 'FolderKanban':
      return <FolderKanban className="w-5 h-5" />;
    case 'Users':
      return <Users className="w-5 h-5" />;
    case 'Calculator':
      return <Calculator className="w-5 h-5" />;
    default:
      return <Box className="w-5 h-5" />;
  }
};

export const ModuleNode = memo(({ id, data, selected }: NodeProps) => {
  const { node, childCount = 0, onSelectNode } = (data || {}) as unknown as ModuleNodeData;
  const { mode, updateNodeSize, deleteNode } = useProjectStore();
  const showDialog = useAppDialog();

  const width = node?.size?.width || 840;
  const height = node?.size?.height || 330;
  const color = node?.color || '#6366F1';

  return (
    <>
      {/* Redimensionador interativo no Modo Editor */}
      {mode === 'editor' && (
        <NodeResizer
          minWidth={360}
          minHeight={200}
          isVisible={selected}
          lineClassName="!border-brand-500 !border-2"
          handleClassName="!w-3.5 !h-3.5 !bg-white !border-2 !border-brand-600 !rounded-full shadow-md hover:!scale-125 transition-transform"
          onResizeEnd={(_event, params) => {
            updateNodeSize(id, { width: params.width, height: params.height });
          }}
        />
      )}

      <div
        onClick={(event) => {
          event.stopPropagation();
          if (onSelectNode) onSelectNode(node);
        }}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          borderColor: `${color}40`,
          backgroundColor: `${color}06`,
        }}
        className={`rounded-3xl border-2 border-dashed p-6 transition-all duration-150 select-none relative group ${
          selected && mode === 'editor' ? 'ring-2 ring-brand-500 ring-offset-2' : ''
        }`}
      >
        {/* Header do Módulo */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
          <div className="flex items-center space-x-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: color }}
            >
              {getModuleIcon(node?.icon)}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Módulo Agrupador
              </span>
              <h2 className="text-base font-bold text-slate-800 leading-tight">
                {node?.title.replace('Módulo: ', '')}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {childCount > 0 && (
              <span 
                className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-white shadow-xs"
                style={{ color: color, borderColor: `${color}30` }}
              >
                {childCount} {childCount === 1 ? 'funcionalidade' : 'funcionalidades'}
              </span>
            )}
            {mode === 'editor' && (
              <span className="text-[10px] text-slate-400 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                {width} × {height}px
              </span>
            )}
            {mode === 'editor' && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  showDialog({
                    title: 'Excluir módulo',
                    message: `Excluir o módulo "${node.title}"${childCount > 0 ? ` e suas ${childCount} funcionalidades` : ''}?`,
                    confirmLabel: 'Excluir',
                    onConfirm: () => {
                      deleteNode(id).catch((error: unknown) => showDialog({ title: 'Erro ao excluir módulo', message: error instanceof Error ? error.message : 'Não foi possível excluir o módulo.' }));
                    },
                  });
                }}
                title="Excluir módulo"
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Dica de redimensionamento no Modo Editor quando selecionado */}
        {mode === 'editor' && selected && (
          <div className="absolute top-3 right-3 text-[10px] bg-brand-600 text-white font-bold px-2 py-0.5 rounded-full shadow-xs animate-in fade-in">
            Arraste as bordas para redimensionar
          </div>
        )}

        {/* Descrição resumida no rodapé do container do módulo */}
        {node?.content?.description && (
          <div className="absolute bottom-4 left-6 right-6 text-xs text-slate-400 leading-relaxed italic border-t border-slate-200/40 pt-3">
            💡 {node.content.description}
          </div>
        )}
      </div>
    </>
  );
});

ModuleNode.displayName = 'ModuleNode';
