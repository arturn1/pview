# FlowDoc

> Plataforma web interativa para que equipes não-técnicas conheçam, entendam e explorem sistemas complexos de forma visual e intuitiva.

FlowDoc transforma a documentação de sistemas — frequentemente espalhada em textos estáticos ou diagramas mudos — em uma **Árvore Viva de Conhecimento e Arquitetura** (*Living Architecture Map*).

> **Status atual:** Editor visual com importação/exportação JSON, regras estruturadas e simulador de cálculos.

---

## 💡 Como Funciona

- **Visualização em Árvore Hierárquica (Top-Down):** O sistema organiza as dependências de cima para baixo. O que é raiz/origem fica no topo (ex: Projetos), alimentando as ramificações intermediárias (ex: Staffs), que por sua vez abastecem as bases operacionais (ex: Cálculos de Horas & Custos).
- **Componentes Semânticos:** Cartões visuais com cantos arredondados representando funcionalidades reais.
- **Expansão In-Place:** Expanda o card no canvas para visualizar regras de negócio e títulos de cálculos sem perder o contexto do fluxo.
- **Painel Lateral de Detalhes (Drawer):** Gaveta lateral retrátil com leitura aprofundada de regras (bloqueio vs. validação), fórmulas matemáticas detalhadas com variáveis/exemplos e mapa de conexões.
- **Fluxo Direcional Limpo:** Linhas curvas indicando a direção dos dados sem poluição visual ou sobreposição de cards.
- **Busca Global & Filtros:** Localização instantânea de componentes com animação de foco (*fly-to* animado) e isolamento por módulo.

---

## 🏛️ Sistema-Piloto: Gestor de Projetos

O primeiro sistema mapeado no FlowDoc implementa a gestão de alocação de equipes:

```
┌─────────────────────────────────────────────────────────────┐
│  NÍVEL 1 (TOPO): GESTÃO DE PROJETOS                         │
│  [Criar Projeto]                    [Detalhes & Orçamento]  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼ (Origina a demanda de equipe)
┌──────────────────────────────┴──────────────────────────────┐
│  NÍVEL 2 (INTERMEDIÁRIO): GESTÃO DE STAFFS                  │
│  [Cadastrar Staff]                  [Disponibilidade/Carga] │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼ (Alimenta os cálculos)
┌──────────────────────────────┴──────────────────────────────┐
│  NÍVEL 3 (BASE): ATRIBUIÇÃO DE HORAS & CUSTOS               │
│  [Atribuir Horas]  ───────────────►  [Motor de Cálculos]    │
└──────────────────────────────────────────────┬──────────────┘
                                               │
                                               └────► (Alimenta Orçamento do Nível 1)
```

---

## 🛠️ Stack Técnica

