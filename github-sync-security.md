# Plan: GitHub Sync & Security

## Overview
Sincronizar a branch local `feature/feed-inline-comments` que contém todas as novas funcionalidades do MVP do Trino com o repositório remoto `sayaorenato/trino` no GitHub. O plano inclui a segurança de segredos (ignorando o token do MCP no Git) e o fluxo correto de Pull Request.

## Project Type
MOBILE (React Native / Expo)

## Success Criteria
1. O arquivo `.agents/mcp_config.json` não é rastreado nem commitado pelo Git.
2. A branch local `feature/feed-inline-comments` é enviada com sucesso para o GitHub remoto.
3. Um Pull Request da branch `feature/feed-inline-comments` para `main` é aberto com sucesso no GitHub.

## Tech Stack
- Git
- GitHub MCP Server
- React Native / Expo (contexto do projeto Trino)

## File Structure
Nenhuma mudança estrutural de arquivos de código, apenas alteração no `.gitignore`.

## Task Breakdown

### Task 1: Ignorar segredos no Git
- **Agent**: `project-planner`
- **Skill**: `clean-code`
- **Priority**: P0
- **Dependencies**: Nenhuma
- **INPUT**: Arquivo `.gitignore` existente.
- **OUTPUT**: `.gitignore` contendo a regra para ignorar `.agents/mcp_config.json`.
- **VERIFY**: Executar `git status` e verificar que `.agents/mcp_config.json` não aparece mais como modificado ou rastreável.

### Task 2: Push da branch de funcionalidade
- **Agent**: `mobile-developer` (full-stack mobile)
- **Skill**: `powershell-windows`
- **Priority**: P1
- **Dependencies**: Task 1
- **INPUT**: Histórico local de commits na branch `feature/feed-inline-comments`.
- **OUTPUT**: Branch disponível remotamente no GitHub.
- **VERIFY**: Executar `git branch -r` ou buscar commits da branch no GitHub.

### Task 3: Criar Pull Request no GitHub
- **Agent**: `orchestrator`
- **Skill**: `mcp-builder`
- **Priority**: P1
- **Dependencies**: Task 2
- **INPUT**: Branch remota criada.
- **OUTPUT**: Pull Request aberto no repositório `sayaorenato/trino` apontando de `feature/feed-inline-comments` para `main`.
- **VERIFY**: Sucesso no retorno da ferramenta `create_pull_request`.

## Phase X: Final Verification
- [ ] O token pessoal do GitHub não foi exposto no histórico do Git.
- [ ] A branch foi enviada.
- [ ] O Pull Request está aberto.
