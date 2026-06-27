import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Button } from '../../components/ui/Button';
import { WebContainer } from '../../components/ui/WebContainer';
import { useAuth } from '../../context/auth';
import { supabase } from '../../lib/supabase';
import { 
  MOCK_GROUPS, 
  MOCK_CHALLENGES, 
  MOCK_ROUNDS, 
  MOCK_EXTRA_TASKS, 
  MOCK_RANKINGS,
  CHALLENGE_REQUESTS,
  ExtraTask,
  RankingMember
} from '../../constants/mock-data';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, SHADOWS } from '../../constants/theme';

export default function ChallengeScreen() {
  const router = useRouter();
  const { challengeId } = useLocalSearchParams<{ challengeId?: string }>();
  const { user } = useAuth();
  
  // Obter o ID do desafio atual (dinâmico ou padrão)
  const currentChallengeId = challengeId || 'chal_1';
  
  const [challenge, setChallenge] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const [userRole, setUserRole] = useState<'admin' | 'member'>('member');
  const [rounds, setRounds] = useState<any[]>([]);
  const [extraTasks, setExtraTasks] = useState<ExtraTask[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de controle de acesso a desafios
  const [hasNoAccess, setHasNoAccess] = useState(false);
  const [hasNoChallenges, setHasNoChallenges] = useState(false);
  
  // Estado para armazenar o ranking dinâmico
  const [rankingData, setRankingData] = useState<RankingMember[]>([]);

  // Trigger para recarregar solicitações e ranking na aprovação
  const [reqTrigger, setReqTrigger] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setHasNoAccess(false);
      setHasNoChallenges(false);

      // 1. Descobrir todos os grupos e desafios que o usuário realmente participa
      const { api } = require('../../lib/api');
      api.getDashboardData(user.id).then(async ({ groups: userGroups }: any) => {
        const allowedChallenges: any[] = [];
        
        userGroups.forEach((g: any) => {
          if (!g.challenges || !Array.isArray(g.challenges)) return;
          g.challenges.forEach((c: any) => {
            const ranking = MOCK_RANKINGS[c.id] || [];
            const isUserAdmin = g.role === 'admin';
            const userParticipates = isUserAdmin || ranking.some((m: any) => m.user_id === user.id);
            
            if (userParticipates) {
              allowedChallenges.push({
                groupId: g.id,
                groupName: g.name,
                challengeId: c.id,
                challengeTitle: c.title || c.name || 'Desafio',
                rounds: c.rounds || [],
                isMock: g.id?.startsWith('group')
              });
            }
          });
        });

        // Se o usuário não participa de NENHUM desafio
        if (allowedChallenges.length === 0) {
          setHasNoChallenges(true);
          setLoading(false);
          return;
        }

        // Determinar qual desafio carregar
        let targetChallengeId = challengeId;
        if (!targetChallengeId) {
          // Se não especificou ID, pega o primeiro que ele tem acesso
          targetChallengeId = allowedChallenges[0].challengeId;
        } else {
          // Se especificou ID, verifica se ele de fato tem acesso
          const hasAccessToTarget = allowedChallenges.some(ac => ac.challengeId === targetChallengeId);
          if (!hasAccessToTarget) {
            setHasNoAccess(true);
            setLoading(false);
            return;
          }
        }

        // 2. Carregar os dados do desafio selecionado
        const selectedAllowed = allowedChallenges.find(ac => ac.challengeId === targetChallengeId);
        
        // Buscar dados no Supabase ou no mock
        if (selectedAllowed.isMock) {
          const mockChal = MOCK_CHALLENGES[targetChallengeId!];
          setChallenge(mockChal);
          const mockGroup = MOCK_GROUPS.find(g => g.id === mockChal.group_id) || MOCK_GROUPS[0];
          setGroup(mockGroup);
          setUserRole(mockGroup.role || 'member');
          setRounds(MOCK_ROUNDS[targetChallengeId!] || []);
          setExtraTasks((MOCK_EXTRA_TASKS[targetChallengeId!] || []).filter((t: ExtraTask) => t.active !== false));
          
          // Carrega o ranking do Mock
          const mRank = MOCK_RANKINGS[targetChallengeId!] || [
            {
              user_id: user.id,
              name: user.email?.split('@')[0] || 'Renato Mello',
              avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
              points: 0,
              streak: 12,
              rounds_won: 0
            }
          ];
          setRankingData(mRank);
          setLoading(false);
        } else {
          supabase
            .from('challenges')
            .select('*, groups(*), rounds(*)')
            .eq('id', targetChallengeId)
            .maybeSingle()
            .then(async ({ data, error }) => {
              if (data && !error) {
                setChallenge({
                  id: data.id,
                  group_id: data.group_id,
                  name: data.title || data.name,
                  start_date: data.start_date,
                  end_date: data.end_date,
                  total_rounds: data.rounds?.length || 1,
                  current_round: data.rounds?.filter((r: any) => new Date(r.end_date) < new Date()).length + 1 || 1,
                  rules: data.rules || 'Sem regras cadastradas.'
                });
                setGroup(data.groups);
                
                // Buscar role no grupo
                const { data: memberData } = await supabase
                  .from('group_members')
                  .select('role')
                  .eq('group_id', data.group_id)
                  .eq('user_id', user.id)
                  .maybeSingle();
                setUserRole(memberData?.role as 'admin' | 'member' || 'member');

                // Ordenar rounds
                const sortedRounds = (data.rounds || []).sort((a: any, b: any) => a.round_number - b.round_number);
                const now = new Date();
                const roundsWithStatus = sortedRounds.map((r: any) => {
                  let status: 'active' | 'completed' | 'upcoming' = 'upcoming';
                  if (new Date(r.end_date) < now) status = 'completed';
                  else if (new Date(r.start_date) <= now && new Date(r.end_date) >= now) status = 'active';
                  return { ...r, status };
                });
                setRounds(roundsWithStatus);

                const activeRound = roundsWithStatus.find((r: any) => r.status === 'active') || roundsWithStatus[0];
                const roundId = activeRound?.id || null;

                // --- CALCULO DINÂMICO DO RANKING REAL DO BANCO ---
                try {
                  const members = await api.getGroupMembers(data.group_id);
                  const roundIds = sortedRounds.map((r: any) => r.id);
                  
                  let dbCheckins: any[] = [];
                  if (roundIds.length > 0) {
                    const { data: cData } = await supabase
                      .from('checkins')
                      .select('user_id, note, type')
                      .in('round_id', roundIds);
                    dbCheckins = cData || [];
                  }

                  // Mapeia pontuação de cada membro participante aprovado
                  const allowedRanking = MOCK_RANKINGS[targetChallengeId!] || [];
                  const activeMembers = members.filter((m: any) => 
                    m.role === 'admin' || allowedRanking.some((r: any) => r.user_id === m.user_id)
                  );

                  const calculatedRanking: RankingMember[] = activeMembers.map((m: any) => {
                    const userCheckins = dbCheckins.filter((c: any) => c.user_id === m.user_id);
                    
                    let points = 0;
                    userCheckins.forEach((c: any) => {
                      if (c.note && c.note.startsWith('[EXTRA_TASK_ID:')) {
                        // Pontos de tarefas extras (calculamos 30 pts padrão)
                        points += 30;
                      } else {
                        // 10 pts por hábito diário concluído
                        points += 10;
                      }
                    });

                    return {
                      user_id: m.user_id,
                      name: m.full_name || 'Participante',
                      avatar_url: m.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
                      points: points,
                      streak: m.user_id === user.id ? 12 : 5, // streak simulada
                      rounds_won: 0
                    };
                  });

                  setRankingData(calculatedRanking);
                } catch (rankErr) {
                  console.error('Erro ao calcular ranking real:', rankErr);
                }

                // Carregar tarefas extras do Supabase
                supabase
                  .from('tasks')
                  .select('*')
                  .eq('challenge_id', targetChallengeId)
                  .then(async ({ data: tasksData, error: tasksError }) => {
                    if (tasksError || !tasksData) {
                      setExtraTasks([]);
                      setLoading(false);
                      return;
                    }

                    let completedMap: Record<string, string[]> = {};
                    if (roundId) {
                      const { data: checkinsData } = await supabase
                        .from('checkins')
                        .select('user_id, note')
                        .eq('round_id', roundId);

                      (checkinsData || []).forEach((c: any) => {
                        if (c.note && c.note.startsWith('[EXTRA_TASK_ID:')) {
                          const match = c.note.match(/^\[EXTRA_TASK_ID:([^\]]+)\]/);
                          if (match) {
                            const tId = match[1];
                            if (!completedMap[tId]) completedMap[tId] = [];
                            completedMap[tId].push(c.user_id);
                          }
                        }
                      });
                    }

                    const parsedTasks: ExtraTask[] = tasksData.map((t: any) => {
                      let parsed = { title: 'Tarefa Extra', description: t.description, type: 'general' as const, expires_at: t.created_at, start_time: undefined, active: true };
                      try { parsed = JSON.parse(t.description); } catch (e) {}
                      return {
                        id: t.id,
                        challenge_id: t.challenge_id,
                        title: parsed.title || 'Tarefa Extra',
                        description: parsed.description || t.description,
                        type: (parsed.type || 'general') as 'general' | 'presence' | 'punctuality',
                        points: t.points || 30,
                        expires_at: parsed.expires_at || t.created_at,
                        start_time: parsed.start_time,
                        completed_by: completedMap[t.id] || [],
                        active: parsed.active !== false
                      };
                    });

                    setExtraTasks(parsedTasks.filter(t => t.active !== false));
                    setLoading(false);
                  });
              } else {
                setLoading(false);
              }
            });
        }
      }).catch((err: any) => {
        console.error('Erro ao buscar grupos e desafios:', err);
        setLoading(false);
      });
    }, [challengeId, user, reqTrigger])
  );

  const handleApproveChallengeRequest = (requestId: string, approve: boolean) => {
    const request = CHALLENGE_REQUESTS.find((r: any) => r.id === requestId);
    if (!request) return;

    if (approve) {
      request.status = 'approved';
      
      if (!MOCK_RANKINGS[request.challenge_id]) {
        MOCK_RANKINGS[request.challenge_id] = [];
      }
      
      const alreadyInRank = MOCK_RANKINGS[request.challenge_id].some(m => m.user_id === request.user_id);
      if (!alreadyInRank) {
        MOCK_RANKINGS[request.challenge_id].push({
          user_id: request.user_id,
          name: request.user_name,
          avatar_url: request.user_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
          points: 0,
          streak: 0,
          rounds_won: 0
        });
      }
      
      if (Platform.OS === 'web') {
        window.alert(`${request.user_name} foi adicionado ao desafio.`);
      } else {
        Alert.alert('Sucesso', `${request.user_name} agora faz parte do desafio!`);
      }
    } else {
      request.status = 'declined';
      if (Platform.OS === 'web') {
        window.alert('Solicitação recusada.');
      } else {
        Alert.alert('Sucesso', 'Solicitação recusada.');
      }
    }
    
    // Dispara recálculo do ranking e re-render
    setReqTrigger(prev => prev + 1);
  };

  if (loading) {
    return (
      <WebContainer>
        <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={COLORS.secondary} />
        </SafeAreaView>
      </WebContainer>
    );
  }

  // RENDER SE O USUÁRIO TENTOU ACESSAR UM DESAFIO ESPECÍFICO E NÃO PARTICIPA DELE AINDA
  if (hasNoAccess) {
    return (
      <WebContainer>
        <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: SPACING.xl }]}>
          <MaterialCommunityIcons name="lock-outline" size={48} color={COLORS.gold} style={{ marginBottom: SPACING.md }} />
          <Text style={{ color: COLORS.text, fontFamily: FONTS.family.heading, fontSize: FONTS.size.md, fontWeight: 'bold', marginBottom: SPACING.sm, textAlign: 'center' }}>
            Acesso Restrito
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontFamily: FONTS.family.body, fontSize: FONTS.size.sm, textAlign: 'center', marginBottom: SPACING.lg }}>
            Você precisa ser aceito no desafio deste grupo para poder visualizar os rankings e rounds. Peça acesso na aba de Grupos.
          </Text>
          <Button title="Voltar" variant="primary" onPress={() => router.back()} style={{ width: 120 }} />
        </SafeAreaView>
      </WebContainer>
    );
  }

  // RENDER SE O USUÁRIO NÃO PARTICIPA DE NENHUM DESAFIO ATIVO
  if (hasNoChallenges || !challenge) {
    return (
      <WebContainer>
        <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: SPACING.xl }]}>
          <MaterialCommunityIcons name="trophy-outline" size={48} color={COLORS.textLight} style={{ marginBottom: SPACING.md }} />
          <Text style={{ color: COLORS.text, fontFamily: FONTS.family.heading, fontSize: FONTS.size.md, fontWeight: 'bold', marginBottom: SPACING.sm, textAlign: 'center' }}>
            Nenhum Desafio Ativo
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontFamily: FONTS.family.body, fontSize: FONTS.size.sm, textAlign: 'center', marginBottom: SPACING.lg }}>
            Você não participa de nenhum desafio de constância ativo no momento. Peça acesso em algum desafio na aba de Grupos.
          </Text>
          <Button title="Ir para Meus Grupos" variant="primary" onPress={() => router.push('/(tabs)')} style={{ width: 180 }} />
        </SafeAreaView>
      </WebContainer>
    );
  }

  const sortedRanking = [...rankingData]
    .sort((a, b) => b.points - a.points)
    .map((member, index) => ({ ...member, position: index + 1 }));

  const isFinished = challenge ? new Date(challenge.end_date) < new Date() : false;
  const top1 = sortedRanking.find(m => m.position === 1);
  const top2 = sortedRanking.find(m => m.position === 2);
  const top3 = sortedRanking.find(m => m.position === 3);

  const activeRound = rounds.find(r => r.status === 'active') || rounds[0] || { round_number: 1, start_date: challenge.start_date, end_date: challenge.end_date, status: 'active' };

  const handleToggleTask = async (taskId: string) => {
    const task = extraTasks.find(t => t.id === taskId);
    if (!task || !user) return;

    const isCompleted = task.completed_by.includes(user.id);

    if (isCompleted) {
      if (Platform.OS === 'web') {
        window.alert('Aviso: Esta tarefa já foi concluída e os pontos computados no ranking.');
      } else {
        Alert.alert(
          'Tarefa Concluída',
          'Esta tarefa já foi concluída e os pontos computados no ranking.'
        );
      }
      return;
    }

    const isExpired = new Date(task.expires_at) < new Date();
    if (isExpired) {
      if (Platform.OS === 'web') {
        window.alert('Aviso: Esta tarefa já expirou e não está mais disponível para check-in.');
      } else {
        Alert.alert(
          'Tarefa Expirada',
          'Esta tarefa já expirou e não está mais disponível para check-in.'
        );
      }
      return;
    }

    // Calcular bloqueio
    let isLocked = false;
    let warningText = '';
    if (task.type === 'presence' || task.type === 'punctuality') {
      const taskDateStr = task.expires_at.split('T')[0];
      const [hour, minute] = (task.start_time || '00:00').split(':');
      const startDateTime = new Date(`${taskDateStr}T${hour}:${minute}:00`);
      const now = new Date();
      isLocked = now < startDateTime;

      if (isLocked) {
        const day = String(startDateTime.getDate()).padStart(2, '0');
        const month = String(startDateTime.getMonth() + 1).padStart(2, '0');
        warningText = `Disponível em ${day}/${month} às ${task.start_time}`;
      }
    }

    if (isLocked) {
      if (Platform.OS === 'web') {
        window.alert(`Aviso: Esta tarefa extra só estará liberada para check-in a partir de: ${warningText.replace('Disponível em ', '')}`);
      } else {
        Alert.alert(
          'Tarefa Bloqueada',
          `Esta tarefa extra só estará liberada para check-in a partir de: ${warningText.replace('Disponível em ', '')}`
        );
      }
      return;
    }

    if (task.type === 'presence' || task.type === 'punctuality') {
      if (Platform.OS === 'web') {
        const confirm = window.confirm('Validação Requerida: Tarefas de presença ou pontualidade devem ser validadas fazendo um check-in com foto na tela de Check-in. Deseja ir para a tela de Check-in agora?');
        if (confirm) {
          router.push('/checkin');
        }
      } else {
        Alert.alert(
          'Validação Requerida',
          'Tarefas de presença ou pontualidade devem ser validadas fazendo um check-in com foto na tela de Check-in.',
          [
            { 
              text: 'Ir para Check-in', 
              onPress: () => router.push('/checkin') 
            },
            { 
              text: 'Cancelar', 
              style: 'cancel' 
            }
          ]
        );
      }
      return;
    }

    // Se for tipo 'general' (Geral), permite toggle manual
    const isMock = currentChallengeId.startsWith('chal');
    setLoading(true);

    try {
      if (isMock) {
        MOCK_EXTRA_TASKS[currentChallengeId] = (MOCK_EXTRA_TASKS[currentChallengeId] || []).map(t => {
          if (t.id === taskId) {
            return {
              ...t,
              completed_by: [...t.completed_by, user.id]
            };
          }
          return t;
        });

        // Somar pontos no ranking do usuário logado
        const userRankings = MOCK_RANKINGS[challenge.id] || [];
        MOCK_RANKINGS[challenge.id] = userRankings.map((member: RankingMember) => {
          if (member.user_id === user.id) {
            return {
              ...member,
              points: member.points + task.points
            };
          }
          return member;
        });

        setExtraTasks((MOCK_EXTRA_TASKS[challenge.id] || []).filter(t => t.active !== false));
      } else {
        // Gravar check-in de conclusão na tabela checkins do Supabase
        const activeRound = rounds.find(r => r.status === 'active') || rounds[0];
        const roundId = activeRound?.id;
        if (!roundId) throw new Error('Nenhum round ativo encontrado para este desafio.');

        const { error } = await supabase.from('checkins').insert({
          user_id: user.id,
          round_id: roundId,
          type: 'pray',
          image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
          note: `[EXTRA_TASK_ID:${taskId}] Concluído manualmente`,
          verified: false,
        });

        if (error) throw error;

        // Atualizar estado local das tarefas extras
        setExtraTasks(prev => prev.map(t => {
          if (t.id === taskId) {
            return { ...t, completed_by: [...t.completed_by, user.id] };
          }
          return t;
        }));
      }

      if (Platform.OS === 'web') {
        window.alert(`Sucesso: Tarefa concluída! Você ganhou +${task.points} pontos no ranking.`);
      } else {
        Alert.alert('Sucesso', `Tarefa concluída! Você ganhou +${task.points} pontos no ranking.`);
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert('Erro', e.message || 'Falha ao registrar a conclusão da tarefa.');
    } finally {
      setLoading(false);
    }
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'presence':
        return 'map-marker-check-outline';
      case 'punctuality':
        return 'clock-check-outline';
      case 'general':
      default:
        return 'star-check-outline';
    }
  };

  return (
    <WebContainer>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          {challengeId ? (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
          <Text style={styles.headerTitle} numberOfLines={1}>{challenge.name}</Text>
          <View style={styles.headerRightActions}>
            {userRole === 'admin' && (
              <TouchableOpacity 
                style={styles.headerActionButton}
                onPress={() => router.push({ pathname: '/create-challenge', params: { challengeId: challenge.id, groupId: challenge.group_id } })}
              >
                <MaterialCommunityIcons name="pencil" size={20} color={COLORS.secondary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={styles.headerActionButton}
              onPress={() => router.push({ pathname: '/create-challenge' })}
            >
              <MaterialCommunityIcons name="plus" size={22} color={COLORS.secondary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerActionButton}
              onPress={() => router.push({ pathname: '/ranking', params: { challengeId: challenge.id } })}
            >
              <MaterialCommunityIcons name="podium" size={20} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* CABEÇALHO DO DESAFIO */}
          <Card variant="gradient" gradientColors={COLORS.gradients.primary} style={styles.infoCard}>
            <View style={styles.badgeRow}>
              <View style={styles.groupBadge}>
                <Text style={styles.groupBadgeText}>{group.name}</Text>
              </View>
              <View style={styles.roundBadge}>
                <Text style={styles.roundBadgeText}>Round {challenge.current_round} de {challenge.total_rounds}</Text>
              </View>
            </View>
            
            <Text style={styles.challengeName}>{challenge.name}</Text>
            <Text style={styles.challengeRules} numberOfLines={3}>
              {challenge.rules}
            </Text>
            
            <View style={styles.dateRow}>
              <MaterialCommunityIcons name="calendar-range" size={16} color={COLORS.goldLight} />
              <Text style={styles.dateText}>
                {new Date(challenge.start_date).toLocaleDateString('pt-BR')} até {new Date(challenge.end_date).toLocaleDateString('pt-BR')}
              </Text>
            </View>
          </Card>

          {/* SOLICITAÇÕES PENDENTES DO DESAFIO (VISÍVEL APENAS PARA ADMIN) */}
          {(() => {
            const pendingRequests = CHALLENGE_REQUESTS.filter(
              (r: any) => r.challenge_id === challenge.id && r.status === 'pending'
            );
            if (userRole === 'admin' && pendingRequests.length > 0) {
              return (
                <View style={[styles.section, { marginBottom: SPACING.sm }]}>
                  <Text style={[styles.sectionTitle, { color: COLORS.secondary }]}>
                    Pedidos de Aprovação ({pendingRequests.length})
                  </Text>
                  {pendingRequests.map((req: any) => (
                    <Card key={req.id} variant="default" style={{ padding: SPACING.md, marginBottom: SPACING.sm }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <Avatar source={req.user_avatar || undefined} name={req.user_name} size={40} />
                          <View style={{ marginLeft: SPACING.sm, flex: 1 }}>
                            <Text style={{ fontFamily: FONTS.family.heading, fontSize: FONTS.size.sm, color: COLORS.text, fontWeight: 'bold' }}>
                              {req.user_name}
                            </Text>
                            <Text style={{ fontFamily: FONTS.family.body, fontSize: FONTS.size.xs, color: COLORS.textSecondary }}>
                              Deseja entrar no desafio
                            </Text>
                          </View>
                        </View>
                        
                        <View style={{ flexDirection: 'row', gap: SPACING.xs }}>
                          <TouchableOpacity
                            onPress={() => handleApproveChallengeRequest(req.id, true)}
                            style={{
                              backgroundColor: COLORS.secondary,
                              paddingVertical: 6,
                              paddingHorizontal: SPACING.sm,
                              borderRadius: BORDER_RADIUS.sm,
                              flexDirection: 'row',
                              alignItems: 'center',
                            }}
                          >
                            <MaterialCommunityIcons name="check" size={14} color="#fff" style={{ marginRight: 2 }} />
                            <Text style={{ color: '#fff', fontSize: FONTS.size.xs, fontFamily: FONTS.family.heading, fontWeight: 'bold' }}>
                              Aprovar
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleApproveChallengeRequest(req.id, false)}
                            style={{
                              backgroundColor: 'rgba(255, 78, 80, 0.1)',
                              borderWidth: 1,
                              borderColor: '#ff4e50',
                              paddingVertical: 6,
                              paddingHorizontal: SPACING.sm,
                              borderRadius: BORDER_RADIUS.sm,
                              flexDirection: 'row',
                              alignItems: 'center',
                            }}
                          >
                            <MaterialCommunityIcons name="close" size={14} color="#ff4e50" style={{ marginRight: 2 }} />
                            <Text style={{ color: '#ff4e50', fontSize: FONTS.size.xs, fontFamily: FONTS.family.heading, fontWeight: 'bold' }}>
                              Recusar
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Card>
                  ))}
                </View>
              );
            }
            return null;
          })()}

          {/* PROGRESSO DO ROUND ATUAL */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Progresso do Round Atual</Text>
            <Card variant="default" style={styles.roundCard}>
              <View style={styles.roundHeader}>
                <Text style={styles.roundTitle}>Round #{activeRound.round_number}</Text>
                <Text style={styles.roundTimeLeft}>Faltam 2 dias</Text>
              </View>
              
              <View style={styles.roundDates}>
                <Text style={styles.roundDateLabel}>
                  Início: {new Date(activeRound.start_date).toLocaleDateString('pt-BR')}
                </Text>
                <Text style={styles.roundDateLabel}>
                  Fim: {new Date(activeRound.end_date).toLocaleDateString('pt-BR')}
                </Text>
              </View>

              <ProgressBar 
                progress={0.71} 
                height={10} 
                style={styles.progressBar}
              />
              
              <Text style={styles.progressNote}>
                Seu grupo realizou 32 check-ins de 45 planejados neste round.
              </Text>
            </Card>
          </View>

          {/* TAREFAS EXTRAS */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Tarefas Extras Semanais</Text>
                <Text style={styles.sectionSubtitle}>Criadas pelo Administrador para pontos bônus</Text>
              </View>
              {userRole === 'admin' && (
                <TouchableOpacity 
                  style={styles.adminLink}
                  onPress={() => router.push({ pathname: '/admin', params: { challengeId: currentChallengeId } })}
                >
                  <MaterialCommunityIcons name="cog-outline" size={20} color={COLORS.secondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Card de Gerenciamento de Tarefas Extras (Somente Admin) */}
            {userRole === 'admin' && (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/admin', params: { challengeId: currentChallengeId } })}
                style={{ marginBottom: SPACING.md }}
              >
                <Card variant="flat" style={styles.adminTasksCard}>
                  <View style={styles.adminTasksLeft}>
                    <MaterialCommunityIcons name="cog-outline" size={22} color={COLORS.secondary} />
                    <View style={{ marginLeft: SPACING.sm, flex: 1 }}>
                      <Text style={styles.adminTasksTitle}>Painel de Tarefas Extras</Text>
                      <Text style={styles.adminTasksDesc}>Como administrador, crie e exclua tarefas extras para este desafio.</Text>
                    </View>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
                </Card>
              </TouchableOpacity>
            )}

            <View style={styles.tasksList}>
              {[...extraTasks]
                .sort((a, b) => new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime())
                .map(task => {
                  const isCompleted = task.completed_by.includes(user?.id || 'user_1');
                  const isExpired = new Date(task.expires_at) < new Date();
                  
                  // Determina bloqueio
                  let isLocked = false;
                  let warningText = '';
                  if (!isCompleted && !isExpired && (task.type === 'presence' || task.type === 'punctuality')) {
                    const taskDateStr = task.expires_at.split('T')[0];
                    const [hour, minute] = (task.start_time || '00:00').split(':');
                    const startDateTime = new Date(`${taskDateStr}T${hour}:${minute}:00`);
                    const now = new Date();
                    isLocked = now < startDateTime;
                    
                    if (isLocked) {
                      const day = String(startDateTime.getDate()).padStart(2, '0');
                      const month = String(startDateTime.getMonth() + 1).padStart(2, '0');
                      warningText = `Indisponível antes de ${day}/${month} às ${task.start_time}`;
                    }
                  }

                  return (
                    <TouchableOpacity
                      key={task.id}
                      style={[
                        styles.taskItem,
                        isCompleted && styles.taskItemCompleted,
                        isLocked && styles.taskItemLocked,
                        isExpired && styles.taskItemExpired
                      ]}
                      onPress={() => handleToggleTask(task.id)}
                      activeOpacity={isCompleted || isExpired ? 1 : 0.8}
                    >
                      <View style={[
                        styles.taskIconContainer,
                        { 
                          backgroundColor: isCompleted 
                            ? COLORS.secondary 
                            : isExpired 
                              ? '#f0f0f0' 
                              : isLocked 
                                ? COLORS.border 
                                : COLORS.surfaceVariant 
                        }
                      ]}>
                        <MaterialCommunityIcons 
                          name={isCompleted ? getTaskIcon(task.type) : isLocked ? 'lock' : isExpired ? 'calendar-clock' : getTaskIcon(task.type)} 
                          size={22} 
                          color={isCompleted ? '#fff' : isExpired || isLocked ? COLORS.textLight : COLORS.textSecondary} 
                        />
                      </View>
                      
                      <View style={styles.taskDetails}>
                        <Text style={[
                          styles.taskTitle,
                          isCompleted && styles.taskTitleCompleted,
                          isLocked && styles.taskTitleLocked,
                          isExpired && styles.taskTitleExpired
                        ]}>
                          {task.title}
                        </Text>
                        {isLocked ? (
                          <Text style={styles.warningText}>{warningText}</Text>
                        ) : (
                          <Text style={styles.taskDesc} numberOfLines={2}>
                            {task.description}
                          </Text>
                        )}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          <Text style={styles.taskExpiry}>
                            Expira em: {new Date(task.expires_at).toLocaleDateString('pt-BR')}
                          </Text>
                          {isExpired && (
                            <View style={styles.expiredBadge}>
                              <Text style={styles.expiredBadgeText}>Expirada</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <View style={styles.taskRight}>
                        <View style={[
                          styles.pointsBadge,
                          isCompleted && styles.pointsBadgeCompleted,
                          isLocked && styles.pointsBadgeLocked,
                          isExpired && styles.pointsBadgeLocked
                        ]}>
                          <Text style={[
                            styles.pointsText,
                            isCompleted && styles.pointsTextCompleted,
                            isLocked && styles.pointsTextLocked,
                            isExpired && styles.pointsTextLocked
                          ]}>
                            +{task.points} pts
                          </Text>
                        </View>
                        <View style={[
                          styles.checkbox,
                          isCompleted && styles.checkboxChecked,
                          isLocked && styles.checkboxLocked,
                          isExpired && styles.checkboxLocked
                        ]}>
                          {isCompleted ? (
                            <MaterialCommunityIcons name="check" size={14} color="#fff" />
                          ) : isLocked ? (
                            <MaterialCommunityIcons name="lock" size={12} color={COLORS.textLight} />
                          ) : isExpired ? (
                            <MaterialCommunityIcons name="close" size={12} color={COLORS.textLight} />
                          ) : null}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
            </View>
          </View>

          {/* HISTÓRICO DE ROUNDS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Histórico de Rounds</Text>
            
            <View style={styles.roundsTimeline}>
              {rounds.filter(r => r.status === 'completed').map(round => (
                <View key={round.id} style={styles.timelineItem}>
                  <View style={styles.timelinePoint} />
                  <View style={styles.timelineCard}>
                    <View style={styles.timelineHeader}>
                      <Text style={styles.timelineRoundTitle}>Round #{round.round_number}</Text>
                      <View style={styles.winnerBadge}>
                        <MaterialCommunityIcons name="crown" size={12} color={COLORS.gold} />
                        <Text style={styles.winnerName}>Venceu: Mateus</Text>
                      </View>
                    </View>
                    <Text style={styles.timelineDates}>
                      Período: {new Date(round.start_date).toLocaleDateString('pt-BR')} - {new Date(round.end_date).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* RANKING / CLASSIFICAÇÃO DOS PARTICIPANTES */}
          <View style={styles.section}>
            <View style={styles.rankingHeaderRow}>
              <Text style={styles.sectionTitle}>Ranking dos Participantes</Text>
              {userRole === 'admin' && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.inviteBtn}
                  onPress={() => router.push({ pathname: '/challenge-invite', params: { challengeId: currentChallengeId } })}
                >
                  <MaterialCommunityIcons name="account-plus" size={16} color={COLORS.secondary} />
                  <Text style={styles.inviteBtnText}>Convidar</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {/* Mostrar PÓDIO TOP 3 somente se o desafio já foi encerrado */}
            {isFinished && (
              <View style={styles.podiumContainer}>
                {/* Segundo Lugar */}
                {top2 && (
                  <View style={styles.podiumCol}>
                    <View style={styles.avatarWrapper}>
                      <Avatar source={top2.avatar_url} name={top2.name} size={48} />
                      <View style={[styles.podiumBadge, { backgroundColor: '#a0a0a5' }]}>
                        <Text style={styles.podiumBadgeText}>2</Text>
                      </View>
                    </View>
                    <Text style={styles.podiumName} numberOfLines={1}>{top2.name.split(' ')[0]}</Text>
                    <Text style={styles.podiumPoints}>{top2.points} pts</Text>
                    <View style={[styles.podiumBase, styles.podium2]}>
                      <Text style={styles.podiumBaseText}>2º</Text>
                    </View>
                  </View>
                )}

                {/* Primeiro Lugar */}
                {top1 && (
                  <View style={[styles.podiumCol, styles.podiumColCenter]}>
                    <MaterialCommunityIcons name="crown" size={20} color={COLORS.gold} style={styles.crownIcon} />
                    <View style={styles.avatarWrapperCenter}>
                      <Avatar source={top1.avatar_url} name={top1.name} size={60} style={styles.goldAvatarBorder} />
                      <View style={[styles.podiumBadge, { backgroundColor: COLORS.gold }]}>
                        <Text style={styles.podiumBadgeText}>1</Text>
                      </View>
                    </View>
                    <Text style={styles.podiumNameCenter} numberOfLines={1}>{top1.name.split(' ')[0]}</Text>
                    <Text style={styles.podiumPointsCenter}>{top1.points} pts</Text>
                    <View style={[styles.podiumBase, styles.podium1]}>
                      <Text style={styles.podiumBaseText}>1º</Text>
                    </View>
                  </View>
                )}

                {/* Terceiro Lugar */}
                {top3 && (
                  <View style={styles.podiumCol}>
                    <View style={styles.avatarWrapper}>
                      <Avatar source={top3.avatar_url} name={top3.name} size={48} />
                      <View style={[styles.podiumBadge, { backgroundColor: '#cd7f32' }]}>
                        <Text style={styles.podiumBadgeText}>3</Text>
                      </View>
                    </View>
                    <Text style={styles.podiumName} numberOfLines={1}>{top3.name.split(' ')[0]}</Text>
                    <Text style={styles.podiumPoints}>{top3.points} pts</Text>
                    <View style={[styles.podiumBase, styles.podium3]}>
                      <Text style={styles.podiumBaseText}>3º</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Listagem Geral */}
            <Card variant="default" style={styles.leaderboardCard}>
              {sortedRanking.map((member, index) => (
                <View 
                  key={member.user_id} 
                  style={[
                    styles.leaderboardRow,
                    index === sortedRanking.length - 1 && { borderBottomWidth: 0 }
                  ]}
                >
                  <Text style={styles.positionText}>{member.position}</Text>
                  <View style={styles.userCol}>
                    <Avatar source={member.avatar_url} name={member.name} size={36} />
                    <View style={{ marginLeft: SPACING.sm }}>
                      <Text style={styles.userNameText}>{member.name}</Text>
                      <View style={styles.detailsRow}>
                        {member.streak > 0 && (
                          <View style={styles.streakBadgeInline}>
                            <MaterialCommunityIcons name="fire" size={12} color="#ff4e50" />
                            <Text style={styles.streakTextInline}>{member.streak}d</Text>
                          </View>
                        )}
                        {member.rounds_won > 0 && (
                          <View style={styles.roundsBadgeInline}>
                            <MaterialCommunityIcons name="crown" size={12} color={COLORS.gold} />
                            <Text style={styles.roundsTextInline}>{member.rounds_won} rd</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  <View style={styles.pointsCol}>
                    <Text style={styles.pointsValueText}>{member.points}</Text>
                    <Text style={styles.pointsLabelText}>pts</Text>
                  </View>
                </View>
              ))}
            </Card>
          </View>

          {/* Doação CTA rápido */}
          <Card variant="flat" style={styles.supportCard}>
            <View style={styles.supportLeft}>
              <MaterialCommunityIcons name="heart-flash" size={28} color={COLORS.gold} />
              <View style={{ marginLeft: SPACING.md }}>
                <Text style={styles.supportTitle}>Apoie o Trino</Text>
                <Text style={styles.supportDesc}>Ajude a manter o app 100% gratuito.</Text>
              </View>
            </View>
            <Button 
              title="Apoiar" 
              variant="ghost" 
              size="sm" 
              onPress={() => router.push('/support')}
            />
          </Card>

          {/* Espaçamento TabBar */}
          <View style={{ height: Platform.OS === 'ios' ? 100 : 80 }} />
        </ScrollView>
      </SafeAreaView>
    </WebContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(225, 222, 227, 0.4)',
  },
  headerTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    fontFamily: FONTS.family.heading,
  },
  backButton: {
    padding: 2,
    marginRight: 8,
  },
  rankingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  infoCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  groupBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.sm,
  },
  groupBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: FONTS.weight.bold,
    fontFamily: FONTS.family.body,
  },
  roundBadge: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.md,
  },
  roundBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: FONTS.weight.bold,
    fontFamily: FONTS.family.body,
  },
  challengeName: {
    color: '#fff',
    fontSize: FONTS.size.xl,
    fontWeight: FONTS.weight.bold,
    marginBottom: SPACING.xs,
    fontFamily: FONTS.family.heading,
  },
  challengeRules: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: FONTS.size.sm,
    lineHeight: 18,
    marginBottom: SPACING.md,
    fontFamily: FONTS.family.body,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    color: COLORS.goldLight,
    fontSize: FONTS.size.xs,
    fontWeight: FONTS.weight.semibold,
    marginLeft: SPACING.xs,
    fontFamily: FONTS.family.body,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    fontFamily: FONTS.family.heading,
  },
  sectionSubtitle: {
    fontSize: FONTS.size.xs,
    color: COLORS.textLight,
    fontFamily: FONTS.family.body,
  },
  adminLink: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roundCard: {
    padding: SPACING.md,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  roundTitle: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    fontFamily: FONTS.family.heading,
  },
  roundTimeLeft: {
    fontSize: FONTS.size.xs,
    fontWeight: FONTS.weight.bold,
    color: COLORS.error,
    fontFamily: FONTS.family.body,
  },
  roundDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  roundDateLabel: {
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    fontFamily: FONTS.family.body,
  },
  progressBar: {
    marginBottom: SPACING.sm,
  },
  progressNote: {
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    fontFamily: FONTS.family.body,
  },
  tasksList: {
    gap: SPACING.md,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(225, 222, 227, 0.4)',
  },
  taskItemCompleted: {
    backgroundColor: '#f6fbf6',
    borderColor: 'rgba(74, 101, 74, 0.2)',
  },
  taskIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  taskDetails: {
    flex: 1,
  },
  taskTitle: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    fontFamily: FONTS.family.heading,
  },
  taskTitleCompleted: {
    color: COLORS.secondaryDark,
    textDecorationLine: 'line-through',
  },
  taskDesc: {
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    marginVertical: 2,
    fontFamily: FONTS.family.body,
  },
  taskExpiry: {
    fontSize: 10,
    color: COLORS.textLight,
    fontFamily: FONTS.family.body,
  },
  taskRight: {
    alignItems: 'flex-end',
    marginLeft: SPACING.sm,
  },
  pointsBadge: {
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
  },
  pointsBadgeCompleted: {
    backgroundColor: COLORS.secondary,
  },
  pointsText: {
    fontSize: FONTS.size.xs,
    fontWeight: FONTS.weight.bold,
    color: COLORS.text,
    fontFamily: FONTS.family.body,
  },
  pointsTextCompleted: {
    color: '#fff',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.borderDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  roundsTimeline: {
    paddingLeft: SPACING.md,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.border,
    marginLeft: SPACING.sm,
    gap: SPACING.md,
  },
  timelineItem: {
    position: 'relative',
  },
  timelinePoint: {
    position: 'absolute',
    left: -22,
    top: 16,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.secondary,
    borderWidth: 2,
    borderColor: '#fff',
  },
  timelineCard: {
    backgroundColor: COLORS.surfaceCard,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(225, 222, 227, 0.4)',
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  timelineRoundTitle: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    fontFamily: FONTS.family.heading,
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff9eb',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.md,
  },
  winnerName: {
    fontSize: 10,
    fontWeight: FONTS.weight.bold,
    color: COLORS.goldDark,
    marginLeft: 2,
    fontFamily: FONTS.family.body,
  },
  timelineDates: {
    fontSize: FONTS.size.xs,
    color: COLORS.textLight,
    fontFamily: FONTS.family.body,
  },
  supportCard: {
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  supportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  supportTitle: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    fontFamily: FONTS.family.heading,
  },
  supportDesc: {
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    maxWidth: '90%',
    fontFamily: FONTS.family.body,
  },
  warningText: {
    fontSize: FONTS.size.xs,
    color: COLORS.error,
    fontWeight: FONTS.weight.semibold,
    marginVertical: 2,
    fontFamily: FONTS.family.body,
  },
  taskTitleLocked: {
    color: COLORS.textLight,
  },
  taskItemLocked: {
    opacity: 0.7,
    borderColor: 'rgba(225, 222, 227, 0.2)',
  },
  checkboxLocked: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceVariant,
  },
  pointsBadgeLocked: {
    backgroundColor: COLORS.surfaceVariant,
  },
  pointsTextLocked: {
    color: COLORS.textLight,
  },
  taskItemExpired: {
    opacity: 0.55,
    backgroundColor: '#fafafa',
    borderColor: '#e8e8e8',
  },
  taskTitleExpired: {
    color: '#8e8e93',
  },
  expiredBadge: {
    backgroundColor: '#ffebeb',
    borderColor: 'rgba(255, 78, 80, 0.2)',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 6,
  },
  expiredBadgeText: {
    fontSize: 9,
    color: COLORS.error,
    fontWeight: 'bold',
  },
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.md,
  },
  podiumCol: {
    alignItems: 'center',
    width: '30%',
  },
  podiumColCenter: {
    width: '40%',
    zIndex: 2,
  },
  crownIcon: {
    marginBottom: -4,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: SPACING.sm,
  },
  avatarWrapperCenter: {
    position: 'relative',
    marginBottom: SPACING.sm,
  },
  goldAvatarBorder: {
    borderWidth: 3,
    borderColor: COLORS.gold,
  },
  podiumBadge: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  podiumBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: FONTS.family.body,
  },
  podiumName: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.semibold,
    color: COLORS.text,
    marginBottom: 2,
    fontFamily: FONTS.family.heading,
  },
  podiumNameCenter: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    marginBottom: 2,
    fontFamily: FONTS.family.heading,
  },
  podiumPoints: {
    fontSize: 11,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    fontFamily: FONTS.family.body,
  },
  podiumPointsCenter: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    color: COLORS.secondary,
    marginBottom: SPACING.sm,
    fontFamily: FONTS.family.body,
  },
  podiumBase: {
    width: '100%',
    borderTopLeftRadius: BORDER_RADIUS.md,
    borderTopRightRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podium1: {
    height: 90,
    backgroundColor: COLORS.primary,
  },
  podium2: {
    height: 65,
    backgroundColor: COLORS.secondary,
  },
  podium3: {
    height: 50,
    backgroundColor: 'rgba(74, 101, 74, 0.6)',
  },
  podiumBaseText: {
    color: '#fff',
    fontSize: FONTS.size.md,
    fontWeight: 'bold',
    fontFamily: FONTS.family.heading,
  },
  leaderboardCard: {
    padding: 0,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  positionText: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textSecondary,
    width: 24,
    textAlign: 'center',
    fontFamily: FONTS.family.body,
  },
  userCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: SPACING.xs,
  },
  userNameText: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    color: COLORS.text,
    fontFamily: FONTS.family.heading,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: 2,
  },
  streakBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff0f0',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: BORDER_RADIUS.sharp,
  },
  streakTextInline: {
    fontSize: 9,
    color: '#ff4e50',
    fontWeight: 'bold',
    marginLeft: 2,
    fontFamily: FONTS.family.body,
  },
  roundsBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff9eb',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: BORDER_RADIUS.sharp,
  },
  roundsTextInline: {
    fontSize: 9,
    color: COLORS.goldDark,
    fontWeight: 'bold',
    marginLeft: 2,
    fontFamily: FONTS.family.body,
  },
  pointsCol: {
    alignItems: 'flex-end',
  },
  pointsValueText: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.extraBold,
    color: COLORS.primary,
    fontFamily: FONTS.family.heading,
  },
  pointsLabelText: {
    fontSize: 9,
    color: COLORS.textLight,
    textTransform: 'uppercase',
    fontFamily: FONTS.family.body,
  },
  adminTasksCard: {
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: 'rgba(74, 101, 74, 0.2)',
    borderWidth: 1,
    backgroundColor: '#f6fbf6',
  },
  adminTasksLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  adminTasksTitle: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    fontFamily: FONTS.family.heading,
  },
  adminTasksDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: FONTS.family.body,
    marginTop: 2,
  },
  rankingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondaryMuted,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
    gap: 4,
  },
  inviteBtnText: {
    fontSize: 12,
    fontWeight: FONTS.weight.bold,
    color: COLORS.secondary,
    fontFamily: FONTS.family.bodyBold,
  },
  headerRightActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
    alignItems: 'center',
  },
  headerActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
