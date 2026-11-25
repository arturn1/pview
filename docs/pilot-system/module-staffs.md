# Módulo: Staffs

> Responsável pelo cadastro e gestão dos colaboradores (staffs) disponíveis para atribuição em projetos.

---

## Funcionalidades

```
[Cadastrar Staff] ──► [Listar Staffs] ──► [Detalhar Staff] ──► [Editar Staff]
                                                                      │
                                                              [Desativar Staff]
```

---

## 1. Cadastrar Staff

**Descrição:** Registra um novo colaborador com seu perfil e valor/hora de trabalho.

### Entradas
| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| `nome` | string | ✅ | 3–100 caracteres |
| `email` | string | ✅ | formato e-mail válido, único no sistema |
| `cargo` | string | ❌ | máx. 80 caracteres |
| `especialidade` | string[] | ❌ | lista de tags (ex: ["Frontend", "React"]) |
| `valor_hora` | number | ✅ | > 0, em R$ |
| `carga_horaria_semanal` | number | ❌ | padrão: 40h |

### Saídas
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `staff_id` | UUID | ID do staff criado |
| `StaffDTO` | object | Objeto completo do staff |

### Regras
| # | Condição | Consequência | Severidade |
|---|----------|-------------|-----------|
| 1 | `email` já cadastrado no sistema | Bloquear e exibir "E-mail já cadastrado" | 🔴 Critical |
| 2 | `valor_hora` = 0 | Bloquear — deve ser maior que zero | 🔴 Critical |
| 3 | `cargo` não informado | Staff salvo sem cargo (exibido como "—") | ℹ️ Info |

---

## 2. Listar Staffs

**Descrição:** Exibe todos os staffs com filtros por status e especialidade.

### Entradas (Filtros)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `status` | enum | `"ativo"`, `"inativo"`, `"todos"` |
| `busca` | string | Busca por nome, e-mail ou cargo |
| `especialidade` | string | Filtra por tag de especialidade |
| `disponivel` | boolean | Se `true`, retorna apenas staffs com capacidade de horas disponível |

### Saídas
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `staffs` | StaffDTO[] | Lista de staffs com horas alocadas no mês atual |
| `total` | number | Total de registros |

### Cálculos na Listagem
> **Horas Disponíveis no Mês:**
> $$H_{disp} = H_{max} - H_{alocadas}$$
> Onde `H_max` = `carga_horaria_semanal × 4`, `H_alocadas` = soma de horas em projetos ativos no mês.

---

## 3. Detalhar Staff

**Descrição:** Exibe o perfil completo do staff com todos os projetos ao qual está atribuído.

### Saídas
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `staff` | StaffDTO | Dados completos do staff |
| `atribuicoes` | AtribuicaoDTO[] | Projetos e horas atribuídas |
| `horas_totais_mes` | number | Total de horas alocadas no mês atual |
| `custo_gerado_mes` | number | Custo total gerado pelo staff no mês |

### Cálculos
> **Custo Gerado pelo Staff no Mês:**
> $$C_{staff} = H_{mes} \times V_{hora}$$
> Onde `H_mes` = horas alocadas no mês, `V_hora` = valor/hora atual.

### Regras
| # | Condição | Consequência | Severidade |
|---|----------|-------------|-----------|
| 1 | `horas_totais_mes > carga_horaria_semanal × 4` | Badge vermelho "Sobrecarga de horas" no perfil | 🔴 Critical |
| 2 | Staff inativo | Exibir banner "Staff inativo — atribuições suspensas" | 🟡 Warning |

---

## 4. Editar Staff

**Descrição:** Atualiza dados do staff. Alterações no `valor_hora` têm impacto direto nos custos.

### Regras
| # | Condição | Consequência | Severidade |
|---|----------|-------------|-----------|
| 1 | `valor_hora` alterado | Recalcular custo de TODAS as atribuições ativas do staff | 🔴 Critical |
| 2 | Staff inativo | Bloquear edição até reativação | 🟡 Warning |
| 3 | `email` alterado para um já existente | Bloquear e exibir "E-mail já cadastrado" | 🔴 Critical |

---

## 5. Desativar Staff

**Descrição:** Marca o staff como inativo. Suas atribuições ficam suspensas.

### Regras
| # | Condição | Consequência | Severidade |
|---|----------|-------------|-----------|
| 1 | Staff possui atribuições ativas | Exibir lista de projetos afetados e pedir confirmação | 🟡 Warning |
| 2 | Atribuições ativas existentes | Mudar status das atribuições para `"suspensa"` | 🔴 Critical |
| 3 | Staff é o único em um projeto ativo | Exibir alerta adicional "Este é o único staff do projeto X" | 🟡 Warning |

---

## Modelo de Dados (StaffDTO)

```typescript
interface StaffDTO {
  id: string;
  nome: string;
  email: string;
  cargo?: string;
  especialidade: string[];
  valor_hora: number;             // R$/h
  carga_horaria_semanal: number;  // padrão: 40h
  status: "ativo" | "inativo";
  horas_alocadas_mes: number;     // calculado
  horas_disponiveis_mes: number;  // calculado: (semanal × 4) - alocadas
  custo_gerado_mes: number;       // calculado: horas_alocadas_mes × valor_hora
  total_projetos_ativos: number;  // calculado
  criado_em: string;
  atualizado_em: string;
}
```
