# Componentes de UI — Especificação

> Especificação visual e comportamental dos componentes customizados do FlowDoc.

---

## Componentes do Canvas

### 1. ModuleNode — Nó Módulo

Representa um agrupador de funcionalidades. Visualmente é um container grande.

```
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
  📦  Módulo: Projetos              [−]   ← header clicável (colapsa/expande)
│                                         │
  conteúdo (nós filhos)
│                                         │
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘
```

**Propriedades visuais:**
| Propriedade | Valor |
|-------------|-------|
| Fundo | `rgba(248, 249, 252, 0.8)` com backdrop-blur |
| Borda | `2px dashed #CBD5E1` |
| Border-radius | `16px` |
| Header padding | `12px 16px` |
| Cor do ícone | `#6366F1` |
| Fonte do título | `16px`, `font-semibold`, `#1E293B` |

**Estados:**
- **Expandido (padrão):** Mostra todos os filhos
- **Colapsado:** Apenas header visível (`height: 56px`)

---

### 2. FeatureNode — Nó Funcionalidade

O componente central do FlowDoc. Representa uma funcionalidade ou processo.

#### Modo Compacto (padrão)
```
┌─────────────────────────────────────┐
│ ⚙️  Criar Projeto                [▼] │
│    #formulário  #criação            │
└─────────────────────────────────────┘
  Width: 240px | Height: 72px
```

#### Modo Expandido (após double-click)
```
┌─────────────────────────────────────┐
│ ⚙️  Criar Projeto                [▲] │
├─────────────────────────────────────┤
│ 📋 Descrição                        │
│ Permite criar novo projeto...       │
├─────────────────────────────────────┤
│ 📏 Regras (2)                       │
│ 🔴 Nome único por usuário           │
│ 🔴 Prazo > Data de início           │
├─────────────────────────────────────┤
│ 🧮 Cálculos (1)                     │
│ Custo Total: C = H × V             │
├─────────────────────────────────────┤
│ 📥 Entrada    │  📤 Saída           │
│ nome          │  projeto_id         │
│ data_prazo    │  ProjetoDTO         │
└─────────────────────────────────────┘
  Width: 300px | Height: dinâmica
```

**Propriedades visuais:**
| Estado | Borda | Sombra |
|--------|-------|--------|
| Padrão | `2px solid #E2E8F0` | `sm` |
| Hover | `2px solid #A5B4FC` | `md` |
| Selecionado | `2px solid #6366F1` | `lg` |
| Expandido | `2px solid #6366F1` | `xl` |

**Propriedades por seção interna:**

| Seção | Ícone | Cor header | Exibição |
|-------|-------|-----------|---------|
| Descrição | 📋 | `#F1F5F9` | Sempre (se preenchida) |
| Regras | 📏 | `#FEF2F2` | Colapsado — clique para expandir |
| Cálculos | 🧮 | `#F0FDF4` | Colapsado — clique para expandir |
| Entradas | 📥 | `#F8FAFC` | Tabela simples |
| Saídas | 📤 | `#F8FAFC` | Tabela simples |
| Notas | 💬 | `#FFFBEB` | Se existir alguma |

---

### 3. RuleTag — Tag de Regra (dentro de FeatureNode)

```
🔴 SE [condição] → ENTÃO [consequência]
🟡 SE [condição] → ENTÃO [consequência]
ℹ️ [informação]
```

**Cores por severidade:**
| Severidade | Cor da borda | Ícone | Background |
|-----------|-------------|-------|-----------|
| `critical` | `#FCA5A5` | 🔴 | `#FEF2F2` |
| `warning` | `#FCD34D` | 🟡 | `#FFFBEB` |
| `info` | `#93C5FD` | ℹ️ | `#EFF6FF` |

---

### 4. CalculationCard — Card de Cálculo (dentro de FeatureNode)

```
┌───────────────────────────────┐
│ 🧮 Custo do Staff no Projeto  │
│                               │
│         C = H × V            │  ← fórmula renderizada
│                               │
│ H = Horas atribuídas (h)      │
│ V = Valor/hora (R$/h)         │
│ C = Custo total (R$)          │
│                               │
│ Ex: 80h × R$50/h = R$4.000   │
└───────────────────────────────┘
```

---

### 5. CustomEdge — Conexão Customizada

**Tipos visuais:**

| Tipo | Estilo da linha | Animação | Cor |
|------|----------------|---------|-----|
| `sync` | Sólida | Nenhuma | `#64748B` |
| `async` | Tracejada (`5,5`) | Fluxo animado | `#94A3B8` |
| `batch` | Dupla | Nenhuma | `#6366F1` |
| `optional` | Pontilhada (`2,4`) | Nenhuma | `#CBD5E1` |

**Rótulo na aresta:**
```
─────── ProjetoDTO ────────►
         (tooltip ao hover: descrição + tipo do payload)
```

---

## Componentes de UI Geral

### Toolbar (topo do canvas)
```
[Logo] [Nome do Projeto ▾]   [Buscar /]   [Zoom: 100%] [-] [+] [Fit]   [👁 Modo Leitura]
```

### Painel Lateral (Drawer)
Abre ao selecionar um nó — versão completa do conteúdo, com edição (modo editor).

```
┌───────────────────────────────┐
│ ✕  Criar Projeto              │
│ ─────────────────────────────│
│ [Descrição] [Regras] [Calc]  │  ← abas
│ [Entradas]  [Saídas] [Notas] │
│ ─────────────────────────────│
│ Conteúdo da aba selecionada  │
└───────────────────────────────┘
```

### Busca Global
```
┌─────────────────────────────────────────┐
│ 🔍  Buscar módulo ou funcionalidade...  │
├─────────────────────────────────────────┤
│ 📦 Projetos          [Módulo]           │
│ ⚙️  Criar Projeto     [Funcionalidade]  │
│ ⚙️  Atribuir Horas    [Funcionalidade]  │
└─────────────────────────────────────────┘
```

---

## Tokens de Design (Design System)

```typescript
const tokens = {
  colors: {
    canvas: '#F8F9FC',
    surface: '#FFFFFF',
    border: {
      default: '#E2E8F0',
      hover: '#A5B4FC',
      selected: '#6366F1',
    },
    text: {
      primary: '#1E293B',
      secondary: '#64748B',
      muted: '#94A3B8',
    },
    accent: '#6366F1',    // Indigo — cor principal
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
  },
  radius: {
    node: '12px',         // FeatureNode
    module: '16px',       // ModuleNode
    tag: '6px',           // RuleTag
    card: '8px',          // CalculationCard
  },
  shadow: {
    sm:  '0 1px 3px rgba(0,0,0,0.08)',
    md:  '0 4px 12px rgba(0,0,0,0.10)',
    lg:  '0 8px 24px rgba(0,0,0,0.12)',
    xl:  '0 16px 40px rgba(0,0,0,0.15)',
  },
  animation: {
    expand: 'height 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    flyTo:  'transform 600ms cubic-bezier(0.4, 0, 0.2, 1)',
    pulse:  'box-shadow 1s ease-in-out 2',
  }
}
```
