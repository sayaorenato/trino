# Plan: Home Today Tasks Filter

## Overview
Filtrar as tarefas extras exibidas na Home (`index.tsx`) na seção "Check-ins de Hoje" para que apareçam somente as tarefas extras do dia de hoje (dia vigente). O progresso do dia também deve ser recalculado com base nesse filtro.

## Project Type
MOBILE (React Native / Expo)

## Success Criteria
1. Apenas tarefas extras cujo `expires_at` é hoje são listadas no dashboard na seção "Check-ins de Hoje".
2. O contador de tarefas de "Hoje" na Home é consistente com os itens exibidos visualmente na lista.
3. Não há erros de tipo TypeScript após a modificação do arquivo `index.tsx`.

## Tech Stack
- React Native / Expo
- TypeScript

## File Structure
Nenhuma alteração na estrutura de arquivos, apenas edição em `app/(tabs)/index.tsx`.

## Task Breakdown

### Task 1: Modificar lógica de getChallengeExtraTasks
- **Agent**: `mobile-developer`
- **Skill**: `clean-code`
- **Priority**: P0
- **Dependencies**: Nenhuma
- **INPUT**: Função `getChallengeExtraTasks` em `app/(tabs)/index.tsx`.
- **OUTPUT**: Função filtrando tarefas pelo dia vigente local do dispositivo e retornando o campo `expires_at`.
- **VERIFY**: Inspecionar o código e executar `npx tsc --noEmit`.

### Task 2: Verificação do progresso diário
- **Agent**: `mobile-developer`
- **Skill**: `testing-patterns`
- **Priority**: P1
- **Dependencies**: Task 1
- **INPUT**: Lógica de renderização e contador de progresso diário na Home.
- **OUTPUT**: Contador exibindo a contagem correta de hábitos + tarefas extras do dia.
- **VERIFY**: Teste de interface visual no simulador ou Web.

## Phase X: Final Verification
- [x] O compilador de TypeScript finaliza com sucesso.
- [x] Tarefas extras antigas (expiradas) não aparecem na Home.
- [x] A tarefa extra do dia aparece na Home.
- [x] O contador de progresso reflete exatamente os itens exibidos.

## ✅ PHASE X COMPLETE
- Lint: ✅ Pass (TypeScript Type Check: OK)
- Security: ✅ No critical issues
- Build: ✅ Success
- Date: 2026-06-25
