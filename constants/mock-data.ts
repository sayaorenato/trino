export interface User {
  id: string;
  name: string;
  avatar_url: string;
  streak: number;
  longest_streak: number;
  total_points: number;
  email: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  members_count: number;
  active_challenge_id?: string;
  role: 'admin' | 'member';
  challenge?: any;
}

export let USER_MOCK_GROUPS: any[] = [];

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export interface ChallengeRequest {
  id: string;
  challenge_id: string;
  challenge_name: string;
  group_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  status: 'pending' | 'approved' | 'declined';
}

export let CHALLENGE_REQUESTS: ChallengeRequest[] = [];

export async function getMockRankings(): Promise<Record<string, RankingMember[]>> {
  try {
    const data = await AsyncStorage.getItem('TRINO_MOCK_RANKINGS');
    if (data) {
      const parsed = JSON.parse(data);
      console.log('[MOCK_DATA] Rankings carregados do AsyncStorage para emulação:', Object.keys(parsed));
      Object.assign(MOCK_RANKINGS, parsed);
    }

    // Sincronizar participantes reais do Supabase (challenge_members)
    const { data: dbMembers, error } = await supabase
      .from('challenge_members')
      .select(`
        challenge_id,
        user_id,
        profiles (
          id,
          full_name,
          avatar_url
        )
      `);

    if (!error && dbMembers) {
      console.log('[MOCK_DATA] Sincronizando', dbMembers.length, 'membros de desafios do Supabase.');
      
      // Limpar chaves reais (que não começam com 'chal') para recarregar do banco
      Object.keys(MOCK_RANKINGS).forEach(key => {
        if (!key.startsWith('chal')) {
          delete MOCK_RANKINGS[key];
        }
      });

      dbMembers.forEach((m: any) => {
        const cId = m.challenge_id;
        if (!MOCK_RANKINGS[cId]) {
          MOCK_RANKINGS[cId] = [];
        }
        const alreadyIn = MOCK_RANKINGS[cId].some(x => x.user_id === m.user_id);
        if (!alreadyIn) {
          MOCK_RANKINGS[cId].push({
            user_id: m.user_id,
            name: m.profiles?.full_name || 'Participante',
            avatar_url: m.profiles?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
            points: 0,
            streak: 0,
            rounds_won: 0
          });
        }
      });
    } else if (error) {
      console.error('[MOCK_DATA] Erro ao buscar membros de desafios no Supabase:', error);
    }

    return MOCK_RANKINGS;
  } catch (e) {
    console.error('Erro ao ler mock rankings:', e);
    return MOCK_RANKINGS;
  }
}

export async function saveMockRankings(): Promise<void> {
  try {
    console.log('[MOCK_DATA] Salvando rankings no AsyncStorage...');
    await AsyncStorage.setItem('TRINO_MOCK_RANKINGS', JSON.stringify(MOCK_RANKINGS));
  } catch (e) {
    console.error('Erro ao salvar mock rankings:', e);
  }
}

export async function removeRankingMember(challengeId: string, userId: string): Promise<void> {
  if (MOCK_RANKINGS[challengeId]) {
    MOCK_RANKINGS[challengeId] = MOCK_RANKINGS[challengeId].filter(m => m.user_id !== userId);
    console.log('[MOCK_DATA] removeRankingMember de fato filtrou o membro:', userId, 'do desafio:', challengeId);
    await saveMockRankings();

    // Se for desafio real do Supabase, remover do banco
    if (!challengeId.startsWith('chal')) {
      const { error } = await supabase
        .from('challenge_members')
        .delete()
        .eq('challenge_id', challengeId)
        .eq('user_id', userId);
      if (error) {
        console.error('[MOCK_DATA] Erro ao remover membro do desafio no Supabase:', error);
      } else {
        console.log('[MOCK_DATA] Membro do desafio removido do Supabase:', challengeId, userId);
      }
    }
  }
}

