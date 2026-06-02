# Discovery Notes — [Trino]
> Arquivo gerado automaticamente durante o workflow /build-saas.
> Fonte de verdade para geração dos PRDs. Não edite manualmente.

## Visão
- **Problema**: Dificuldade em manter a constância tanto na saúde física quanto na vida espiritual. O app resolve isso unindo o cuidado com o corpo, a alma e o espírito de forma simultânea.
- **Público-alvo**: Público cristão que busca crescimento espiritual e físico através de motivação em grupo.
- **Referência**: Gym Rats (focado em mecânica de grupos, desafios com períodos definidos e check-ins diários).
- **Pitch**: Um aplicativo comunitário para cristãos que incentiva a prática de exercícios físicos e disciplinas bíblicas (oração e leitura) por meio de desafios em grupo e check-ins diários.

## Funcionalidades
- **Core Loop**: Check-in diário de 3 hábitos: oração, leitura bíblica e exercícios físicos.
- **Comunidade e Gamificação**: 
  - Desafios em grupos fechados (prestação de contas).
  - Períodos de desafio entre 1 semana (mínimo) e 1 ano (máximo).
  - Opção de divisão em "rounds" (ex: a pontuação zera a cada round para manter o engajamento de todos, e vence o desafio quem ganhar mais rounds).
  - Validação diária: Regra básica é validar no dia vigente. Se houver atraso (dentro de um limite máximo definido), o check-in é aceito com 50% de penalidade na pontuação daquela atividade.
  - Pontuação base (oração, leitura, exercícios) e streak.
  - Administradores do grupo podem criar "tarefas extras" semanais com pontuação extra definida previamente.
  - Feed de incentivo entre os participantes.
- **Inteligência Artificial**: Sem uso de IA. O foco é 100% na interação real e humana entre os usuários.
- **Upload de Mídia**: O aplicativo exigirá upload de fotos ou vídeos para validação dos check-ins diários.
- **Autenticação**: Login simples (e-mail/senha) e Login Social (Google e Apple).

## Monetização
- **Modelo**: 100% gratuito para os usuários.
- **Receita**: Baseado em ofertas/doações voluntárias. Haverá um QR Code direcionando para um checkout de pagamento (Pix ou Cartão de Crédito) sem valor mínimo.
## Técnico
- **Stack Frontend**: React Native com Expo (permite exportar como aplicativo nativo para iOS/Android e também como PWA/Web App usando o mesmo código base).
- **Stack Backend/Database**: Supabase (PostgreSQL, Auth e Storage).
## Contexto
- **Design/Estilo Visual**: Acolhedor, moderno, limpo, espiritual (sem exageros), motivador, fácil de usar e com aparência premium porém simples.
- **Público-alvo Detalhado**: Cristãos em geral, jovens, líderes de célula, igrejas locais, pequenos grupos, casais e famílias.
- **Referências Atuais**: Existe um esboço de telas feito no Google Stitch que servirá de base (precisará de adaptações).
- **Prazo MVP**: Não há um prazo rigoroso definido.
## PRD — User Stories
- **Como participante**, quero registrar meu check-in diário com fotos/vídeos para manter meu streak e provar que cumpri meus hábitos.
  - *Critérios de aceite*: Upload de mídia obrigatório, bloqueio de check-ins falsos, cálculo automático de atrasos (50% de penalidade) se permitido pelo grupo.
- **Como participante**, quero ver o feed de atividades do meu grupo para me sentir incentivado e incentivar os outros.
  - *Critérios de aceite*: Feed ordenado cronologicamente com as fotos/vídeos dos outros, opção de dar likes/reações.
- **Como administrador do grupo**, quero criar desafios com rounds e duração customizada para manter minha igreja/célula engajada a longo prazo.
  - *Critérios de aceite*: Setup de datas (1 semana a 1 ano), definição de rounds (opcional), e envio de convites (link/código).
- **Como administrador do grupo**, quero poder adicionar tarefas extras semanais para dar dinamicidade ao desafio.
  - *Critérios de aceite*: Criar a tarefa escolhendo entre 3 tipos (gerais, de presença e de pontualidade), definir pontuação extra e determinar a data de expiração da tarefa.
- **Como usuário**, quero poder apoiar o aplicativo voluntariamente escaneando um QR Code para ajudar na manutenção do app gratuito.
  - *Critérios de aceite*: Tela de apoio visível, gerando checkout sem valor mínimo.
- **Como participante**, quero poder participar de vários grupos ao mesmo tempo.
  - *Critérios de aceite*: Navegação que permita trocar entre os grupos ativos sem perder os dados de cada desafio separadamente.
