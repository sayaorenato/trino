import React, { useState, useEffect } from 'react';
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
  ActivityIndicator
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/auth';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { StreakBadge } from '../../components/ui/StreakBadge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Button } from '../../components/ui/Button';
import { 
  HABIT_LABELS, 
  HabitType,
  MOCK_FEED
} from '../../constants/mock-data';
import { COLORS, SPACING, FONTS, SHADOWS, BORDER_RADIUS } from '../../constants/theme';

const { width } = Dimensions.get('window');

// Lista de versículos do dia
const VERSES = [
  { text: "Não fui eu que ordenei a você? Seja forte e corajoso! Não se apavore nem desanime, pois o Senhor, o seu Deus, estará com você por onde você andar.", reference: "Josué 1:9" },
  { text: "Tudo posso naquele que me fortalece.", reference: "Filipenses 4:13" },
  { text: "O Senhor é o meu pastor; de nada terei falta.", reference: "Salmos 23:1" },
  { text: "Pois Deus não nos deu espírito de covardia, mas de poder, de amor e de equilíbrio.", reference: "2 Timóteo 1:7" }
];

export default function DashboardScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  
  const [groups, setGroups] = useState<any[]>([]);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [activeChallenge, setActiveChallenge] = useState<any>(null);
  
  const [todayHabits, setTodayHabits] = useState<Record<HabitType, boolean>>({
    prayer: false,
    bible: false,
    exercise: false,
  });

  const [loading, setLoading] = useState(true);

  // Versículo do dia aleatório com base na data
  const verseIndex = new Date().getDate() % VERSES.length;
  const todayVerse = VERSES[verseIndex];

  useFocusEffect(
    React.useCallback(() => {
      async function loadData() {
        if (!user) return;
        setLoading(true);
        const userGroups = await api.getUserGroups(user.id);
        setGroups(userGroups);
        
        if (userGroups.length > 0) {
          const challenge = await api.getActiveChallenge(userGroups[activeGroupIndex]?.id || userGroups[0].id);
          setActiveChallenge(challenge);
          
          if (challenge?.rounds?.length > 0) {
            const currentRound = challenge.rounds[0];
            const checkins = await api.getTodayCheckins(user.id, currentRound.id);
            
            const habitsState = { prayer: false, bible: false, exercise: false };
            checkins.forEach((c: any) => {
               if (c.type === 'pray') habitsState.prayer = true;
               if (c.type === 'bible') habitsState.bible = true;
               if (c.type === 'workout') habitsState.exercise = true;
            });
            setTodayHabits(habitsState);
          } else {
            setTodayHabits({ prayer: false, bible: false, exercise: false });
          }
        }
        setLoading(false);
      }
      loadData();
    }, [user, activeGroupIndex])
  );

  const activeGroup = groups[activeGroupIndex];

  // Último check-in da comunidade para o preview (Ainda mockado para MVP, integraremos feed em seguida)
  const lastFeedItem = MOCK_FEED.find(item => item.user_id !== user?.id) || MOCK_FEED[0];

  const handleToggleHabit = (type: HabitType) => {
    router.push('/(tabs)/checkin');
  };

  if (loading && groups.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* HEADER PRINCIPAL */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Avatar 
            source={profile?.avatar_url ?? undefined} 
            name={profile?.full_name || 'User'} 
            size={44} 
          />
          <View style={styles.greetingContainer}>
            <Text style={styles.greetingText}>Olá,</Text>
            <Text style={styles.nameText}>{profile?.full_name?.split(' ')[0] || 'Visitante'}</Text>
          </View>
        </View>
        <StreakBadge count={profile?.streak_count || 0} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        
        {groups.length === 0 ? (
          <View style={{ padding: SPACING.xl, alignItems: 'center', marginTop: SPACING.xxl }}>
            <MaterialCommunityIcons name="account-group-outline" size={64} color={COLORS.textLight} />
            <Text style={{ fontSize: FONTS.size.lg, fontWeight: 'bold', color: COLORS.primary, marginTop: SPACING.md, textAlign: 'center' }}>
              Você ainda não está em nenhum grupo
            </Text>
            <Text style={{ fontSize: FONTS.size.sm, color: COLORS.textSecondary, marginTop: SPACING.sm, textAlign: 'center', marginBottom: SPACING.lg }}>
              Para participar de desafios e fazer check-ins, crie um grupo ou peça um convite.
            </Text>
            <Button 
              title="Criar Novo Grupo" 
              variant="primary" 
              onPress={() => router.push('/create-group')}
              style={{ width: '100%' }}
            />
          </View>
        ) : (
          <>
            {/* SELETOR DE GRUPOS (TABS RAPIDAS) */}
            <View style={styles.groupsSelectorContainer}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.groupsSelectorScroll}
              >
                {groups.map((group, index) => (
                  <TouchableOpacity
                    key={group.id}
                    style={[
                      styles.groupChip,
                      activeGroupIndex === index && styles.groupChipActive
                    ]}
                    onPress={() => setActiveGroupIndex(index)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.groupChipText,
                      activeGroupIndex === index && styles.groupChipTextActive
                    ]}>
                      {group.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* VERSÍCULO DO DIA */}
            <Card variant="gradient" gradientColors={COLORS.gradients.primary} style={styles.verseCard}>
              <MaterialCommunityIcons name="format-quote-open" size={32} color={COLORS.goldLight} style={styles.quoteIcon} />
              <Text style={styles.verseText}>{todayVerse.text}</Text>
              <Text style={styles.verseReference}>{todayVerse.reference}</Text>
            </Card>

            {/* CARD DO DESAFIO ATIVO */}
            {activeChallenge ? (
              <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={() => router.push('/(tabs)/challenge')}
              >
                <Card variant="default" style={styles.challengeCard}>
                  <View style={styles.challengeHeader}>
                    <View>
                      <Text style={styles.challengeLabel}>Desafio do Grupo</Text>
                      <Text style={styles.challengeTitle}>{activeChallenge.title}</Text>
                    </View>
                    {activeChallenge.rounds && activeChallenge.rounds.length > 0 && (
                      <View style={styles.roundBadge}>
                        <Text style={styles.roundBadgeText}>Round {activeChallenge.rounds[0].round_number}</Text>
                      </View>
                    )}
                  </View>
                  
                  <Text style={styles.challengeProgressText}>Progresso Coletivo</Text>
                  <ProgressBar 
                    progress={0.65} // Simula progresso coletivo
                    height={8} 
                    style={styles.progressBar} 
                  />
                  
                  <View style={styles.challengeFooter}>
                    <Text style={styles.challengeFooterText}>
                      Termina em: {new Date(activeChallenge.end_date).toLocaleDateString('pt-BR')}
                    </Text>
                    <View style={styles.viewDetailsContainer}>
                      <Text style={styles.viewDetailsText}>Detalhes</Text>
                      <MaterialCommunityIcons name="chevron-right" size={16} color={COLORS.secondary} />
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ) : (
              <Card variant="flat" style={styles.noChallengeCard}>
                <MaterialCommunityIcons name="trophy-outline" size={36} color={COLORS.textLight} />
                <Text style={styles.noChallengeText}>Nenhum desafio ativo no momento</Text>
                <TouchableOpacity 
                  style={styles.createChallengeBtn}
                  onPress={() => router.push({ pathname: '/create-challenge', params: { groupId: activeGroup.id } })}
                >
                  <Text style={styles.createChallengeBtnText}>Criar Desafio</Text>
                </TouchableOpacity>
              </Card>
            )}

            {/* ÁREA BENTO DE HÁBITOS */}
            <View style={styles.habitsSection}>
              <Text style={styles.sectionTitle}>Seus Hábitos de Hoje</Text>
              <Text style={styles.sectionSubtitle}>Clique no hábito para fazer check-in</Text>
              
              <View style={styles.habitsGrid}>
                {/* Oração Card */}
                <TouchableOpacity 
                  activeOpacity={0.8}
                  style={[
                    styles.habitCard, 
                    todayHabits.prayer && styles.habitCardCompleted
                  ]}
                  onPress={() => handleToggleHabit('prayer')}
                >
                  <View style={[styles.habitIconBg, { backgroundColor: COLORS.goldLight }]} >
                <MaterialCommunityIcons 
                  name={HABIT_LABELS.prayer.icon} 
                  size={24} 
                  color="#fff" 
                />
              </View>
              <View style={styles.habitInfo}>
                <Text style={styles.habitTitle}>{HABIT_LABELS.prayer.title}</Text>
                <Text style={styles.habitDesc}>{HABIT_LABELS.prayer.description}</Text>
              </View>
              <View style={styles.habitStatusContainer}>
                {todayHabits.prayer ? (
                  <View style={[styles.statusBadge, styles.statusBadgeCompleted]}>
                    <MaterialCommunityIcons name="check-bold" size={14} color="#fff" />
                    <Text style={styles.statusTextCompleted}>Pago</Text>
                  </View>
                ) : (
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>Pendente</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {/* Bíblia Card */}
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[
                styles.habitCard, 
                todayHabits.bible && styles.habitCardCompleted
              ]}
              onPress={() => handleToggleHabit('bible')}
            >
              <View style={[styles.habitIconBg, { backgroundColor: COLORS.primaryLight }]}>
                <MaterialCommunityIcons 
                  name={HABIT_LABELS.bible.icon} 
                  size={24} 
                  color="#fff" 
                />
              </View>
              <View style={styles.habitInfo}>
                <Text style={styles.habitTitle}>{HABIT_LABELS.bible.title}</Text>
                <Text style={styles.habitDesc}>{HABIT_LABELS.bible.description}</Text>
              </View>
              <View style={styles.habitStatusContainer}>
                {todayHabits.bible ? (
                  <View style={[styles.statusBadge, styles.statusBadgeCompleted]}>
                    <MaterialCommunityIcons name="check-bold" size={14} color="#fff" />
                    <Text style={styles.statusTextCompleted}>Pago</Text>
                  </View>
                ) : (
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>Pendente</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {/* Exercício Card */}
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[
                styles.habitCard, 
                todayHabits.exercise && styles.habitCardCompleted
              ]}
              onPress={() => handleToggleHabit('exercise')}
            >
              <View style={[styles.habitIconBg, { backgroundColor: COLORS.secondary }]}>
                <MaterialCommunityIcons 
                  name={HABIT_LABELS.exercise.icon} 
                  size={24} 
                  color="#fff" 
                />
              </View>
              <View style={styles.habitInfo}>
                <Text style={styles.habitTitle}>{HABIT_LABELS.exercise.title}</Text>
                <Text style={styles.habitDesc}>{HABIT_LABELS.exercise.description}</Text>
              </View>
              <View style={styles.habitStatusContainer}>
                {todayHabits.exercise ? (
                  <View style={[styles.statusBadge, styles.statusBadgeCompleted]}>
                    <MaterialCommunityIcons name="check-bold" size={14} color="#fff" />
                    <Text style={styles.statusTextCompleted}>Pago</Text>
                  </View>
                ) : (
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>Pendente</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ATALHOS FEED E RANKING */}
        <View style={styles.shortcutsRow}>
          <TouchableOpacity 
            style={[styles.shortcutCard, SHADOWS.light]}
            onPress={() => router.push('/feed')}
            activeOpacity={0.7}
          >
            <View style={[styles.shortcutIconBg, { backgroundColor: '#eefcf4' }]}>
              <MaterialCommunityIcons name="newspaper-variant-outline" size={22} color={COLORS.secondary} />
            </View>
            <View style={{ marginLeft: SPACING.sm }}>
              <Text style={styles.shortcutTitle}>Feed do Grupo</Text>
              <Text style={styles.shortcutSubtitle}>Ver check-ins</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.shortcutCard, SHADOWS.light]}
            onPress={() => router.push('/ranking')}
            activeOpacity={0.7}
          >
            <View style={[styles.shortcutIconBg, { backgroundColor: '#fff9eb' }]}>
              <MaterialCommunityIcons name="podium-gold" size={22} color={COLORS.gold} />
            </View>
            <View style={{ marginLeft: SPACING.sm }}>
              <Text style={styles.shortcutTitle}>Leaderboard</Text>
              <Text style={styles.shortcutSubtitle}>Ver posições</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* PREVIEW DA COMUNIDADE */}
        <View style={styles.communitySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Atividade Recente</Text>
            <TouchableOpacity onPress={() => router.push('/feed')}>
              <Text style={styles.seeAllText}>Ver Tudo</Text>
            </TouchableOpacity>
          </View>

          <Card variant="default" style={styles.previewCard}>
            <View style={styles.previewUserRow}>
              <Avatar source={lastFeedItem.user_avatar} name={lastFeedItem.user_name} size={36} />
              <View style={styles.previewUserInfo}>
                <Text style={styles.previewUserName}>{lastFeedItem.user_name}</Text>
                <Text style={styles.previewTime}>
                  Há {Math.round((new Date().getTime() - new Date(lastFeedItem.created_at).getTime()) / (1000 * 60 * 60))}h
                </Text>
              </View>
              <View style={[styles.previewHabitBadge, { backgroundColor: HABIT_LABELS[lastFeedItem.habit_type].color }]}>
                <Text style={styles.previewHabitText}>
                  {HABIT_LABELS[lastFeedItem.habit_type].title}
                </Text>
              </View>
            </View>

            <Text style={styles.previewCaption} numberOfLines={2}>
              "{lastFeedItem.caption}"
            </Text>

            {lastFeedItem.media_url ? (
              <View style={styles.previewImageContainer}>
                <Avatar 
                  source={lastFeedItem.media_url} 
                  name="Media" 
                  size={120} 
                  style={styles.previewImage}
                />
              </View>
            ) : null}
          </Card>
        </View>
          </>
        )}

        {/* Rodapé Invisível para dar espaçamento da TabBar */}
        <View style={{ height: Platform.OS === 'ios' ? 100 : 80 }} />
      </ScrollView>
    </SafeAreaView>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetingContainer: {
    marginLeft: SPACING.sm,
  },
  greetingText: {
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    fontFamily: FONTS.family.body,
  },
  nameText: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    fontFamily: FONTS.family.heading,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  groupsSelectorContainer: {
    marginVertical: SPACING.md,
  },
  groupsSelectorScroll: {
    paddingHorizontal: SPACING.lg,
  },
  groupChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: BORDER_RADIUS.lg,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  groupChipActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  groupChipText: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.semibold,
    color: COLORS.textSecondary,
  },
  groupChipTextActive: {
    color: '#fff',
  },
  verseCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    padding: SPACING.xl,
    position: 'relative',
  },
  quoteIcon: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    opacity: 0.15,
  },
  verseText: {
    color: '#fff',
    fontSize: FONTS.size.md,
    fontStyle: 'italic',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    fontFamily: FONTS.family.body,
  },
  verseReference: {
    color: COLORS.goldLight,
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    textAlign: 'right',
    fontFamily: FONTS.family.heading,
  },
  challengeCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  challengeLabel: {
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weight.semibold,
    textTransform: 'uppercase',
  },
  challengeTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    fontFamily: FONTS.family.heading,
  },
  roundBadge: {
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  roundBadgeText: {
    fontSize: FONTS.size.xs,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
  },
  challengeProgressText: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.semibold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  progressBar: {
    marginBottom: SPACING.md,
  },
  challengeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  challengeFooterText: {
    fontSize: FONTS.size.xs,
    color: COLORS.textLight,
  },
  viewDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: FONTS.size.xs,
    fontWeight: FONTS.weight.bold,
    color: COLORS.secondary,
    marginRight: 2,
  },
  noChallengeCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    alignItems: 'center',
    padding: SPACING.xl,
  },
  noChallengeText: {
    fontSize: FONTS.size.md,
    color: COLORS.textSecondary,
    marginVertical: SPACING.md,
    textAlign: 'center',
  },
  createChallengeBtn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  createChallengeBtnText: {
    color: '#fff',
    fontWeight: FONTS.weight.semibold,
  },
  habitsSection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
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
    marginBottom: SPACING.md,
  },
  habitsGrid: {
    gap: SPACING.md,
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(225, 222, 227, 0.4)',
  },
  habitCardCompleted: {
    backgroundColor: '#f6fbf6',
    borderColor: 'rgba(74, 101, 74, 0.2)',
  },
  habitIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  habitInfo: {
    flex: 1,
  },
  habitTitle: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
  },
  habitDesc: {
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
  },
  habitStatusContainer: {
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: BORDER_RADIUS.md,
  },
  statusBadgeCompleted: {
    backgroundColor: COLORS.secondary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: FONTS.size.xs,
    fontWeight: FONTS.weight.semibold,
    color: COLORS.textSecondary,
  },
  statusTextCompleted: {
    fontSize: FONTS.size.xs,
    fontWeight: FONTS.weight.bold,
    color: '#fff',
    marginLeft: 2,
  },
  shortcutsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  shortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    backgroundColor: COLORS.surfaceCard,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(225, 222, 227, 0.4)',
  },
  shortcutIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortcutTitle: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
  },
  shortcutSubtitle: {
    fontSize: FONTS.size.xs,
    color: COLORS.textLight,
  },
  communitySection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  seeAllText: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    color: COLORS.secondary,
  },
  previewCard: {
    padding: SPACING.md,
  },
  previewUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  previewUserInfo: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  previewUserName: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
  },
  previewTime: {
    fontSize: FONTS.size.xs,
    color: COLORS.textLight,
  },
  previewHabitBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.md,
  },
  previewHabitText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: FONTS.weight.bold,
  },
  previewCaption: {
    fontSize: FONTS.size.sm,
    color: COLORS.text,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  previewImageContainer: {
    marginTop: SPACING.sm,
    height: 120,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  }
});
