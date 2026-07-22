import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  Platform,
  ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { WebContainer } from '../components/ui/WebContainer';
import { MOCK_RANKINGS, MOCK_GROUPS, MOCK_ROUNDS, RankingMember, getMockRankings } from '../constants/mock-data';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, SHADOWS } from '../constants/theme';
import { useAuth } from '../context/auth';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';

export default function RankingScreen() {
  const router = useRouter();
  const { challengeId, groupId } = useLocalSearchParams<{ challengeId?: string; groupId?: string }>();
  const { user } = useAuth();

  const [challengesList, setChallengesList] = useState<any[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>('');
  const [rankingData, setRankingData] = useState<RankingMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRanking, setLoadingRanking] = useState(false);

  // 1. Carregar lista de desafios disponíveis (do grupo ou gerais)
  useEffect(() => {
    async function loadChallenges() {
      try {
        setLoading(true);
        let list: any[] = [];

        if (groupId) {
          list = await api.getGroupChallenges(groupId);
        } else {
          const { data } = await supabase.from('challenges').select('*');
          list = data || [];
        }

        const fullList = list;

        setChallengesList(fullList);

        if (fullList.length > 0) {
          // Selecionar por padrão o challengeId recebido ou o primeiro da lista
          let defaultId = fullList[0].id;
          if (challengeId && fullList.some(c => c.id === challengeId)) {
            defaultId = challengeId;
          }
          setSelectedChallengeId(defaultId);
        }
      } catch (err) {
        console.error('Erro ao carregar desafios para o ranking:', err);
      } finally {
        setLoading(false);
      }
    }
    loadChallenges();
  }, [groupId, challengeId]);

  // 2. Carregar e calcular o ranking dinâmico sempre que o desafio selecionado mudar
  useEffect(() => {
    if (!selectedChallengeId) return;

    async function loadRankingForSelectedChallenge() {
      setLoadingRanking(true);
      await getMockRankings();

      const isMock = selectedChallengeId.startsWith('chal');
      if (isMock) {
        const mRank = MOCK_RANKINGS[selectedChallengeId] || [];
        setRankingData(mRank);
        setLoadingRanking(false);
        return;
      }

      try {
        // A. Buscar dados do desafio e seus rounds no Supabase
        const { data: chalData } = await supabase
          .from('challenges')
          .select('*, rounds(*)')
          .eq('id', selectedChallengeId)
          .maybeSingle();

        if (!chalData) {
          setRankingData([]);
          setLoadingRanking(false);
          return;
        }

        const roundIds = (chalData.rounds || []).map((r: any) => r.id);

        // B. Buscar membros aprovados do desafio + todos os membros do grupo
        const { data: approvedRequests } = await supabase
          .from('challenge_requests')
          .select('user_id, profiles(id, full_name, avatar_url, streak)')
          .eq('challenge_id', selectedChallengeId)
          .eq('status', 'approved');

        const { data: challengeMembers } = await supabase
          .from('challenge_members')
          .select('user_id, profiles(id, full_name, avatar_url, streak)')
          .eq('challenge_id', selectedChallengeId);

        const { data: groupMembersData } = await supabase
          .from('group_members')
          .select('user_id, role, profiles(id, full_name, avatar_url, streak)')
          .eq('group_id', chalData.group_id);

        // Mapear participantes únicos (TODOS os membros do grupo + participantes inscritos no desafio)
        const participantsMap = new Map<string, { user_id: string; name: string; avatar_url: string | null; streak: number }>();

        // 1. Incluir TODOS os membros do grupo proprietário do desafio
        (groupMembersData || []).forEach((m: any) => {
          const prof = m.profiles || {};
          participantsMap.set(m.user_id, {
            user_id: m.user_id,
            name: prof.full_name || 'Participante',
            avatar_url: prof.avatar_url || null,
            streak: prof.streak || 0,
          });
        });

        // 2. Incluir participantes aprovados via solicitação
        (approvedRequests || []).forEach((r: any) => {
          const prof = r.profiles || {};
          if (!participantsMap.has(r.user_id)) {
            participantsMap.set(r.user_id, {
              user_id: r.user_id,
              name: prof.full_name || 'Participante',
              avatar_url: prof.avatar_url || null,
              streak: prof.streak || 0,
            });
          }
        });

        // 3. Incluir participantes gravados na tabela challenge_members
        (challengeMembers || []).forEach((cm: any) => {
          const prof = cm.profiles || {};
          if (!participantsMap.has(cm.user_id)) {
            participantsMap.set(cm.user_id, {
              user_id: cm.user_id,
              name: prof.full_name || 'Participante',
              avatar_url: prof.avatar_url || null,
              streak: prof.streak || 0,
            });
          }
        });

        // 4. Caso exista no mock local
        const mockAllowed = MOCK_RANKINGS[selectedChallengeId] || [];
        mockAllowed.forEach((m: any) => {
          if (!participantsMap.has(m.user_id)) {
            participantsMap.set(m.user_id, {
              user_id: m.user_id,
              name: m.name,
              avatar_url: m.avatar_url,
              streak: m.streak || 0
            });
          }
        });

        // C. Buscar check-ins gravados no banco para esses rounds
        let dbCheckins: any[] = [];
        if (roundIds.length > 0) {
          const { data: cData } = await supabase
            .from('checkins')
            .select('user_id, note, round_id')
            .in('round_id', roundIds);
          dbCheckins = cData || [];
        }

        // D. Calcular pontuação real: 10 pts por check-in regular e 30 pts por tarefa extra
        const calculatedRanking: RankingMember[] = Array.from(participantsMap.values()).map(p => {
          const userCheckins = dbCheckins.filter(c => c.user_id === p.user_id);
          
          let points = 0;
          userCheckins.forEach(c => {
            if (c.note && c.note.startsWith('[EXTRA_TASK_ID:')) {
              points += 30; // 30 pontos por tarefa extra concluída
            } else {
              points += 10; // 10 pontos por check-in diário
            }
          });

          return {
            user_id: p.user_id,
            name: p.name,
            avatar_url: p.avatar_url || '',
            points: points,
            streak: userCheckins.length > 0 ? Math.max(p.streak, userCheckins.length) : p.streak,
            rounds_won: 0
          };
        });

        // Ordenar por pontos decrescentes
        calculatedRanking.sort((a, b) => b.points - a.points);
        setRankingData(calculatedRanking);

      } catch (e) {
        console.error('Erro ao buscar ranking dinâmico no Supabase:', e);
        setRankingData([]);
      } finally {
        setLoadingRanking(false);
      }
    }

    loadRankingForSelectedChallenge();
  }, [selectedChallengeId, user]);

  // Mapear posições de acordo com a ordem de pontuação
  const sortedRanking = [...rankingData]
    .sort((a, b) => b.points - a.points)
    .map((member, index) => ({
      ...member,
      position: index + 1
    }));

  // Separar pódio (Top 3) e o restante da classificação
  const top1 = sortedRanking.find(m => m.position === 1);
  const top2 = sortedRanking.find(m => m.position === 2);
  const top3 = sortedRanking.find(m => m.position === 3);
  const remainder = sortedRanking.filter(m => m.position > 3);

  const selectedChallengeObj = challengesList.find(c => c.id === selectedChallengeId);

  if (loading) {
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
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ranking do Desafio</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* SELETOR DE DESAFIOS */}
          {challengesList.length > 0 && (
            <View style={styles.selectorContainer}>
              <Text style={styles.selectorTitle}>ESCOLHA O DESAFIO:</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.selectorScroll}
              >
                {challengesList.map(chal => {
                  const isSelected = chal.id === selectedChallengeId;
                  return (
                    <TouchableOpacity
                      key={chal.id}
                      activeOpacity={0.8}
                      onPress={() => setSelectedChallengeId(chal.id)}
                      style={[
                        styles.challengeChip,
                        isSelected && styles.challengeChipSelected
                      ]}
                    >
                      <MaterialCommunityIcons 
                        name={isSelected ? "trophy" : "trophy-outline"} 
                        size={16} 
                        color={isSelected ? "#fff" : COLORS.primary} 
                      />
                      <Text 
                        style={[
                          styles.challengeChipText,
                          isSelected && styles.challengeChipTextSelected
                        ]}
                        numberOfLines={1}
                      >
                        {chal.title || chal.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {loadingRanking ? (
            <View style={{ paddingVertical: 60, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={COLORS.secondary} />
              <Text style={{ marginTop: SPACING.md, fontSize: FONTS.size.xs, color: COLORS.textSecondary, fontFamily: FONTS.family.body }}>
                Calculando pontos e posições...
              </Text>
            </View>
          ) : (
            <>
              {/* TÍTULO DO DESAFIO ATIVO */}
              {selectedChallengeObj && (
                <View style={styles.activeChallengeHeader}>
                  <Text style={styles.activeChallengeTitle}>
                    {selectedChallengeObj.title || selectedChallengeObj.name}
                  </Text>
                </View>
              )}

              {/* PÓDIO TOP 3 */}
              <View style={styles.podiumContainer}>
                {/* Segundo Lugar (Esquerda) */}
                {top2 ? (
                  <View style={styles.podiumCol}>
                    <View style={styles.avatarWrapper}>
                      <Avatar source={top2.avatar_url} name={top2.name} size={58} />
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
                ) : (
                  <View style={styles.podiumCol} />
                )}

                {/* Primeiro Lugar (Centro - Destaque) */}
                {top1 ? (
                  <View style={[styles.podiumCol, styles.podiumColCenter]}>
                    <MaterialCommunityIcons name="crown" size={26} color={COLORS.gold} style={styles.crownIcon} />
                    <View style={styles.avatarWrapperCenter}>
                      <Avatar source={top1.avatar_url} name={top1.name} size={74} style={styles.goldAvatarBorder} />
                      <View style={[styles.podiumBadge, { backgroundColor: COLORS.gold }]}>
                        <Text style={styles.podiumBadgeText}>1</Text>
                      </View>
                    </View>
                    <Text style={styles.podiumNameCenter} numberOfLines={1}>{top1.name.split(' ')[0]}</Text>
                    <Text style={styles.podiumPointsCenter}>{top1.points} pts</Text>
                    <View style={[styles.podiumBase, styles.podium1, SHADOWS.medium]}>
                      <Text style={styles.podiumBaseText}>1º</Text>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.podiumCol, styles.podiumColCenter]} />
                )}

                {/* Terceiro Lugar (Direita) */}
                {top3 ? (
                  <View style={styles.podiumCol}>
                    <View style={styles.avatarWrapper}>
                      <Avatar source={top3.avatar_url} name={top3.name} size={58} />
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
                ) : (
                  <View style={styles.podiumCol} />
                )}
              </View>

              {/* RESTANTE DOS PARTICIPANTES (CLASSIFICAÇÃO GERAL NA SEQUÊNCIA) */}
              <View style={styles.listSection}>
                <Text style={styles.listSectionTitle}>
                  {remainder.length > 0 ? "Classificação Geral" : "Participantes do Desafio"}
                </Text>
                
                {sortedRanking.length === 0 ? (
                  <Card variant="flat" style={{ padding: SPACING.lg, alignItems: 'center' }}>
                    <Text style={{ fontSize: FONTS.size.xs, color: COLORS.textSecondary, fontFamily: FONTS.family.body }}>
                      Nenhum participante pontuou neste desafio ainda.
                    </Text>
                  </Card>
                ) : (
                  <Card variant="default" style={styles.leaderboardCard}>
                    {sortedRanking.map((member, index) => (
                      <View 
                        key={member.user_id} 
                        style={[
                          styles.leaderboardRow,
                          index === sortedRanking.length - 1 && { borderBottomWidth: 0 }
                        ]}
                      >
                        {/* Posição */}
                        <Text style={styles.positionText}>{member.position}º</Text>
                        
                        {/* Usuário */}
                        <View style={styles.userCol}>
                          <Avatar source={member.avatar_url} name={member.name} size={36} />
                          <View style={{ marginLeft: SPACING.sm }}>
                            <Text style={styles.userNameText}>{member.name}</Text>
                            <View style={styles.detailsRow}>
                              {/* Streak */}
                              <View style={styles.streakBadgeInline}>
                                <MaterialCommunityIcons name="fire" size={12} color={member.streak > 0 ? "#ff4e50" : COLORS.textLight} />
                                <Text style={[styles.streakTextInline, member.streak === 0 && { color: COLORS.textLight }]}>
                                  {member.streak}d
                                </Text>
                              </View>
                              {/* Rounds vencidos */}
                              {member.rounds_won > 0 && (
                                <View style={styles.roundsBadgeInline}>
                                  <MaterialCommunityIcons name="crown" size={12} color={COLORS.gold} />
                                  <Text style={styles.roundsTextInline}>{member.rounds_won} rd</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>

                        {/* Pontos */}
                        <View style={styles.pointsCol}>
                          <Text style={styles.pointsValueText}>{member.points}</Text>
                          <Text style={styles.pointsLabelText}>pts</Text>
                        </View>
                      </View>
                    ))}
                  </Card>
                )}
              </View>
            </>
          )}

          {/* INFORMAÇÃO DOS PONTOS */}
          <Card variant="flat" style={styles.infoBox}>
            <MaterialCommunityIcons name="information-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.infoBoxText}>
              A pontuação é acumulada através da conclusão dos check-ins diários da rotina (+10 pts) e das tarefas extras ativas (+30 pts) de cada round do desafio.
            </Text>
          </Card>
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
  backButton: {
    padding: 2,
  },
  headerTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    fontFamily: FONTS.family.heading,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  selectorContainer: {
    backgroundColor: COLORS.surface,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  selectorTitle: {
    fontSize: 10,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textLight,
    fontFamily: FONTS.family.heading,
    letterSpacing: 0.5,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xs,
  },
  selectorScroll: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    alignItems: 'center',
  },
  challengeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: 999,
    gap: 6,
  },
  challengeChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  challengeChipText: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bodyBold,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
  },
  challengeChipTextSelected: {
    color: '#fff',
  },
  activeChallengeHeader: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    alignItems: 'center',
  },
  activeChallengeTitle: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.heading,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    textAlign: 'center',
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
  listSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  listSectionTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    fontFamily: FONTS.family.heading,
    marginBottom: SPACING.md,
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
  infoBox: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoBoxText: {
    flex: 1,
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
    lineHeight: 16,
    fontFamily: FONTS.family.body,
  }
});
