# Módulo: Horas de Trabalho

> Responsável pela atribuição de horas de um staff a um projeto, pelo cálculo de custo e pela geração de relatórios.

Este é o módulo central de cálculo do sistema — onde as regras de negócio mais críticas residem.

---

## Funcionalidades

```
[Atribuir Horas] ──► [Calcular Custo] ──► [Atualizar Atribuição]
                                               │
                                       [Remover Atribuição]
                                               │
                              [Relatório de Custo por Projeto]
```

---

## 1. Atribuir Horas

**Descrição:** Registra a quantidade de horas de trabalho de um staff em um projeto, gerando automaticamente o custo calculado.

### Entradas
| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| `projeto_id` | UUID | ✅ | Projeto deve existir e estar ativo |
| `staff_id` | UUID | ✅ | Staff deve existir, estar ativo e ter valor/hora |
| `horas` | number | ✅ | > 0, máx. 500 |
| `descricao` | string | ❌ | máx. 300 caracteres — descrição do trabalho |
| `mes_referencia` | string | ✅ | Formato `"YYYY-MM"` (ex: "2024-01") |

### Saídas
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `atribuicao_id` | UUID | ID da atribuição criada |
| `custo_calculado` | number | Custo em R$ (calculado automaticamente) |
| `AtribuicaoDTO` | object | Objeto completo da atribuição |

### Cálculo Principal
> **Custo da Atribuição:**
> $$C = H \times V$$
>
> | Símbolo | Nome | Unidade | Fonte |
> |---------|------|---------|-------|
> | C | Custo da atribuição | R$ | Calculado |
> | H | Horas atribuídas | h | Campo `horas` |
> | V | Valor/hora do staff | R$/h | Cadastro do Staff |
>
> **Exemplo:** 80h × R\$ 50/h = **R\$ 4.000,00**

### Regras
| # | Condição | Consequência | Severidade |
|---|----------|-------------|-----------|
| 1 | Staff não possui `valor_hora` | Bloquear — "Cadastre o valor/hora antes de atribuir" | 🔴 Critical |
| 2 | Projeto com status `"encerrado"` | Bloquear — "Projeto encerrado não aceita novas atribuições" | 🔴 Critical |
| 3 | Staff inativo | Bloquear — "Staff inativo não pode ser atribuído" | 🔴 Critical |
| 4 | Staff já atribuído ao mesmo projeto no mesmo `mes_referencia` | Exibir aviso e perguntar se deseja **somar** ou **substituir** as horas | 🟡 Warning |
| 5 | Novas horas fazem o staff superar 200h no mês (todos projetos) | Exibir alerta de sobrecarga. Permitir com confirmação do gestor | 🟡 Warning |
| 6 | `horas > carga_horaria_semanal × 4` | Exibir aviso "Horas excedem a carga mensal do staff" | 🟡 Warning |

---

## 2. Calcular Custo (Recalcular)

**Descrição:** Recalcula o custo de uma atribuição existente. Disparado automaticamente quando `valor_hora` do staff ou `horas` são atualizados.

### Quando é disparado
- Edição de `horas` em uma atribuição existente
- Atualização do `valor_hora` no cadastro do staff (recalcula TODAS as suas atribuições ativas)

### Cálculo
> $$C_{novo} = H_{atual} \times V_{hora\,atual}$$

### Regras
| # | Condição | Consequência | Severidade |
|---|----------|-------------|-----------|
| 1 | Recalcular altera o custo do projeto acima do orçamento | Exibir alerta na tela de detalhes do projeto | 🟡 Warning |
| 2 | Atribuição com status `"suspensa"` | Não recalcular — manter o custo congelado | ℹ️ Info |

---

## 3. Atualizar Atribuição

**Descrição:** Permite alterar as horas de uma atribuição existente.

### Entradas
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| `atribuicao_id` | UUID | ✅ |
| `horas` | number | ✅ |
| `descricao` | string | ❌ |

### Regras
| # | Condição | Consequência | Severidade |
|---|----------|-------------|-----------|
| 1 | Projeto encerrado | Bloquear alteração | 🔴 Critical |
| 2 | Horas alteradas | Recalcular custo automaticamente | ℹ️ Info |

---

## 4. Remover Atribuição

**Descrição:** Remove a atribuição de um staff de um projeto.

### Regras
| # | Condição | Consequência | Severidade |
|---|----------|-------------|-----------|
| 1 | Remoção em projeto ativo | Exibir confirmação — custo do projeto será reduzido | 🟡 Warning |
| 2 | Projeto encerrado | Bloquear remoção | 🔴 Critical |

---

## 5. Relatório de Custo por Projeto

**Descrição:** Gera um resumo financeiro do projeto com todos os staffs, horas e custos.

### Entradas
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `projeto_id` | UUID | Projeto a ser relatado |
| `mes_referencia` | string | Filtro por mês (`"YYYY-MM"`) — opcional |

### Saídas / Estrutura do Relatório
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `nome_projeto` | string | Nome do projeto |
| `orcamento` | number | Orçamento definido (ou null) |
| `atribuicoes` | AtribuicaoDTO[] | Lista detalhada por staff |
| `total_horas` | number | Soma total de horas |
| `custo_total` | number | Soma de todos os custos |
| `percentual_orcamento` | number | `custo_total / orcamento × 100` |
| `status_orcamento` | enum | `"ok"`, `"alerta"`, `"excedido"` |

### Cálculos do Relatório

> **Custo Total do Projeto:**
> $$C_{total} = \sum_{i=1}^{n} H_i \times V_i$$

> **Percentual do Orçamento:**
> $$P = \frac{C_{total}}{O} \times 100$$

> **Status do Orçamento:**
>
> | Condição | Status |
> |----------|--------|
> | P ≤ 80% | `"ok"` — verde |
> | 80% < P ≤ 100% | `"alerta"` — amarelo |
> | P > 100% | `"excedido"` — vermelho |

---

## Modelo de Dados (AtribuicaoDTO)

```typescript
interface AtribuicaoDTO {
  id: string;
  projeto_id: string;
  projeto_nome: string;        // desnormalizado para exibição
  staff_id: string;
  staff_nome: string;          // desnormalizado para exibição
  staff_valor_hora: number;    // snapshot do valor/hora no momento
  horas: number;
  custo: number;               // calculado: horas × staff_valor_hora
  descricao?: string;
  mes_referencia: string;      // "YYYY-MM"
  status: "ativa" | "suspensa";
  criado_em: string;
  atualizado_em: string;
}
```

> **Nota:** `staff_valor_hora` é um **snapshot** — salva o valor/hora no momento da atribuição. O recalculo só ocorre quando o usuário editar explicitamente as horas ou quando o gestor disparar recalculo manual após atualizar o `valor_hora` do staff.
