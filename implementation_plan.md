# Trino — Plano de Implementação (MVP)

## Visão Geral

**Trino** é um aplicativo comunitário para cristãos que incentiva hábitos de fé e saúde física por meio de desafios em grupo. O stack é **React Native + Expo** (frontend) e **Supabase** (backend/auth/storage), com design baseado no protótipo Stitch "Fé em Constância".

O MVP será construído como um projeto Expo com navegação entre telas, design system fiel ao Stitch (cores, tipografia, componentes) e dados mockados — sem integração real ao Supabase por enquanto, pois o projeto ainda não foi criado.

---

## User Review Required

> [!IMPORTANT]
> **Dados Mockados no MVP**: Como o projeto Supabase ainda não existe, toda a integração com banco/auth/storage será mockada. O código será estruturado de forma que a troca por chamadas reais ao Supabase seja simples e localizada.

> [!IMPORTANT]
> **Nome do App**: As telas do Stitch usam "Sanctuary" como nome. Deseja manter "Trino" como nome oficial do app nos textos e na splash screen?

> [!WARNING]
> **Expo & React Native**: O projeto será inicializado com `expo-router` (file-based routing), que é o padrão moderno do Expo. Certifique-se de ter Node.js 18+ e o Expo CLI instalados. Se preferir outra versão/configuração do Expo, avise antes de iniciar.

---

## Open Questions

> [!NOTE]
> **Idioma das labels de navegação**: O design do Stitch tem labels em inglês (Home, Challenge, Check-in, Group, Profile). Deseja traduzir para português (Início, Desafio, Check-in, Grupos, Perfil)?

---

## Escopo do MVP — Telas a Construir

Com base no PRD e no design do Stitch, as seguintes telas serão implementadas:

### Autenticação (2 telas)
1. **Splash / Welcome** — Tela de entrada com logo, CTA "Criar conta" e "Entrar"
2. **Login / Cadastro** — Formulário com e-mail/senha + botões Google e Apple

### Core (5 telas)
3. **Home / Dashboard** — Saudação, streak, versículo do dia, card do desafio ativo, atalhos para os 3 hábitos, preview da comunidade
4. **Check-in** — Seleção do hábito (oração/bíblia/exercício), upload de foto/vídeo (simulado), confirmação
5. **Feed do Grupo** — Timeline cronológica de check-ins com foto, reações (emoji)
6. **Ranking / Leaderboard** — Tabela de pontuação do desafio ativo por participante
7. **Tela de Desafio Ativo** — Detalhe do desafio: rounds, progresso, tarefas extras

### Grupos (3 telas)
8. **Meus Grupos** — Lista de grupos do usuário com chips de troca rápida
9. **Criar Desafio** — Setup: nome, datas, rounds (toggle), tarefas extras
10. **Convidar Participantes** — QR Code / link de convite

### Admin (1 tela)
11. **Painel Admin** — Criação de tarefas extras (tipo, pontuação, expiração)

### Perfil & Apoio (2 telas)
12. **Perfil** — Avatar, nome, histórico de streaks, grupos
13. **Apoie o Projeto** — QR Code para doação Pix/Cartão

**Total: 13 telas**

---

## Proposed Changes

### 1. Inicialização do Projeto

#### [NEW] Projeto Expo com Expo Router
```
npx create-expo-app@latest ./ --template blank-typescript
```
Instalar dependências:
- `expo-router` (navegação file-based)
- `@expo/vector-icons` (ícones Material)
- `expo-image-picker` (simulação de upload de mídia)
- `react-native-safe-area-context`
- `react-native-screens`
- `@react-native-async-storage/async-storage`

---

### 2. Design System

#### [NEW] `constants/theme.ts`
Tokens de design extraídos do Stitch:
- **Cores**: primary `#03192e`, secondary `#4a654a`, surface `#fbf9fb`, tertiary `#ae8f64` (gold/âmbar), etc.
- **Tipografia**: Plus Jakarta Sans (display/headline) + Manrope (body/label)
- **Espaçamento**: base 8px, xs/sm/md/lg/xl
- **Border radius**: sm `4px`, DEFAULT `8px`, md `12px`, lg `16px`, xl `24px`, full `9999px`

#### [NEW] `constants/mock-data.ts`
Dados mockados para toda a aplicação:
- Usuário logado
- Lista de grupos
- Desafios e rounds
- Feed de check-ins
- Ranking

---

### 3. Navegação

#### [NEW] `app/_layout.tsx`
Layout raiz com `expo-router` Stack navigator + contexto de autenticação mockado.

#### [NEW] `app/(auth)/_layout.tsx` + telas de auth
Grupo de rotas não autenticadas: `welcome.tsx`, `login.tsx`

#### [NEW] `app/(tabs)/_layout.tsx`
Tab navigator com 5 abas: Home, Desafio, Check-in, Grupos, Perfil