export async function getChallengeRequests(): Promise<ChallengeRequest[]> {
  try {
    const data = await AsyncStorage.getItem('TRINO_CHALLENGE_REQUESTS');
    const reqs = data ? JSON.parse(data) : [];

    // Juntar com dados reais do Supabase
    const { data: dbRequests, error } = await supabase
      .from('challenge_requests')
      .select(`
        id,
        challenge_id,
        group_id,
        user_id,
        status,
        created_at,
        profiles (
          id,
          full_name,
          avatar_url
        ),
        challenges (
          id,
          title
        )
      `);

    let parsedDbRequests: ChallengeRequest[] = [];
    if (!error && dbRequests) {
      parsedDbRequests = dbRequests.map((r: any) => ({
        id: r.id,
        challenge_id: r.challenge_id,
        challenge_name: r.challenges?.title || 'Desafio',
        group_id: r.group_id,
        user_id: r.user_id,
        user_name: r.profiles?.full_name || 'Participante',
        user_avatar: r.profiles?.avatar_url || null,
        status: r.status as 'pending' | 'approved' | 'declined'
      }));
      console.log('[MOCK_DATA] getChallengeRequests do Supabase carregado:', parsedDbRequests.length, 'solicitações.');
    } else if (error) {
      console.error('[MOCK_DATA] Erro ao ler solicitações do Supabase:', error);
    }

    // Filtrar somente as solicitações de desafios mockados da lista local do AsyncStorage
    const mockRequests = reqs.filter((r: any) => r.challenge_id.startsWith('chal'));

    const combined = [...mockRequests, ...parsedDbRequests];
    CHALLENGE_REQUESTS = combined;
    return combined;
  } catch (e) {
    console.error('Erro ao ler mock data do AsyncStorage:', e);
    return [];
  }
}

export async function saveChallengeRequests(requests: ChallengeRequest[]): Promise<void> {
  try {
    CHALLENGE_REQUESTS = requests;
    console.log('[MOCK_DATA] saveChallengeRequests salvando:', requests.length, 'solicitações no AsyncStorage.');
    await AsyncStorage.setItem('TRINO_CHALLENGE_REQUESTS', JSON.stringify(requests));

    // Sincronizar com o Supabase para solicitações em desafios reais
    for (const r of requests) {
      const isMockChallenge = r.challenge_id.startsWith('chal');
      if (!isMockChallenge) {
        // Tentar primeiro atualizar a solicitação existente no banco
        const { data: updated, error: updateError } = await supabase
          .from('challenge_requests')
          .update({ status: r.status })
          .eq('challenge_id', r.challenge_id)
          .eq('user_id', r.user_id)
          .select();

        if (updateError) {
          console.error('[MOCK_DATA] Erro ao atualizar solicitação no Supabase:', updateError);
        } else if (!updated || updated.length === 0) {
          // Se não encontrou nenhuma linha para atualizar e é uma solicitação pendente nova
          if (r.status === 'pending') {
            const { error: insertError } = await supabase
              .from('challenge_requests')
              .insert({
                challenge_id: r.challenge_id,
                group_id: r.group_id,
                user_id: r.user_id,
                status: 'pending'
              });
            if (insertError) {
              console.error('[MOCK_DATA] Erro ao criar nova solicitação no Supabase:', insertError);
            }
          }
        } else {
          console.log('[MOCK_DATA] Status da solicitação sincronizado com sucesso no Supabase:', r.challenge_id, r.user_id, r.status);
        }

        // Se foi aprovada, garantir a inserção na tabela challenge_members
        if (r.status === 'approved') {
          const { error: memberError } = await supabase
            .from('challenge_members')
            .upsert({
              challenge_id: r.challenge_id,
              user_id: r.user_id
            }, { onConflict: 'challenge_id,user_id' });
          if (memberError) {
            console.error('[MOCK_DATA] Erro ao inserir membro no desafio no Supabase:', memberError);
          } else {
            console.log('[MOCK_DATA] Membro inserido com sucesso no desafio no Supabase:', r.challenge_id, r.user_id);
          }
        }
      }
    }
  } catch (e) {
    console.error('Erro ao salvar mock data no AsyncStorage:', e);
  }
}

