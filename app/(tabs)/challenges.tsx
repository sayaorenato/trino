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
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { WebContainer } from '../../components/ui/WebContainer';
import { useAuth } from '../../context/auth';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, SHADOWS } from '../../constants/theme';
import { SupportCard } from '../../components/SupportCard';

export default function ChallengesDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      if (!user) return;
      setLoading(true);

      // Buscar todos os grupos em que o usuário participa e seus desafios correspondentes
      api.getUserGroups(user.id).then(async (userGroups) => {
        const list: any[] = [];
        await Promise.all(
          userGroups.map(async (group: any) => {
            const groupChallenges = await api.getGroupChallenges(group.id);
            groupChallenges.forEach((chal: any) => {
              list.push({
                ...chal,
                groupName: group.name,
              });
            });
          })
        );
        // Ordenar os desafios por data de criação descrescente
        list.sort((a, b) => new Date(b.created_at || b.start_date).getTime() - new Date(a.created_at || a.start_date).getTime());
        setChallenges(list);
        setLoading(false);
      });
    }, [user])
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

  const now = new Date();
  const activeChallenges = challenges.filter(c => new Date(c.end_date) >= now);
  const finishedChallenges = challenges.filter(c => new Date(c.end_date) < now);

  return (
    <WebContainer>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Desafios</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>
            Acompanhe os desafios ativos e o histórico das suas conquistas em grupo.
          </Text>

          {/* Ativos */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ativos ({activeChallenges.length})</Text>
            {activeChallenges.length === 0 ? (
              <Card variant="flat" style={styles.emptyCard}>
                <MaterialCommunityIcons name="trophy-outline" size={28} color={COLORS.textLight} />
                <Text style={styles.emptyText}>Nenhum desafio ativo no momento</Text>
              </Card>
            ) : (
              <View style={styles.list}>
                {activeChallenges.map(chal => {
                  const daysLeft = Math.max(0, Math.ceil((new Date(chal.end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                  return (
                    <TouchableOpacity
                      key={chal.id}
                      activeOpacity={0.85}
                      onPress={() => router.push({ pathname: '/(tabs)/challenge', params: { challengeId: chal.id } })}
                    >
                      <Card variant="default" style={styles.challengeCard}>
                        <View style={styles.cardHeader}>
                          <View style={styles.iconBg}>
                            <MaterialCommunityIcons name="trophy" size={20} color={COLORS.gold} />
                          </View>
                          <View style={{ flex: 1, marginLeft: SPACING.md }}>
                            <Text style={styles.chalTitle}>{chal.title || chal.name}</Text>
                            <Text style={styles.groupName}>{chal.groupName}</Text>
                          </View>
                          <View style={styles.badgeActive}>
                            <Text style={styles.badgeActiveText}>Ativo</Text>
                          </View>
                        </View>
                        <Text style={styles.dates}>
                          Período: {new Date(chal.start_date).toLocaleDateString('pt-BR')} até {new Date(chal.end_date).toLocaleDateString('pt-BR')}
                        </Text>
                        <View style={styles.footer}>
                          <Text style={styles.daysLeft}>{daysLeft > 0 ? `${daysLeft} dias restantes` : 'Encerra hoje!'}</Text>
                        </View>
                      </Card>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Finalizados */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Finalizados ({finishedChallenges.length})</Text>
            {finishedChallenges.length === 0 ? (
              <Card variant="flat" style={styles.emptyCard}>
                <MaterialCommunityIcons name="trophy-broken" size={28} color={COLORS.textLight} />
                <Text style={styles.emptyText}>Nenhum histórico de desafios finalizados</Text>
              </Card>
            ) : (
              <View style={styles.list}>
                {finishedChallenges.map(chal => (
                  <TouchableOpacity
                    key={chal.id}
                    activeOpacity={0.85}
                    onPress={() => router.push({ pathname: '/(tabs)/challenge', params: { challengeId: chal.id } })}
                  >
                    <Card variant="default" style={[styles.challengeCard, styles.finishedCard]}>
                      <View style={styles.cardHeader}>
                        <View style={[styles.iconBg, { backgroundColor: COLORS.surfaceVariant }]}>
                          <MaterialCommunityIcons name="trophy-outline" size={20} color={COLORS.textLight} />
                        </View>
                        <View style={{ flex: 1, marginLeft: SPACING.md }}>
                          <Text style={styles.chalTitle}>{chal.title || chal.name}</Text>
                          <Text style={styles.groupName}>{chal.groupName}</Text>
                        </View>
                        <View style={styles.badgeFinished}>
                          <Text style={styles.badgeFinishedText}>Finalizado</Text>
                        </View>
                      </View>
                      <Text style={styles.dates}>
                        Período: {new Date(chal.start_date).toLocaleDateString('pt-BR')} — {new Date(chal.end_date).toLocaleDateString('pt-BR')}
                      </Text>
                    </Card>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <SupportCard />

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
  headerTitle: {
    fontSize: FONTS.size.lg, fontFamily: FONTS.family.heading, color: COLORS.primary, fontWeight: FONTS.weight.bold,
  },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
  subtitle: {
    fontSize: FONTS.size.sm, fontFamily: FONTS.family.body, color: COLORS.textSecondary,
    lineHeight: 20, marginBottom: SPACING.lg,
  },
  section: { marginBottom: SPACING.xl },
  sectionTitle: {
    fontSize: FONTS.size.md, fontFamily: FONTS.family.heading, color: COLORS.primary,
    fontWeight: FONTS.weight.bold, marginBottom: SPACING.md,
  },
  list: { gap: SPACING.md },
  challengeCard: { padding: SPACING.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconBg: {
    width: 40, height: 40, borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.goldMuted, justifyContent: 'center', alignItems: 'center',
  },
  chalTitle: {
    fontSize: FONTS.size.md, fontFamily: FONTS.family.heading, color: COLORS.primary, fontWeight: FONTS.weight.bold,
  },
  groupName: {
    fontSize: FONTS.size.xs, fontFamily: FONTS.family.body, color: COLORS.textSecondary, marginTop: 2,
  },
  badgeActive: {
    backgroundColor: COLORS.secondaryMuted, paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: BORDER_RADIUS.md,
  },
  badgeActiveText: {
    color: COLORS.secondary, fontSize: 10, fontFamily: FONTS.family.bodyBold, fontWeight: FONTS.weight.bold,
  },
  badgeFinished: {
    backgroundColor: COLORS.surfaceVariant, paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: BORDER_RADIUS.md,
  },
  badgeFinishedText: {
    color: COLORS.textLight, fontSize: 10, fontFamily: FONTS.family.bodyBold, fontWeight: FONTS.weight.bold,
  },
  dates: {
    fontSize: FONTS.size.xs, fontFamily: FONTS.family.body, color: COLORS.textLight, marginTop: SPACING.sm,
  },
  footer: {
    borderTopWidth: 1, borderTopColor: COLORS.borderLight, paddingTop: SPACING.sm, marginTop: SPACING.sm,
    flexDirection: 'row', justifyContent: 'flex-end',
  },
  daysLeft: {
    fontSize: FONTS.size.xs, fontFamily: FONTS.family.bodySemibold, color: COLORS.error, fontWeight: FONTS.weight.semibold,
  },
  finishedCard: {
    opacity: 0.8,
  },
  emptyCard: {
    padding: SPACING.xl, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.borderLight, backgroundColor: COLORS.surface,
  },
  emptyText: {
    fontSize: FONTS.size.xs, fontFamily: FONTS.family.body, color: COLORS.textLight, textAlign: 'center',
  },
});
