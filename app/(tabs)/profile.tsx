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
import { useAuth } from '../../context/auth';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { WebContainer } from '../../components/ui/WebContainer';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, SHADOWS } from '../../constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    // O layout raiz cuidará do redirecionamento
  };

  return (
    <WebContainer>
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meu Perfil</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        
        {/* CARD PRINCIPAL DO USUÁRIO */}
        <Card variant="gradient" gradientColors={COLORS.gradients.primary} style={styles.userCard}>
          <View style={styles.userInfoRow}>
            <Avatar 
              source={profile?.avatar_url ?? undefined} 
              name={profile?.full_name || 'User'} 
              size={70} 
              style={styles.avatarBorder}
            />
            <View style={styles.userInfoText}>
              <Text style={styles.userName}>{profile?.full_name}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
          </View>

          <View style={styles.statsDivider} />

          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statValue}>{profile?.streak_count ?? 0}d</Text>
              <Text style={styles.statLabel}>Streak Atual</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statValue}>{profile?.streak_count ?? 0}d</Text>
              <Text style={styles.statLabel}>Recorde</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statValue}>{0}</Text>
              <Text style={styles.statLabel}>Pontos</Text>
            </View>
          </View>
        </Card>

        {/* ESTATÍSTICAS DOS TRÊS HÁBITOS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Desempenho de Hábitos</Text>
          <Text style={styles.sectionSubtitle}>Média de conclusão nas últimas 4 semanas</Text>

          <View style={styles.habitsStats}>
            {/* ORAÇÃO */}
            <View style={styles.habitStatItem}>
              <View style={[styles.habitIconBg, { backgroundColor: COLORS.gold }]}>
                <MaterialCommunityIcons name="hands-pray" size={20} color="#fff" />
              </View>
              <View style={styles.habitStatDetails}>
                <View style={styles.habitStatHeader}>
                  <Text style={styles.habitStatTitle}>Oração</Text>
                  <Text style={styles.habitStatPercentage}>85%</Text>
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: '85%', backgroundColor: COLORS.gold }]} />
                </View>
              </View>
            </View>

            {/* BÍBLIA */}
            <View style={styles.habitStatItem}>
              <View style={[styles.habitIconBg, { backgroundColor: COLORS.primary }]}>
                <MaterialCommunityIcons name="book-open-variant" size={20} color="#fff" />
              </View>
              <View style={styles.habitStatDetails}>
                <View style={styles.habitStatHeader}>
                  <Text style={styles.habitStatTitle}>Leitura Bíblica</Text>
                  <Text style={styles.habitStatPercentage}>70%</Text>
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: '70%', backgroundColor: COLORS.primary }]} />
                </View>
              </View>
            </View>

            {/* EXERCÍCIO */}
            <View style={styles.habitStatItem}>
              <View style={[styles.habitIconBg, { backgroundColor: COLORS.secondary }]}>
                <MaterialCommunityIcons name="run-fast" size={20} color="#fff" />
              </View>
              <View style={styles.habitStatDetails}>
                <View style={styles.habitStatHeader}>
                  <Text style={styles.habitStatTitle}>Exercício Físico</Text>
                  <Text style={styles.habitStatPercentage}>60%</Text>
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: '60%', backgroundColor: COLORS.secondary }]} />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* OPÇÕES E ATALHOS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configurações e Ações</Text>
          
          <Card variant="default" style={styles.optionsCard}>
            {/* Apoie o Projeto */}
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => router.push('/support')}
            >
              <View style={styles.optionLeft}>
                <MaterialCommunityIcons name="heart-outline" size={22} color={COLORS.primary} />
                <Text style={styles.optionText}>Apoie o Projeto (Doações)</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
            </TouchableOpacity>

            {/* Painel do Admin */}
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => router.push('/admin')}
            >
              <View style={styles.optionLeft}>
                <MaterialCommunityIcons name="shield-crown-outline" size={22} color={COLORS.primary} />
                <Text style={styles.optionText}>Painel do Admin</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
            </TouchableOpacity>

            {/* Convidar Amigos */}
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => router.push('/invite')}
            >
              <View style={styles.optionLeft}>
                <MaterialCommunityIcons name="account-plus-outline" size={22} color={COLORS.primary} />
                <Text style={styles.optionText}>Convidar Participantes</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
            </TouchableOpacity>

            {/* Compartilhar App */}
            <TouchableOpacity 
              style={[styles.optionItem, { borderBottomWidth: 0 }]}
              onPress={() => router.push('/invite')}
            >
              <View style={styles.optionLeft}>
                <MaterialCommunityIcons name="share-variant-outline" size={22} color={COLORS.primary} />
                <Text style={styles.optionText}>Compartilhar Aplicativo</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* BOTÃO LOGOUT */}
        <View style={styles.logoutContainer}>
          <Button
            title="Sair da Conta"
            variant="outline"
            size="md"
            icon={<MaterialCommunityIcons name="logout" size={18} color={COLORS.error} />}
            onPress={handleSignOut}
            style={styles.logoutBtn}
            textStyle={{ color: COLORS.error }}
          />
          <Text style={styles.versionText}>Trino v1.0.0 — Fé em Constância</Text>
        </View>

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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(225, 222, 227, 0.4)',
  },
  headerTitle: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.heading,
    color: COLORS.primary,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  userCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBorder: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  userInfoText: {
    marginLeft: SPACING.md,
  },
  userName: {
    color: '#fff',
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.heading,
  },
  userEmail: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: FONTS.size.sm,
    marginTop: 2,
  },
  statsDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCol: {
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: FONTS.size.xl,
    fontFamily: FONTS.family.heading,
  },
  statLabel: {
    color: COLORS.goldLight,
    fontSize: 10,
    fontFamily: FONTS.family.bodySemibold,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.heading,
    color: COLORS.primary,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.body,
    color: COLORS.textLight,
    marginBottom: SPACING.md,
  },
  habitsStats: {
    backgroundColor: COLORS.surfaceCard,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: SPACING.md,
  },
  habitStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  habitIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  habitStatDetails: {
    flex: 1,
  },
  habitStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  habitStatTitle: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bodySemibold,
    color: COLORS.primary,
  },
  habitStatPercentage: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bodyBold,
    color: COLORS.textSecondary,
  },
  barBg: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  optionsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    marginLeft: SPACING.md,
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bodySemibold,
    color: COLORS.text,
  },
  logoutContainer: {
    marginTop: SPACING.md,
    alignItems: 'center',
    gap: SPACING.md,
  },
  logoutBtn: {
    width: '100%',
    borderColor: 'rgba(211, 47, 47, 0.3)',
  },
  versionText: {
    fontSize: FONTS.size.xs,
    color: COLORS.textLight,
  }
});
