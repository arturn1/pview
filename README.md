# FlowDoc

> Plataforma web interativa para que equipes não-técnicas conheçam, entendam e explorem sistemas complexos de forma visual e intuitiva.

FlowDoc transforma a documentação de sistemas — frequentemente espalhada em textos estáticos ou diagramas mudos — em uma **Árvore Viva de Conhecimento e Arquitetura** (*Living Architecture Map*).

> **Status atual:** API independente, autenticação OIDC, usuários e papéis, PostgreSQL/Prisma, múltiplos projetos e planejamento de sprints.

---

## 💡 Como Funciona

- **Visualização em Árvore Hierárquica (Top-Down):** O sistema organiza as dependências de cima para baixo. O que é raiz/origem fica no topo (ex: Projetos), alimentando as ramificações intermediárias (ex: Staffs), que por sua vez abastecem as bases operacionais (ex: Cálculos de Horas & Custos).
- **Componentes Semânticos:** Cartões visuais com cantos arredondados representando funcionalidades reais.
- **Expansão In-Place:** Expanda o card no canvas para visualizar regras de negócio e títulos de cálculos sem perder o contexto do fluxo.
- **Painel Lateral de Detalhes (Drawer):** Gaveta lateral retrátil com leitura aprofundada de regras (bloqueio vs. validação), fórmulas matemáticas detalhadas com variáveis/exemplos e mapa de conexões.
- **Fluxo Direcional Limpo:** Linhas curvas indicando a direção dos dados sem poluição visual ou sobreposição de cards.
- **Busca Global & Filtros:** Localização instantânea de componentes com animação de foco (*fly-to* animado) e isolamento por módulo.
- **Projetos:** Lista de projetos após o login, criação de projetos e navegação entre a lista e o canvas.
- **Sprints:** Cadastro e listagem geral ou por projeto, equipes, colaboradores, capacidade, atribuição de tarefas e retrospectiva.
- **Autenticação:** Acesso pelo provedor de identidade do Fanti, com informações disponíveis do usuário na barra da tela de projetos.

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
| **Autenticação** | OpenID Connect + `jose` | Validação de identidade e sessão local na API |
| **Persistência** | Prisma + PostgreSQL | Adaptadores da API por interfaces de armazenamento e usuários |

---

## 📁 Estrutura do Projeto

