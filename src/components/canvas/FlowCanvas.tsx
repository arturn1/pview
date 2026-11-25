import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Node,
  Edge,
  MarkerType,
  Connection as RFConnection,
  ConnectionLineType,
  addEdge,
} from '@xyflow/react';
import { FlowNode } from '../../types';
import { useProjectStore } from '../../store/useProjectStore';
import { ModuleNode } from './ModuleNode';
import { FeatureNode } from './FeatureNode';
import { CustomEdge } from './CustomEdge';
import { CanvasToolbar } from './CanvasToolbar';
import { NodeDetailDrawer } from './NodeDetailDrawer';

const nodeTypes = {
  module: ModuleNode,
  feature: FeatureNode,
};

const edgeTypes = {
  customEdge: CustomEdge,
};

function FlowCanvasContent() {
  const { 
    project, 
    mode, 
    selectedNodeId, 
    setSelectedNodeId,
    addConnection,
    deleteConnection,
    updateNodePosition,
    loadFromRepository 
  } = useProjectStore();

  const { fitView, setCenter } = useReactFlow();

  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string | null>(null);

  // Carrega os dados persistidos do SQLite ao iniciar
  useEffect(() => {
    loadFromRepository();
  }, [loadFromRepository]);

  // Mapeia os nós do modelo para o React Flow
  const initialNodes = useMemo<Node[]>(() => {
    const expandedFeatureZIndexes = new Map(
      project.nodes
        .filter((node) => node.type === 'feature' && node.expanded)
        .map((node, index) => [node.id, 11 + index])
    );

    return project.nodes.map(n => {
      if (n.type === 'module') {
        const childCount = project.nodes.filter(child => child.parentId === n.id).length;
        return {
          id: n.id,
          type: 'module',
          position: { x: n.position.x, y: n.position.y },
          data: {
            node: n,
            childCount,
            onSelectNode: (node: FlowNode) => setSelectedNodeId(node.id),
          },
          draggable: mode === 'editor',
          selectable: mode === 'editor',
          zIndex: n.zIndex ?? 0,
        };
      }

      return {
        id: n.id,
        type: 'feature',
        position: { x: n.position.x, y: n.position.y },
        data: {
          node: n,
          onSelectNode: (node: FlowNode) => setSelectedNodeId(node.id),
          isSelected: selectedNodeId === n.id,
        },
        draggable: mode === 'editor',
        selectable: true,
        zIndex: n.expanded
          ? Math.max(n.zIndex ?? 10, expandedFeatureZIndexes.get(n.id) ?? 11)
          : n.zIndex ?? 10,
      };
    });
  }, [project.nodes, selectedNodeId, mode, setSelectedNodeId]);

  // Mapeia conexões preservando os handles válidos existentes
  const initialEdges = useMemo<Edge[]>(() => {
    return project.connections.map(c => {
      let sourceHandle = c.sourceHandle;
      let targetHandle = c.targetHandle;

      // Fallbacks para handles existentes caso não venham definidos
      if (!sourceHandle) {
        if (c.fromId === 'feat_assign_hours' && c.toId === 'feat_calculate_cost') {
          sourceHandle = 'source-right';
        } else if (c.fromId === 'feat_calculate_cost' && c.toId === 'feat_detail_project') {
          sourceHandle = 'source-right';
        } else {
          sourceHandle = 'source-bottom';
        }
      }

      if (!targetHandle) {
        if (c.fromId === 'feat_assign_hours' && c.toId === 'feat_calculate_cost') {
          targetHandle = 'target-left';
        } else if (c.fromId === 'feat_calculate_cost' && c.toId === 'feat_detail_project') {
          targetHandle = 'target-top';
        } else {
          targetHandle = 'target-top';
        }
      }

      return {
        id: c.id,
        source: c.fromId,
        target: c.toId,
        sourceHandle,
        targetHandle,
        type: 'customEdge',
        data: {
          connection: c,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 18,
          height: 18,
          color: c.style?.color || '#6366F1',
        },
      };
    });
  }, [project.connections]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sincroniza nodes e edges com o store
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Filtragem visual dos nós quando o usuário seleciona um módulo no topo
  const displayNodes = useMemo(() => {
    if (!selectedModuleFilter) return nodes;
    return nodes.filter(n => {
      if (n.id === selectedModuleFilter) return true;
      const originalNode = project.nodes.find(orig => orig.id === n.id);
      return originalNode?.parentId === selectedModuleFilter;
    });
  }, [nodes, selectedModuleFilter, project.nodes]);

  // Conectar dois nós arrastando no canvas (Modo Editor)
  const handleConnect = useCallback(
    (params: RFConnection) => {
      if (mode !== 'editor') return;
      if (params.source && params.target && params.source !== params.target) {
        const sHandle = params.sourceHandle || 'source-bottom';
        const tHandle = params.targetHandle || 'target-top';

        addConnection(params.source, params.target, sHandle, tHandle);

        // Feedback visual imediato na tela
        setEdges((eds) =>
          addEdge(
            {
              id: `conn_${Date.now()}`,
              source: params.source,
              target: params.target,
              sourceHandle: sHandle,
              targetHandle: tHandle,
              type: 'customEdge',
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 18,
                height: 18,
                color: '#6366F1',
              },
            },
            eds
          )
        );
      }
    },
    [mode, addConnection, setEdges]
  );

  // Evento ao soltar um nó após arrastar no canvas
  const handleNodeDragStop = useCallback(
    (_event: unknown, node: Node) => {
      if (mode === 'editor') {
        updateNodePosition(node.id, { x: node.position.x, y: node.position.y });
      }
    },
    [mode, updateNodePosition]
  );

  // Evento ao excluir arestas (ex: selecionando a linha e pressionando Delete/Backspace)
  const handleEdgesDelete = useCallback(
    (edgesToDelete: Edge[]) => {
      if (mode === 'editor') {
        edgesToDelete.forEach((edge) => {
          deleteConnection(edge.id);
        });
      }
    },
    [mode, deleteConnection]
  );

  // Validador de conexão (permite conectar quaisquer nós diferentes)
  const isValidConnection = useCallback((connection: Edge | RFConnection) => {
    return connection.source !== connection.target;
  }, []);

  // Ação ao clicar em resultado da busca
  const handleSearchSelect = useCallback((node: FlowNode) => {
    setSelectedNodeId(node.id);
    setCenter(node.position.x + 160, node.position.y + 100, {
      zoom: 1.0,
      duration: 700,
    });
  }, [setCenter, setSelectedNodeId]);

  // Enquadra tudo
  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 600 });
  }, [fitView]);

  return (
    <div className="w-full h-screen relative bg-canvas overflow-hidden">
      {/* Barra de Ferramentas com Ações do SQLite e Criação */}
      <CanvasToolbar
        selectedModuleId={selectedModuleFilter}
        onFilterModule={setSelectedModuleFilter}
        onSearchSelectNode={handleSearchSelect}
        onFitView={handleFitView}
      />

      {/* Canvas React Flow */}
      <ReactFlow
        nodes={displayNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeDragStop={handleNodeDragStop}
        onEdgesDelete={handleEdgesDelete}
        edgesFocusable={mode === 'editor'}
        isValidConnection={isValidConnection}
        connectionLineType={ConnectionLineType.Bezier}
        connectionLineStyle={{ stroke: '#6366F1', strokeWidth: 3 }}
        nodesDraggable={mode === 'editor'}
        nodesConnectable={mode === 'editor'}
        minZoom={0.2}
        maxZoom={2.0}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1.5} color="#CBD5E1" />

        <Controls 
          className="!bg-white !border !border-slate-200/90 !rounded-xl !shadow-md !overflow-hidden"
          showInteractive={false}
        />

        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'module') return '#E2E8F0';
            return '#6366F1';
          }}
          maskColor="rgba(241, 245, 249, 0.7)"
          className="!bg-white !border !border-slate-200/90 !rounded-2xl !shadow-md !overflow-hidden"
          zoomable
          pannable
        />
      </ReactFlow>

      {/* Drawer Lateral de Inspeção e Edição */}
      <NodeDetailDrawer
        nodeId={selectedNodeId}
        project={project}
        onClose={() => setSelectedNodeId(null)}
        onSelectOtherNode={(otherId) => {
          setSelectedNodeId(otherId);
        }}
      />
    </div>
  );
}

export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasContent />
    </ReactFlowProvider>
  );
}
