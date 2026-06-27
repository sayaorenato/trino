# Plan: Admin Ban Member

## Overview
Implementar o fluxo e suporte visual/lógico para banir (remover de forma definitiva) um participante do grupo na aba de membros do painel de administração (`admin.tsx`), adicionando suporte para manipulação de dados mockados locais.

## Project Type
MOBILE (React Native / Expo)

## Success Criteria
1. O painel admin exibe a lista de membros de grupos mockados locais na aba "Participantes".
2. O alerta de remoção é textualizado claramente com o termo "Banir".
3. A remoção de membros de grupos mockados remove o usuário da lista local e do `MOCK_RANKINGS`.
4. Sem erros de TypeScript em todo o projeto.

## Tech Stack
- React Native / Expo
- TypeScript

## File Structure
Nenhuma alteração estrutural, modificações nos arquivos `lib/api.ts` e `app/admin.tsx`.

## Task Breakdown

### Task 1: Adicionar suporte a mocks em getGroupMembers
- **Agent**: `mobile-developer`
- **Skill**: `api-patterns`
- **Priority**: P0
- **Dependencies**: Nenhuma
- **INPUT**: Função `getGroupMembers` em `lib/api.ts`.
- **OUTPUT**: Função retornando participantes mockados caso o `groupId` seja mockado.
- **VERIFY**: Executar compilador TypeScript (`npx tsc --noEmit`).

### Task 2: Modificar handleRemoveMember e interface no admin.tsx
- **Agent**: `mobile-developer`
- **Skill**: `clean-code`
- **Priority**: P0
- **Dependencies**: Task 1
- **INPUT**: Função `handleRemoveMember` e Alerta correspondente em `app/admin.tsx`.
- **OUTPUT**: Lógica de suporte a mocks na exclusão e textos do Alerta alterados para o termo "Banir".
- **VERIFY**: Teste de fluxo e comportamento no painel admin local.

## Phase X: Final Verification
- [x] TypeScript compila com sucesso.
- [x] O admin lista os participantes mockados na aba membros.
- [x] O alerta exibe as strings com o termo "Banir".
- [x] Banir um membro mockado atualiza os rankings locais do desafio.

## ✅ PHASE X COMPLETE
- Lint: ✅ Pass (TypeScript Type Check: OK)
- Security: ✅ No critical issues
- Build: ✅ Success
- Date: 2026-06-26