```
pview/
├── src/
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── AddFeatureModal.tsx   # Modal de criação de funcionalidade
│   │   │   ├── AddModuleModal.tsx    # Modal de criação de módulo (com seletor de cor)
│   │   │   ├── AddProjectModal.tsx   # Criação de projeto vazio
│   │   │   ├── CanvasToolbar.tsx     # Barra superior (busca, filtros, modos, export/import)
│   │   │   ├── CustomEdge.tsx        # Aresta curva com botão de exclusão flutuante
│   │   │   ├── FeatureNode.tsx       # Card de funcionalidade com 4 handles de conexão
│   │   │   ├── FlowCanvas.tsx        # Canvas React Flow (nós, arestas, eventos, sincronização)
│   │   │   ├── ModuleNode.tsx        # Container agrupador com NodeResizer e auto-expand
│   │   │   └── NodeDetailDrawer.tsx  # Drawer lateral (regras, fórmulas, fluxo, edição)
│   │   ├── common/
│   │   │   ├── AppDialog.tsx         # Avisos e confirmações do aplicativo
│   │   │   ├── AuthGate.tsx          # Fluxo de autenticação e acesso ao aplicativo
│   │   │   ├── WorkspaceHeader.tsx   # Navegação e usuário autenticado
│   │   │   ├── FormulaRenderer.tsx   # Renderizador tipográfico de fórmulas matemáticas
│   │   │   └── FormulaSimulator.tsx  # Simulador interativo com cálculo ao vivo
│   │   ├── projects/
│   │   │   ├── ProjectList.tsx       # Tela inicial de projetos e usuário autenticado
│   │   │   └── UsersManager.tsx     # Gestão de papéis por administradores
│   │   └── sprints/
│   │       ├── DevOpsImport.tsx      # Importação de tarefas a partir de XLSX
│   │       ├── PeopleManager.tsx     # Equipes e colaboradores
│   │       ├── SprintForm.tsx        # Cadastro e edição de sprints
│   │       ├── SprintList.tsx        # Lista geral ou filtrada por projeto
│   │       ├── SprintOverview.tsx    # Consulta de tarefas sem identificar colaboradores
│   │       ├── SprintPlan.tsx        # Participantes, capacidade e tarefas
│   │       ├── TaskForm.tsx          # Atribuição e retrospectiva
│   │       └── time.ts               # Conversão de horas e minutos
│   ├── data/
│   │   └── pilotProject.ts           # Dados iniciais do sistema piloto
│   ├── api/
│   │   ├── request.ts                      # Requisições HTTP compartilhadas
│   │   ├── planning.ts                     # Comunicação com a API de planejamento
│   │   ├── projects.ts                     # Comunicação com a API de projetos
│   │   └── sprints.ts                      # Comunicação com a API de sprints
│   ├── store/
│   │   └── useProjectStore.ts        # Zustand store com todos os CRUDs e auto-save
│   ├── styles/
│   │   └── globals.css               # Configurações do Tailwind e fontes
│   ├── types/
│   │   └── index.ts                  # Contratos TypeScript das entidades
│   ├── imports/
│   │   └── importProject.ts          # Validação e cópia de projetos importados
│   ├── App.tsx                       # Componente principal
│   └── main.tsx                      # Ponto de entrada
├── prisma/                           # Schema PostgreSQL e migrações Prisma
├── server/
│   ├── main.ts                       # Inicialização da API independente
│   ├── domain/                       # Contratos de persistência, usuários e validação
│   ├── http/
│   │   ├── api.ts                    # Composição do servidor HTTP
│   │   ├── auth.ts                   # Sessões, autorização e autenticação OIDC
│   │   ├── helpers.ts                # Validação e respostas HTTP
│   │   └── routes/
│   │       ├── index.ts              # Encaminhamento e tratamento de erros
│   │       ├── common.ts             # Tipos e validações comuns das rotas
│   │       ├── projects.ts           # Rotas de projetos
│   │       ├── sprints.ts            # Rotas de sprints
│   │       ├── people.ts             # Equipes e colaboradores
│   │       ├── planning.ts           # Planejamento, participantes e tarefas
│   │       └── devops.ts             # Pré-visualização e importação DevOps
│   ├── imports/
│   │   └── devops-workbook.ts        # Leitura da planilha DevOps
│   └── repositories/                 # Repositórios Prisma e transações
├── tests/
│   ├── api.test.mjs                  # Autorização e integração HTTP com PostgreSQL
│   ├── postgres-domain.test.mjs      # Sprints, planejamento e importação em PostgreSQL
│   ├── run-postgres.mjs              # Criação e remoção do banco de teste
│   ├── auth.test.mjs                 # Testes de autenticação e sessão
│   ├── devops.test.mjs               # Testes da pré-visualização XLSX
│   ├── projects.test.mjs             # Testes de projetos e tela inicial
│   ├── planning.test.mjs             # Testes de conversão de horas
│   └── sprints.test.mjs              # Testes dos componentes de sprints
├── package.json
├── tailwind.config.js
└── vite.config.ts                    # Proxy de desenvolvimento para a API
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js **v22.13+**
- npm ou pnpm/yarn
- PostgreSQL acessível localmente, ou Docker para criá-lo.

### Passo a passo
1. Clone o repositório ou acesse a pasta do projeto:
   ```bash
   cd pview
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure `DATABASE_URL` em `.env.local` apontando para um banco PostgreSQL **dedicado ao FlowDoc**. O arquivo não deve ser versionado. Para o exemplo abaixo, crie uma senha forte e use a mesma senha nos dois campos:
   ```dotenv
   POSTGRES_PASSWORD=SUA_SENHA
   DATABASE_URL=postgresql://flowdoc:SUA_SENHA@127.0.0.1:5433/flowdoc
   ```
   Caracteres especiais da senha devem ser codificados na URL. Para criar o contêiner:
   ```bash
   docker run --name pview-postgres --env-file .env.local -e POSTGRES_USER=flowdoc -e POSTGRES_DB=flowdoc -p 127.0.0.1:5433:5432 -v pview-postgres-data:/var/lib/postgresql/data -d postgres:16
   ```
   A URL deve usar o mesmo usuário e senha, host `127.0.0.1`, porta `5433` e banco `flowdoc`. Se o contêiner já existir, use `docker start pview-postgres` em vez de criá-lo novamente.

