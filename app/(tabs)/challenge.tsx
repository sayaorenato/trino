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
import { api } from '../../lib/api';
import { 
  MOCK_GROUPS, 
  MOCK_CHALLENGES, 
  MOCK_ROUNDS, 
  MOCK_EXTRA_TASKS, 
  MOCK_RANKINGS,
  CHALLENGE_REQUESTS,
  MOCK_CHALLENGE_INVITATIONS,
  ExtraTask,
  RankingMember,
  loadPersistedMockData,
  savePersistedMockData,
  getChallengeRequests,
  saveChallengeRequests,
  checkExtraTaskAvailability,
  ChallengeRequest,
  getMockRankings,
  saveMockRankings
} from '../../constants/mock-data';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, SHADOWS } from '../../constants/theme';

export default function ChallengeScreen() {
  const router = useRouter();
  const { challengeId } = useLocalSearchParams<{ challengeId?: string }>();
  const { user, profile } = useAuth();
  
  // Obter o ID do desafio atual (dinâmico ou padrão)
  const currentChallengeId = challengeId || 'chal_1';
  
  const [restrictedChallengeInfo, setRestrictedChallengeInfo] = useState<{
    challengeId: string;
    challengeTitle: string;
    groupId: string;
    groupName: string;
    startDate?: string;
    endDate?: string;
    rules?: string;
  } | null>(null);
  
  const [challenge, setChallenge] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const [userRole, setUserRole] = useState<'admin' | 'member'>('member');
  const [rounds, setRounds] = useState<any[]>([]);
  const [extraTasks, setExtraTasks] = useState<ExtraTask[]>([]);
  const [visibleExtraTasksCount, setVisibleExtraTasksCount] = useState(3);
  const [loading, setLoading] = useState(true);
  const [dbCheckins, setDbCheckins] = useState<any[]>([]);

  const calculateRoundProgress = (startStr: string, endStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [sYear, sMonth, sDay] = startStr.split('-').map(Number);
    const startDate = new Date(sYear, sMonth - 1, sDay);
    startDate.setHours(0, 0, 0, 0);

    const [eYear, eMonth, eDay] = endStr.split('-').map(Number);
    const endDate = new Date(eYear, eMonth - 1, eDay);
    endDate.setHours(0, 0, 0, 0);

    const totalMs = endDate.getTime() - startDate.getTime();
    const totalDays = Math.round(totalMs / (1000 * 60 * 60 * 24)) + 1;

    if (totalDays <= 0) return { progress: 0, daysLeft: 0, totalDays: 0, statusLabel: 'Finalizado' };

    let elapsedDays = 0;
    if (today >= startDate) {
      const elapsedMs = today.getTime() - startDate.getTime();
      elapsedDays = Math.round(elapsedMs / (1000 * 60 * 60 * 24)) + 1;
      if (elapsedDays > totalDays) elapsedDays = totalDays;
    }

    const daysLeft = totalDays - elapsedDays;
    const progress = totalDays > 0 ? elapsedDays / totalDays : 0;

    let statusLabel = '';
    if (today < startDate) {
      statusLabel = `Começa em ${Math.round((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} dias`;
    } else if (daysLeft === 0) {
      statusLabel = 'Termina hoje';
    } else if (today > endDate) {
      statusLabel = 'Finalizado';
    } else {
      statusLabel = `Faltam ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`;
    }

    return {
      progress,
      daysLeft,
      totalDays,
      elapsedDays,
      statusLabel
    };
  };
  
  // Estados de controle de acesso a desafios
  const [hasNoAccess, setHasNoAccess] = useState(false);
  const [hasNoChallenges, setHasNoChallenges] = useState(false);
  
  // Estado para armazenar o ranking dinâmico
  const [rankingData, setRankingData] = useState<RankingMember[]>([]);

  // Trigger para recarregar solicitações e ranking na aprovação
  const [reqTrigger, setReqTrigger] = useState(0);
  const [challengeRequests, setChallengeRequests] = useState<ChallengeRequest[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      getChallengeRequests().then(async (reqs) => {
        setChallengeRequests(reqs);
        await getMockRankings();
        setReqTrigger(prev => prev + 1);
      });
    }, [])
  );

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
            const isCreator = c.created_by === user.id;
            const userParticipates = c.userParticipates || isCreator || ranking.some((m: any) => m.user_id === user.id);
            
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

        // Determinar qual desafio carregar
        let targetChallengeId = challengeId;
        if (!targetChallengeId && allowedChallenges.length > 0) {
          targetChallengeId = allowedChallenges[0].challengeId;
        }

        // Se o usuário não tem nenhum desafio e não especificou ID
        if (!targetChallengeId) {
          setHasNoChallenges(true);
          setLoading(false);
          return;
        }

        // 2. Carregar os dados do desafio selecionado
        const selectedAllowed = allowedChallenges.find(ac => ac.challengeId === targetChallengeId);

        // Se o usuário tentou acessar um desafio em que ainda não foi aceito/não participa
        if (!selectedAllowed) {
          let restrictedTargetChallenge: any = null;
          let restrictedTargetGroup: any = null;

          userGroups.forEach((g: any) => {
            if (g.challenges && Array.isArray(g.challenges)) {
              const found = g.challenges.find((c: any) => c.id === targetChallengeId);
              if (found) {
                restrictedTargetGroup = g;
                restrictedTargetChallenge = found;
              }
            }
          });

          if (!restrictedTargetChallenge && targetChallengeId.startsWith('chal') && MOCK_CHALLENGES[targetChallengeId]) {
            restrictedTargetChallenge = MOCK_CHALLENGES[targetChallengeId];
            restrictedTargetGroup = MOCK_GROUPS.find(g => g.id === restrictedTargetChallenge.group_id);
          }

          if (!restrictedTargetChallenge) {
            try {
              const realChal = await api.getChallengeById(targetChallengeId);
              if (realChal) {
                restrictedTargetChallenge = realChal;
                if (realChal.group_id) {
                  restrictedTargetGroup = await api.getGroupById(realChal.group_id);
                }
              }
            } catch (fetchErr) {
              console.warn('Erro ao carregar desafio restrito:', fetchErr);
            }
          }

          setRestrictedChallengeInfo({
            challengeId: targetChallengeId,
            challengeTitle: restrictedTargetChallenge?.title || restrictedTargetChallenge?.name || 'Desafio',
            groupId: restrictedTargetGroup?.id || '',
            groupName: restrictedTargetGroup?.name || 'Grupo',
            startDate: restrictedTargetChallenge?.start_date,
            endDate: restrictedTargetChallenge?.end_date,
            rules: restrictedTargetChallenge?.rules
          });
          setHasNoAccess(true);
          setLoading(false);
          return;
        }

        const isMock = selectedAllowed ? selectedAllowed.isMock : (targetChallengeId.startsWith('chal') && !!MOCK_CHALLENGES[targetChallengeId]);
        
        if (isMock) {
          const mockChal = MOCK_CHALLENGES[targetChallengeId!];
          setChallenge(mockChal);
          const mockGroup = MOCK_GROUPS.find(g => g.id === mockChal.group_id) || MOCK_GROUPS[0];
          setGroup(mockGroup);
          setUserRole(mockGroup.role || 'member');
          setRounds(MOCK_ROUNDS[targetChallengeId!] || []);
          setExtraTasks((MOCK_EXTRA_TASKS[targetChallengeId!] || []).filter((t: ExtraTask) => t.active !== false));
          
          // Carrega o ranking dinâmico do desafio
          try {
            const calculatedRanking = await api.getChallengeRanking(targetChallengeId!);
            setRankingData(calculatedRanking);
          } catch (rErr) {
            console.warn('Erro ao carregar ranking:', rErr);
            const mRank = MOCK_RANKINGS[targetChallengeId!] || [];
            setRankingData(mRank);
          }
          setLoading(false);
        } else {
          api.getChallengeById(targetChallengeId).then(async (data: any) => {
            if (data) {
              const grp = data.group_id ? await api.getGroupById(data.group_id) : null;
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
              setGroup(grp);
              
              // Buscar role no grupo
              const role = data.group_id ? await api.getUserGroupRole(data.group_id, user.id) : 'member';
              const isAdminUser = role === 'admin' || data.created_by === user.id;
              setUserRole(isAdminUser ? 'admin' : 'member');

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
                  const calculatedRanking = await api.getChallengeRanking(targetChallengeId!);
                  setRankingData(calculatedRanking);
                } catch (rankErr) {
                  console.error('Erro ao calcular ranking real:', rankErr);
                }

                try {
                  const uCheckins = await api.getUserCheckins(user.id);
                  setDbCheckins(uCheckins || []);
                } catch {}

                // Carregar tarefas extras via Firebase API
                api.getTasksForChallenges([targetChallengeId]).then(async (tasksData: any[]) => {
                  if (!tasksData) {
                    setExtraTasks([]);
                    setLoading(false);
                    return;
                  }

                  let completedMap: Record<string, string[]> = {};
                  if (user) {
                    const uCheckins = await api.getUserCheckins(user.id);
                    (uCheckins || []).forEach((c: any) => {
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
                      let parsed: any = {};
                      try { parsed = JSON.parse(t.description); } catch (e) {}
                      return {
                        id: t.id,
                        challenge_id: t.challenge_id,
                        title: t.title || parsed.title || 'Tarefa Extra',
                        description: (parsed.description !== undefined ? parsed.description : t.description) || '',
                        type: (t.type && (t as any).type !== 'other' ? t.type : (parsed.type && (parsed as any).type !== 'other' ? parsed.type : 'general')) as 'general' | 'presence' | 'punctuality',
                        points: t.points || parsed.points || 30,
                        expires_at: t.expires_at || parsed.expires_at || t.created_at,
                        start_time: t.start_time || parsed.start_time,
                        completed_by: completedMap[t.id] || [],
                        active: t.active !== undefined ? t.active !== false : (parsed.active !== false)
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

  const handleApproveChallengeRequest = async (requestId: string, approve: boolean) => {
    const targetRequest = challengeRequests.find((r: any) => r.id === requestId);
    if (!targetRequest) return;

    const newStatus = approve ? 'approved' : 'declined';

    if (!targetRequest.challenge_id.startsWith('chal')) {
      // status já tratado localmente
    }

    const updatedRequests = challengeRequests.map((r: any) => {
      if (r.id === requestId) {
        return { ...r, status: newStatus };
      }
      return r;
    });

    if (approve) {
      if (!MOCK_RANKINGS[targetRequest.challenge_id]) {
        MOCK_RANKINGS[targetRequest.challenge_id] = [];
      }
      
      const alreadyInRank = MOCK_RANKINGS[targetRequest.challenge_id].some(m => m.user_id === targetRequest.user_id);
      if (!alreadyInRank) {
        MOCK_RANKINGS[targetRequest.challenge_id].push({
          user_id: targetRequest.user_id,
          name: targetRequest.user_name,
          avatar_url: targetRequest.user_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
          points: 0,
          streak: 0,
          rounds_won: 0
        });
      }
      
      if (Platform.OS === 'web') {
        window.alert(`${targetRequest.user_name} foi adicionado ao desafio.`);
      } else {
        Alert.alert('Sucesso', `${targetRequest.user_name} agora faz parte do desafio!`);
      }
    } else {
      if (Platform.OS === 'web') {
        window.alert('Solicitação recusada.');
      } else {
        Alert.alert('Sucesso', 'Solicitação recusada.');
      }
    }
    
    setChallengeRequests(updatedRequests);
    await saveChallengeRequests(updatedRequests);
    await saveMockRankings();
    try {
      await api.respondToChallengeRequest(requestId, approve);
    } catch (e) {
      console.warn('Erro ao atualizar respondToChallengeRequest:', e);
    }

    // Dispara recálculo do ranking e re-render
    setReqTrigger(prev => prev + 1);
  };

  const handleCancelInvitation = (inviteId: string) => {
    const idx = MOCK_CHALLENGE_INVITATIONS.findIndex((inv: any) => inv.id === inviteId);
    if (idx !== -1) {
      const invite = MOCK_CHALLENGE_INVITATIONS[idx];
      MOCK_CHALLENGE_INVITATIONS.splice(idx, 1);
      if (Platform.OS === 'web') {
        window.alert(`Convite para o participante cancelado.`);
      } else {
        Alert.alert('Sucesso', 'Convite de desafio cancelado com sucesso.');
      }
      setReqTrigger(prev => prev + 1);
    }
  };

  const handleRequestParticipation = async (cId: string, cTitle: string, gId: string) => {
    if (!user || !cId) return;

    try {
      await api.joinChallenge(cId, user.id, profile);
      if (Platform.OS === 'web') {
        window.alert(`Sucesso: Você entrou no desafio "${cTitle}"! Bons treinos e constância.`);
      } else {
        Alert.alert('Bem-vindo ao Desafio!', `Você entrou no desafio "${cTitle}"! Bons treinos e constância.`);
      }
      setHasNoAccess(false);
      setReqTrigger(prev => prev + 1);
    } catch (e: any) {
      if (Platform.OS === 'web') {
        window.alert(`Erro ao entrar no desafio: ${e.message}`);
      } else {
        Alert.alert('Erro', e.message || 'Erro ao entrar no desafio.');
      }
    }
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
    const isPending = challengeRequests.some(
      r => r.challenge_id === restrictedChallengeInfo?.challengeId && r.user_id === user?.id && r.status === 'pending'
    );

    return (
      <WebContainer>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: SPACING.xs, marginRight: SPACING.sm }}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Desafio do Grupo</Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: SPACING.lg, alignItems: 'center' }}>
            <Card variant="default" style={{ width: '100%', maxWidth: 500, padding: SPACING.xl, alignItems: 'center', marginTop: SPACING.lg }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isPending ? 'rgba(217, 119, 6, 0.15)' : 'rgba(59, 130, 246, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md }}>
                <MaterialCommunityIcons 
                  name={isPending ? "clock-outline" : "shield-account-outline"} 
                  size={36} 
                  color={isPending ? COLORS.gold : COLORS.secondary} 
                />
              </View>

              <Text style={{ color: COLORS.text, fontFamily: FONTS.family.heading, fontSize: FONTS.size.lg, fontWeight: 'bold', marginBottom: SPACING.xs, textAlign: 'center' }}>
                {restrictedChallengeInfo?.challengeTitle || 'Desafio do Grupo'}
              </Text>

              {restrictedChallengeInfo?.groupName && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
                  <MaterialCommunityIcons name="account-group" size={16} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={{ color: COLORS.textSecondary, fontFamily: FONTS.family.body, fontSize: FONTS.size.sm }}>
                    {restrictedChallengeInfo.groupName}
                  </Text>
                </View>
              )}

              {restrictedChallengeInfo?.startDate && restrictedChallengeInfo?.endDate && (
                <Text style={{ color: COLORS.textLight, fontFamily: FONTS.family.body, fontSize: FONTS.size.xs, marginBottom: SPACING.md }}>
                  Período: {new Date(restrictedChallengeInfo.startDate).toLocaleDateString('pt-BR')} até {new Date(restrictedChallengeInfo.endDate).toLocaleDateString('pt-BR')}
                </Text>
              )}

              <View style={{ width: '100%', height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.md }} />

              {isPending ? (
                <View style={{ alignItems: 'center', paddingVertical: SPACING.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(217, 119, 6, 0.12)', paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.full, marginBottom: SPACING.md }}>
                    <MaterialCommunityIcons name="clock-outline" size={16} color={COLORS.goldDark} style={{ marginRight: 6 }} />
                    <Text style={{ color: COLORS.goldDark, fontFamily: FONTS.family.body, fontSize: FONTS.size.sm, fontWeight: 'bold' }}>
                      Aguardando Liberação do Administrador
                    </Text>
                  </View>
                  <Text style={{ color: COLORS.textSecondary, fontFamily: FONTS.family.body, fontSize: FONTS.size.sm, textAlign: 'center', lineHeight: 20 }}>
                    Sua solicitação de participação já foi enviada. O administrador do grupo precisa aprovar sua entrada para que você possa pontuar no ranking e registrar seus check-ins diários.
                  </Text>
                </View>
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: SPACING.sm, width: '100%' }}>
                  <Text style={{ color: COLORS.text, fontFamily: FONTS.family.heading, fontSize: FONTS.size.md, fontWeight: '600', marginBottom: SPACING.xs, textAlign: 'center' }}>
                    Entrar no Desafio
                  </Text>
                  <Text style={{ color: COLORS.textSecondary, fontFamily: FONTS.family.body, fontSize: FONTS.size.sm, textAlign: 'center', marginBottom: SPACING.lg, lineHeight: 20 }}>
                    Você é membro deste grupo! Para começar a registrar seus check-ins diários e pontuar no ranking, clique abaixo para entrar no desafio.
                  </Text>
                  <Button
                    title="Entrar no Desafio"
                    variant="primary"
                    icon={<MaterialCommunityIcons name="checkbox-marked-circle-outline" size={18} color="#fff" />}
                    onPress={() => handleRequestParticipation(
                      restrictedChallengeInfo?.challengeId || '',
                      restrictedChallengeInfo?.challengeTitle || 'Desafio',
                      restrictedChallengeInfo?.groupId || ''
                    )}
                    style={{ width: '100%' }}
                  />
                </View>
              )}

              <Button
                title="Voltar para Início"
                variant="ghost"
                onPress={() => router.push('/(tabs)')}
                style={{ marginTop: SPACING.md, width: '100%' }}
              />
            </Card>
          </ScrollView>
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

  const activeRound = rounds.find(r => r.status === 'active') || rounds[0] || { id: null, round_number: 1, start_date: challenge.start_date, end_date: challenge.end_date, status: 'active' };
  const roundProgress = calculateRoundProgress(activeRound.start_date, activeRound.end_date);

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

    const allowLate = challenge?.allow_late_checkins ?? true;
    const availability = checkExtraTaskAvailability(task, allowLate);

    if (availability.isExpired) {
      if (Platform.OS === 'web') {
        window.alert(`Aviso: ${availability.reason || 'Esta tarefa já expirou e não está mais disponível para check-in.'}`);
      } else {
        Alert.alert(
          'Tarefa Expirada',
          availability.reason || 'Esta tarefa já expirou e não está mais disponível para check-in.'
        );
      }
      return;
    }

    if (availability.isLocked) {
      if (Platform.OS === 'web') {
        window.alert(`Aviso: Tarefa Bloqueada — ${availability.reason}`);
      } else {
        Alert.alert(
          'Tarefa Bloqueada',
          availability.reason || 'Esta tarefa ainda não está liberada para check-in.'
        );
      }
      return;
    }

    if (task.type === 'presence' || task.type === 'punctuality') {
      if (Platform.OS === 'web') {
        const confirm = window.confirm('Validação Requerida: Tarefas de presença ou pontualidade devem ser validadas fazendo um check-in com foto na tela de Check-in. Deseja ir para a tela de Check-in agora?');
        if (confirm) {
          router.push({ pathname: '/(tabs)/checkin', params: { challengeId: currentChallengeId, taskId: task.id } });
        }
      } else {
        Alert.alert(
          'Validação Requerida',
          'Tarefas de presença ou pontualidade devem ser validadas fazendo um check-in com foto na tela de Check-in.',
          [
            { 
              text: 'Ir para Check-in', 
              onPress: () => router.push({ pathname: '/(tabs)/checkin', params: { challengeId: currentChallengeId, taskId: task.id } }) 
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
        // Gravar check-in de conclusão na tabela checkins do Firebase
        const activeRound = rounds.find(r => r.status === 'active') || rounds[0];
        const roundId = activeRound?.id || `round_${currentChallengeId}_1`;

        const userName = profile?.full_name || user.displayName || user.email?.split('@')[0] || 'Membro Trino';
        const userAvatar = profile?.avatar_url || user.photoURL || null;

        await api.createCheckin({
          user_id: user.id,
          user_name: userName,
          user_avatar: userAvatar,
          group_id: group?.id || challenge?.group_id || 'group_1',
          challenge_id: currentChallengeId,
          round_id: roundId,
          type: 'pray',
          image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
          media_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
          caption: `Tarefa Extra Concluída: ${task.title}`,
          note: `[EXTRA_TASK_ID:${taskId}] Concluído manualmente`,
          points: task.points || 20,
          verified: false,
        });

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
      if (Platform.OS === 'web') {
        window.alert(`Erro: ${e.message || 'Falha ao registrar a conclusão da tarefa.'}`);
      } else {
        Alert.alert('Erro', e.message || 'Falha ao registrar a conclusão da tarefa.');
      }
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
              onPress={() => router.push({ 
                pathname: '/ranking', 
                params: { 
                  challengeId: challenge.id,
                  groupId: challenge.group_id || group?.id 
                } 
              })}
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
            const pendingRequests = challengeRequests.filter(
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

          {/* CONVITES ENVIADOS PENDENTES (VISÍVEL APENAS PARA ADMIN) */}
          {(() => {
            const pendingInvitations = MOCK_CHALLENGE_INVITATIONS.filter(
              (inv: any) => inv.challenge_id === challenge.id && inv.status === 'pending'
            );
            if (userRole === 'admin' && pendingInvitations.length > 0) {
              return (
                <View style={[styles.section, { marginBottom: SPACING.sm }]}>
                  <Text style={[styles.sectionTitle, { color: COLORS.goldDark }]}>
                    Convites Pendentes de Aceite ({pendingInvitations.length})
                  </Text>
                  {pendingInvitations.map((inv: any) => (
                    <Card key={inv.id} variant="default" style={{ padding: SPACING.md, marginBottom: SPACING.sm }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <View style={{
                            width: 40, height: 40, borderRadius: 20, 
                            backgroundColor: COLORS.goldMuted, 
                            justifyContent: 'center', alignItems: 'center'
                          }}>
                            <MaterialCommunityIcons name="email-outline" size={20} color={COLORS.gold} />
                          </View>
                          <View style={{ marginLeft: SPACING.sm, flex: 1 }}>
                            <Text style={{ fontFamily: FONTS.family.heading, fontSize: FONTS.size.sm, color: COLORS.text, fontWeight: 'bold' }}>
                              {inv.invited_user_name || 'Convidado'}
                            </Text>
                            <Text style={{ fontFamily: FONTS.family.body, fontSize: FONTS.size.xs, color: COLORS.textSecondary }}>
                              Aguardando confirmação do participante...
                            </Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          onPress={() => handleCancelInvitation(inv.id)}
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
                          <MaterialCommunityIcons name="trash-can-outline" size={14} color="#ff4e50" style={{ marginRight: 2 }} />
                          <Text style={{ color: '#ff4e50', fontSize: FONTS.size.xs, fontFamily: FONTS.family.heading, fontWeight: 'bold' }}>
                            Cancelar
                          </Text>
                        </TouchableOpacity>
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
                <Text style={styles.roundTimeLeft}>{roundProgress.statusLabel}</Text>
              </View>
              
              <View style={styles.roundDates}>
                <Text style={styles.roundDateLabel}>
                  Início: {new Date(activeRound.start_date.replace(/-/g, '/')).toLocaleDateString('pt-BR')}
                </Text>
                <Text style={styles.roundDateLabel}>
                  Fim: {new Date(activeRound.end_date.replace(/-/g, '/')).toLocaleDateString('pt-BR')}
                </Text>
              </View>

              <ProgressBar 
                progress={roundProgress.progress} 
                height={10} 
                style={styles.progressBar}
              />
              
              <Text style={styles.progressNote}>
                {currentChallengeId.startsWith('chal') ? (
                  `Seu grupo realizou 32 check-ins neste round.`
                ) : (
                  `Seu grupo realizou ${dbCheckins.filter((c: any) => c.round_id === activeRound.id).length} check-ins neste round de ${roundProgress.totalDays} dias.`
                )}
              </Text>

              <TouchableOpacity
                style={{
                  marginTop: SPACING.md,
                  backgroundColor: COLORS.secondary,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: SPACING.sm + 2,
                  paddingHorizontal: SPACING.md,
                  borderRadius: BORDER_RADIUS.md,
                }}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/(tabs)/checkin', params: { challengeId: currentChallengeId } })}
              >
                <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={{ color: '#fff', fontSize: FONTS.size.sm, fontFamily: FONTS.family.heading, fontWeight: 'bold' }}>
                  Fazer Check-in de Hoje
                </Text>
              </TouchableOpacity>
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

            {(() => {
              const sortedExtraTasks = [...extraTasks].sort((a, b) => new Date(b.expires_at || 0).getTime() - new Date(a.expires_at || 0).getTime());
              const visibleTasks = sortedExtraTasks.slice(0, visibleExtraTasksCount);
              const hasMoreExtraTasks = sortedExtraTasks.length > visibleTasks.length;

              return (
                <>
                  <View style={styles.tasksList}>
                    {visibleTasks.map(task => {
                      const isCompleted = task.completed_by.includes(user?.id || 'user_1');
                      const allowLate = challenge?.allow_late_checkins ?? true;
                      const availability = checkExtraTaskAvailability(task, allowLate);
                      const isLocked = !isCompleted && availability.isLocked;
                      const isExpired = !isCompleted && availability.isExpired;
                      const warningText = availability.reason || '';

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

                  {hasMoreExtraTasks && (
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: SPACING.md,
                        paddingHorizontal: SPACING.lg,
                        backgroundColor: COLORS.surface,
                        borderRadius: BORDER_RADIUS.md,
                        borderWidth: 1,
                        borderColor: COLORS.primary,
                        marginTop: SPACING.md,
                        gap: 6
                      }}
                      onPress={() => setVisibleExtraTasksCount(prev => prev + 5)}
                    >
                      <MaterialCommunityIcons name="chevron-down" size={20} color={COLORS.primary} />
                      <Text style={{ fontSize: FONTS.size.sm, fontWeight: '600', color: COLORS.primary }}>
                        Ver mais tarefas ({sortedExtraTasks.length - visibleTasks.length} restantes)
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              );
            })()}
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
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Ranking dos Participantes</Text>
                <Text style={{ fontSize: FONTS.size.xs, color: COLORS.textSecondary, fontFamily: FONTS.family.body }}>
                  {isFinished ? 'Classificação final do desafio' : 'Acompanhe a pontuação de todos os membros'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: SPACING.xs, alignItems: 'center' }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.inviteBtn, { backgroundColor: COLORS.goldLight + '25', borderColor: COLORS.gold, borderWidth: 1 }]}
                  onPress={() => router.push({ 
                    pathname: '/ranking', 
                    params: { 
                      challengeId: challenge?.id || currentChallengeId,
                      groupId: challenge?.group_id || group?.id
                    } 
                  })}
                >
                  <MaterialCommunityIcons name="podium-gold" size={16} color={COLORS.goldDark} />
                  <Text style={[styles.inviteBtnText, { color: COLORS.goldDark }]}>Ver Todos</Text>
                </TouchableOpacity>
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
            </View>


            {/* Listagem Geral dos Participantes */}
            {sortedRanking.length === 0 ? (
              <Card variant="flat" style={{ padding: SPACING.lg, alignItems: 'center' }}>
                <MaterialCommunityIcons name="trophy-outline" size={32} color={COLORS.textLight} style={{ marginBottom: 6 }} />
                <Text style={{ fontSize: FONTS.size.xs, color: COLORS.textSecondary, fontFamily: FONTS.family.body, textAlign: 'center' }}>
                  Nenhum participante pontuou neste desafio ainda.{'\n'}Faça seu primeiro check-in e lidere o ranking!
                </Text>
              </Card>
            ) : (
              <Card variant="default" style={styles.leaderboardCard}>
                {sortedRanking.map((member, index) => {
                  const isCurrentUser = member.user_id === user?.id;
                  return (
                    <View 
                      key={member.user_id} 
                      style={[
                        styles.leaderboardRow,
                        isCurrentUser && { backgroundColor: COLORS.goldLight + '15' },
                        index === sortedRanking.length - 1 && { borderBottomWidth: 0 }
                      ]}
                    >
                      <Text style={[styles.positionText, isCurrentUser && { color: COLORS.goldDark, fontWeight: 'bold' }]}>
                        {member.position}º
                      </Text>
                      <View style={styles.userCol}>
                        <Avatar source={member.avatar_url} name={member.name} size={36} />
                        <View style={{ marginLeft: SPACING.sm, flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.userNameText, isCurrentUser && { color: COLORS.primary, fontWeight: 'bold' }]}>
                              {member.name}
                            </Text>
                            {isCurrentUser && (
                              <View style={{ backgroundColor: COLORS.secondary, paddingHorizontal: 6, paddingVertical: 1, borderRadius: BORDER_RADIUS.sm }}>
                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>Você</Text>
                              </View>
                            )}
                          </View>
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
                        <Text style={[styles.pointsValueText, isCurrentUser && { color: COLORS.secondary, fontWeight: 'bold' }]}>
                          {member.points}
                        </Text>
                        <Text style={styles.pointsLabelText}>pts</Text>
                      </View>
                    </View>
                  );
                })}
              </Card>
            )}
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
