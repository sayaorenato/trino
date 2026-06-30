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
  Alert,
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
import { MOCK_RANKINGS, CHALLENGE_REQUESTS, loadPersistedMockData, savePersistedMockData } from '../constants/mock-data';
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
  const { user, profile } = useAuth();

  const [requestTrigger, setRequestTrigger] = useState(0);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const [group, setGroup] = useState<any>(null);
  const [userRole, setUserRole] = useState<'admin' | 'member'>('member');
  const [challenges, setChallenges] = useState<any[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      if (!user || !groupId) return;
      setLoading(true);

      const loadData = async () => {
        await loadPersistedMockData();

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
      };
      loadData();
    }, [user, groupId, requestTrigger])
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

  // Filtrar os desafios ativos gerais do grupo (end_date >= agora)
  const activeGroupChallenges = challenges.filter(c => new Date(c.end_date) >= now);

  // Desafios ativos nos quais o usuário já participa do ranking (ou se for o admin do grupo)
  const activeChallenges = activeGroupChallenges.filter(c => {
    if (isAdmin) return true;
    const ranking = MOCK_RANKINGS[c.id] || [];
    return ranking.some((m: any) => m.user_id === user?.id);
  });

  // Desafios disponíveis nos quais o usuário ainda não participa do ranking (admins nunca veem disponíveis)
  const availableChallenges = activeGroupChallenges.filter(c => {
    if (isAdmin) return false;
    const ranking = MOCK_RANKINGS[c.id] || [];
    return !ranking.some((m: any) => m.user_id === user?.id);
  });

  const pastChallenges = challenges.filter(c => new Date(c.end_date) < now);

  const handleRequestJoinChallenge = async (challengeId: string, challengeName: string) => {
    if (!user || !groupId) return;

    // Se for administrador do grupo, entra no ranking na hora sem aprovação
    if (isAdmin) {
      if (!MOCK_RANKINGS[challengeId]) {
        MOCK_RANKINGS[challengeId] = [];
      }
      const alreadyInRank = MOCK_RANKINGS[challengeId].some(m => m.user_id === user.id);
      if (!alreadyInRank) {
        MOCK_RANKINGS[challengeId].push({
          user_id: user.id,
          name: profile?.full_name || user.email?.split('@')[0] || 'Administrador',
          avatar_url: profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
          points: 0,
          streak: 0,
          rounds_won: 0
        });
      }
      showAlert('Sucesso!', `Você entrou no desafio "${challengeName}" como administrador!`);
      setRequestTrigger(prev => prev + 1);
      return;
    }

    // Verificar se já existe uma solicitação pendente
    const hasPending = CHALLENGE_REQUESTS.some(
      r => r.challenge_id === challengeId && r.user_id === user.id && r.status === 'pending'
    );

    if (hasPending) {
      showAlert('Aviso', 'Você já enviou uma solicitação para este desafio. Aguarde a liberação do administrador.');
      return;
    }

    // Criar solicitação
    const newRequest = {
      id: `req_${Date.now()}`,
      challenge_id: challengeId,
      challenge_name: challengeName,
      group_id: groupId,
      user_id: user.id,
      user_name: profile?.full_name || user.email?.split('@')[0] || 'Novo Membro',
      user_avatar: profile?.avatar_url || null,
      status: 'pending' as const
    };

    CHALLENGE_REQUESTS.push(newRequest);
    await savePersistedMockData();
    showAlert('Solicitação Enviada', `Sua solicitação para entrar no desafio "${challengeName}" foi enviada. Aguarde a liberação do administrador!`);
    setRequestTrigger(prev => prev + 1);
  };

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
              onPress={() => router.push({ pathname: '/admin', params: { groupId: group.id } })}
              style={styles.backButton}
            >
              <MaterialCommunityIcons name="cog" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Alerta de solicitações pendentes para o Admin */}
          {(() => {
            const pendingRequestsCount = CHALLENGE_REQUESTS.filter(
              (r: any) => r.group_id === group.id && r.status === 'pending'
            ).length;
            if (isAdmin && pendingRequestsCount > 0) {
              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push({ pathname: '/admin', params: { groupId: group.id, tab: 'members' } })}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(174, 143, 100, 0.1)',
                    borderWidth: 1,
                    borderColor: COLORS.secondary,
                    borderRadius: BORDER_RADIUS.md,
                    padding: SPACING.md,
                    marginHorizontal: SPACING.lg,
                    marginBottom: SPACING.md,
                    marginTop: SPACING.sm,
                  }}
                >
                  <MaterialCommunityIcons name="alert-circle-outline" size={24} color={COLORS.secondary} style={{ marginRight: SPACING.sm }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: FONTS.family.heading, fontSize: FONTS.size.sm, color: COLORS.text, fontWeight: 'bold' }}>
                      Solicitações Pendentes!
                    </Text>
                    <Text style={{ fontFamily: FONTS.family.body, fontSize: FONTS.size.xs, color: COLORS.textSecondary }}>
                      Existem {pendingRequestsCount} participantes aguardando liberação no desafio deste grupo.
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
                </TouchableOpacity>
              );
            }
            return null;
          })()}

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

          {/* Desafios Disponíveis */}
          {availableChallenges.length > 0 && (
            <View style={[styles.section, { marginTop: SPACING.md }]}>
              <Text style={styles.sectionTitle}>Desafios Disponíveis</Text>
              <View style={{ gap: SPACING.md }}>
                {availableChallenges.map(challenge => {
                  const isPending = CHALLENGE_REQUESTS.some(
                    r => r.challenge_id === challenge.id && r.user_id === user?.id && r.status === 'pending'
                  );

                  return (
                    <Card key={challenge.id} variant="default" style={styles.availableChallengeCard}>
                      <View style={styles.challengeHeader}>
                        <MaterialCommunityIcons name="trophy-outline" size={20} color={COLORS.secondary} />
                        <Text style={[styles.challengeName, { color: COLORS.text, marginLeft: SPACING.xs }]}>
                          {challenge.title || challenge.name}
                        </Text>
                      </View>
                      <View style={styles.challengeDates}>
                        <MaterialCommunityIcons name="calendar-range" size={14} color={COLORS.textSecondary} />
                        <Text style={[styles.challengeDateText, { color: COLORS.textSecondary }]}>
                          {new Date(challenge.start_date).toLocaleDateString('pt-BR')} até {new Date(challenge.end_date).toLocaleDateString('pt-BR')}
                        </Text>
                      </View>
                      
                      {isPending ? (
                        <View style={styles.pendingStatusContainer}>
                          <MaterialCommunityIcons name="clock-outline" size={16} color={COLORS.goldDark} />
                          <Text style={styles.pendingStatusText}>Aguardando Liberação do Administrador</Text>
                        </View>
                      ) : (
                        <Button
                          title={isAdmin ? "Participar do Desafio" : "Solicitar Entrada"}
                          variant="secondary"
                          size="sm"
                          icon={<MaterialCommunityIcons name="plus" size={14} color="#fff" />}
                          onPress={() => handleRequestJoinChallenge(challenge.id, challenge.title || challenge.name)}
                          style={{ marginTop: SPACING.md, alignSelf: 'flex-start' }}
                        />
                      )}
                    </Card>
                  );
                })}
              </View>
            </View>
          )}

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
  availableChallengeCard: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.light,
  },
  pendingStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: '#fff9eb',
    borderColor: 'rgba(212, 175, 55, 0.2)',
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  pendingStatusText: {
    fontSize: 12,
    fontFamily: FONTS.family.bodyMedium,
    color: COLORS.goldDark,
  },
});
