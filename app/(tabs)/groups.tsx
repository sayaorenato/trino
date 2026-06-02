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
import { Button } from '../../components/ui/Button';
import { MOCK_GROUPS, MOCK_CHALLENGES, Group } from '../../constants/mock-data';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, SHADOWS } from '../../constants/theme';

export default function GroupsScreen() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>(MOCK_GROUPS);

  const handleCreateGroup = () => {
    // Simula a criação de um novo grupo
    const newGroup: Group = {
      id: `group_${groups.length + 1}`,
      name: `Pequeno Grupo ${groups.length - 1}`,
      description: 'Novo grupo criado para prestação de contas de leitura e oração.',
      members_count: 1,
      role: 'admin',
    };
    setGroups(prev => [...prev, newGroup]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meus Grupos</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleCreateGroup}
        >
          <MaterialCommunityIcons name="plus" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          Você participa de {groups.length} grupos ativos. Alterne entre eles no Início para ver os desafios de cada um.
        </Text>

        <View style={styles.groupsList}>
          {groups.map(group => {
            const hasActiveChallenge = !!group.active_challenge_id;
            const challenge = group.active_challenge_id 
              ? MOCK_CHALLENGES[group.active_challenge_id] 
              : null;

            return (
              <Card key={group.id} variant="default" style={styles.groupCard}>
                <View style={styles.groupHeader}>
                  <View style={styles.groupInfoLeft}>
                    <View style={styles.groupIconBg}>
                      <MaterialCommunityIcons name="account-group" size={24} color={COLORS.primary} />
                    </View>
                    <View style={{ marginLeft: SPACING.md }}>
                      <Text style={styles.groupName}>{group.name}</Text>
                      <Text style={styles.membersCount}>{group.members_count} participantes</Text>
                    </View>
                  </View>
                  
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
                </View>

                <Text style={styles.groupDesc}>{group.description}</Text>

                {hasActiveChallenge && challenge ? (
                  <View style={styles.challengeBox}>
                    <View style={styles.challengeBoxHeader}>
                      <MaterialCommunityIcons name="trophy" size={16} color={COLORS.gold} />
                      <Text style={styles.challengeBoxTitle}>Desafio Ativo: {challenge.name}</Text>
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

                <View style={styles.actionsRow}>
                  {group.role === 'admin' && !hasActiveChallenge && (
                    <Button
                      title="Criar Desafio"
                      variant="secondary"
                      size="sm"
                      icon={<MaterialCommunityIcons name="plus" size={14} color="#fff" />}
                      onPress={() => router.push({ pathname: '/create-challenge', params: { groupId: group.id } })}
                      style={styles.actionBtn}
                    />
                  )}
                  {hasActiveChallenge && (
                    <Button
                      title="Ver Desafio"
                      variant="outline"
                      size="sm"
                      onPress={() => router.push('/(tabs)/challenge')}
                      style={styles.actionBtn}
                    />
                  )}
                  <Button
                    title="Convidar"
                    variant="ghost"
                    size="sm"
                    icon={<MaterialCommunityIcons name="share-variant" size={14} color={COLORS.primary} />}
                    onPress={() => router.push('/invite')}
                    style={styles.actionBtn}
                  />
                </View>
              </Card>
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
    paddingBottom: SPACING.xl,
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
  },
  membersCount: {
    fontSize: FONTS.size.xs,
    color: COLORS.textLight,
  },
  roleBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.md,
  },
  roleText: {
    fontSize: 10,
    fontWeight: FONTS.weight.bold,
  },
  groupDesc: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: SPACING.md,
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
  },
  challengeBoxDates: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginLeft: 20,
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
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
  },
  actionBtn: {
    paddingVertical: SPACING.xs,
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
  }
});