export async function loadPersistedMockData() {
  await getChallengeRequests();
  await getMockRankings();
}

export async function savePersistedMockData() {
  await saveChallengeRequests(CHALLENGE_REQUESTS);
  await saveMockRankings();
}

export function clearMockSession() {
  USER_MOCK_GROUPS.length = 0;
}

export interface Challenge {
  id: string;
  group_id: string;
  name: string;
  start_date: string;
  end_date: string;
  total_rounds: number;
  current_round: number;
  rules: string;
}

export interface Round {
  id: string;
  challenge_id: string;
  round_number: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'upcoming';
}

export type HabitType = 'prayer' | 'bible' | 'exercise';

export interface Checkin {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  group_id: string;
  habit_type: HabitType;
  media_url: string;
  is_late: boolean;
  caption?: string;
  points: number;
  created_at: string;
  reactions: {
    emoji: string;
    users: string[]; // ids dos usuários que reagiram
  }[];
}

export interface RankingMember {
  user_id: string;
  name: string;
  avatar_url: string;
  points: number;
  streak: number;
  rounds_won: number;
  position?: number;
}

export interface ExtraTask {
  id: string;
  challenge_id: string;
  title: string;
  description: string;
  type: 'general' | 'presence' | 'punctuality';
  points: number;
  expires_at: string;
  completed_by: string[]; // ids dos usuários que completaram
  start_time?: string; // Horário de início no formato "HH:MM"
  active?: boolean;
}

// ---------------- MOCK DATA ----------------

export const MOCK_CURRENT_USER: User = {
  id: 'user_1',
  name: 'Renato Mello',
  avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
  streak: 12,
  longest_streak: 24,
  total_points: 1340,
  email: 'renato@trino.app',
};

export const MOCK_USERS: Record<string, User> = {
  'user_1': MOCK_CURRENT_USER,
  'user_2': {
    id: 'user_2',
    name: 'Sarah Souza',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    streak: 8,
    longest_streak: 15,
    total_points: 1120,
    email: 'sarah@trino.app',
  },
  'user_3': {
    id: 'user_3',
    name: 'Mateus Oliveira',
    avatar_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
    streak: 15,
    longest_streak: 30,
    total_points: 1450,
    email: 'mateus@trino.app',
  },
  'user_4': {
    id: 'user_4',
    name: 'Amanda Costa',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80',
    streak: 5,
    longest_streak: 10,
    total_points: 890,
    email: 'amanda@trino.app',
  },
  'user_5': {
    id: 'user_5',
    name: 'Thiago Neves',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    streak: 0,
    longest_streak: 18,
    total_points: 620,
    email: 'thiago@trino.app',
  }
};

export const MOCK_GROUPS: Group[] = [
  {
    id: 'group_1',
    name: 'Célula Videira',
    description: 'Grupo da nossa célula para crescer espiritualmente e manter o corpo ativo na fé!',
    members_count: 8,
    active_challenge_id: 'chal_1',
    role: 'admin',
  },
  {
    id: 'group_2',
    name: 'Jovens IMC',
    description: 'Desafio trimestral da mocidade da Igreja Metodista Central. Foco e constância!',
    members_count: 24,
    active_challenge_id: 'chal_2',
    role: 'member',
  },
  {
    id: 'group_3',
    name: 'Família em Ação',
    description: 'Pequeno grupo familiar para prestação de contas diária de hábitos de oração e treinos.',
    members_count: 5,
    active_challenge_id: undefined,
    role: 'admin',
  }
];

const now = new Date();
const fmt = (d: Date) => d.toISOString().split('T')[0];
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

// Datas dinâmicas: início 60 dias atrás, fim 120 dias à frente
const CHAL_START = fmt(addDays(now, -60));
const CHAL_END   = fmt(addDays(now, 120));

