# Entidade: Project

O `Project` é o **container raiz** de um mapeamento. Representa o sistema ou subsistema que está sendo documentado no FlowDoc.

---

## Schema

```typescript
interface Project {
  id: string;               // UUID gerado automaticamente
  name: string;             // Nome exibido no canvas e na listagem
  description: string;      // Descrição curta do sistema mapeado
  version: string;          // Versão do mapeamento (ex: "1.0.0")
  thumbnail?: string;       // URL de imagem de capa (opcional)

  // Autoria
  createdAt: string;        // ISO 8601
  updatedAt: string;        // ISO 8601
  createdBy?: string;       // ID do usuário autor (fase com auth)

  // Configurações do canvas
  canvasSettings: CanvasSettings;

  // Dados
  nodes: Node[];            // Todos os nós do projeto (flat array com parentId)
  connections: Connection[]; // Todas as conexões

  // Metadados
  tags: string[];           // Tags para busca e filtragem
  isPublic: boolean;        // Compartilhável com link público (fase 3)
}
```

---

## CanvasSettings

```typescript
interface CanvasSettings {
  defaultZoom: number;         // Zoom inicial (padrão: 1.0)
  backgroundColor: string;    // Cor de fundo do canvas (padrão: "#F8F9FC")
  gridVisible: boolean;        // Exibir grid de pontos (padrão: true)
  snapToGrid: boolean;         // Encaixar nós no grid (padrão: false)
  miniMapVisible: boolean;     // Exibir minimapa (padrão: true)
  initialViewport: {
    x: number;
    y: number;
    zoom: number;
  };
}
```

---

## Regras de Negócio

| # | Regra |
|---|-------|
| 1 | `name` é obrigatório e único dentro do workspace do usuário |
| 2 | `version` segue [semver](https://semver.org/) — `MAJOR.MINOR.PATCH` |
| 3 | Um projeto deve ter pelo menos 1 nó para ser salvo |
| 4 | Ao duplicar um projeto, todos os IDs (nós e conexões) são regenerados |
| 5 | O `updatedAt` é atualizado sempre que qualquer nó ou conexão for modificado |

---

## Persistência

### Fase 1 (MVP) — JSON Local
```json
{
  "id": "proj_abc123",
  "name": "Gestor de Projetos",
  "description": "Sistema de gestão de projetos, staffs e horas trabalhadas",
  "version": "1.0.0",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z",
  "canvasSettings": {
    "defaultZoom": 1.0,
    "backgroundColor": "#F8F9FC",
    "gridVisible": true,
    "snapToGrid": false,
    "miniMapVisible": true,
    "initialViewport": { "x": 0, "y": 0, "zoom": 1 }
  },
  "nodes": [],
  "connections": [],
  "tags": ["gestao", "projetos"],
  "isPublic": false
}
```

### Fase 2 — Supabase
Tabela `projects` com os campos do schema acima. `nodes` e `connections` em tabelas separadas com FK para `project_id`.

---

## Operações

| Operação | Descrição |
|----------|-----------|
| `createProject()` | Cria projeto com configurações padrão |
| `updateProject(id, patch)` | Atualiza campos do projeto |
| `deleteProject(id)` | Remove projeto e todos seus nós/conexões |
| `duplicateProject(id)` | Clona projeto com novos IDs |
| `exportProject(id)` | Serializa para JSON para download |
| `importProject(json)` | Carrega projeto de arquivo JSON |
| `shareProject(id)` | Gera link público (fase 3) |
