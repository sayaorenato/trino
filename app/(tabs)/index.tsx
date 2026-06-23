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
import { HABIT_LABELS, HabitType, MOCK_RANKINGS, RankingMember, MOCK_CHALLENGE_INVITATIONS } from '../../constants/mock-data';
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

  const activeChallenges = groups.reduce((acc: any[], g: any) => {
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

          const ranking = MOCK_RANKINGS[challenge.id] || [];
          const userParticipates = ranking.some((m: any) => m.user_id === user?.id);
          if (userParticipates) {
            acc.push({
              groupName: g.name,
              challenge: challenge
            });
          }
        }
      });
    }
    return acc;
  }, []);

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
        setLoading(false);
        
        // Verificar se há convites pendentes na memória global
        checkPendingInvite();
        // Verificar se há convites para desafios
        checkChallengeInvitations();
      });
    }, [user, checkPendingInvite, checkChallengeInvitations])
  );

  const totalCheckinsDone = Object.values(habits).filter(Boolean).length;

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
                { value: activeChallenges.length, label: 'Desafios', color: COLORS.secondary },
                { value: `${totalCheckinsDone}/3`, label: 'Hoje', color: COLORS.gold },
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
                  const challenge = group.challenge;
                  const daysLeft = challenge
                    ? Math.ceil((new Date(challenge.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : 0;
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
                        {challenge ? (
                          <>
                            <Text style={styles.groupCardChallenge} numberOfLines={1}>{challenge.title}</Text>
                            <View style={styles.groupCardFooter}>
                              <ProgressBar progress={0.65} height={4} showPercentage={false} style={{ width: '100%' }} />
                              <Text style={styles.groupCardDays}>{daysLeft}d restantes</Text>
                            </View>
                          </>
                        ) : (
                          <Text style={styles.groupCardNoChallenge}>+ Criar desafio</Text>
                        )}
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

            {activeChallenges.length === 0 ? (
              <Card variant="flat" style={styles.noChallengesCard}>
                <MaterialCommunityIcons name="trophy-outline" size={24} color={COLORS.textLight} />
                <Text style={styles.noChallengesText}>Nenhum desafio ativo no momento</Text>
              </Card>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={styles.groupsScroll}>
                {activeChallenges.map((item: any) => {
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

            {/* Today's Check-ins */}
            <View style={[styles.habitsSection, groups.length === 0 && { opacity: 0.6 }]}>
              <Text style={styles.sectionTitle}>Check-ins de Hoje</Text>
              <Text style={styles.sectionSubtitle}>
                {groups.length === 0 
                  ? 'Crie ou entre em um grupo para fazer check-ins.'
                  : totalCheckinsDone === 3
                    ? 'Todos os hábitos concluídos! 🎉'
                    : `${3 - totalCheckinsDone} hábito(s) pendente(s)`}
              </Text>

              <View style={styles.habitsGrid}>
                {(['prayer', 'bible', 'exercise'] as HabitType[]).map((type) => {
                  const done = habits[type];
                  const label = HABIT_LABELS[type];
                  const iconColors: Record<HabitType, string> = {
                    prayer: COLORS.gold,
                    bible: COLORS.primaryLight,
                    exercise: COLORS.secondary,
                  };
                  return (
                    <TouchableOpacity
                      key={type}
                      activeOpacity={0.8}
                      style={[
                        styles.habitCard, 
                        done && styles.habitCardCompleted,
                        groups.length === 0 && { backgroundColor: COLORS.surfaceVariant, borderColor: COLORS.border }
                      ]}
                      disabled={groups.length === 0}
                      onPress={() => router.push('/(tabs)/checkin')}
                    >
                      <View style={[styles.habitIconBg, { backgroundColor: iconColors[type] }]}>
                        <MaterialCommunityIcons name={label.icon as any} size={22} color="#fff" />
                      </View>
                      <View style={styles.habitInfo}>
                        <Text style={styles.habitTitle}>{label.title}</Text>
                        <Text style={styles.habitDesc}>{label.description}</Text>
                      </View>
                      <View style={styles.habitStatusContainer}>
                        {done ? (
                          <View style={[styles.statusBadge, styles.statusBadgeCompleted]}>
                            <MaterialCommunityIcons name="check-bold" size={13} color="#fff" />
                            <Text style={styles.statusTextCompleted}>Feito</Text>
                          </View>
                        ) : (
                          <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>Pendente</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
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
});