export const MOCK_CHALLENGES: Record<string, Challenge> = {
  'chal_1': {
    id: 'chal_1',
    group_id: 'group_1',
    name: 'Fé em Constância',
    start_date: CHAL_START,
    end_date: CHAL_END,
    total_rounds: 8,
    current_round: 4,
    rules: 'Check-in diário obrigatório de: 1. Oração (mín. 15min), 2. Leitura Bíblica (mín. 3 caps), 3. Exercício Físico (mín. 30min). Os check-ins devem conter foto de validação.',
  },
  'chal_2': {
    id: 'chal_2',
    group_id: 'group_2',
    name: 'Mocidade Forte',
    start_date: CHAL_START,
    end_date: CHAL_END,
    total_rounds: 3,
    current_round: 2,
    rules: 'Manter a chama acesa! Atividades físicas e oração. Check-in com foto obrigatório.',
  }
};

// Rounds dinâmicos: round anterior, ativo e próximo baseados em today
const ROUND_PREV_START  = fmt(addDays(now, -14));
const ROUND_PREV_END    = fmt(addDays(now, -7));
const ROUND_CURR_START  = fmt(addDays(now, -7));
const ROUND_CURR_END    = fmt(addDays(now,  7));
const ROUND_NEXT_START  = fmt(addDays(now,  7));
const ROUND_NEXT_END    = fmt(addDays(now, 14));

export const MOCK_ROUNDS: Record<string, Round[]> = {
  'chal_1': [
    { id: 'round_1_1', challenge_id: 'chal_1', round_number: 1, start_date: ROUND_PREV_START, end_date: ROUND_PREV_END, status: 'completed' },
    { id: 'round_1_2', challenge_id: 'chal_1', round_number: 2, start_date: ROUND_CURR_START, end_date: ROUND_CURR_END, status: 'active' },
    { id: 'round_1_3', challenge_id: 'chal_1', round_number: 3, start_date: ROUND_NEXT_START, end_date: ROUND_NEXT_END, status: 'upcoming' },
  ],
  'chal_2': [
    { id: 'round_2_1', challenge_id: 'chal_2', round_number: 1, start_date: ROUND_PREV_START, end_date: ROUND_PREV_END, status: 'completed' },
    { id: 'round_2_2', challenge_id: 'chal_2', round_number: 2, start_date: ROUND_CURR_START, end_date: ROUND_CURR_END, status: 'active' },
  ],
};

