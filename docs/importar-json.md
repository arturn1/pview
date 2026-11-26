# 📄 Importar um sistema por JSON

Guia para criar o JSON de um sistema existente e importá-lo no FlowDoc. Voltar ao [README](../README.md).

O FlowDoc importa **um projeto inteiro como uma nova cópia**, sem substituir os projetos existentes. Para criar um arquivo para outro sistema:

O arquivo [`docs/flowdoc.json`](./flowdoc.json) é um exemplo importável que mapeia funcionalidades do próprio FlowDoc.

1. Abra um projeto na tela inicial e, opcionalmente, no modo editor, use **Exportar projeto em JSON** para guardar um backup do projeto atual.
2. Crie um arquivo `.json` UTF-8 conforme o exemplo abaixo, ou solicite a uma IA usando o prompt deste guia.
3. No modo editor, clique em **Importar projeto JSON** e selecione o arquivo.
4. Confira módulos, posições, conexões, regras e cálculos no canvas. Exporte novamente se quiser guardar o resultado.

> **Importante:** cada importação recebe um novo ID, inclusive quando o arquivo já foi importado antes. Os campos `projectId` dos nós e conexões são atualizados automaticamente. O ID do arquivo não precisa ser o do projeto piloto.
>
> **Fora do JSON:** aprovadores do projeto, histórico de revisões, sprints, equipes e tarefas são armazenados separadamente e não fazem parte da exportação nem da importação. Após importar, configure os aprovadores em **Editar** no card do projeto.
>
> A importação valida os campos principais, o conteúdo dos nós e as referências de módulos e conexões, mas **não valida todos os campos opcionais**. Revise o mapa importado antes de usá-lo.

### Exemplo completo

O exemplo mapeia um módulo com duas funcionalidades conectadas. Copie o objeto inteiro para um arquivo `.json`; não inclua comentários ou cercas Markdown no arquivo.

```json
{
  "id": "proj_exemplo_pedidos",
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
      "projectId": "proj_exemplo_pedidos",
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
      "projectId": "proj_exemplo_pedidos",
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
      "projectId": "proj_exemplo_pedidos",
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
      "projectId": "proj_exemplo_pedidos",
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

Os contratos completos estão em [`src/types/index.ts`](../src/types/index.ts). Use o exemplo como base e siga estas regras:

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

Copie o prompt abaixo, forneça também o exemplo e as orientações deste guia, e substitua o trecho entre colchetes pela descrição do sistema.

```text
Crie um arquivo JSON completo para importar no FlowDoc, seguindo exatamente o
exemplo e as orientações do guia "Importar um sistema por JSON" que forneci.

Sistema a mapear:
[DESCREVA O SISTEMA, MÓDULOS, FUNCIONALIDADES, FLUXOS, REGRAS E CÁLCULOS]

Requisitos:
- Retorne somente um objeto JSON válido, sem comentários, texto adicional ou Markdown.
- Use um ID para o projeto e repita-o em projectId de todos os nós e conexões.
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
