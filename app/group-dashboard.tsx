import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { WebContainer } from '../components/ui/WebContainer';
import { useAuth } from '../context/auth';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { MOCK_RANKINGS } from '../constants/mock-data';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, SHADOWS } from '../constants/theme';

interface GroupMember {
  user_id: string;
  role: string;
  joined_at: string;
  full_name: string;
  avatar_url: string | null;
}

export default function GroupDashboardScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { user } = useAuth();

  const [group, setGroup] = useState<any>(null);
  const [userRole, setUserRole] = useState<'admin' | 'member'>('member');
  const [challenges, setChallenges] = useState<any[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      if (!user || !groupId) return;
      setLoading(true);

      Promise.all([
        // Buscar grupo
        supabase.from('groups').select('*').eq('id', groupId).single(),
        // Buscar role do usuário
        supabase.from('group_members').select('role').eq('group_id', groupId).eq('user_id', user.id).single(),
        // Buscar desafios
        api.getGroupChallenges(groupId),
        // Buscar membros (só para contagem)
        api.getGroupMembers(groupId),
      ]).then(([groupRes, roleRes, challengesData, membersData]) => {
        if (groupRes.data) setGroup(groupRes.data);
        if (roleRes.data) setUserRole(roleRes.data.role as 'admin' | 'member');
        setChallenges(challengesData);
        setMemberCount(membersData.length);
        setLoading(false);
      });
    }, [user, groupId])
  );

  if (loading) {
    return (
      <WebContainer>
        <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={COLORS.secondary} />
        </SafeAreaView>
      </WebContainer>
    );
  }

  if (!group) {
    return (
      <WebContainer>
        <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: COLORS.textSecondary, fontFamily: FONTS.family.body }}>Grupo não encontrado.</Text>
        </SafeAreaView>
      </WebContainer>
    );
  }

  const isAdmin = userRole === 'admin';
  const now = new Date();
  const activeChallenges = challenges.filter(c => {
    const isChallengeActive = new Date(c.end_date) >= now;
    if (!isChallengeActive) return false;
    
    // Se o ranking não existir para este desafio ativo (ex: após refresh), inicializa com o usuário
    if (!MOCK_RANKINGS[c.id] && user) {
      MOCK_RANKINGS[c.id] = [
        {
          user_id: user.id,
          name: user.email?.split('@')[0] || 'Participante',
          avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
          points: 0,
          streak: 0,
          rounds_won: 0
        }
      ];
    }

    const ranking = MOCK_RANKINGS[c.id] || [];
    return ranking.some((m: any) => m.user_id === user?.id);
  });
  const pastChallenges = challenges.filter(c => new Date(c.end_date) < now);

  return (
    <WebContainer>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>{group.name}</Text>
            <View style={[styles.roleBadge, { backgroundColor: isAdmin ? COLORS.secondaryMuted : COLORS.surfaceVariant }]}>
              <Text style={[styles.roleBadgeText, { color: isAdmin ? COLORS.secondary : COLORS.textSecondary }]}>
                {isAdmin ? 'Admin' : 'Membro'}
              </Text>
            </View>
          </View>
          {isAdmin ? (
            <TouchableOpacity 
              onPress={() => router.push({ pathname: '/edit-group', params: { groupId: group.id } })}
              style={styles.backButton}
            >
              <MaterialCommunityIcons name="cog" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Descrição */}
          {group.description ? (
            <Text style={styles.description}>{group.description}</Text>
          ) : null}

          {/* Ações Rápidas */}
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              activeOpacity={0.7}
              onPress={() => router.push({ pathname: '/feed', params: { groupId: group.id } })}
            >
              <View style={[styles.actionIconBg, { backgroundColor: COLORS.secondaryMuted }]}>
                <MaterialCommunityIcons name="newspaper-variant-outline" size={24} color={COLORS.secondary} />
              </View>
              <Text style={styles.actionLabel}>Feed</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              activeOpacity={0.7}
              onPress={() => router.push({ pathname: '/group-members', params: { groupId: group.id } })}
            >
              <View style={[styles.actionIconBg, { backgroundColor: '#eef3f8' }]}>
                <MaterialCommunityIcons name="account-group-outline" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.actionLabel}>Participantes</Text>
              <Text style={styles.actionCount}>{memberCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              activeOpacity={0.7}
              onPress={() => router.push({ pathname: '/invite', params: { groupId: group.id } })}
            >
              <View style={[styles.actionIconBg, { backgroundColor: '#fff9eb' }]}>
                <MaterialCommunityIcons name="share-variant-outline" size={24} color={COLORS.gold} />
              </View>
              <Text style={styles.actionLabel}>Convidar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              activeOpacity={0.7}
              onPress={() => router.push('/ranking')}
            >
              <View style={[styles.actionIconBg, { backgroundColor: COLORS.goldMuted }]}>
                <MaterialCommunityIcons name="podium" size={24} color={COLORS.gold} />
              </View>
              <Text style={styles.actionLabel}>Ranking</Text>
            </TouchableOpacity>
          </View>

          {/* Card de Criação de Desafio (Somente para Admin) */}
          {isAdmin && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/create-challenge', params: { groupId: group.id } })}
              style={{ marginBottom: SPACING.lg }}
            >
              <Card variant="gradient" gradientColors={COLORS.gradients.sage} style={styles.createChallengeCard}>
                <View style={styles.createChallengeLeft}>
                  <MaterialCommunityIcons name="trophy" size={28} color="#fff" />
                  <View style={{ marginLeft: SPACING.md, flex: 1 }}>
                    <Text style={styles.createChallengeTitle}>Criar Novo Desafio</Text>
                    <Text style={styles.createChallengeDesc}>Inicie um novo ciclo de hábitos e constância para o grupo.</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color="#fff" />
              </Card>
            </TouchableOpacity>
          )}

          {/* Desafios Ativos */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Desafios Ativos</Text>
            {activeChallenges.length > 0 ? (
              <View style={{ gap: SPACING.md }}>
                {activeChallenges.map(challenge => {
                  const activeDaysLeft = Math.max(0, Math.ceil((new Date(challenge.end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                  const activeTotalDays = Math.max(1, Math.ceil((new Date(challenge.end_date).getTime() - new Date(challenge.start_date).getTime()) / (1000 * 60 * 60 * 24)));
                  const activeProgress = Math.max(0, Math.min(1, 1 - activeDaysLeft / activeTotalDays));
                  
                  return (
                    <TouchableOpacity
                      key={challenge.id}
                      activeOpacity={0.85}
                      onPress={() => router.push({ pathname: '/(tabs)/challenge', params: { challengeId: challenge.id } })}
                    >
                      <Card variant="gradient" gradientColors={COLORS.gradients.primary} style={styles.activeChallengeCard}>
                        <View style={styles.challengeHeader}>
                          <MaterialCommunityIcons name="trophy" size={20} color={COLORS.goldLight} />
                          <Text style={styles.challengeName}>{challenge.title || challenge.name}</Text>
                        </View>
                        <View style={styles.challengeDates}>
                          <MaterialCommunityIcons name="calendar-range" size={14} color={COLORS.goldLight} />
                          <Text style={styles.challengeDateText}>
                            {new Date(challenge.start_date).toLocaleDateString('pt-BR')} até {new Date(challenge.end_date).toLocaleDateString('pt-BR')}
                          </Text>
                        </View>
                        <ProgressBar progress={activeProgress} height={6} style={{ marginVertical: SPACING.sm }} />
                        <Text style={styles.challengeDaysLeft}>
                          {activeDaysLeft > 0 ? `${activeDaysLeft} dias restantes` : 'Encerra hoje!'}
                        </Text>
                        {challenge.rounds && (
                          <Text style={styles.challengeRoundsInfo}>
                            {challenge.rounds.length} round{challenge.rounds.length !== 1 ? 's' : ''} configurado{challenge.rounds.length !== 1 ? 's' : ''}
                          </Text>
                        )}
                        <Button
                          title="Ver Desafio"
                          variant="ghost"
                          size="sm"
                          onPress={() => router.push({ pathname: '/(tabs)/challenge', params: { challengeId: challenge.id } })}
                          style={{ marginTop: SPACING.sm, alignSelf: 'flex-start' }}
                        />
                      </Card>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Card variant="default" style={styles.noChallengeCard}>
                <MaterialCommunityIcons name="trophy-outline" size={40} color={COLORS.textLight} />
                <Text style={styles.noChallengeText}>Nenhum desafio ativo</Text>
                {isAdmin ? (
                  <Button
                    title="Criar Desafio"
                    variant="secondary"
                    size="sm"
                    icon={<MaterialCommunityIcons name="plus" size={14} color="#fff" />}
                    onPress={() => router.push({ pathname: '/create-challenge', params: { groupId: group.id } })}
                    style={{ marginTop: SPACING.md }}
                  />
                ) : (
                  <Text style={styles.noChallengeHint}>Peça a um administrador para criar um desafio.</Text>
                )}
              </Card>
            )}
          </View>

          {/* Desafios Anteriores */}
          {pastChallenges.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Desafios Anteriores</Text>
              <View style={styles.pastList}>
                {pastChallenges.map(challenge => (
                  <TouchableOpacity
                    key={challenge.id}
                    activeOpacity={0.7}
                    onPress={() => router.push({ pathname: '/(tabs)/challenge', params: { challengeId: challenge.id } })}
                  >
                    <View style={styles.pastItem}>
                      <View style={styles.pastDot} />
                      <View style={styles.pastContent}>
                        <Text style={styles.pastTitle}>{challenge.title || challenge.name}</Text>
                        <Text style={styles.pastDates}>
                          {new Date(challenge.start_date).toLocaleDateString('pt-BR')} — {new Date(challenge.end_date).toLocaleDateString('pt-BR')}
                        </Text>
                        {challenge.rounds && (
                          <Text style={styles.pastRounds}>{challenge.rounds.length} rounds</Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

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
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  backButton: { padding: 2 },
  headerCenter: { flex: 1, alignItems: 'center', marginHorizontal: SPACING.sm },
  headerTitle: {
    fontSize: FONTS.size.lg, fontFamily: FONTS.family.heading, color: COLORS.primary, fontWeight: FONTS.weight.bold,
  },
  roleBadge: {
    paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: BORDER_RADIUS.md, marginTop: 2,
  },
  roleBadgeText: { fontSize: 10, fontFamily: FONTS.family.bodyBold, fontWeight: FONTS.weight.bold },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
  description: {
    fontSize: FONTS.size.sm, fontFamily: FONTS.family.body, color: COLORS.textSecondary,
    lineHeight: 20, marginBottom: SPACING.lg,
  },

  // Actions Grid
  actionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.xl,
  },
  actionCard: {
    width: '48%', flexGrow: 1, minWidth: 140,
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.light,
  },
  actionIconBg: {
    width: 48, height: 48, borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.xs,
  },
  actionLabel: {
    fontSize: FONTS.size.sm, fontFamily: FONTS.family.bodySemibold, color: COLORS.primary,
    fontWeight: FONTS.weight.semibold,
  },
  actionCount: {
    fontSize: FONTS.size.xs, fontFamily: FONTS.family.body, color: COLORS.textLight, marginTop: 2,
  },

  // Section
  section: { marginBottom: SPACING.xl },
  sectionTitle: {
    fontSize: FONTS.size.lg, fontFamily: FONTS.family.heading, color: COLORS.primary,
    fontWeight: FONTS.weight.bold, marginBottom: SPACING.md,
  },

  // Active Challenge
  activeChallengeCard: { padding: SPACING.lg },
  challengeHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs },
  challengeName: {
    color: '#fff', fontSize: FONTS.size.md, fontFamily: FONTS.family.heading, fontWeight: FONTS.weight.bold,
  },
  challengeDates: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  challengeDateText: { color: COLORS.goldLight, fontSize: FONTS.size.xs, fontFamily: FONTS.family.body },
  challengeDaysLeft: { color: 'rgba(255,255,255,0.8)', fontSize: FONTS.size.xs, fontFamily: FONTS.family.bodySemibold },
  challengeRoundsInfo: {
    color: 'rgba(255,255,255,0.6)', fontSize: FONTS.size.xs, fontFamily: FONTS.family.body, marginTop: 2,
  },

  // No Challenge
  noChallengeCard: { padding: SPACING.xl, alignItems: 'center' },
  noChallengeText: {
    fontSize: FONTS.size.md, fontFamily: FONTS.family.heading, color: COLORS.textLight,
    marginTop: SPACING.sm, fontWeight: FONTS.weight.bold,
  },
  noChallengeHint: {
    fontSize: FONTS.size.xs, fontFamily: FONTS.family.body, color: COLORS.textLight,
    marginTop: SPACING.sm, textAlign: 'center',
  },

  // Past Challenges
  pastList: {
    paddingLeft: SPACING.md, borderLeftWidth: 2, borderLeftColor: COLORS.border, marginLeft: SPACING.sm, gap: SPACING.md,
  },
  pastItem: { flexDirection: 'row', alignItems: 'flex-start' },
  pastDot: {
    position: 'absolute', left: -22, top: 6, width: 12, height: 12, borderRadius: 6,
    backgroundColor: COLORS.textLight, borderWidth: 2, borderColor: COLORS.background,
  },
  pastContent: { flex: 1 },
  pastTitle: {
    fontSize: FONTS.size.sm, fontFamily: FONTS.family.bodySemibold, color: COLORS.primary, fontWeight: FONTS.weight.semibold,
  },
  pastDates: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.body, color: COLORS.textLight, marginTop: 2 },
  pastRounds: { fontSize: 10, fontFamily: FONTS.family.body, color: COLORS.textLight, marginTop: 2 },
  createChallengeCard: {
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  createChallengeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  createChallengeTitle: {
    color: '#fff',
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
    fontFamily: FONTS.family.heading,
  },
  createChallengeDesc: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.body,
    marginTop: 2,
  },
});
