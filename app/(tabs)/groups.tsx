import React, { useState } from 'react';
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
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { WebContainer } from '../../components/ui/WebContainer';
import { useAuth } from '../../context/auth';
import { api } from '../../lib/api';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, SHADOWS } from '../../constants/theme';
import { SupportCard } from '../../components/SupportCard';

export default function GroupsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      if (!user) return;
      setLoading(true);
      api.getDashboardData(user.id).then((data) => {
        setGroups(data.groups);
        setLoading(false);
      });
    }, [user])
  );

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
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Meus Grupos</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => router.push('/create-group')}
          >
            <MaterialCommunityIcons name="plus" size={24} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {groups.length === 0 ? (
            <Card variant="elevated" style={styles.emptyCard}>
              <View style={styles.emptyIconBg}>
                <MaterialCommunityIcons name="account-group-outline" size={32} color={COLORS.secondary} />
              </View>
              <Text style={styles.emptyTitle}>Nenhum grupo encontrado</Text>
              <Text style={styles.emptySubtitle}>
                Crie um grupo ou use um link de convite para começar.
              </Text>
              <Button
                title="Criar Grupo"
                variant="secondary"
                size="sm"
                onPress={() => router.push('/create-group')}
                style={{ marginTop: SPACING.sm, width: 160, alignSelf: 'center' }}
              />
            </Card>
          ) : (
            <Text style={styles.subtitle}>
              Você participa de {groups.length} grupo{groups.length !== 1 ? 's' : ''}. Alterne entre eles no Início para ver os desafios de cada um.
            </Text>
          )}

          <View style={styles.groupsList}>
            {groups.map(group => {
              const challenge = group.challenge;
              const hasActiveChallenge = !!challenge;

              return (
                <TouchableOpacity
                  key={group.id}
                  activeOpacity={0.85}
                  onPress={() => router.push({ pathname: '/group-dashboard', params: { groupId: group.id } })}
                >
                  <Card variant="default" style={styles.groupCard}>
                    <View style={styles.groupHeader}>
                      <View style={styles.groupInfoLeft}>
                        <View style={styles.groupIconBg}>
                          <MaterialCommunityIcons name="account-group" size={24} color={COLORS.primary} />
                        </View>
                        <View style={{ marginLeft: SPACING.md, flex: 1 }}>
                          <Text style={styles.groupName}>{group.name}</Text>
                          <Text style={styles.membersCount}>
                            {group.memberCount ?? 0} {group.memberCount === 1 ? 'participante' : 'participantes'}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                        <View style={[
                          styles.roleBadge,
                          { backgroundColor: group.role === 'admin' ? '#eef3f8' : '#f5f5f7' }
                        ]}>
                          <Text style={[
                            styles.roleText,
                            { color: group.role === 'admin' ? COLORS.primary : COLORS.textSecondary }
                          ]}>
                            {group.role === 'admin' ? 'Admin' : 'Membro'}
                          </Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
                      </View>
                    </View>

                    {group.description ? (
                      <Text style={styles.groupDesc} numberOfLines={2}>{group.description}</Text>
                    ) : null}

                    {hasActiveChallenge ? (
                      <View style={styles.challengeBox}>
                        <View style={styles.challengeBoxHeader}>
                          <MaterialCommunityIcons name="trophy" size={16} color={COLORS.gold} />
                          <Text style={styles.challengeBoxTitle}>Desafio Ativo: {challenge.title}</Text>
                        </View>
                        <Text style={styles.challengeBoxDates}>
                          Período: {new Date(challenge.start_date).toLocaleDateString('pt-BR')} até {new Date(challenge.end_date).toLocaleDateString('pt-BR')}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.noChallengeBox}>
                        <MaterialCommunityIcons name="trophy-outline" size={16} color={COLORS.textLight} />
                        <Text style={styles.noChallengeBoxText}>Sem desafio ativo</Text>
                      </View>
                    )}
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Card informativo de como funciona */}
          <Card variant="flat" style={styles.infoBox}>
            <MaterialCommunityIcons name="information" size={24} color={COLORS.primary} />
            <Text style={styles.infoBoxText}>
              Apenas administradores de grupos podem criar novos desafios e definir rounds e tarefas extras semanais.
            </Text>
          </Card>

          <SupportCard />

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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: 120,
  },
  subtitle: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
    lineHeight: 20,
    fontFamily: FONTS.family.body,
  },
  groupsList: {
    gap: SPACING.lg,
  },
  groupCard: {
    padding: SPACING.md,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  groupInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupName: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    fontFamily: FONTS.family.heading,
  },
  membersCount: {
    fontSize: FONTS.size.xs,
    color: COLORS.textLight,
    fontFamily: FONTS.family.body,
  },
  roleBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.md,
  },
  roleText: {
    fontSize: 10,
    fontWeight: FONTS.weight.bold,
    fontFamily: FONTS.family.body,
  },
  groupDesc: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: SPACING.md,
    fontFamily: FONTS.family.body,
  },
  challengeBox: {
    backgroundColor: '#fff9eb',
    borderWidth: 1,
    borderColor: 'rgba(174, 143, 100, 0.2)',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  challengeBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  challengeBoxTitle: {
    fontSize: FONTS.size.xs,
    fontWeight: FONTS.weight.bold,
    color: COLORS.goldDark,
    marginLeft: SPACING.xs,
    fontFamily: FONTS.family.heading,
  },
  challengeBoxDates: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginLeft: 20,
    fontFamily: FONTS.family.body,
  },
  noChallengeBox: {
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  noChallengeBoxText: {
    fontSize: FONTS.size.xs,
    color: COLORS.textLight,
    marginLeft: SPACING.xs,
    fontFamily: FONTS.family.body,
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xl,
    padding: SPACING.md,
  },
  infoBoxText: {
    flex: 1,
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    marginLeft: SPACING.md,
    lineHeight: 16,
    fontFamily: FONTS.family.body,
  },
  emptyCard: {
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.surface,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.secondaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.heading,
    color: COLORS.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