## PRD — Requisitos Funcionais

**1. Autenticação & Usuários**
- Login social (Google/Apple) e login por E-mail/Senha.
- Gerenciamento de perfil básico.

**2. Core Features (Check-in e Hábitos)**
- Sistema de check-in diário com upload obrigatório de mídia (foto/vídeo) focado em: Leitura Bíblica, Oração e Exercícios Físicos.
- Regra de Atraso: Cálculo de check-in atrasado aplicando penalidade de 50% na pontuação da atividade (dentro do limite configurado).
- Cálculo e exibição de "Streak" (ofensiva diária).
- Suporte a múltiplos grupos (navegação e isolamento de dados por desafio).

**3. Comunidade (Grupos & Desafios)**
- Criação de desafios com duração customizada (1 semana a 1 ano).
- Opção de divisão em "Rounds" (zerando a pontuação parcial, mas acumulando vitórias de rounds).
- Feed de atividades cronológico do grupo com reações (curtidas).
- Ranking/Leaderboard atualizado em tempo real.

**4. Gestão Admin e Tarefas Extras**
- Painel para o administrador criar Tarefas Extras com prazo de expiração.
- Categorização em 3 tipos de tarefas extras: Gerais, Presença e Pontualidade.

**5. Doações**
- Tela "Apoie o Projeto" que exibe um QR Code gerando um link de checkout (Pix/Cartão) sem valor mínimo.
## PRD — Requisitos Não-Funcionais

**1. Segurança**
- Autenticação e Autorização via Supabase Auth (RLS - Row Level Security garantindo que usuários só acessem dados dos seus próprios grupos).
- Isolamento de dados multi-tenant (os dados de um grupo nunca vazam para outro).

**2. Performance**
- Paginação no feed de atividades para garantir carregamento rápido (ex: 20 posts por vez).
- Otimização de mídia (compressão de fotos/vídeos antes do upload) para poupar banda e espaço no Supabase Storage.

**3. UX/UI**
- Suporte a Dark Mode e Light Mode.
- Loading states consistentes (esqueletos ou spinners) para ações de rede.
- Interface acessível com botões grandes e legíveis.
## Database — Entidades e Relações

**Regras Gerais de Exclusão:**
- Soft Delete (campo `deleted_at`) para `groups`, `challenges`, e `extra_tasks`.
- Hard Delete (apagar o registro e a mídia do Storage) para `checkins`.

**Tabelas e Relacionamentos:**
1. `users`: id (UUID), name, email, avatar_url, created_at
2. `groups`: id (UUID), name, description, created_at, deleted_at
3. `group_members`: id, group_id (FK), user_id (FK), role (admin/member), joined_at
4. `challenges`: id, group_id (FK), name, start_date, end_date, deleted_at
5. `rounds`: id, challenge_id (FK), start_date, end_date, round_number
6. `checkins`: id, user_id (FK), round_id (FK), challenge_id (FK), type (prayer/bible/exercise), media_url, is_late (boolean), created_at
7. `extra_tasks`: id, challenge_id (FK), title, type (general/presence/punctuality), points, expires_at, deleted_at
8. `user_extra_tasks`: id, task_id (FK), user_id (FK), completed_at
9. `feed_reactions`: id, checkin_id (FK), user_id (FK), emoji_type

**Triggers & Indexes:**
- Trigger: Criar registro em `users` automaticamente após signup no Supabase Auth.
- Indexes: Nas foreign keys (`group_id`, `user_id`, `challenge_id`) para performance no feed.

**Segurança (RLS):**
- SELECT em `checkins` e `groups` liberado apenas se `auth.uid() IN (select user_id from group_members where group_id = x)`.
## Backend — Endpoints e Integrações
**Arquitetura Base:**
- O aplicativo consumirá o banco de dados e autenticação diretamente via Supabase SDK no React Native (BaaS). Não haverá uma API intermediária customizada no MVP.
- Todo o controle de acesso é feito via RLS (Row Level Security) e JWT no banco.

**Lógica Complexa / Edge Functions:**
- Funções serverless (Supabase Edge Functions) poderão ser usadas apenas se necessário para tarefas sensíveis (ex: processar os pagamentos/doações do QR Code se integrado com alguma API) ou cron jobs (ex: rotina diária para validar quem perdeu o *streak* à meia-noite).

**Integrações Externas:**
- Gateway de Pagamento para doações (checkout link).
- Serviço de Notificações Push via Expo Push API (para alertas de fim do dia, novas tarefas e reações no feed).
## Frontend — Páginas e Componentes
## Frontend — Design System
## Security — Decisões