#### [NEW] Rotas de telas
- `app/(tabs)/index.tsx` — Home
- `app/(tabs)/challenge.tsx` — Desafio Ativo
- `app/(tabs)/checkin.tsx` — Check-in
- `app/(tabs)/groups.tsx` — Grupos
- `app/(tabs)/profile.tsx` — Perfil
- `app/feed.tsx` — Feed (modal ou tela separada)
- `app/ranking.tsx` — Ranking
- `app/create-challenge.tsx` — Criar Desafio
- `app/invite.tsx` — Convite
- `app/admin.tsx` — Painel Admin
- `app/support.tsx` — Apoie o Projeto

---

### 4. Componentes Reutilizáveis

#### [NEW] `components/ui/`
- `Button.tsx` — Variantes: primary, secondary, ghost
- `Card.tsx` — Card base com sombra ambiente
- `HabitIcon.tsx` — Ícone circular para os 3 hábitos
- `StreakBadge.tsx` — Badge de fogo com contagem
- `ProgressBar.tsx` — Barra de progresso com gradiente sage green
- `Avatar.tsx` — Avatar circular com fallback de iniciais
- `BottomTabBar.tsx` — Barra de navegação customizada
- `CheckinCard.tsx` — Card do feed com foto, nome, reações
- `RankingRow.tsx` — Linha do leaderboard
- `TaskChip.tsx` — Chip de tarefa extra

---

### 5. Telas (implementação detalhada)

#### Splash / Welcome
Fiel ao protótipo Stitch: fundo com padrão de pontos, anéis concêntricos animados, foto hero com máscara radial, card glassmorphism com CTAs.

#### Home / Dashboard
Bento grid: saudação + streak, versículo do dia, card do desafio ativo com progresso, CTA de check-in centralizado, cards dos 3 hábitos, preview da comunidade.

#### Check-in
Seleção do hábito (3 botões grandes), área de upload simulado (câmera/galeria), campo de texto opcional, botão de confirmação com animação de sucesso.

#### Feed do Grupo
Lista vertical de `CheckinCard`, paginação simulada, reações com emoji (👏❤️🔥), seletor de grupo no topo.

#### Ranking
Pódio animado (top 3) + lista de participantes com pontuação e streak.

#### Tela de Desafio Ativo
Header com nome e datas, progresso do round atual, lista de tarefas extras com status, histórico de rounds.

---

## Verification Plan

### Build & Run
```bash
npx expo start
```
- Verificar que o app inicia sem erros no Expo Go (iOS/Android) ou no emulador
- Navegar entre todas as 13 telas

### Manual Verification
- [ ] Splash screen carrega com animação dos anéis
- [ ] Fluxo de login (mock) redireciona para Home
- [ ] Check-in completo: selecionar hábito → upload → confirmação
- [ ] Feed exibe cards com reações funcionando
- [ ] Ranking mostra pódio e lista corretamente
- [ ] Navegação entre grupos no seletor
- [ ] Tab bar funciona em todas as abas
- [ ] Tela de doação exibe QR Code

---

## Fase 2: Integração com Supabase (Próximos Passos)

Agora que as tabelas foram criadas no banco de dados, o próximo grande passo é substituir os dados *mockados* pela integração real com o Supabase.

### 1. Sincronização de Perfis (Profiles)
- **Problema:** Quando um usuário se cadastra no Supabase Auth (`auth.users`), o registro na tabela `profiles` precisa ser criado.
- **Solução:** Criar uma *Database Trigger* no Supabase para inserir automaticamente o perfil na tabela `profiles` após o cadastro, ou fazer a inserção manualmente após a função `signUp` no app.

### 2. Integração de Dados nas Telas
- **Home (`index.tsx`):** Buscar os grupos do usuário (`group_members`), o desafio ativo do grupo selecionado (`challenges`) e os check-ins de hoje.
- **Check-in (`checkin.tsx`):** Inserir novos registros na tabela `checkins` vinculados ao usuário e ao round atual. Fazer upload real de fotos para o *Supabase Storage* (será necessário criar um *bucket* de storage chamado `checkins`).
- **Grupos (`groups.tsx`):** Buscar e exibir a lista real de grupos e membros.
- **Feed (`feed.tsx`):** Listar os check-ins mais recentes (`checkins` com join em `profiles`).
- **Ranking (`ranking.tsx`):** Calcular e exibir os pontos reais baseados nos check-ins e `tasks` concluídas.

### 3. Autenticação (Ajustes)
- A tela de Login (`login.tsx`) já utiliza os métodos do Supabase, mas precisaremos garantir que o contexto de usuário traga também os dados estendidos da tabela `profiles` (ex: `streak_count`, `avatar_url`).

> [!IMPORTANT]
> **User Review Required:**
> Você já criou um bucket no **Supabase Storage** para armazenar as fotos dos check-ins? Se não, vamos precisar criar um (ex: bucket `checkins` configurado como público). Além disso, prefere que criemos a trigger para a tabela `profiles` no SQL ou prefere que o próprio App insira o perfil após o cadastro?
