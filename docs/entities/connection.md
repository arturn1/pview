# Entidade: Connection

A `Connection` representa uma **aresta direcional** entre dois nós no canvas. Indica o fluxo de dados, a dependência ou a sequência entre funcionalidades.

---

## Schema

```typescript
interface Connection {
  id: string;               // UUID
  projectId: string;        // FK → Project.id

  // Origem e destino
  fromId: string;           // FK → Node.id (nó de origem)
  toId: string;             // FK → Node.id (nó de destino)

  // Semântica
  type: ConnectionType;     // Tipo visual e semântico da conexão
  label?: string;           // Rótulo exibido na linha (ex: "PedidoCriadoEvent")
  description?: string;     // Descrição detalhada (exibida em tooltip)

  // Dados trafegados (opcional, para documentação rica)
  payload?: {
    name: string;           // Nome do dado/evento/objeto
    type: string;           // Tipo (ex: "DTO", "Event", "String")
    description?: string;
  };

  // Estilo visual
  style?: {
    color?: string;         // Cor da linha (hex)
    animated?: boolean;     // Animar a linha (fluxo em movimento)
    thickness?: number;     // Espessura da linha (1-4)
  };

  // Metadados
  createdAt: string;
  updatedAt: string;
}

type ConnectionType = "sync" | "async" | "batch" | "optional";
```

---

## Tipos de Conexão

| Tipo | Valor | Visual | Cor padrão | Uso |
|------|-------|--------|-----------|-----|
| Síncrono | `sync` | Seta sólida `→` | `#64748B` | Chamada direta, sequência obrigatória |
| Assíncrono | `async` | Seta tracejada `⤍` | `#94A3B8` | Evento, mensagem, fila |
| Lote | `batch` | Seta dupla `⇒` | `#6366F1` | Processamento em lote (cron, job) |
| Opcional | `optional` | Seta cinza clara | `#CBD5E1` | Fluxo condicional, pode não ocorrer |

---

## Regras de Negócio

| # | Regra |
|---|-------|
| 1 | `fromId` e `toId` não podem ser o mesmo nó (sem auto-referência) |
| 2 | Não podem existir duas conexões com o mesmo `fromId` e `toId` (sem duplicatas) |
| 3 | Ao deletar um nó, todas as conexões com ele como origem ou destino são removidas |
| 4 | Conexões só podem existir entre nós no mesmo nível hierárquico OU do pai para filho direto |
| 5 | O `label` tem máximo de 60 caracteres |
| 6 | `style.animated` é `true` por padrão para conexões do tipo `async` |

---

## Exemplo de Instância

```json
{
  "id": "conn_001",
  "projectId": "proj_abc123",
  "fromId": "node_criar_projeto",
  "toId": "node_atribuir_staff",
  "type": "sync",
  "label": "ProjetoDTO",
  "description": "Após criar o projeto, o usuário pode atribuir staffs",
  "payload": {
    "name": "ProjetoDTO",
    "type": "DTO",
    "description": "Contém id, nome, prazo e orçamento do projeto criado"
  },
  "style": {
    "color": "#6366F1",
    "animated": false,
    "thickness": 2
  },
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

---

## Operações

| Operação | Descrição |
|----------|-----------|
| `addConnection(projectId, conn)` | Adiciona conexão entre dois nós |
| `updateConnection(id, patch)` | Atualiza rótulo, tipo ou estilo |
| `deleteConnection(id)` | Remove a conexão |
| `getConnectionsOf(nodeId)` | Retorna conexões de entrada e saída de um nó |
| `highlightPath(nodeId)` | Destaca todos os nós e conexões ligados a um nó |