export const MOCK_RANKINGS: Record<string, RankingMember[]> = {
  'chal_1': [
    { user_id: 'user_3', name: 'Mateus Oliveira', avatar_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80', points: 345, streak: 15, rounds_won: 2 },
    { user_id: 'user_1', name: 'Renato Mello', avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80', points: 320, streak: 12, rounds_won: 1 },
    { user_id: 'user_2', name: 'Sarah Souza', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', points: 290, streak: 8, rounds_won: 0 },
    { user_id: 'user_4', name: 'Amanda Costa', avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80', points: 210, streak: 5, rounds_won: 0 },
    { user_id: 'user_5', name: 'Thiago Neves', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', points: 120, streak: 0, rounds_won: 0 },
  ],
  'chal_2': [
    { user_id: 'user_1', name: 'Renato Mello', avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80', points: 1020, streak: 12, rounds_won: 1 },
    { user_id: 'user_3', name: 'Mateus Oliveira', avatar_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80', points: 980, streak: 15, rounds_won: 0 },
  ]
};

const getRelativeDate = (offsetDays: number, hourStr = '23:59:59') => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const dateStr = d.toISOString().split('T')[0];
  return `${dateStr}T${hourStr}Z`;
};

export const MOCK_EXTRA_TASKS: Record<string, ExtraTask[]> = {
  'chal_1': [
    {
      id: 'task_1',
      challenge_id: 'chal_1',
      title: 'Vigília da Célula',
      description: 'Participar da vigília da célula na sexta-feira e fazer um check-in de presença.',
      type: 'presence',
      points: 50,
      expires_at: getRelativeDate(-2, '23:59:59'),
      completed_by: ['user_2', 'user_3'],
      start_time: '19:30',
    },
    {
      id: 'task_2',
      challenge_id: 'chal_1',
      title: 'Devocional de Madrugada',
      description: 'Fazer o devocional e oração antes das 06:00 da manhã.',
      type: 'punctuality',
      points: 30,
      expires_at: getRelativeDate(-1, '23:59:59'),
      completed_by: ['user_2', 'user_3'],
      start_time: '06:00',
    },
    {
      id: 'task_3',
      challenge_id: 'chal_1',
      title: 'Ajudar no Social',
      description: 'Apoiar o projeto social da igreja no sábado, entregando donativos.',
      type: 'general',
      points: 80,
      expires_at: getRelativeDate(0, '23:59:59'), // expira hoje
      completed_by: [],
    }
  ]
};

export const MOCK_FEED: Checkin[] = [
  {
    id: 'check_1',
    user_id: 'user_3',
    user_name: 'Mateus Oliveira',
    user_avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
    group_id: 'group_1',
    habit_type: 'exercise',
    media_url: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=600&q=80', // Corrida/Caminhada
    is_late: false,
    caption: 'Corrida matinal de 5km paga! O templo do Espírito Santo está ativo.',
    points: 10,
    created_at: '2026-05-26T07:30:00Z',
    reactions: [
      { emoji: '🔥', users: ['user_1', 'user_2'] },
      { emoji: '👏', users: ['user_4'] }
    ]
  },
  {
    id: 'check_2',
    user_id: 'user_2',
    user_name: 'Sarah Souza',
    user_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    group_id: 'group_1',
    habit_type: 'bible',
    media_url: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab90?auto=format&fit=crop&w=600&q=80', // Bíblia/Estudo
    is_late: false,
    caption: 'Lendo Romanos 8 hoje. Que palavra edificante para a nossa caminhada! 🙌📖',
    points: 10,
    created_at: '2026-05-26T08:15:00Z',
    reactions: [
      { emoji: '❤️', users: ['user_1', 'user_3'] },
      { emoji: '🙌', users: ['user_5'] }
    ]
  },
  {
    id: 'check_3',
    user_id: 'user_1',
    user_name: 'Renato Mello',
    user_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    group_id: 'group_1',
    habit_type: 'prayer',
    media_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80', // Ambiente de oração/vela/café
    is_late: false,
    caption: 'Tempo precioso de intercessão pelo nosso grupo hoje pela manhã. Oração é a chave.',
    points: 10,
    created_at: '2026-05-26T06:30:00Z',
    reactions: [
      { emoji: '🙌', users: ['user_2', 'user_3'] },
      { emoji: '🔥', users: ['user_4'] }
    ]
  },
  {
    id: 'check_4',
    user_id: 'user_4',
    user_name: 'Amanda Costa',
    user_avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80',
    group_id: 'group_1',
    habit_type: 'exercise',
    media_url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80', // Academia
    is_late: true, // Atrasado
    caption: 'Treino feito à noite! Cheguei cansada mas fui. Check-in atrasado conta pela metade mas conta!',
    points: 5,
    created_at: '2026-05-25T23:45:00Z',
    reactions: [
      { emoji: '👏', users: ['user_1'] }
    ]
  }
];

export const HABIT_LABELS = {
  prayer: {
    title: 'Oração',
    description: 'Mínimo de 15 minutos diários',
    icon: 'hands-pray' as const, // Ícone customizado ou Material
    color: '#ae8f64',
    points: 10,
  },
  bible: {
    title: 'Leitura Bíblica',
    description: 'Mínimo de 3 capítulos',
    icon: 'book-open-variant' as const,
    color: '#03192e',
    points: 10,
  },
  exercise: {
    title: 'Exercício Físico',
    description: 'Mínimo de 30 minutos',
    icon: 'run-fast' as const,
    color: '#4a654a',
    points: 10,
  }
};

export interface ChallengeInvitation {
  id: string;
  challenge_id: string;
  challenge_name: string;
  group_name: string;
  invited_user_id: string;
  invited_user_name: string;
  status: 'pending' | 'accepted' | 'declined';
}

export const MOCK_CHALLENGE_INVITATIONS: ChallengeInvitation[] = [];
