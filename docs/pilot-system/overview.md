# Sistema-Piloto: Gestor de Projetos

> Este é o primeiro sistema mapeado no FlowDoc. Serve como prova de conceito e validação do modelo de dados e da experiência de navegação.

---

## Visão Geral do Sistema

O **Gestor de Projetos** é uma aplicação que permite a gestores:
1. Criar e gerenciar **Projetos** com nome, prazo e orçamento
2. Cadastrar **Staffs** (colaboradores) com seu perfil e valor/hora
3. **Atribuir horas** de trabalho de um staff a um projeto, com cálculo automático de custo

---

## Mapa dos Módulos

```
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
  📦 MÓDULO: Projetos
│                                                                  │
   [Criar Projeto] ──► [Listar Projetos] ──► [Detalhar Projeto]
│                                                 │                │
 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─
                                                  │ ProjetoDTO
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─▼─ ─ ─ ─ ─ ─ ─ ─ ┐
  📦 MÓDULO: Horas de Trabalho
│                                                                  │
   [Atribuir Horas] ──► [Calcular Custo] ──► [Relatório de Custo]
│        ▲                                                         │
 ─ ─ ─ ─ │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
          │ StaffDTO
┌─ ─ ─ ─ │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
  📦 MÓDULO: Staffs
│                                                                  │
   [Cadastrar Staff] ──► [Listar Staffs] ──► [Detalhar Staff]
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

---

## Módulos

| Módulo | Arquivo | Funcionalidades |
|--------|---------|-----------------|
| Projetos | [module-projects.md](./module-projects.md) | Criar, listar, detalhar, editar, encerrar |
| Staffs | [module-staffs.md](./module-staffs.md) | Cadastrar, listar, detalhar, editar, desativar |
| Horas de Trabalho | [module-hours.md](./module-hours.md) | Atribuir horas, calcular custo, relatório |

---

## Fluxos Principais

### Fluxo 1 — Criação e Atribuição Completa

```
Usuário cria Projeto → Usuário cadastra Staff → Atribui Staff ao Projeto com X horas
→ Sistema calcula custo (Horas × Valor/h) → Relatório de custos disponível
```

### Fluxo 2 — Atualização de Valor/Hora

```
Gestor atualiza Valor/hora do Staff
→ Sistema recalcula todos os custos de atribuições ativas
→ Relatórios são atualizados automaticamente
```

---

## Regras Globais do Sistema

| # | Regra | Severidade |
|---|-------|-----------|
| 1 | Um staff só pode ser atribuído a um projeto se tiver `valor_hora` cadastrado | 🔴 Critical |
| 2 | A soma de horas de um staff em projetos ativos não pode exceder 200h/mês | 🟡 Warning |
| 3 | Um projeto encerrado não aceita novas atribuições | 🔴 Critical |
| 4 | O custo total de um projeto é a soma dos custos de todas as atribuições ativas | ℹ️ Info |
| 5 | Ao desativar um staff, suas atribuições pendentes são marcadas como "suspensas" | 🟡 Warning |
