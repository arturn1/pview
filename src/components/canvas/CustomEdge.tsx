import { memo } from 'react';
import { 
  EdgeProps, 
  getBezierPath, 
  BaseEdge,
  EdgeLabelRenderer
} from '@xyflow/react';
import { FlowConnection } from '../../types';
import { useProjectStore } from '../../store/useProjectStore';
import { useAppDialog } from '../common/AppDialog';
import { X } from 'lucide-react';

interface CustomEdgeData {
  connection: FlowConnection;
}

export const CustomEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) => {
  const { mode, deleteConnection } = useProjectStore();
  const showDialog = useAppDialog();

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const connection = (data as unknown as CustomEdgeData)?.connection;
  const isAnimated = connection?.style?.animated || false;
  const strokeColor = connection?.style?.color || style.stroke || '#94A3B8';

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    showDialog({
      title: 'Excluir conexão',
      message: 'Deseja excluir esta conexão de fluxo?',
      confirmLabel: 'Excluir',
      onConfirm: () => deleteConnection(id),
    });
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth: connection?.style?.thickness || 2.5,
          strokeDasharray: isAnimated ? '6,6' : undefined,
          animation: isAnimated ? 'dashdraw 1.2s linear infinite' : undefined,
        }}
      />

      {/* Botão flutuante para excluir a conexão no Modo Editor */}
      {mode === 'editor' && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan group z-30"
          >
            <button
              onClick={handleDelete}
              title="Excluir conexão de fluxo"
              className="w-5 h-5 rounded-full bg-white border border-slate-300 text-slate-400 hover:bg-rose-600 hover:text-white hover:border-rose-600 shadow-md flex items-center justify-center transition-all hover:scale-125 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

CustomEdge.displayName = 'CustomEdge';
