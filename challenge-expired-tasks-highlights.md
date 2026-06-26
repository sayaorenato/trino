# Plan: Challenge Expired Tasks Highlights

## Overview
Modificar a tela do Desafio (`challenge.tsx`) na seção de tarefas extras para ordenar a listagem por prazo de expiração decrescente, aplicar um destaque visual acinzentado nas tarefas expiradas e travar sua interação.

## Project Type
MOBILE (React Native / Expo)

## Success Criteria
1. As tarefas extras aparecem ordenadas de forma decrescente por data/hora (`expires_at`), com as que expiram por último no topo.
2. Tarefas que expiraram no passado são exibidas com estilo de opacidade cinza, badge vermelha de "Expirada" e ícone indicador.
3. Não é possível marcar ou realizar check-in em tarefas extras expiradas.
4. Nenhumm erro de tipo TypeScript é gerado.

## Tech Stack
- React Native / Expo
- TypeScript

## File Structure
Nenhuma alteração estrutural, apenas alterações no arquivo `app/(tabs)/challenge.tsx`.

## Task Breakdown

### Task 1: Ordenação e bloqueio no handleToggleTask
- **Agent**: `mobile-developer`
- **Skill**: `clean-code`
- **Priority**: P0
- **Dependencies**: Nenhuma
- **INPUT**: Funções de carregamento e `handleToggleTask` em `app/(tabs)/challenge.tsx`.
- **OUTPUT**: Bloqueio de cliques em tarefas expiradas implementado no `handleToggleTask`.
- **VERIFY**: Executar compilador TypeScript (`npx tsc --noEmit`).

### Task 2: Modificar renderização e estilos no challenge.tsx
- **Agent**: `mobile-developer`
- **Skill**: `frontend-design`
- **Priority**: P0
- **Dependencies**: Task 1
- **INPUT**: Bloco de mapeamento da listagem de tarefas extras e folha de estilos em `challenge.tsx`.
- **OUTPUT**: Ordenação aplicada no `map`, novos elementos visuais (ícones, badges, opacidade) para expiradas e folhas de estilo adicionadas no final.
- **VERIFY**: Teste no emulador do comportamento estético e funcional de tarefas expiradas.

## Phase X: Final Verification
- [x] TypeScript compila sem erros.
- [x] Tarefas expiradas aparecem organizadas no fim da lista (ordenada decrescentemente).
- [x] Tarefas expiradas exibem a badge vermelha "Expirada" e ícone cinza.
- [x] O clique em tarefas expiradas é impedido e dispara o alerta correspondente.

## ✅ PHASE X COMPLETE
- Lint: ✅ Pass (TypeScript Type Check: OK)
- Security: ✅ No critical issues
- Build: ✅ Success
- Date: 2026-06-25
