# Entidade: Node

O `Node` representa um **componente no canvas** — pode ser um módulo (agrupador), uma funcionalidade (processo) ou uma regra (detalhe atômico). É a peça central do FlowDoc.

---

## Schema

```typescript
interface Node {
  id: string;               // UUID
  projectId: string;        // FK → Project.id
  parentId: string | null;  // FK → Node.id (null = nó raiz no canvas)

  // Identidade
  type: NodeType;           // "module" | "feature" | "rule"
  title: string;            // Nome exibido no canvas
  icon?: string;            // Emoji ou nome de ícone (ex: "📦", "settings")
  color?: string;           // Cor de destaque da borda (hex)
  tags: string[];           // Tags para classificação e busca

  // Posição no canvas (relativa ao pai, ou absoluta se raiz)
  position: {
    x: number;
    y: number;
  };

  // Dimensões (calculadas/manuais)
  size: {
    width: number;
    height: number;         // Altura no modo compacto; expande dinamicamente
  };

  // Estado de UI
  expanded: boolean;        // true = exibe o Content expandido
  locked: boolean;          // true = não pode ser movido (modo leitura)
  visible: boolean;         // false = oculto (útil para filtros)
  zIndex: number;           // Ordem de sobreposição

  // Conteúdo rico
  content: Content;         // Regras, cálculos, I/O, notas

  // Metadados
  createdAt: string;
  updatedAt: string;
  order: number;            // Ordem de exibição entre irmãos (mesmo pai)
}

type NodeType = "module" | "feature" | "rule";
```

---

## Tipos de Nó em Detalhe

### `module` — Módulo
- Representa uma área funcional grande do sistema.
- Visualmente: retângulo grande com borda tracejada, fundo semitransparente.
- Contém filhos (`feature` ou outros `module`s) no mesmo canvas.
- Exemplo: *Projetos*, *Staffs*, *Horas de Trabalho*

```
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
  📦 Módulo: Projetos     [−/+]
│                                  │
  ┌──────────┐    ┌─────────────┐
│ │ Feature  │───►│  Feature    │  │
  └──────────┘    └─────────────┘
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘
```

### `feature` — Funcionalidade
- Representa um processo, ação ou fluxo dentro de um módulo.
- Visualmente: cartão com cantos arredondados, expandível ao clique.
- Pode conter filhos (`rule`s) que aparecem como lista dentro do card expandido.
- Exemplo: *Criar Projeto*, *Atribuir Staff*, *Calcular Custo Total*

```
┌────────────────────────────┐
│ ⚙️ Criar Projeto   [▼]     │  ← compacto
└────────────────────────────┘

┌────────────────────────────┐
│ ⚙️ Criar Projeto   [▲]     │  ← expandido
│────────────────────────────│
│ Descrição...               │
│ Regras / Cálculos / I/O    │
└────────────────────────────┘
```

### `rule` — Regra / Detalhe
- Representa uma regra, cálculo ou detalhe atômico.
- Visualmente: badge/tag colorido, ou linha dentro do card pai.
- Não contém filhos.
- Exemplo: *"Se prazo < 7 dias → urgente"*, *"Custo = Horas × Valor/h"*

---

## Regras de Negócio

| # | Regra |
|---|-------|
| 1 | `title` é obrigatório (mínimo 2, máximo 80 caracteres) |
| 2 | Nós `rule` não podem ter filhos |
| 3 | Nós `module` não podem ter `parentId` apontando para uma `feature` |
| 4 | `expanded` inicia como `false` (compacto por padrão) |
| 5 | A posição `(x, y)` é relativa ao nó pai (se houver) ou absoluta no canvas |
| 6 | `order` define a ordenação quando múltiplos nós têm o mesmo pai |
| 7 | Ao mover um `module`, todos os filhos se movem junto (posições relativas preservadas) |
| 8 | Um nó pode ter no máximo 3 níveis de profundidade: `module → feature → rule` |

---

## Exemplo de Instância (feature)

```json
{
  "id": "node_xyz789",
  "projectId": "proj_abc123",
  "parentId": "node_module_projects",
  "type": "feature",
  "title": "Criar Projeto",
  "icon": "📋",
  "color": "#6366F1",
  "tags": ["criação", "formulário"],
  "position": { "x": 120, "y": 80 },
  "size": { "width": 240, "height": 56 },
  "expanded": false,
  "locked": false,
  "visible": true,
  "zIndex": 10,
  "content": {
    "description": "Permite criar um novo projeto com nome, prazo e orçamento.",
    "rules": [],
    "calculations": [],
    "inputs": [],
    "outputs": []
  },
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z",
  "order": 1
}
```

---

## Operações

| Operação | Descrição |
|----------|-----------|
| `addNode(projectId, node)` | Adiciona nó ao projeto |
| `updateNode(id, patch)` | Atualiza campos do nó |
| `moveNode(id, position)` | Move nó (e filhos se for module) |
| `deleteNode(id)` | Remove nó e todos os seus filhos e conexões |
| `toggleExpand(id)` | Alterna `expanded` entre true/false |
| `nestNode(id, parentId)` | Move nó para dentro de outro (muda parentId) |
| `unnestNode(id)` | Move nó para o canvas raiz (parentId = null) |
| `reorderNodes(parentId, orderedIds)` | Reordena filhos de um nó |
