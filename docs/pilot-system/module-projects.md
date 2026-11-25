# Módulo: Projetos

> Responsável pelo ciclo de vida completo de um projeto: criação, acompanhamento e encerramento.

---

## Funcionalidades

```
[Criar Projeto] ──► [Listar Projetos] ──► [Detalhar Projeto] ──► [Editar Projeto]
                                                                        │
                                                              [Encerrar Projeto]
```

---

## 1. Criar Projeto

**Descrição:** Permite ao gestor criar um novo projeto com as informações básicas.

### Entradas
| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| `nome` | string | ✅ | 3–120 caracteres |
| `descricao` | string | ❌ | máx. 500 caracteres |
| `data_inicio` | Date | ✅ | ≥ data atual |
| `data_prazo` | Date | ✅ | > data_inicio |
| `orcamento` | number | ❌ | ≥ 0, em R$ |
| `status` | enum | ✅ | padrão: `"ativo"` |

### Saídas
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `projeto_id` | UUID | ID do projeto criado |
| `ProjetoDTO` | object | Objeto completo do projeto |

### Regras
| # | Condição | Consequência | Severidade |
|---|----------|-------------|-----------|
| 1 | `nome` já existe para o mesmo usuário | Bloquear e exibir "Nome de projeto já utilizado" | 🔴 Critical |
| 2 | `data_prazo` ≤ `data_inicio` | Bloquear e exibir "O prazo deve ser após a data de início" | 🔴 Critical |
| 3 | `orcamento` não informado | Projeto criado com orçamento indefinido (`null`) | ℹ️ Info |

---

## 2. Listar Projetos

**Descrição:** Exibe todos os projetos do usuário com filtros e ordenação.

### Entradas (Filtros)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `status` | enum | `"ativo"`, `"encerrado"`, `"todos"` |
| `busca` | string | Busca por nome (parcial, case-insensitive) |
| `ordenacao` | enum | `"nome"`, `"data_prazo"`, `"custo_total"` |
| `pagina` | number | Paginação (padrão: 1) |

### Saídas
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `projetos` | ProjetoDTO[] | Lista de projetos com custo total calculado |
| `total` | number | Total de registros (para paginação) |

### Cálculos
> **Custo Total do Projeto:**
> $$C_{total} = \sum_{i=1}^{n} H_i \times V_i$$
> Onde `H_i` = horas do staff i, `V_i` = valor/hora do staff i.

---

## 3. Detalhar Projeto

**Descrição:** Exibe todas as informações de um projeto, incluindo staffs atribuídos, horas e custos.

### Entradas
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `projeto_id` | UUID | ID do projeto |

### Saídas
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `projeto` | ProjetoDTO | Dados do projeto |
| `atribuicoes` | AtribuicaoDTO[] | Staffs atribuídos com horas e custo |
| `custo_total` | number | Soma de todos os custos de atribuição |
| `percentual_orcamento` | number | `custo_total / orcamento × 100` |

### Cálculos
> **Percentual do Orçamento Consumido:**
> $$P = \frac{C_{total}}{O} \times 100$$
> Onde `C_total` = custo total das atribuições, `O` = orçamento do projeto.

### Regras
| # | Condição | Consequência | Severidade |
|---|----------|-------------|-----------|
| 1 | `custo_total > orcamento` | Exibir badge vermelho "Orçamento excedido" | 🔴 Critical |
| 2 | `custo_total > 80% do orcamento` | Exibir badge amarelo "Atenção: 80% do orçamento consumido" | 🟡 Warning |
| 3 | `orcamento` é `null` | Não exibir percentual, apenas custo total | ℹ️ Info |

---

## 4. Editar Projeto

**Descrição:** Permite alterar os dados de um projeto ativo.

### Regras
| # | Condição | Consequência | Severidade |
|---|----------|-------------|-----------|
| 1 | Projeto com status `"encerrado"` | Bloquear edição | 🔴 Critical |
| 2 | `data_prazo` alterada para data passada | Exibir aviso, mas permitir com confirmação | 🟡 Warning |

---

## 5. Encerrar Projeto

**Descrição:** Muda o status do projeto para `"encerrado"`. Ação irreversível pela UI.

### Regras
| # | Condição | Consequência | Severidade |
|---|----------|-------------|-----------|
| 1 | Projeto encerrado | Bloqueia novas atribuições de horas | 🔴 Critical |
| 2 | Atribuições com horas em andamento | Exibir lista e pedir confirmação de encerramento | 🟡 Warning |
| 3 | Projeto já encerrado | Bloquear e ocultar botão "Encerrar" | 🔴 Critical |

---

## Modelo de Dados (ProjetoDTO)

```typescript
interface ProjetoDTO {
  id: string;
  nome: string;
  descricao?: string;
  data_inicio: string;      // ISO 8601
  data_prazo: string;       // ISO 8601
  orcamento?: number;       // R$
  status: "ativo" | "encerrado";
  custo_total: number;      // calculado em tempo real
  percentual_orcamento?: number; // se orcamento definido
  total_staffs: number;
  total_horas: number;
  criado_em: string;
  atualizado_em: string;
}
```