4. Gere o cliente e aplique as migrações ao banco configurado:
   ```bash
   node --env-file-if-exists=.env --env-file-if-exists=.env.local ./node_modules/prisma/build/index.js generate
   node --env-file-if-exists=.env --env-file-if-exists=.env.local ./node_modules/prisma/build/index.js migrate deploy
   ```
   O SQLite anterior não é migrado automaticamente.

5. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

6. O comando inicia o Vite e a API independente (porta 3001, configurável com `API_PORT`). Abra [http://localhost:3000/](http://localhost:3000/) e autentique-se no provedor do Fanti. Na tela de projetos, selecione um projeto para abrir o canvas ou crie um projeto vazio. Para iniciá-los separadamente, use `npm run dev:api` e `npm run dev:web`.

7. Para gerar o build de produção:
   ```bash
   npm run build
   ```

8. Para testar a API com PostgreSQL, use uma conexão local com permissão para criar e remover bancos temporários:
   ```bash
   npm run test:postgres
   ```
   O comando cria um banco de teste com nome aleatório, aplica as migrações e o remove ao terminar; não limpa o banco da aplicação. Para incluir o teste de importação de 5.000 tarefas, use `FLOWDOC_TEST_LARGE=1 npm run test:postgres`.

   Para os demais testes:
   ```bash
   node --test tests/auth.test.mjs tests/projects.test.mjs tests/sprints.test.mjs tests/sprint-privacy.test.mjs tests/planning.test.mjs tests/devops.test.mjs
   ```

### Autenticação Fanti

A API usa os mesmos parâmetros padrão do Fanti:

| Variável de ambiente | Padrão |
|---|---|
| `OAUTH2_ISSUER` | `https://connect-staging.fi-group.com/identity` |
| `OAUTH2_CLIENTID` | `ext.local` |
| `OAUTH2_SCOPE` | `openid profile email` |
| `OAUTH2_REDIRECT_URI` | `http://localhost:3000/` |

As variáveis podem ser definidas no ambiente ou em `.env.local`. O endereço de retorno precisa estar registrado no provedor e apontar para a raiz do FlowDoc; use HTTPS, exceto em localhost. A porta 3000 deve estar livre. É necessário acesso ao provedor e uma conta válida; não há senha ou segredo de cliente configurado no FlowDoc. O fluxo exige que o cliente OIDC aceite `id_token token` e que o provedor assine o ID token com RS256 e inclua `at_hash`.

O servidor valida o ID token e cria um cookie de sessão local; as sessões ficam em memória e expiram ao reiniciar o servidor ou quando o token expira, no máximo em oito horas. **Sair** encerra a sessão local e encaminha ao encerramento de sessão do provedor, que também pode afetar outros aplicativos que usam o mesmo login. Após o retorno ao FlowDoc sem sessão, o login no provedor é iniciado automaticamente. O provedor precisa permitir o endereço de retorno após a saída.

O servidor valida assinatura, emissor, público, expiração, `nonce` e vínculo com o token de acesso antes de liberar o aplicativo e as APIs de projetos. O retorno e a saída dependem da configuração do cliente no provedor; o fluxo deve ser confirmado com uma conta real no ambiente utilizado.

### Usuários e permissões

- O primeiro login cria um usuário `USER`, com acesso somente de leitura. O e-mail é normalizado e único.
- `ADM` administra usuários e todas as operações; `DIGITAL` gerencia projetos, sprints, equipes e tarefas; `DEV` pode editar apenas as próprias tarefas e retrospectivas, vinculadas pelo e-mail do colaborador; `USER` consulta projetos e uma visão anônima das tarefas da sprint.
- Um ADM pode simular os papéis no menu para conferir a interface. A simulação existe apenas no navegador, volta ao ADM após recarregar e não altera as permissões efetivas da API.
- Na inicialização é criado, se ainda não existir, o administrador `artur.patricio@epsa.com`. O seed não redefine papéis existentes. Ao menos um administrador deve permanecer.
- Por decisão de configuração, o e-mail emitido pelo IS4 é considerado confiável mesmo sem `email_verified`. No primeiro acesso a identidade é vinculada por emissor e subject; uma identidade diferente não assume automaticamente um e-mail já vinculado, e alterações do e-mail da identidade exigem intervenção administrativa.
- Projetos e sprints são compartilhados entre usuários; as permissões são globais, não por projeto.

O domínio acessa os contratos de repositórios por entidade em `Storage` e `UserRepository`; os repositórios Prisma compartilham a sessão de leitura ou transação. PostgreSQL é a implementação atual. Para outro banco, substitua os adaptadores ou adapte o schema, o provider, o cliente gerado e as migrações Prisma. SQL Server ainda não foi implementado nem testado.

> As sessões continuam em memória. O build estático e `npm run preview` não configuram o proxy da API; uma implantação requer proxy HTTPS e configuração de produção apropriados.

---

## 🗺️ Roadmap de Evolução

- [x] **Fase 1 — Entidades:** Modelagem dos contratos TypeScript e mapeamento do sistema piloto.
- [x] **Fase 2 — Canvas Interativo:** Nós customizados, zoom, pan, minimap, busca global e visualização em árvore top-down.
- [x] **Fase 3 — Refinamento de Componentes & Fórmulas:** FormulaRenderer tipográfico matemático, Simulador Interativo com cálculo ao vivo e filtros de regras por severidade.
- [x] **Fase 4 — Modo Editor:** Interface de criação de módulos e funcionalidades, edição visual de regras e fórmulas, criação e exclusão interativa de conexões (botão flutuante na linha, teclado Delete e painel lateral), exportação e importação em JSON.
- [x] **Fase 5 — Persistência:** API com contratos de armazenamento e adaptadores Prisma/PostgreSQL.
- [x] **Fase 6 — Redimensionamento de Módulos:** Resize manual via drag nas bordas/cantos do container (`NodeResizer`), auto-expansão de altura e persistência das dimensões.
- [x] **Fase 7 — Acesso e projetos:** Autenticação OIDC e tela inicial para listar e abrir projetos.
- [x] **Fase 8 — Sprints básicas:** Cadastro e listagem de períodos em visões geral e por projeto.
- [x] **Fase 9 — Planejamento de sprints:** Equipes, participantes, capacidade, tarefas e retrospectiva.

---

## 🎮 Modos de Uso

### Tela inicial de projetos
- Após a autenticação, veja os projetos salvos e selecione um cartão para abrir o canvas.
- Use **Novo Projeto** para criar um projeto vazio; ele aparecerá na lista.
- Em cada cartão, use **Editar** para alterar nome e descrição ou **Excluir** para remover o projeto e todo o seu conteúdo, após confirmação. Projetos com tarefas vinculadas não podem ser excluídos.
- A barra superior mostra o nome e o e-mail quando disponíveis no ID token, além do botão **Sair**.
- No canvas, use a seta **Voltar aos projetos** para retornar à lista. O seletor no cabeçalho também permite alternar diretamente entre projetos.
- Se ocorrer uma falha ao carregar ou salvar, use a opção de tentar novamente exibida na tela.

### Sprints
- Na home, use **Todas as sprints** para consultar a lista geral ou **Sprints** no cartão de um projeto para filtrá-la. No canvas, o botão de calendário abre as sprints do projeto selecionado.
- Crie uma sprint informando nome, objetivo, datas e um ou mais projetos. A data final não pode anteceder a inicial.
- Busque por nome em todas as sprints e navegue pela listagem paginada, ordenada pelas datas de início mais recentes. ADM, DIGITAL e DEV abrem o planejamento pelo cartão ou por **Organizar**; USER usa **Ver tarefas** para consultar as tarefas, projeto, funcionalidade e horas planejadas/realizadas sem ver os participantes. Use as demais ações do cartão para editar ou excluir. Uma sprint vinculada a vários projetos aparece em cada visão correspondente.
- Em **Equipes e colaboradores**, cadastre equipes e seus colaboradores. Em **Organizar**, adicione participantes à sprint e informe a capacidade individual. Os cartões começam recolhidos com um resumo de horas e tarefas; clique no nome para abrir ou fechar os detalhes.
- Atribua tarefas pelo número externo e projeto vinculado à sprint, com título e vínculo opcional a uma funcionalidade do canvas. Registre horas planejadas, horas reais, lições aprendidas, desafios e observações de revisão. As tarefas podem ser editadas ou excluídas.
- Capacidade e horas usam `H:MM`, com precisão de um minuto. A capacidade pode ser definida depois da atribuição e não impede sobrealocação; o resumo mostra capacidade, horas atribuídas, saldo e utilização. Estimativas pendentes não entram no total de horas e são contabilizadas separadamente.
- Remova as tarefas antes de excluir a sprint, o participante, o colaborador ou o projeto associado, ou de desvincular da sprint um projeto usado por elas. Remova o vínculo das tarefas antes de excluir uma funcionalidade, inclusive ao excluir seu módulo. Uma equipe com colaboradores não pode ser excluída.
- Ao excluir um projeto sem tarefas, seus vínculos com sprints são removidos; as sprints permanecem na lista geral, inclusive se ficarem sem projeto. Elas podem ser editadas para vinculá-las novamente.
- Sprints, equipes, colaboradores e tarefas são armazenados separadamente dos documentos do canvas e não são incluídos na exportação JSON dos projetos.
- A visão de USER não inclui nomes, equipes, e-mails, vínculos de participantes, links do DevOps ou notas de retrospectiva. Não há status formal de execução de tarefa; a visão informa horas realizadas quando registradas. As permissões são globais, não por projeto.

### Importação de tarefas do DevOps
- Em **Organizar**, selecione **Importar DevOps**, o projeto da sprint, a equipe para novos colaboradores e o arquivo XLSX (até 3 MB e 5.000 linhas). Cadastre a equipe antes da importação.
- Use **Pré-visualizar** para conferir tarefas, responsáveis, estimativas e ações de criação ou atualização antes de confirmar. Nenhum dado é salvo até a confirmação. Se os registros relevantes mudarem durante a revisão, volte e gere uma nova pré-visualização.
- A primeira aba deve conter as colunas `Title`, `ID`, `Assigned To` e `Original Estimate`. O título e ID identificam a tarefa; `Assigned To` deve conter o e-mail, opcionalmente no formato `Nome <email>`. A estimativa é interpretada em horas e precisa ser representável em minutos inteiros. Células vazias ficam pendentes; zero é uma estimativa válida.
- Os colaboradores são identificados pelo e-mail, sem diferenciar maiúsculas de minúsculas. Se não existir um cadastro com esse e-mail, a importação cria o colaborador na equipe escolhida. Novos participantes são adicionados com capacidade `0:00`, ajustável posteriormente.
- Uma reimportação atualiza por ID dentro da sprint o título, a estimativa, o projeto e a pessoa atribuída. Horas reais e retrospectiva são preservadas; um vínculo de funcionalidade é removido se o projeto mudar. IDs duplicados no arquivo ou ambiguidades entre tarefas existentes impedem a importação inteira.
- O hiperlink HTTP ou HTTPS da célula `ID`, quando presente, é salvo e pode ser aberto em uma nova aba pelo botão **DevOps** na tarefa. Reimporte a planilha para obter links de tarefas importadas anteriormente. Se o ID vier sem hiperlink em uma reimportação, o link já salvo é preservado.
- Outros campos do arquivo, como estado e severidade, não são importados. O arquivo não é sincronizado automaticamente com o DevOps.

### 🔭 Modo Explorador (padrão)
- Navegue livremente pelo canvas com zoom e pan
- Use a lista vertical à esquerda para filtrar os módulos; quando necessário, role a lista.
- Clique em qualquer funcionalidade para abrir o drawer lateral com regras e cálculos
- Use o simulador interativo para calcular resultados com seus próprios valores
- Busca global por nome de componente com animação *fly-to*
- Filtre por módulo para focar em uma área específica do sistema

### ✏️ Modo Editor
- **Barra do editor:** ações organizadas separadamente da busca e dos filtros; confirmações e avisos aparecem em diálogos do aplicativo
- **Projetos:** crie projetos na tela inicial e alterne entre eles pelo seletor no cabeçalho
- **Criar Módulo:** botão `+ Novo Módulo` na toolbar, com escolha de cor e descrição
- **Criar Funcionalidade:** botão `+ Nova Funcionalidade`, vincula a um módulo existente
- **Mover nós:** arraste qualquer card ou container livremente
- **Redimensionar módulos:** clique no container para selecionar → arraste bordas/cantos
- **Conectar funcionalidades:** arraste a partir dos pontos de conexão (⊕) nas bordas dos cards
- **Excluir módulos e funcionalidades:** use a lixeira no canvas ou no painel lateral e confirme a ação
- **Regras e cálculos:** crie, edite e exclua regras e cálculos no painel lateral; cálculos aceitam variáveis e podem ser expandidos individualmente
- **Excluir conexão:** botão `×` flutuante no meio da linha, tecla `Delete` com a aresta selecionada, ou painel lateral
- **Export / Import JSON:** exporte o projeto atual ou importe o arquivo como um novo projeto independente
- **Projeto piloto:** o botão de seta circular abre o piloto existente ou o cria se ainda não estiver salvo; ele não restaura nem sobrescreve os dados existentes

O banco armazena vários projetos, cada um com seu próprio ID. A seleção do último projeto aberto é guardada no navegador. Ao recarregar, o FlowDoc apresenta a lista de projetos e mantém o último projeto selecionado; se ele não estiver disponível, seleciona outro projeto existente. Em um banco vazio, o piloto é criado automaticamente quando um administrador ou DIGITAL acessa a aplicação; usuários somente leitura veem uma lista vazia. Se todos os projetos forem excluídos, a lista ficará vazia até que outro projeto seja criado ou um usuário com permissão de escrita recarregue a página. Uma falha no salvamento é exibida na tela e impede a troca, edição ou exclusão de projeto até que o salvamento seja concluído.

---

## 📄 Importar um sistema por JSON

O FlowDoc importa **um projeto inteiro como uma nova cópia**, sem substituir os projetos existentes. Para criar um arquivo para outro sistema:

O arquivo [`docs/flowdoc.json`](./docs/flowdoc.json) é um exemplo importável que mapeia funcionalidades do próprio FlowDoc.

1. Abra um projeto na tela inicial e, opcionalmente, no modo editor, use **Exportar projeto em JSON** para guardar um backup do projeto atual.
2. Crie um arquivo `.json` UTF-8 conforme o exemplo abaixo, ou solicite a uma IA usando o prompt desta seção.
3. No modo editor, clique em **Importar projeto JSON** e selecione o arquivo.
4. Confira módulos, posições, conexões, regras e cálculos no canvas. Exporte novamente se quiser guardar o resultado.

> **Importante:** cada importação recebe um novo ID, inclusive quando o arquivo já foi importado antes. Os campos `projectId` dos nós e conexões são atualizados automaticamente. O ID do arquivo não precisa ser o do projeto piloto.
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
