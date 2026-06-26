# Plan: Home Extra Tasks Time Lock

## Overview
Implementar o bloqueio de horário e feedback visual para tarefas extras cujo horário de início (`start_time`) seja posterior ao horário atual. Exibir o horário de liberação e impedir navegação para o check-in antes da liberação.

## Project Type
MOBILE (React Native / Expo)

## Success Criteria
1. Tarefas extras com `start_time` não atingido são exibidas com estilo bloqueado (cinza com ícone de cadeado e texto indicativo).
2. O clique em uma tarefa bloqueada exibe um alerta explicativo e não navega para a tela de check-in.
3. Tarefas liberadas ou concluídas continuam com o comportamento normal de fluxo e estilo.
4. Sem erros de TypeScript em todo o projeto.

## Tech Stack
- React Native / Expo
- TypeScript

## File Structure
Nenhuma alteração estrutural, apenas modificações no arquivo `app/(tabs)/index.tsx`.

## Task Breakdown

### Task 1: Adicionar start_time e lógica isTimeReleased
- **Agent**: `mobile-developer`
- **Skill**: `clean-code`
- **Priority**: P0
- **Dependencies**: Nenhuma
- **INPUT**: Função `getChallengeExtraTasks` em `app/(tabs)/index.tsx`.
- **OUTPUT**: Função retornando `start_time` e lógica utilitária `isTimeReleased` implementada no escopo.
- **VERIFY**: Compilação TypeScript bem-sucedida.

### Task 2: Modificar renderização da tarja de tarefa extra
- **Agent**: `mobile-developer`
- **Skill**: `frontend-design`
- **Priority**: P0
- **Dependencies**: Task 1
- **INPUT**: Bloco de renderização da tarja da tarefa extra no `index.tsx` e estilos relacionados.
- **OUTPUT**: Nova renderização dinâmica suportando os três estados (Concluído, Liberado e Bloqueado) com o Alerta no toque bloqueado.
- **VERIFY**: Teste no emulador e verificação estética (Rich Aesthetics).

## Phase X: Final Verification
- [x] TypeScript compila com sucesso.
- [x] A tarja bloqueada exibe o texto "(Libera às HH:MM)".
- [x] O clique na tarja bloqueada dispara o alerta correto.
- [x] Não é possível abrir o check-in de tarefas bloqueadas.

## ✅ PHASE X COMPLETE
- Lint: ✅ Pass (TypeScript Type Check: OK)
- Security: ✅ No critical issues
- Build: ✅ Success
- Date: 2026-06-25
