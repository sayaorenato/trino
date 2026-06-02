import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { MOCK_RANKINGS, RankingMember } from '../constants/mock-data';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, SHADOWS } from '../constants/theme';

export default function RankingScreen() {
  const router = useRouter();
  
  // Usando o ranking do desafio 1 (Fé em Constância)
  const rankingData: RankingMember[] = MOCK_RANKINGS['chal_1'] || [];

  // Mapear posições de acordo com os pontos
  const sortedRanking = [...rankingData]
    .sort((a, b) => b.points - a.points)
    .map((member, index) => ({
      ...member,
      position: index + 1
    }));

  // Separar pódio (Top 3) e o restante
  const top1 = sortedRanking.find(m => m.position === 1);
  const top2 = sortedRanking.find(m => m.position === 2);
  const top3 = sortedRanking.find(m => m.position === 3);
  const remainder = sortedRanking.filter(m => m.position > 3);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ranking do Desafio</Text>
        <View style={{ width: 24 }} /> {/* Espaçador */}
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        
        {/* PÓDIO TOP 3 */}
        <View style={styles.podiumContainer}>
          {/* Segundo Lugar (Esquerda) */}
          {top2 && (
            <View style={styles.podiumCol}>
              <View style={styles.avatarWrapper}>
                <Avatar source={top2.avatar_url} name={top2.name} size={60} />
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

          {/* Primeiro Lugar (Centro - Destaque) */}
          {top1 && (
            <View style={[styles.podiumCol, styles.podiumColCenter]}>
              <MaterialCommunityIcons name="crown" size={26} color={COLORS.gold} style={styles.crownIcon} />
              <View style={styles.avatarWrapperCenter}>
                <Avatar source={top1.avatar_url} name={top1.name} size={76} style={styles.goldAvatarBorder} />
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
          )}

          {/* Terceiro Lugar (Direita) */}
          {top3 && (
            <View style={styles.podiumCol}>
              <View style={styles.avatarWrapper}>
                <Avatar source={top3.avatar_url} name={top3.name} size={60} />
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

        {/* RESTANTE DOS PARTICIPANTES */}
        <View style={styles.listSection}>
          <Text style={styles.listSectionTitle}>Classificação Geral</Text>
          
          <Card variant="default" style={styles.leaderboardCard}>
            {remainder.map((member, index) => (
              <View 
                key={member.user_id} 
                style={[
                  styles.leaderboardRow,
                  index === remainder.length - 1 && { borderBottomWidth: 0 }
                ]}
              >
                {/* Posição */}
                <Text style={styles.positionText}>{member.position}</Text>
                
                {/* Usuário */}
                <View style={styles.userCol}>
                  <Avatar source={member.avatar_url} name={member.name} size={36} />
                  <View style={{ marginLeft: SPACING.sm }}>
                    <Text style={styles.userNameText}>{member.name}</Text>
                    <View style={styles.detailsRow}>
                      {/* Streak */}
                      {member.streak > 0 && (
                        <View style={styles.streakBadgeInline}>
                          <MaterialCommunityIcons name="fire" size={12} color="#ff4e50" />
                          <Text style={styles.streakTextInline}>{member.streak}d</Text>
                        </View>
                      )}
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
        </View>

        {/* Informação sobre os rounds */}
        <Card variant="flat" style={styles.infoBox}>
          <MaterialCommunityIcons name="information-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.infoBoxText}>
            A pontuação é zerada a cada round semanal de modo a motivar a todos. O vencedor geral do desafio de 8 semanas será quem acumular mais rounds vencidos.
          </Text>
        </Card>
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
  },
  podiumName: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.semibold,
    color: COLORS.text,
    marginBottom: 2,
  },
  podiumNameCenter: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    marginBottom: 2,
  },
  podiumPoints: {
    fontSize: 11,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  podiumPointsCenter: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    color: COLORS.secondary,
    marginBottom: SPACING.sm,
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
    borderRadius: BORDER_RADIUS.xs,
  },
  streakTextInline: {
    fontSize: 9,
    color: '#ff4e50',
    fontWeight: 'bold',
    marginLeft: 2,
  },
  roundsBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff9eb',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: BORDER_RADIUS.xs,
  },
  roundsTextInline: {
    fontSize: 9,
    color: COLORS.goldDark,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  pointsCol: {
    alignItems: 'flex-end',
  },
  pointsValueText: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.extraBold,
    color: COLORS.primary,
  },
  pointsLabelText: {
    fontSize: 9,
    color: COLORS.textLight,
    textTransform: 'uppercase',
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
  }
});
