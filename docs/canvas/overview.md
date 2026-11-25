# Canvas — Especificação

> O canvas é o coração do FlowDoc: um espaço infinito e navegável onde os componentes do sistema são organizados, conectados e explorados.

---

## Comportamento Geral

| Interação | Comportamento |
|-----------|---------------|
| Scroll do mouse | Zoom in/out centrado no cursor |
| Click e arrastar (canvas vazio) | Pan (mover câmera) |
| Click em nó | Seleciona e destaca conexões do nó |
| Double-click em nó | Expande/colapsa o conteúdo do nó |
| Click em conexão | Seleciona e exibe tooltip com rótulo/payload |
| Hover em nó | Preview sutil (elevação de sombra, cursor pointer) |
| Hover em conexão | Exibe tooltip com tipo e rótulo |
| Atalho `/` | Abre busca global no canvas |
| `Esc` | Deseleciona tudo |
| `Ctrl/Cmd + Z` | Undo (fase 2) |
| `Ctrl/Cmd + Y` | Redo (fase 2) |

---

## Zoom e Pan

```typescript
interface ViewportConfig {
  minZoom: number;      // 0.1 (10% — visão macro)
  maxZoom: number;      // 2.0 (200% — detalhe)
  defaultZoom: number;  // 1.0
  zoomStep: number;     // 0.1 por scroll
  panSpeed: number;     // 1.0
}
```

### Progressive Disclosure por Zoom
O conteúdo exibido nos nós muda conforme o zoom — evita poluição visual em visão macro:

| Zoom | Exibido no Nó |
|------|---------------|
| < 0.4 | Apenas nome (fonte pequena) |
| 0.4 – 0.8 | Nome + tags |
| 0.8 – 1.2 | Nome + tags + ícone de status |
| > 1.2 | Nome + tags + ícone + contagem de regras/cálculos |
| Expandido (manual) | Conteúdo completo (regras, cálculos, I/O) |

---

## Grid e Snap

```typescript
interface GridConfig {
  visible: boolean;     // padrão: true
  size: number;         // 20px
  color: string;        // "#E2E8F0" (pontinhos)
  snapEnabled: boolean; // padrão: false (modo editor)
}
```

---

## Minimap

Exibido no canto inferior direito. Permite:
- Ver a posição atual da câmera
- Clicar para navegar para uma área
- Ver todos os nós em escala reduzida

```typescript
interface MinimapConfig {
  visible: boolean;        // padrão: true
  position: "bottom-right" | "bottom-left";
  width: number;           // 200px
  height: number;          // 150px
  nodeColor: string;       // "#6366F1" para módulos
  maskColor: string;       // rgba do viewport atual
}
```

---

## Hierarquia Visual (Nesting)

Nós `module` funcionam como **grupos**: envolvem visualmente seus filhos. Ao mover um módulo, todos os filhos se movem juntos.

```
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐  ← Módulo (grupo)
   Header do módulo: ícone + nome
│                                                  │
  ┌──────────┐    ┌──────────┐    ┌──────────┐
│ │ Feature  │───►│ Feature  │───►│ Feature  │  │
  └──────────┘    └──────────┘    └──────────┘
│                                                  │
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘
       ↕ Pode ser colapsado (oculta filhos, mantém o container menor)
```

---

## Busca Global

Ativada com `/`:
- Input de texto com debounce de 200ms
- Busca em tempo real em `title`, `tags`, `content.description`, `content.rules`
- Resultados exibidos em lista dropdown
- Ao selecionar um resultado: câmera faz pan + zoom animado até o nó (`fly-to`)
- O nó selecionado fica destacado por 2 segundos (pulso de borda)

---

## Modos do Canvas

| Modo | Descrição | Quem usa |
|------|-----------|----------|
| **Leitura (Explorer)** | Apenas navegação — sem editar, sem mover nós | Equipe não-técnica |
| **Editor** | Adicionar, mover, conectar, editar nós | Autor do projeto |

> No MVP, o foco é o **Modo Leitura**. O Modo Editor é simplificado (editar conteúdo via painel lateral, posições pré-definidas).

---

## Tecnologia: React Flow

### Por que React Flow?
- Pan/zoom nativo com hooks configuráveis
- Nós e arestas 100% customizáveis (componentes React)
- Suporte a grupos/containers (parent nodes)
- MiniMap built-in
- Performance: renderização apenas dos nós visíveis (viewport culling)
- Open-source, bem mantido, grande comunidade

### Configuração Base
```typescript
import ReactFlow, { Controls, MiniMap, Background } from 'reactflow';

<ReactFlow
  nodes={nodes}
  edges={edges}
  nodeTypes={customNodeTypes}   // Nossos componentes customizados
  edgeTypes={customEdgeTypes}   // Nossas arestas customizadas
  minZoom={0.1}
  maxZoom={2.0}
  fitView                       // Ajusta câmera para ver todos os nós
  snapToGrid={false}
>
  <Background variant="dots" gap={20} color="#E2E8F0" />
  <Controls />
  <MiniMap />
</ReactFlow>
```
