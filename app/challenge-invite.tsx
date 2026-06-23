import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { WebContainer } from '../components/ui/WebContainer';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, SHADOWS } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { useAuth } from '../context/auth';
import { 
  MOCK_CHALLENGE_INVITATIONS, 
  MOCK_CHALLENGES, 
  MOCK_GROUPS,
  MOCK_USERS
} from '../constants/mock-data';

interface MemberSelection {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  selected: boolean;
}

export default function ChallengeInviteScreen() {
  const router = useRouter();
  const { challengeId } = useLocalSearchParams<{ challengeId: string }>();
  const { user } = useAuth();

  const [challenge, setChallenge] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<MemberSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!challengeId || !user) return;
      setLoading(true);

      let chalData: any = null;
      let groupData: any = null;
      let membersList: any[] = [];

      // 1. Carregar desafio (local ou Supabase)
      if (challengeId.startsWith('chal_')) {
        chalData = MOCK_CHALLENGES[challengeId];
        if (chalData) {
          groupData = MOCK_GROUPS.find(g => g.id === chalData.group_id);
          // Gerar membros mockados baseados em MOCK_USERS exceto o admin logado
          membersList = Object.values(MOCK_USERS)
            .filter(u => u.id !== user.id)
            .map(u => ({
              user_id: u.id,
              full_name: u.name,
              avatar_url: u.avatar_url,
              selected: false
            }));
        }
      } else {
        // Fluxo real Supabase
        const { data: chal } = await supabase
          .from('challenges')
          .select('*, groups(*)')
          .eq('id', challengeId)
          .single();

        if (chal) {
          chalData = {
            id: chal.id,
            name: chal.title || chal.name,
            group_id: chal.group_id
          };
          groupData = chal.groups;
          const groupMembers = await api.getGroupMembers(chal.group_id);
          // Excluir o próprio criador
          membersList = groupMembers
            .filter((m: any) => m.user_id !== user.id)
            .map((m: any) => ({
              user_id: m.user_id,
              full_name: m.full_name,
              avatar_url: m.avatar_url,
              selected: false
            }));
        }
      }

      setChallenge(chalData);
      setGroup(groupData);
      setMembers(membersList);
      setLoading(false);
    }

    loadData();
  }, [challengeId, user]);

  const handleToggleSelect = (userId: string) => {
    setMembers(prev =>
      prev.map(m => (m.user_id === userId ? { ...m, selected: !m.selected } : m))
    );
  };

  const handleToggleSelectAll = (value: boolean) => {
    setSelectAll(value);
    setMembers(prev => prev.map(m => ({ ...m, selected: value })));
  };

  const handleSendInvitations = async () => {
    const selectedMembers = members.filter(m => m.selected);
    if (selectedMembers.length === 0) {
      if (Platform.OS === 'web') {
        window.alert('Aviso: Selecione pelo menos um participante para convidar.');
      } else {
        Alert.alert('Aviso', 'Selecione pelo menos um participante para convidar.');
      }
      return;
    }

    setSending(true);

    // Simular envio inserindo em MOCK_CHALLENGE_INVITATIONS
    selectedMembers.forEach(m => {
      // Evitar duplicados ativos
      const alreadyInvited = MOCK_CHALLENGE_INVITATIONS.some(
        inv => inv.challenge_id === challengeId && inv.invited_user_id === m.user_id && inv.status === 'pending'
      );
      if (!alreadyInvited) {
        MOCK_CHALLENGE_INVITATIONS.push({
          id: `inv_${Date.now()}_${m.user_id}`,
          challenge_id: challengeId!,
          challenge_name: challenge?.name || 'Desafio de Constância',
          group_name: group?.name || 'Grupo Trino',
          invited_user_id: m.user_id,
          invited_user_name: m.full_name,
          status: 'pending'
        });
      }
    });

    setSending(false);
    if (Platform.OS === 'web') {
      window.alert(`Sucesso: Convites enviados com sucesso para ${selectedMembers.length} participante(s).`);
      router.back();
    } else {
      Alert.alert(
        'Sucesso',
        `Convites enviados com sucesso para ${selectedMembers.length} participante(s).`,
        [{ text: 'Ok', onPress: () => router.back() }]
      );
    }
  };

  if (loading) {
    return (
      <WebContainer>
        <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={COLORS.secondary} />
        </SafeAreaView>
      </WebContainer>
    );
  }

  if (!challenge || !group) {
    return (
      <WebContainer>
        <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: COLORS.textSecondary, fontFamily: FONTS.family.body }}>Desafio ou Grupo não encontrado.</Text>
        </SafeAreaView>
      </WebContainer>
    );
  }

  return (
    <WebContainer>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Convidar Participantes</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>
            Envie convites para que os membros do grupo participem do desafio <Text style={styles.boldText}>{challenge.name}</Text>.
          </Text>

          {members.length === 0 ? (
            <Card variant="flat" style={styles.emptyCard}>
              <MaterialCommunityIcons name="account-multiple-outline" size={40} color={COLORS.textLight} />
              <Text style={styles.emptyText}>Não há outros participantes no grupo para convidar.</Text>
            </Card>
          ) : (
            <>
              {/* Marcar Todos */}
              <Card variant="default" style={styles.selectAllCard}>
                <View style={styles.selectAllLeft}>
                  <MaterialCommunityIcons name="checkbox-multiple-marked-outline" size={22} color={COLORS.primary} />
                  <Text style={styles.selectAllTitle}>Marcar todos</Text>
                </View>
                <Switch
                  value={selectAll}
                  onValueChange={handleToggleSelectAll}
                  trackColor={{ false: COLORS.border, true: COLORS.secondaryLight }}
                  thumbColor={selectAll ? COLORS.secondary : COLORS.borderDark}
                />
              </Card>

              {/* Lista de Membros */}
              <Text style={styles.sectionTitle}>Membros do Grupo</Text>
              <Card variant="default" style={styles.listCard}>
                {members.map((member, index) => (
                  <TouchableOpacity
                    key={member.user_id}
                    style={[
                      styles.memberRow,
                      index === members.length - 1 && { borderBottomWidth: 0 }
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleToggleSelect(member.user_id)}
                  >
                    <Avatar source={member.avatar_url ?? undefined} name={member.full_name} size={38} />
                    <Text style={styles.memberName} numberOfLines={1}>
                      {member.full_name}
                    </Text>
                    <View style={[
                      styles.checkbox,
                      member.selected && styles.checkboxChecked
                    ]}>
                      {member.selected && (
                        <MaterialCommunityIcons name="check" size={14} color="#fff" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </Card>

              <Button
                title="Enviar Convites"
                variant="primary"
                size="lg"
                loading={sending}
                onPress={handleSendInvitations}
                style={styles.submitBtn}
              />
            </>
          )}
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
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  subtitle: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: SPACING.lg,
    fontFamily: FONTS.family.body,
  },
  boldText: {
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
  },
  emptyCard: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    fontFamily: FONTS.family.body,
  },
  selectAllCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  selectAllLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  selectAllTitle: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    fontFamily: FONTS.family.heading,
  },
  sectionTitle: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: SPACING.xs,
    fontFamily: FONTS.family.body,
  },
  listCard: {
    padding: 0,
    marginBottom: SPACING.lg,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  memberName: {
    flex: 1,
    marginLeft: SPACING.md,
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.semibold,
    color: COLORS.text,
    fontFamily: FONTS.family.heading,
  },
  checkbox: {
    width: 22,
    height: 22,
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
  submitBtn: {
    marginTop: SPACING.md,
    width: '100%',
  },
});
