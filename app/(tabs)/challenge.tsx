import React, { useState } from 'react';
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
import { Card } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Button } from '../../components/ui/Button';
import { 
  MOCK_GROUPS, 
  MOCK_CHALLENGES, 
  MOCK_ROUNDS, 
  MOCK_EXTRA_TASKS, 
  ExtraTask 
} from '../../constants/mock-data';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, SHADOWS } from '../../constants/theme';

export default function ChallengeScreen() {
  const router = useRouter();
  
  // No MVP usamos o Célula Videira como grupo padrão
  const group = MOCK_GROUPS[0];
  const challenge = MOCK_CHALLENGES['chal_1'];
  const rounds = MOCK_ROUNDS['chal_1'] || [];
  
  const [extraTasks, setExtraTasks] = useState<ExtraTask[]>(
    MOCK_EXTRA_TASKS['chal_1'] || []
  );

  const activeRound = rounds.find(r => r.status === 'active') || rounds[0];

  const handleToggleTask = (taskId: string) => {
    // Simula a conclusão de uma tarefa extra
    setExtraTasks(prev => 
      prev.map(task => {
        if (task.id === taskId) {
          const completed = task.completed_by.includes('user_1');
          return {
            ...task,
            completed_by: completed 
              ? task.completed_by.filter(id => id !== 'user_1')
              : [...task.completed_by, 'user_1']
          };
        }
        return task;
      })
    );
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Desafio Ativo</Text>
        <TouchableOpacity 
          style={styles.rankingButton}
          onPress={() => router.push('/ranking')}
        >
          <MaterialCommunityIcons name="podium" size={22} color={COLORS.secondary} />
        </TouchableOpacity>
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
            <TouchableOpacity 
              style={styles.adminLink}
              onPress={() => router.push('/admin')}
            >
              <MaterialCommunityIcons name="cog-outline" size={20} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.tasksList}>
            {extraTasks.map(task => {
              const isCompleted = task.completed_by.includes('user_1');
              return (
                <TouchableOpacity
                  key={task.id}
                  style={[
                    styles.taskItem,
                    isCompleted && styles.taskItemCompleted
                  ]}
                  onPress={() => handleToggleTask(task.id)}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.taskIconContainer,
                    { backgroundColor: isCompleted ? COLORS.secondary : COLORS.surfaceVariant }
                  ]}>
                    <MaterialCommunityIcons 
                      name={getTaskIcon(task.type)} 
                      size={22} 
                      color={isCompleted ? '#fff' : COLORS.textSecondary} 
                    />
                  </View>
                  
                  <View style={styles.taskDetails}>
                    <Text style={[
                      styles.taskTitle,
                      isCompleted && styles.taskTitleCompleted
                    ]}>
                      {task.title}
                    </Text>
                    <Text style={styles.taskDesc} numberOfLines={2}>
                      {task.description}
                    </Text>
                    <Text style={styles.taskExpiry}>
                      Expira em: {new Date(task.expires_at).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>

                  <View style={styles.taskRight}>
                    <View style={[
                      styles.pointsBadge,
                      isCompleted && styles.pointsBadgeCompleted
                    ]}>
                      <Text style={[
                        styles.pointsText,
                        isCompleted && styles.pointsTextCompleted
                      ]}>
                        +{task.points} pts
                      </Text>
                    </View>
                    <View style={[
                      styles.checkbox,
                      isCompleted && styles.checkboxChecked
                    ]}>
                      {isCompleted && (
                        <MaterialCommunityIcons name="check" size={14} color="#fff" />
                      )}
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
  },
  roundTimeLeft: {
    fontSize: FONTS.size.xs,
    fontWeight: FONTS.weight.bold,
    color: COLORS.error,
  },
  roundDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  roundDateLabel: {
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
  },
  progressBar: {
    marginBottom: SPACING.sm,
  },
  progressNote: {
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
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
  },
  taskTitleCompleted: {
    color: COLORS.secondaryDark,
    textDecorationLine: 'line-through',
  },
  taskDesc: {
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    marginVertical: 2,
  },
  taskExpiry: {
    fontSize: 10,
    color: COLORS.textLight,
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
  },
  timelineDates: {
    fontSize: FONTS.size.xs,
    color: COLORS.textLight,
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
  },
  supportDesc: {
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    maxWidth: '90%',
  }
});
