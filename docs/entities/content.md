# Entidade: Content

O `Content` é o **conteúdo rico** de um `Node`. É o que aparece quando o usuário expande um componente no canvas — onde está o conhecimento real sobre o módulo ou funcionalidade.

---

## Schema

```typescript
interface Content {
  // Descrição geral (Rich Text / Markdown)
  description: string;

  // Regras de negócio
  rules: Rule[];

  // Cálculos e fórmulas
  calculations: Calculation[];

  // Dados de entrada e saída
  inputs: DataField[];
  outputs: DataField[];

  // Notas livres (observações, alertas, histórico)
  notes: Note[];
}
```

---

## Sub-tipos

### Rule — Regra de Negócio

```typescript
interface Rule {
  id: string;
  conditional?: "if" | "when" | "unless" | "while" | "before" | "after";
  condition: string;
  logicalOperator?: "none" | "and" | "or" | "not";
  secondaryCondition?: string;
  crudOperation?: "create" | "read" | "update" | "delete";
  consequence: string;  // "ENTÃO" — o resultado/ação
  severity: RuleSeverity;
  tags: string[];
}

type RuleSeverity =
  | "critical"   // Regra de bloqueio (vermelho)
  | "warning"    // Alerta / validação (amarelo)
  | "info";      // Informativo / boas práticas (azul)
```

**Exemplo:**
```json
{
  "id": "rule_001",
  "condition": "Staff possui mais de 40 horas atribuídas na semana",
  "consequence": "Exibir alerta de sobrecarga e bloquear novas atribuições",
  "severity": "critical",
  "tags": ["horas", "limite", "staff"]
}
```

---

### Calculation — Cálculo / Fórmula

```typescript
interface Calculation {
  id: string;
  name: string;           // Nome do cálculo (ex: "Custo Total do Staff")
  description?: string;   // Explicação em prosa
  formula: string;        // Fórmula em LaTeX ou notação simples
  variables: Variable[];  // Variáveis usadas na fórmula
  example?: string;       // Exemplo numérico (ex: "80h × R$ 50/h = R$ 4.000")
}

interface Variable {
  symbol: string;         // Ex: "H", "V", "C"
  name: string;           // Ex: "Horas trabalhadas", "Valor/hora", "Custo"
  unit?: string;          // Ex: "horas", "R$", "%"
  source?: string;        // De onde vem esse valor (ex: "Campo 'horas' do staff")
}
```

**Exemplo:**
```json
{
  "id": "calc_001",
  "name": "Custo do Staff no Projeto",
  "description": "Calcula o custo total de um staff com base nas horas atribuídas e seu valor/hora.",
  "formula": "C = H \\times V",
  "variables": [
    { "symbol": "C", "name": "Custo total", "unit": "R$" },
    { "symbol": "H", "name": "Horas atribuídas", "unit": "h", "source": "Atribuição de Horas" },
    { "symbol": "V", "name": "Valor por hora do staff", "unit": "R$/h", "source": "Cadastro do Staff" }
  ],
  "example": "80h × R$ 50/h = R$ 4.000,00"
}
```

---

### DataField — Campo de Entrada ou Saída

```typescript
interface DataField {
  id: string;
  name: string;           // Nome do campo
  type: string;           // Tipo de dado (ex: "string", "number", "Date", "StaffDTO")
  required: boolean;      // Campo obrigatório?
  description?: string;   // O que é esse campo?
  example?: string;       // Valor de exemplo
  validation?: string;    // Regra de validação (ex: "mínimo 1, máximo 100")
}
```

**Exemplo (input):**
```json
{
  "id": "field_001",
  "name": "nome_projeto",
  "type": "string",
  "required": true,
  "description": "Nome do projeto a ser criado",
  "example": "Website Corporativo",
  "validation": "mínimo 3, máximo 120 caracteres"
}
```

---

### Note — Nota Livre

```typescript
interface Note {
  id: string;
  text: string;           // Texto livre (suporta Markdown)
  type: NoteType;
  createdAt: string;
  author?: string;        // Nome ou ID do autor
}

type NoteType =
  | "observation"   // Observação geral (cinza)
  | "warning"       // Ponto de atenção (amarelo)
  | "tip"           // Dica de uso (verde)
  | "deprecated";   // Funcionalidade ou regra obsoleta (tachado + vermelho)
```

---

## Instância Completa de Content

```json
{
  "description": "Permite atribuir um staff a um projeto, definindo as horas de trabalho e gerando o custo calculado automaticamente.",

  "rules": [
    {
      "id": "rule_001",
      "condition": "Horas atribuídas > 40h semanais para o mesmo staff",
      "consequence": "Exibir alerta de sobrecarga. Permitir salvar com confirmação do gestor.",
      "severity": "warning",
      "tags": ["horas", "limite"]
    },
    {
      "id": "rule_002",
      "condition": "Staff não possui valor/hora cadastrado",
      "consequence": "Bloquear atribuição e exibir mensagem: 'Cadastre o valor/hora antes de atribuir'",
      "severity": "critical",
      "tags": ["validação", "staff"]
    }
  ],

  "calculations": [
    {
      "id": "calc_001",
      "name": "Custo do Staff no Projeto",
      "formula": "C = H \\times V",
      "variables": [
        { "symbol": "C", "name": "Custo total", "unit": "R$" },
        { "symbol": "H", "name": "Horas atribuídas", "unit": "h" },
        { "symbol": "V", "name": "Valor/hora", "unit": "R$/h" }
      ],
      "example": "80h × R$ 50/h = R$ 4.000,00"
    }
  ],

  "inputs": [
    { "id": "i1", "name": "projeto_id", "type": "UUID", "required": true, "description": "Projeto ao qual o staff será atribuído" },
    { "id": "i2", "name": "staff_id", "type": "UUID", "required": true, "description": "Staff a ser atribuído" },
    { "id": "i3", "name": "horas", "type": "number", "required": true, "description": "Horas a atribuir", "validation": "mínimo 1, máximo 500" }
  ],

  "outputs": [
    { "id": "o1", "name": "atribuicao_id", "type": "UUID", "required": true, "description": "ID da atribuição criada" },
    { "id": "o2", "name": "custo_calculado", "type": "number", "required": true, "description": "Custo em R$ (horas × valor/hora)" }
  ],

  "notes": [
    {
      "id": "note_001",
      "text": "O custo é recalculado automaticamente sempre que as horas ou o valor/hora do staff forem atualizados.",
      "type": "tip",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```
