import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, getPendingInviteCode, setPendingInviteCode } from '../../context/auth';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { StreakBadge } from '../../components/ui/StreakBadge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Button } from '../../components/ui/Button';
import { WebContainer } from '../../components/ui/WebContainer';
import { HABIT_LABELS, HabitType, MOCK_RANKINGS, RankingMember, MOCK_CHALLENGE_INVITATIONS, MOCK_FEED, MOCK_EXTRA_TASKS } from '../../constants/mock-data';
import { COLORS, SPACING, FONTS, SHADOWS, BORDER_RADIUS, ANIMATION } from '../../constants/theme';

const { width } = Dimensions.get('window');

const VERSES = [
  { text: "Não fui eu que ordenei a você? Seja forte e corajoso! Não se apavore nem desanime, pois o Senhor, o seu Deus, estará com você por onde você andar.", reference: "Josué 1:9" },
  { text: "Tudo posso naquele que me fortalece.", reference: "Filipenses 4:13" },
  { text: "O Senhor é o meu pastor; de nada terei falta.", reference: "Salmos 23:1" },
  { text: "Pois Deus não nos deu espírito de covardia, mas de poder, de amor e de equilíbrio.", reference: "2 Timóteo 1:7" },
];

export default function DashboardScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [groups, setGroups] = useState<any[]>([]);
  const [habits, setHabits] = useState({ prayer: false, bible: false, exercise: false });
  const [todayCheckins, setTodayCheckins] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Entrance animations
  const headerFade = useRef(new Animated.Value(0)).current;
  const verseFade = useRef(new Animated.Value(0)).current;
  const verseSlide = useRef(new Animated.Value(20)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.stagger(0, [
      Animated.timing(headerFade, { toValue: 1, duration: ANIMATION.duration.normal, delay: 100, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(verseFade, { toValue: 1, duration: ANIMATION.duration.slow, delay: 200, useNativeDriver: true }),
        Animated.timing(verseSlide, { toValue: 0, duration: ANIMATION.duration.slow, delay: 200, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(contentFade, { toValue: 1, duration: ANIMATION.duration.slow, delay: 400, useNativeDriver: true }),
        Animated.timing(contentSlide, { toValue: 0, duration: ANIMATION.duration.slow, delay: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const verseIndex = new Date().getDate() % VERSES.length;
  const todayVerse = VERSES[verseIndex];

  // Lista 1: Meus Desafios (Apenas os desafios ativos em que o usuário participa do ranking)
  const myActiveChallenges = groups.reduce((acc: any[], g: any) => {
    if (g.challenges && Array.isArray(g.challenges)) {
      g.challenges.forEach((challenge: any) => {
        const isChallengeActive = new Date(challenge.end_date) >= new Date();
        if (isChallengeActive) {
          const ranking = MOCK_RANKINGS[challenge.id] || [];
          const userParticipates = ranking.some((m: any) => m.user_id === user?.id);
          
          if (userParticipates) {
            if (!acc.some((item: any) => item.challenge.id === challenge.id)) {
              acc.push({
                groupId: g.id,
                groupName: g.name,
                challenge: challenge
              });
            }
          }
        }
      });
    }
    return acc;
  }, []);

  // Lista 2: Todos os Desafios Ativos de Todos os Grupos (Para os Check-ins de Hoje)
  const allActiveChallenges = groups.reduce((acc: any[], g: any) => {
    if (g.challenges && Array.isArray(g.challenges)) {
      g.challenges.forEach((challenge: any) => {
        const isChallengeActive = new Date(challenge.end_date) >= new Date();
        if (isChallengeActive) {
          // Se o ranking não existir para este desafio ativo (ex: após refresh), inicializa com o usuário
          if (!MOCK_RANKINGS[challenge.id] && user) {
            MOCK_RANKINGS[challenge.id] = [
              {
                user_id: user.id,
                name: profile?.full_name || 'Participante',
                avatar_url: profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
                points: 0,
                streak: 0,
                rounds_won: 0
              }
            ];
          }

          if (!acc.some((item: any) => item.challenge.id === challenge.id)) {
            acc.push({
              groupId: g.id,
              groupName: g.name,
              challenge: challenge
            });
          }
        }
      });
    }
    return acc;
  }, []);

  // Helper para verificar se um hábito específico de um desafio foi feito hoje
  const isHabitDone = (item: any, type: 'prayer' | 'bible' | 'exercise') => {
    const challenge = item.challenge;
    const dbType = type === 'prayer' ? 'pray' : type === 'bible' ? 'bible' : 'workout';
    
    if (challenge.id.startsWith('chal') && user) {
      const todayStr = new Date().toISOString().split('T')[0];
      return MOCK_FEED.some(c => 
        c.user_id === user.id && 
        c.group_id === item.groupId && 
        c.habit_type === type && 
        c.created_at.split('T')[0] === todayStr
      );
    }
    
    const roundIds = (challenge.rounds || []).map((r: any) => r.id);
    return todayCheckins.some((c: any) => c.type === dbType && roundIds.includes(c.round_id));
  };

  // Helper para obter tarefas extras ativas de um desafio
  const getChallengeExtraTasks = (challengeId: string) => {
    if (challengeId.startsWith('chal')) {
      return (MOCK_EXTRA_TASKS[challengeId] || []).filter((t: any) => t.active !== false);
    }
    return tasks
      .filter((t: any) => t.challenge_id === challengeId)
      .map((t: any) => {
        let parsed = { title: 'Tarefa Extra', description: '', type: 'general', active: true, points: 30 };
        try {
          parsed = JSON.parse(t.description);
        } catch (e) {}
        return {
          id: t.id,
          challenge_id: t.challenge_id,
          title: parsed.title || 'Tarefa Extra',
          description: parsed.description || t.description,
          type: parsed.type || 'general',
          points: t.points || 30,
          active: parsed.active !== false
        };
      })
      .filter((t: any) => t.active !== false);
  };

  // Helper para verificar se uma tarefa extra foi concluída hoje pelo usuário
  const isExtraTaskDone = (taskId: string, challengeId: string) => {
    if (challengeId.startsWith('chal') && user) {
      if (MOCK_EXTRA_TASKS[challengeId]) {
        const task = MOCK_EXTRA_TASKS[challengeId].find((t: any) => t.id === taskId);
        return task ? task.completed_by.includes(user.id) : false;
      }
      return false;
    }
    return todayCheckins.some((c: any) => c.note && c.note.includes(`[EXTRA_TASK_ID:${taskId}]`));
  };

  const checkPendingInvite = useCallback(async () => {
    const code = getPendingInviteCode();
    if (!code || !user) return;

    // Limpar o código imediatamente para evitar loops de recarga
    setPendingInviteCode(null);

    try {
      setLoading(true);

      // 1. Buscar o grupo pelo código de convite no Supabase
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('invite_code', code)
        .maybeSingle();

      if (groupError || !group) {
        Alert.alert('Erro', 'Grupo de convite não encontrado ou código inválido.');
        setLoading(false);
        return;
      }

      // 2. Buscar se existe desafio ativo para o grupo
      const { data: challenge } = await supabase
        .from('challenges')
        .select('*')
        .eq('group_id', group.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // 3. Perguntar ao usuário se ele deseja participar do desafio ativo (se houver)
      if (challenge) {
        Alert.alert(
          'Convite Recebido!',
          `Deseja entrar no grupo "${group.name}" e participar do desafio ativo "${challenge.title}"?`,
          [
            {
              text: 'Cancelar',
              style: 'cancel',
              onPress: () => setLoading(false)
            },
            {
              text: 'Entrar Apenas no Grupo',
              onPress: () => handleJoinGroup(group.id, group.name, false)
            },
            {
              text: 'Participar do Desafio',
              onPress: () => handleJoinGroup(group.id, group.name, true)
            }
          ]
        );
      } else {
        // Sem desafio ativo, entra direto no grupo
        Alert.alert(
          'Convite Recebido!',
          `Deseja entrar no grupo "${group.name}"?`,
          [
            {
              text: 'Cancelar',
              style: 'cancel',
              onPress: () => setLoading(false)
            },
            {
              text: 'Entrar no Grupo',
              onPress: () => handleJoinGroup(group.id, group.name, false)
            }
          ]
        );
      }
    } catch (err) {
      console.error('Erro ao processar convite:', err);
      Alert.alert('Erro', 'Ocorreu um erro ao processar o convite.');
      setLoading(false);
    }
  }, [user, profile]);

  const checkChallengeInvitations = useCallback(() => {
    if (!user) return;
    
    // Buscar convites pendentes para o usuário logado
    const pendingInvites = MOCK_CHALLENGE_INVITATIONS.filter(
      inv => inv.invited_user_id === user.id && inv.status === 'pending'
    );

    if (pendingInvites.length > 0) {
      const invite = pendingInvites[0];

      const acceptAction = () => {
        invite.status = 'accepted';
        
        if (!MOCK_RANKINGS[invite.challenge_id]) {
          MOCK_RANKINGS[invite.challenge_id] = [];
        }
        
        const alreadyInRanking = MOCK_RANKINGS[invite.challenge_id].some(m => m.user_id === user.id);
        if (!alreadyInRanking) {
          MOCK_RANKINGS[invite.challenge_id].push({
            user_id: user.id,
            name: profile?.full_name || 'Participante',
            avatar_url: profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
            points: 0,
            streak: 0,
            rounds_won: 0
          });
        }

        if (Platform.OS === 'web') {
          window.alert('Você aceitou o convite do desafio!');
        } else {
          Alert.alert('Sucesso', 'Você aceitou o convite do desafio!');
        }
        
        api.getDashboardData(user.id).then((data) => {
          setGroups(data.groups);
          setHabits(data.habits);
        });

        checkChallengeInvitations();
      };

      const declineAction = () => {
        invite.status = 'declined';
        checkChallengeInvitations();
      };

      if (Platform.OS === 'web') {
        const confirm = window.confirm(`Você foi convidado para participar do desafio "${invite.challenge_name}" no grupo "${invite.group_name}". Deseja aceitar? (Pressione OK para aceitar ou Cancelar para recusar)`);
        if (confirm) {
          acceptAction();
        } else {
          declineAction();
        }
      } else {
        Alert.alert(
          'Convite de Desafio!',
          `Você foi convidado para participar do desafio "${invite.challenge_name}" no grupo "${invite.group_name}". Deseja aceitar?`,
          [
            {
              text: 'Recusar',
              style: 'destructive',
              onPress: declineAction
            },
            {
              text: 'Aceitar',
              onPress: acceptAction
            }
          ]
        );
      }
    }
  }, [user, profile]);

  const handleJoinGroup = async (groupId: string, groupName: string, joinChallenge: boolean) => {
    if (!user) return;
    try {
      setLoading(true);
      // 1. Inserir na tabela group_members
      const { error: joinError } = await supabase
        .from('group_members')
        .insert({
          user_id: user.id,
          group_id: groupId,
          role: 'member'
        });

      if (joinError) {
        // Se já for membro, o insert falhará com primary key violation
        if (joinError.code === '23505' || joinError.message.includes('duplicate key') || joinError.message.includes('already exists')) {
          Alert.alert('Aviso', `Você já faz parte do grupo "${groupName}".`);
          
          // Recarregar os dados do dashboard mesmo se já for membro
          const data = await api.getDashboardData(user.id);
          setGroups(data.groups);
          setHabits(data.habits);
          return;
        }
        throw joinError;
      }

      // 2. Se optou por entrar no desafio, podemos associar no mock rankings do Renato para testes locais
      if (joinChallenge) {
        if (MOCK_RANKINGS['chal_1'] && groupId === 'group_1') {
          const alreadyInRank = MOCK_RANKINGS['chal_1'].some(m => m.user_id === user.id);
          if (!alreadyInRank) {
            MOCK_RANKINGS['chal_1'].push({
              user_id: user.id,
              name: profile?.full_name || 'Novo Membro',
              avatar_url: profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
              points: 0,
              streak: 0,
              rounds_won: 0
            });
          }
        }
      }

      Alert.alert(
        'Sucesso!', 
        joinChallenge 
          ? `Você entrou no grupo "${groupName}" e está participando do desafio ativo!` 
          : `Você entrou no grupo "${groupName}"!`
      );

      // Recarregar os dados do dashboard
      const data = await api.getDashboardData(user.id);
      setGroups(data.groups);
      setHabits(data.habits);
      setTodayCheckins(data.todayCheckins || []);
      setTasks(data.tasks || []);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Erro ao entrar no grupo.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (!user) return;
      setLoading(true);
      api.getDashboardData(user.id).then((data) => {
        setGroups(data.groups);
        setHabits(data.habits);
        setTodayCheckins(data.todayCheckins || []);
        setTasks(data.tasks || []);
        setLoading(false);
        
        // Verificar se há convites pendentes na memória global
        checkPendingInvite();
        // Verificar se há convites para desafios
        checkChallengeInvitations();
      });
    }, [user, checkPendingInvite, checkChallengeInvitations])
  );

  // Calcular soma de tarefas e check-ins concluídos de todos os desafios ativos hoje
  let totalTasksCount = 0;
  let completedTasksCount = 0;

  allActiveChallenges.forEach((item: any) => {
    // 3 hábitos diários por desafio
    totalTasksCount += 3;
    
    if (isHabitDone(item, 'prayer')) completedTasksCount += 1;
    if (isHabitDone(item, 'bible')) completedTasksCount += 1;
    if (isHabitDone(item, 'exercise')) completedTasksCount += 1;

    // Tarefas extras
    const extraTasks = getChallengeExtraTasks(item.challenge.id);
    totalTasksCount += extraTasks.length;

    extraTasks.forEach((task: any) => {
      if (isExtraTaskDone(task.id, item.challenge.id)) {
        completedTasksCount += 1;
      }
    });
  });

  if (loading && groups.length === 0) {
    return (
      <WebContainer>
        <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={COLORS.secondary} />
        </SafeAreaView>
      </WebContainer>
    );
  }

  return (
    <WebContainer>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerFade }]}>
          <View style={styles.headerLeft}>
            <Avatar source={profile?.avatar_url ?? undefined} name={profile?.full_name || 'User'} size={44} />
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingText}>Olá,</Text>
              <Text style={styles.nameText}>{profile?.full_name?.split(' ')[0] || 'Visitante'}</Text>
            </View>
          </View>
          <StreakBadge count={profile?.streak_count || 0} />
        </Animated.View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Verse Card */}
          <Animated.View style={{ opacity: verseFade, transform: [{ translateY: verseSlide }] }}>
            <Card variant="gradient" gradientColors={COLORS.gradients.primaryWarm} style={styles.verseCard}>
              <MaterialCommunityIcons name="format-quote-open" size={36} color={COLORS.goldLight} style={styles.quoteIcon} />
              <Text style={styles.verseText}>{todayVerse.text}</Text>
              <Text style={styles.verseReference}>{todayVerse.reference}</Text>
            </Card>
          </Animated.View>

          <Animated.View style={{ opacity: contentFade, transform: [{ translateY: contentSlide }] }}>
            {/* Summary stats */}
            <View style={styles.summaryRow}>
              {[
                { value: groups.length, label: 'Grupos', color: COLORS.primary },
                { value: myActiveChallenges.length, label: 'Desafios', color: COLORS.secondary },
                { value: `${completedTasksCount}/${totalTasksCount}`, label: 'Hoje', color: COLORS.gold },
              ].map(({ value, label, color }) => (
                <View key={label} style={styles.summaryCard}>
                  <Text style={[styles.summaryNumber, { color }]}>{value}</Text>
                  <Text style={styles.summaryLabel}>{label}</Text>
                </View>
              ))}
            </View>

            {/* My Groups */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Meus Grupos</Text>
              <TouchableOpacity onPress={() => router.push('/create-group')}>
                <MaterialCommunityIcons name="plus-circle-outline" size={22} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>

            {groups.length === 0 ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push('/create-group')}
                style={{ paddingHorizontal: SPACING.xl }}
              >
                <Card variant="default" style={styles.emptyGroupDashboardCard}>
                  <View style={styles.emptyGroupIconContainer}>
                    <MaterialCommunityIcons name="plus" size={24} color={COLORS.secondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.emptyGroupDashboardTitle}>Criar um Grupo</Text>
                    <Text style={styles.emptyGroupDashboardSubtitle}>Comece criando um grupo para convidar seus amigos.</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
                </Card>
              </TouchableOpacity>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={styles.groupsScroll}>
                {groups.map((group: any) => {
                  return (
                    <TouchableOpacity
                      key={group.id}
                      activeOpacity={0.9}
                      onPress={() => router.push({ pathname: '/group-dashboard', params: { groupId: group.id } })}
                    >
                      <Card variant="default" style={styles.groupCard}>
                        <View style={styles.groupCardHeader}>
                          <LinearGradient
                            colors={COLORS.gradients.sage}
                            style={styles.groupAvatar}
                          >
                            <Text style={styles.groupAvatarText}>{group.name?.[0]?.toUpperCase()}</Text>
                          </LinearGradient>
                          {group.role === 'admin' && (
                            <MaterialCommunityIcons name="crown" size={14} color={COLORS.gold} />
                          )}
                        </View>
                        <Text style={styles.groupCardName} numberOfLines={1}>{group.name}</Text>
                        
                        <View style={styles.groupMetaContainer}>
                          <View style={styles.groupMetaItem}>
                            <MaterialCommunityIcons name="account-group-outline" size={14} color={COLORS.textSecondary} />
                            <Text style={styles.groupMetaText}>
                              {group.memberCount ?? 0} {group.memberCount === 1 ? 'membro' : 'membros'}
                            </Text>
                          </View>
                          <View style={styles.groupMetaItem}>
                            <MaterialCommunityIcons name="trophy-outline" size={14} color={COLORS.gold} />
                            <Text style={styles.groupMetaText}>
                              {group.activeChallengesCount ?? 0} {group.activeChallengesCount === 1 ? 'ativo' : 'ativos'}
                            </Text>
                          </View>
                        </View>
                      </Card>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Meus Desafios */}
            <View style={[styles.sectionHeader, { marginTop: SPACING.lg }]}>
              <Text style={styles.sectionTitle}>Meus Desafios</Text>
            </View>

            {myActiveChallenges.length === 0 ? (
              <Card variant="flat" style={styles.noChallengesCard}>
                <MaterialCommunityIcons name="trophy-outline" size={24} color={COLORS.textLight} />
                <Text style={styles.noChallengesText}>Você não participa de nenhum desafio ativo</Text>
              </Card>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={styles.groupsScroll}>
                {myActiveChallenges.map((item: any) => {
                  const challenge = item.challenge;
                  const daysLeft = Math.ceil((new Date(challenge.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <TouchableOpacity
                      key={challenge.id}
                      activeOpacity={0.9}
                      onPress={() => router.push({ pathname: '/(tabs)/challenge', params: { challengeId: challenge.id } })}
                    >
                      <Card variant="gradient" gradientColors={COLORS.gradients.primary} style={styles.groupCard}>
                        <View style={styles.groupCardHeader}>
                          <View style={[styles.groupAvatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                            <MaterialCommunityIcons name="trophy" size={20} color={COLORS.goldLight} />
                          </View>
                        </View>
                        <Text style={[styles.groupCardName, { color: '#fff' }]} numberOfLines={1}>
                          {challenge.title}
                        </Text>
                        <Text style={[styles.groupCardChallenge, { color: COLORS.goldLight }]} numberOfLines={1}>
                          {item.groupName}
                        </Text>
                        <View style={styles.groupCardFooter}>
                          <ProgressBar progress={0.65} height={4} showPercentage={false} style={{ width: '100%' }} />
                          <Text style={[styles.groupCardDays, { color: 'rgba(255,255,255,0.8)' }]}>{daysLeft}d restantes</Text>
                        </View>
                      </Card>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Check-ins de Hoje */}
            <View style={[styles.habitsSection, groups.length === 0 && { opacity: 0.6 }]}>
              <Text style={styles.sectionTitle}>Check-ins de Hoje</Text>
              <Text style={styles.sectionSubtitle}>
                {groups.length === 0 
                  ? 'Crie ou entre em um grupo para fazer check-ins.'
                  : 'Registre o seu hábito tocando nos ícones à direita:'}
              </Text>

              {groups.length === 0 ? (
                <Card variant="flat" style={styles.noChallengesCard}>
                  <MaterialCommunityIcons name="check-decagram-outline" size={24} color={COLORS.textLight} />
                  <Text style={styles.noChallengesText}>Nenhum check-in disponível no momento</Text>
                </Card>
              ) : allActiveChallenges.length === 0 ? (
                <Card variant="flat" style={styles.noChallengesCard}>
                  <MaterialCommunityIcons name="trophy-outline" size={24} color={COLORS.textLight} />
                  <Text style={styles.noChallengesText}>Nenhum desafio ativo para check-in</Text>
                </Card>
              ) : (
                <View style={styles.compactChallengesContainer}>
                  {allActiveChallenges.map((item: any, index: number) => {
                    const challenge = item.challenge;
                    
                    const prayerDone = isHabitDone(item, 'prayer');
                    const bibleDone = isHabitDone(item, 'bible');
                    const exerciseDone = isHabitDone(item, 'exercise');

                    return (
                      <View 
                        key={challenge.id}
                        style={[
                          styles.compactChallengeItem,
                          index === allActiveChallenges.length - 1 && { borderBottomWidth: 0 },
                          { flexDirection: 'column', alignItems: 'stretch' }
                        ]}
                      >
                        <View style={styles.compactChallengeHeaderRow}>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => router.push({ pathname: '/(tabs)/challenge', params: { challengeId: challenge.id } })}
                            style={styles.compactChallengeLeft}
                          >
                            <View style={styles.compactChallengeIconBg}>
                              <MaterialCommunityIcons name="trophy" size={16} color={COLORS.gold} />
                            </View>
                            <View style={styles.compactChallengeInfo}>
                              <Text style={styles.compactChallengeTitle} numberOfLines={1}>
                                {challenge.title}
                              </Text>
                              <Text style={styles.compactChallengeSubtitle} numberOfLines={1}>
                                {item.groupName}
                              </Text>
                            </View>
                          </TouchableOpacity>

                          <View style={styles.compactHabitsRow}>
                            {/* Hábito: Oração */}
                            <TouchableOpacity
                              activeOpacity={0.8}
                              disabled={prayerDone}
                              onPress={() => router.push({ 
                                pathname: '/(tabs)/checkin', 
                                params: { challengeId: challenge.id, habit: 'prayer' } 
                              })}
                              style={[
                                styles.miniHabitButton,
                                prayerDone ? { backgroundColor: COLORS.gold } : styles.miniHabitButtonPending
                              ]}
                            >
                              <MaterialCommunityIcons 
                                name={prayerDone ? "check-bold" : HABIT_LABELS.prayer.icon as any} 
                                size={12} 
                                color="#fff" 
                              />
                            </TouchableOpacity>

                            {/* Hábito: Bíblia */}
                            <TouchableOpacity
                              activeOpacity={0.8}
                              disabled={bibleDone}
                              onPress={() => router.push({ 
                                pathname: '/(tabs)/checkin', 
                                params: { challengeId: challenge.id, habit: 'bible' } 
                              })}
                              style={[
                                styles.miniHabitButton,
                                bibleDone ? { backgroundColor: COLORS.primaryLight } : styles.miniHabitButtonPending
                              ]}
                            >
                              <MaterialCommunityIcons 
                                name={bibleDone ? "check-bold" : HABIT_LABELS.bible.icon as any} 
                                size={12} 
                                color="#fff" 
                              />
                            </TouchableOpacity>

                            {/* Hábito: Exercício */}
                            <TouchableOpacity
                              activeOpacity={0.8}
                              disabled={exerciseDone}
                              onPress={() => router.push({ 
                                pathname: '/(tabs)/checkin', 
                                params: { challengeId: challenge.id, habit: 'exercise' } 
                              })}
                              style={[
                                styles.miniHabitButton,
                                exerciseDone ? { backgroundColor: COLORS.secondary } : styles.miniHabitButtonPending
                              ]}
                            >
                              <MaterialCommunityIcons 
                                name={exerciseDone ? "check-bold" : HABIT_LABELS.exercise.icon as any} 
                                size={12} 
                                color="#fff" 
                              />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Fileira de Tarefas Extras Compacta */}
                        {(() => {
                          const challengeExtraTasks = getChallengeExtraTasks(challenge.id);
                          if (challengeExtraTasks.length === 0) return null;
                          return (
                            <View style={styles.extraTasksRow}>
                              {challengeExtraTasks.map((task: any) => {
                                const done = isExtraTaskDone(task.id, challenge.id);
                                return (
                                  <TouchableOpacity
                                    key={task.id}
                                    activeOpacity={done ? 1 : 0.8}
                                    disabled={done}
                                    onPress={() => router.push({
                                      pathname: '/(tabs)/checkin',
                                      params: { challengeId: challenge.id, taskId: task.id }
                                    })}
                                    style={[
                                      styles.miniTaskBadge,
                                      done ? styles.miniTaskBadgeCompleted : styles.miniTaskBadgePending
                                    ]}
                                  >
                                    <MaterialCommunityIcons 
                                      name={done ? "star" : "star-outline"} 
                                      size={10} 
                                      color={done ? "#fff" : COLORS.goldDark} 
                                      style={{ marginRight: 2 }}
                                    />
                                    <Text 
                                      style={[
                                        styles.miniTaskBadgeText,
                                        done ? styles.miniTaskBadgeTextCompleted : styles.miniTaskBadgeTextPending
                                      ]}
                                      numberOfLines={1}
                                    >
                                      {task.title}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          );
                        })()}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </Animated.View>

          <View style={{ height: Platform.OS === 'ios' ? 100 : 80 }} />
        </ScrollView>
      </SafeAreaView>
    </WebContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  greetingContainer: { marginLeft: SPACING.md },
  greetingText: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.body, color: COLORS.textLight },
  nameText: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.heading, color: COLORS.primary },
  scrollContent: { paddingBottom: SPACING.xl },

  // Verse
  verseCard: {
    marginHorizontal: SPACING.xl, marginTop: SPACING.lg, marginBottom: SPACING.lg,
    padding: SPACING.xl, position: 'relative',
  },
  quoteIcon: { position: 'absolute', top: SPACING.md, left: SPACING.md, opacity: 0.15 },
  verseText: {
    color: '#fff', fontSize: FONTS.size.md, fontFamily: FONTS.family.body,
    fontStyle: 'italic', lineHeight: 24, textAlign: 'center', marginBottom: SPACING.sm,
  },
  verseReference: { color: COLORS.goldLight, fontSize: FONTS.size.sm, fontFamily: FONTS.family.bodySemibold, textAlign: 'right' },

  // Summary row
  summaryRow: {
    flexDirection: 'row', marginHorizontal: SPACING.xl, marginBottom: SPACING.lg, gap: SPACING.sm,
  },
  summaryCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.light,
  },
  summaryNumber: { fontSize: FONTS.size.xl, fontFamily: FONTS.family.heading },
  summaryLabel: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.bodyMedium, color: COLORS.textLight, marginTop: 2 },

  // Section
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.xl, marginBottom: SPACING.md,
  },
  sectionTitle: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.heading, color: COLORS.primary },
  sectionSubtitle: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.body, color: COLORS.textLight, marginBottom: SPACING.md },

  // Group cards
  groupsScroll: { 
    paddingHorizontal: SPACING.xl, 
    paddingBottom: Platform.OS === 'web' ? SPACING.md : SPACING.sm, 
    gap: SPACING.sm 
  },
  groupCard: { width: 180, padding: SPACING.md },
  groupCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm,
  },
  groupAvatar: {
    width: 36, height: 36, borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center', alignItems: 'center',
  },
  groupAvatarText: { color: '#fff', fontFamily: FONTS.family.heading, fontSize: FONTS.size.md },
  groupCardName: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bodySemibold, color: COLORS.primary },
  groupMetaContainer: {
    marginTop: SPACING.xs,
    gap: 4,
  },
  groupMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  groupMetaText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: FONTS.family.body,
  },
  groupCardChallenge: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.body, color: COLORS.textSecondary, marginTop: 2 },
  groupCardNoChallenge: { fontSize: FONTS.size.xs, color: COLORS.secondary, marginTop: SPACING.sm, fontFamily: FONTS.family.bodySemibold },
  groupCardFooter: { marginTop: SPACING.sm },
  groupCardDays: { fontSize: 10, fontFamily: FONTS.family.bodyMedium, color: COLORS.textLight, marginTop: 4 },

  // Habits
  habitsSection: { paddingHorizontal: SPACING.xl, marginTop: SPACING.lg, marginBottom: SPACING.lg },
  habitsGrid: { gap: SPACING.md },
  habitCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.light,
  },
  habitCardCompleted: { backgroundColor: COLORS.secondaryMuted, borderColor: 'rgba(61, 123, 84, 0.2)' },
  habitIconBg: { width: 44, height: 44, borderRadius: BORDER_RADIUS.md, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
  habitInfo: { flex: 1 },
  habitTitle: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bodySemibold, color: COLORS.primary },
  habitDesc: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.body, color: COLORS.textSecondary },
  habitStatusContainer: { justifyContent: 'center' },
  statusBadge: {
    paddingHorizontal: SPACING.sm + 2, paddingVertical: SPACING.xs,
    backgroundColor: COLORS.surfaceVariant, borderRadius: BORDER_RADIUS.full,
  },
  statusBadgeCompleted: { backgroundColor: COLORS.secondary, flexDirection: 'row', alignItems: 'center', gap: 3 },
  statusText: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.bodySemibold, color: COLORS.textSecondary },
  statusTextCompleted: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.bodyBold, color: '#fff' },

  // Shortcuts
  shortcutsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl, gap: SPACING.sm,
  },
  shortcutCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.light,
  },
  shortcutIconBg: { width: 40, height: 40, borderRadius: BORDER_RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  shortcutTitle: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bodySemibold, color: COLORS.primary },
  shortcutSubtitle: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.body, color: COLORS.textLight },

  // Welcome empty state
  noGroupsCard: {
    marginHorizontal: SPACING.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.surface,
  },
  noGroupsIconBg: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.secondaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  noGroupsTitle: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.heading,
    color: COLORS.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  noGroupsSubtitle: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  noChallengesCard: {
    marginHorizontal: SPACING.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceVariant,
  },
  noChallengesText: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.body,
    color: COLORS.textSecondary,
  },
  emptyGroupDashboardCard: {
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  emptyGroupIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.secondaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyGroupDashboardTitle: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.heading,
    color: COLORS.primary,
    fontWeight: FONTS.weight.bold,
  },
  emptyGroupDashboardSubtitle: {
    fontSize: 10,
    fontFamily: FONTS.family.body,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  // Compact Challenges
  compactChallengesContainer: {
    marginHorizontal: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.light,
  },
  compactChallengeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  compactChallengeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  compactChallengeIconBg: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactChallengeInfo: {
    flex: 1,
  },
  compactChallengeTitle: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bodySemibold,
    color: COLORS.primary,
  },
  compactChallengeSubtitle: {
    fontSize: 10,
    fontFamily: FONTS.family.body,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  compactChallengeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  compactChallengeDays: {
    fontSize: 10,
    fontFamily: FONTS.family.bodyMedium,
    color: COLORS.textLight,
  },
  compactHabitsRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    alignItems: 'center',
  },
  miniHabitButton: {
    width: 28,
    height: 28,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniHabitButtonPending: {
    backgroundColor: COLORS.border,
  },
  compactChallengeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  extraTasksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingLeft: 48,
  },
  miniTaskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
  },
  miniTaskBadgePending: {
    backgroundColor: '#fff9eb',
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  miniTaskBadgeCompleted: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  miniTaskBadgeText: {
    fontSize: 9,
    fontFamily: FONTS.family.bodyMedium,
  },
  miniTaskBadgeTextPending: {
    color: COLORS.goldDark,
  },
  miniTaskBadgeTextCompleted: {
    color: '#fff',
  },
});
