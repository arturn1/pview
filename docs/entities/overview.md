# Entidades do FlowDoc — Visão Geral

Este documento descreve o modelo de dados central do FlowDoc: as entidades que compõem um **Projeto** na plataforma.

---

## Diagrama de Relações

```
┌─────────────────────────────────────────────────────────────┐
│                        PROJECT                              │
│  id, name, description, version, createdAt, updatedAt      │
└────────────────┬────────────────────────────────────────────┘
                 │ 1
                 │ possui muitos
                 ▼ N
┌────────────────────────────────┐     ┌──────────────────────┐
│             NODE               │     │      CONNECTION       │
│  id, type, title, parentId     │◄────│  id, fromId, toId    │
│  position, expanded, tags      │────►│  type, label         │
└────────────────┬───────────────┘     └──────────────────────┘
                 │ 1
                 │ possui
                 ▼ 1
┌────────────────────────────────┐
│            CONTENT             │
│  description                   │
│  rules[]                       │
│  calculations[]                │
│  inputs[]                      │
│  outputs[]                     │
│  notes[]                       │
└────────────────────────────────┘
```

---

## Entidades

| Entidade | Arquivo | Descrição |
|----------|---------|-----------|
| `Project` | [project.md](./project.md) | O container raiz de um mapeamento de sistema |
| `Node` | [node.md](./node.md) | Um componente no canvas (módulo ou funcionalidade) |
| `Connection` | [connection.md](./connection.md) | Aresta direcional entre dois nós |
| `Content` | [content.md](./content.md) | Conteúdo rico expandível de um nó |

---

## Regras de Hierarquia

- Um `Project` contém N `Node`s.
- Um `Node` pode ter um `parentId` apontando para outro `Node` (hierarquia de agrupamento).
- Nós sem `parentId` são raiz (ficam diretamente no canvas do projeto).
- Um `Node` do tipo `module` pode conter N `Node`s filhos (tipo `feature` ou `rule`).
- Um `Node` do tipo `feature` pode conter N `Node`s filhos (tipo `rule`).
- Nós do tipo `rule` são folha — não contêm filhos.
- `Connection`s só podem existir entre nós do mesmo nível hierárquico ou entre pai e filho direto.

---

## Tipos de Nó

| Tipo | Descrição | Pode conter filhos? |
|------|-----------|---------------------|
| `module` | Módulo principal do sistema (ex: Vendas, Faturamento) | ✅ Sim |
| `feature` | Funcionalidade ou processo dentro de um módulo | ✅ Sim |
| `rule` | Regra, cálculo ou detalhe atômico | ❌ Não |

---

## Tipos de Conexão

| Tipo | Visual | Descrição |
|------|--------|-----------|
| `sync` | Seta sólida `→` | Fluxo síncrono / sequencial |
| `async` | Seta tracejada `⤍` | Evento assíncrono |
| `batch` | Seta dupla `⇒` | Processamento em lote |
| `optional` | Seta cinza `→` | Fluxo condicional / opcional |