| Camada | Tecnologia | Finalidade |
|--------|-----------|------------|
| **Build & Bundler** | [Vite](https://vitejs.dev/) | HMR ultra-rápido e build otimizado |
| **Framework** | [React 18](https://react.dev/) + TypeScript | Tipagem estrita e arquitetura baseada em componentes |
| **Canvas & Grafo** | [@xyflow/react](https://reactflow.dev/) (React Flow v12) | Zoom, pan livre, nós customizados, arestas direcionais e `NodeResizer` |
| **Estilização** | [Tailwind CSS](https://tailwindcss.com/) | Design system utilitário com tokens customizados |
| **Ícones** | [Lucide React](https://lucide.dev/) | Iconografia consistente e semântica |
| **Gerenciamento de Estado** | Zustand | Estado global leve e reativo |
| **Banco de Dados** | SQLite nativo (`node:sqlite`) | Persistência local via plugin Vite + Repository Pattern |

---

## 📁 Estrutura do Projeto

```
pview/
├── src/
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── AddFeatureModal.tsx   # Modal de criação de funcionalidade
│   │   │   ├── AddModuleModal.tsx    # Modal de criação de módulo (com seletor de cor)
│   │   │   ├── CanvasToolbar.tsx     # Barra superior (busca, filtros, modos, export/import)
│   │   │   ├── CustomEdge.tsx        # Aresta curva com botão de exclusão flutuante
│   │   │   ├── FeatureNode.tsx       # Card de funcionalidade com 4 handles de conexão
│   │   │   ├── FlowCanvas.tsx        # Canvas React Flow (nós, arestas, eventos, sincronização)
│   │   │   ├── ModuleNode.tsx        # Container agrupador com NodeResizer e auto-expand
│   │   │   └── NodeDetailDrawer.tsx  # Drawer lateral (regras, fórmulas, fluxo, edição)
│   │   └── common/
│   │       ├── AppDialog.tsx         # Avisos e confirmações do aplicativo
│   │       ├── FormulaRenderer.tsx   # Renderizador tipográfico de fórmulas matemáticas
│   │       └── FormulaSimulator.tsx  # Simulador interativo com cálculo ao vivo
│   ├── data/
│   │   └── pilotProject.ts           # Dados iniciais do sistema piloto
│   ├── repositories/
│   │   ├── IProjectRepository.ts           # Contrato/interface do repositório
│   │   ├── SqliteApiProjectRepository.ts   # Implementação via API Vite + SQLite nativo
│   │   ├── LocalStorageProjectRepository.ts # Implementação fallback em localStorage
│   │   └── index.ts                        # Factory: escolhe a implementação ativa
│   ├── store/
│   │   └── useProjectStore.ts        # Zustand store com todos os CRUDs e auto-save
│   ├── styles/
│   │   └── globals.css               # Configurações do Tailwind e fontes
│   ├── types/
│   │   └── index.ts                  # Contratos TypeScript das entidades
│   ├── App.tsx                       # Componente principal
│   └── main.tsx                      # Ponto de entrada
├── flowdoc.db                        # Banco SQLite local (auto-criado)
├── package.json
├── tailwind.config.js
└── vite.config.ts                    # Plugin SQLite + rotas /api/project
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js **v22.5+** (necessário para `node:sqlite` nativo)
- npm ou pnpm/yarn

### Passo a passo
1. Clone o repositório ou acesse a pasta do projeto:
   ```bash
   cd pview
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

4. Abra a URL informada no terminal (geralmente [http://localhost:5173](http://localhost:5173)) no seu navegador.

5. Para gerar o build de produção:
   ```bash
   npm run build
   ```

---

## 🗺️ Roadmap de Evolução

- [x] **Fase 1 — Entidades:** Modelagem dos contratos TypeScript e mapeamento do sistema piloto.
- [x] **Fase 2 — Canvas Interativo:** Nós customizados, zoom, pan, minimap, busca global e visualização em árvore top-down.
- [x] **Fase 3 — Refinamento de Componentes & Fórmulas:** FormulaRenderer tipográfico matemático, Simulador Interativo com cálculo ao vivo e filtros de regras por severidade.
- [x] **Fase 4 — Modo Editor:** Interface de criação de módulos e funcionalidades, edição visual de regras e fórmulas, criação e exclusão interativa de conexões (botão flutuante na linha, teclado Delete e painel lateral), exportação e importação em JSON.
- [x] **Fase 5 — Persistência com SQLite & Repository Pattern:** Banco de dados SQLite nativo (`node:sqlite`) integrado ao Vite, com arquitetura em repositório desacoplada (`IProjectRepository`) para fácil substituição por qualquer outro banco (PostgreSQL, Supabase, LocalStorage).
- [x] **Fase 6 — Redimensionamento de Módulos:** Resize manual via drag nas bordas/cantos do container (`NodeResizer`), auto-expansão de altura ao adicionar funcionalidades que excedem o espaço disponível, badge de dimensão em tempo real (px × px), e persistência das dimensões no SQLite.

---

## 🎮 Modos de Uso

### 🔭 Modo Explorador (padrão)
- Navegue livremente pelo canvas com zoom e pan
- Clique em qualquer funcionalidade para abrir o drawer lateral com regras e cálculos
- Use o simulador interativo para calcular resultados com seus próprios valores
- Busca global por nome de componente com animação *fly-to*
- Filtre por módulo para focar em uma área específica do sistema

### ✏️ Modo Editor
- **Barra do editor:** ações organizadas separadamente da busca e dos filtros; confirmações e avisos aparecem em diálogos do aplicativo
- **Criar Módulo:** botão `+ Novo Módulo` na toolbar, com escolha de cor e descrição
- **Criar Funcionalidade:** botão `+ Nova Funcionalidade`, vincula a um módulo existente
- **Mover nós:** arraste qualquer card ou container livremente
- **Redimensionar módulos:** clique no container para selecionar → arraste bordas/cantos
- **Conectar funcionalidades:** arraste a partir dos pontos de conexão (⊕) nas bordas dos cards
- **Excluir módulos e funcionalidades:** use a lixeira no canvas ou no painel lateral e confirme a ação
- **Regras e cálculos:** crie, edite e exclua regras e cálculos no painel lateral; cálculos aceitam variáveis e podem ser expandidos individualmente
- **Excluir conexão:** botão `×` flutuante no meio da linha, tecla `Delete` com a aresta selecionada, ou painel lateral
- **Export / Import JSON:** snapshots portáveis do projeto inteiro
- **Reset:** restaura o projeto piloto original

---

## 📄 Importar um sistema por JSON

O FlowDoc importa **um projeto inteiro**, substituindo o projeto exibido no momento. Para criar um arquivo para outro sistema:

1. No modo editor, use **Exportar projeto em JSON** para guardar um backup do projeto atual.
2. Crie um arquivo `.json` UTF-8 conforme o exemplo abaixo, ou solicite a uma IA usando o prompt desta seção.
3. No modo editor, clique em **Importar projeto JSON** e selecione o arquivo.
4. Confira módulos, posições, conexões, regras e cálculos no canvas. Exporte novamente se quiser guardar o resultado.

> **Importante:** atualmente, ao abrir ou recarregar a aplicação, o FlowDoc procura o projeto com ID `proj_gestor_projetos`. Para que um projeto importado seja carregado novamente, use esse mesmo ID no projeto e em todos os campos `projectId`. A importação sobrescreve o projeto salvo com esse ID: exporte um backup antes. Um projeto importado com outro ID pode ser exibido e salvo, mas não será selecionado automaticamente ao recarregar.
>
> A importação verifica apenas a presença de `id` e que `nodes` e `connections` são listas; ela **não valida o esquema completo**. Um arquivo pode ser aceito e ainda falhar na exibição se faltar algum campo ou se as referências estiverem incorretas. Um projeto sem nós não é restaurado ao recarregar: nesse caso, o piloto é carregado novamente.

### Exemplo completo

O exemplo mapeia um módulo com duas funcionalidades conectadas. Copie o objeto inteiro para um arquivo `.json`; não inclua comentários ou cercas Markdown no arquivo.

```json
{
  "id": "proj_gestor_projetos",
  "name": "Sistema de Pedidos",
  "description": "Mapa das funcionalidades de pedidos e cálculo de valor.",
  "version": "1.0.0",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "tags": ["Pedidos", "Vendas"],
  "isPublic": false,
  "canvasSettings": {
    "defaultZoom": 0.7,
    "backgroundColor": "#F8F9FC",
    "gridVisible": true,
    "snapToGrid": false,
    "miniMapVisible": true,
    "initialViewport": { "x": 100, "y": 30, "zoom": 0.7 }
  },
  "nodes": [
    {
      "id": "mod_pedidos",
      "projectId": "proj_gestor_projetos",
      "parentId": null,
      "type": "module",
      "title": "Módulo: Pedidos",
      "icon": "FolderKanban",
      "color": "#6366F1",
      "tags": ["Pedidos"],
      "position": { "x": 200, "y": 40 },
      "size": { "width": 840, "height": 330 },
      "expanded": true,
      "content": {
        "description": "Gerencia pedidos e seus valores.",
        "rules": [],
        "calculations": [],
        "inputs": [],
        "outputs": []
      }
    },
    {
      "id": "feat_criar_pedido",
      "projectId": "proj_gestor_projetos",
      "parentId": "mod_pedidos",
      "type": "feature",
      "title": "Criar Pedido",
      "color": "#6366F1",
      "tags": ["Criação"],
      "position": { "x": 260, "y": 130 },
      "size": { "width": 320, "height": 180 },
      "expanded": false,
      "content": {
        "description": "Registra um pedido para um cliente.",
        "rules": [
          {
            "id": "rule_cliente_ativo",
            "conditional": "if",
            "condition": "O cliente está inativo",
            "logicalOperator": "or",
            "secondaryCondition": "O pedido não possui itens",
            "crudOperation": "create",
            "consequence": "Bloquear a criação do pedido.",
            "severity": "critical"
          }
        ],
        "calculations": [],
        "inputs": [],
        "outputs": []
      }
    },
    {
      "id": "feat_calcular_valor",
      "projectId": "proj_gestor_projetos",
      "parentId": "mod_pedidos",
      "type": "feature",
      "title": "Calcular Valor",
      "color": "#6366F1",
      "tags": ["Cálculo"],
      "position": { "x": 660, "y": 130 },
      "size": { "width": 320, "height": 180 },
      "expanded": false,
      "content": {
        "description": "Calcula o valor de um item do pedido.",
        "rules": [],
        "calculations": [
          {
            "id": "calc_valor_item",
            "name": "Valor do Item",
            "description": "Multiplica a quantidade pelo preço unitário.",
            "formula": "C = Q * V",
            "variables": [
              { "symbol": "C", "name": "Valor calculado", "unit": "R$" },
              { "symbol": "Q", "name": "Quantidade", "unit": "un" },
              { "symbol": "V", "name": "Preço unitário", "unit": "R$" }
            ],
            "example": "2 unidades × R$ 30 = R$ 60"
          }
        ],
        "inputs": [],
        "outputs": []
      }
    }
  ],
  "connections": [
    {
      "id": "conn_pedido_valor",
      "projectId": "proj_gestor_projetos",
      "fromId": "feat_criar_pedido",
      "toId": "feat_calcular_valor",
      "sourceHandle": "source-right",
      "targetHandle": "target-left",
      "type": "sync",
      "description": "Os itens do pedido alimentam o cálculo de valor.",
      "style": { "color": "#6366F1", "animated": false, "thickness": 3 }
    }
  ]
}
```

### Como montar o arquivo

Os contratos completos estão em [`src/types/index.ts`](./src/types/index.ts). Use o exemplo como base e siga estas regras:

| Parte | Orientações |
|-------|-------------|
| Projeto | Inclua `id`, `name`, `description`, `version`, `createdAt`, `updatedAt`, `tags`, `isPublic`, `canvasSettings`, `nodes` e `connections`. Use datas ISO 8601 e os tipos mostrados no exemplo. |
| IDs | Use IDs únicos para nós, conexões, regras e cálculos. Cada `projectId` deve coincidir com o `id` do projeto. Evite reutilizar os IDs de cálculos do piloto, que têm valores iniciais próprios no simulador. |
| Módulos | Use `type: "module"`, `parentId: null`, posição e tamanho. Para ícones de módulo, `FolderKanban`, `Users` e `Calculator` são reconhecidos; outros nomes usam o ícone padrão. |
| Funcionalidades | Use `type: "feature"` e `parentId` com o ID de um módulo existente. Inclua `tags`, `position` e `content`. Prefira módulos e funcionalidades para o canvas; embora o tipo `rule` exista no modelo, ele não tem renderização própria no canvas. |
| Conteúdo | Em todo nó, inclua `description` e as listas `rules`, `calculations`, `inputs` e `outputs`, mesmo vazias. Campos opcionais, como notas e dados de entrada/saída, seguem os tipos em `src/types/index.ts`. |
| Posições | As coordenadas usadas pelo canvas são **absolutas**, inclusive para funcionalidades. Posicione os cards dentro da área visual de seu módulo. O exemplo usa módulo em `(200, 40)`, com cards em `(260, 130)` e `(660, 130)`; separe módulos verticalmente para evitar sobreposição. |
| Conexões | `fromId` e `toId` devem referenciar funcionalidades existentes. Use `source-bottom` ou `source-right` na origem e `target-top` ou `target-left` no destino. Os tipos aceitos são `sync`, `async`, `batch` e `optional`. |
| Regras | Inclua `id`, `condition`, `consequence` e `severity` (`critical`, `warning` ou `info`). Os campos opcionais `conditional`, `logicalOperator`, `secondaryCondition` e `crudOperation` estão descritos abaixo. |
| Cálculos | Inclua `id`, `name`, `formula` e a lista `variables`; cada variável tem `symbol` e `name`, e pode ter `unit` e `source`. `description` e `example` são opcionais. |

**Regras estruturadas:** `conditional` aceita `if`, `when`, `unless`, `while`, `before` ou `after`. `logicalOperator` aceita `none`, `and`, `or` ou `not`: para `and`/`or`, informe também `secondaryCondition`; `not` nega a primeira condição. `crudOperation` pode ser `create`, `read`, `update` ou `delete`. Esses campos **documentam** o comportamento: o FlowDoc não executa operações CRUD nem avalia regras de negócio.

**Fórmulas para o simulador:** prefira expressões aritméticas como `C = Q * V`, com `+`, `-`, `*`, `/`, parênteses e `^` para potência. Cadastre todas as variáveis de entrada usadas à direita do `=` com símbolos idênticos aos da fórmula; o símbolo à esquerda representa o resultado. O simulador também reconhece `×`, `÷`, `\times`, `\cdot` e subscritos como `V_{hora}` (no JSON, barras invertidas devem ser escapadas: `"\\times"`). Para um subscrito, use o símbolo normalizado na lista de variáveis, por exemplo `V_hora` para `V_{hora}`. Funções e fórmulas em linguagem natural não são calculadas. O simulador usa heurísticas de formatação para moeda, porcentagem e horas; confira o valor e a unidade apresentados.

### Prompt para pedir o JSON a uma IA

Copie o prompt abaixo, forneça também o exemplo e as orientações desta seção, e substitua o trecho entre colchetes pela descrição do sistema.

```text
Crie um arquivo JSON completo para importar no FlowDoc, seguindo exatamente o
exemplo e as orientações da seção "Importar um sistema por JSON" que forneci.

Sistema a mapear:
[DESCREVA O SISTEMA, MÓDULOS, FUNCIONALIDADES, FLUXOS, REGRAS E CÁLCULOS]

Requisitos:
- Retorne somente um objeto JSON válido, sem comentários, texto adicional ou Markdown.
- Use "proj_gestor_projetos" como id do projeto e projectId de todos os nós e conexões.
- Inclua todos os campos obrigatórios do projeto e de cada nó, inclusive arrays vazios.
- Use IDs únicos e referências parentId/fromId/toId válidas.
- Organize os módulos e suas funcionalidades em posições absolutas sem sobreposição.
- Conecte as funcionalidades com handles válidos e descreva seus fluxos.
- Registre regras e operações CRUD apenas quando forem informadas ou claramente
  identificadas; não invente regras nem fórmulas de negócio.
- Para cálculos conhecidos, informe fórmulas aritméticas simuláveis, variáveis
  correspondentes e exemplos. Caso faltem dados, não invente cálculos.
- Mantenha nomes e descrições em português.
```
