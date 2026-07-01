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
import { Avatar } from '../components/ui/Avatar';
import { WebContainer } from '../components/ui/WebContainer';
import { useAuth } from '../context/auth';
import { api } from '../lib/api';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, SHADOWS } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { MOCK_RANKINGS, saveMockRankings } from '../constants/mock-data';

interface MemberItem {
  user_id: string;
  role: string;
  joined_at: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
}

export default function GroupMembersScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { user } = useAuth();

  const [members, setMembers] = useState<MemberItem[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'member'>('member');
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const loadMembers = async () => {
    if (!groupId) return;
    setLoading(true);
    const data = await api.getGroupMembers(groupId);
    setMembers(data);

    // Determinar role do usuário atual
    if (user) {
      const me = data.find((m: MemberItem) => m.user_id === user.id);
      if (me) setCurrentUserRole(me.role as 'admin' | 'member');
    }

    setLoading(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadMembers();
    }, [groupId, user])
  );

  const handlePromote = (member: MemberItem) => {
    Alert.alert(
      'Promover a Admin',
      `Deseja promover "${member.full_name}" a administrador do grupo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Promover',
          onPress: async () => {
            if (!groupId) return;
            setPromoting(member.user_id);
            try {
              await api.promoteToAdmin(groupId, member.user_id);
              Alert.alert('Sucesso', `${member.full_name} agora é administrador!`);
              await loadMembers();
            } catch (err: any) {
              Alert.alert('Erro', err.message || 'Não foi possível promover o membro.');
            } finally {
              setPromoting(null);
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = (member: MemberItem) => {
    const showAlertMessage = (title: string, message: string, buttons?: any[]) => {
      if (Platform.OS === 'web') {
        const confirm = window.confirm(`${title}\n\n${message}`);
        if (confirm && buttons && buttons.length > 1) {
          buttons[1].onPress();
        }
      } else {
        Alert.alert(title, message, buttons);
      }
    };

    showAlertMessage(
      'Remover Participante',
      `Tem certeza que deseja remover "${member.full_name}" deste grupo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            if (!groupId) return;
            setRemoving(member.user_id);
            try {
              const isMock = groupId.startsWith('group');
              if (isMock) {
                const challengeId = groupId === 'group_1' ? 'chal_1' : 'chal_2';
                if (MOCK_RANKINGS[challengeId]) {
                  MOCK_RANKINGS[challengeId] = MOCK_RANKINGS[challengeId].filter(m => m.user_id !== member.user_id);
                }
                await saveMockRankings();
              } else {
                const { error } = await supabase
                  .from('group_members')
                  .delete()
                  .eq('group_id', groupId)
                  .eq('user_id', member.user_id);

                if (error) throw error;
              }

              if (Platform.OS === 'web') {
                window.alert('Participante removido com sucesso!');
              } else {
                Alert.alert('Sucesso', 'Participante removido com sucesso!');
              }
              await loadMembers();
            } catch (err: any) {
              if (Platform.OS === 'web') {
                window.alert(err.message || 'Erro ao remover participante.');
              } else {
                Alert.alert('Erro', err.message || 'Erro ao remover participante.');
              }
            } finally {
              setRemoving(null);
            }
          }
        }
      ]
    );
  };

  const isAdmin = currentUserRole === 'admin';
  const admins = members.filter(m => m.role === 'admin');
  const regularMembers = members.filter(m => m.role === 'member');

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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Participantes ({members.length})</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Admins */}
          {admins.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Administradores</Text>
              {admins.map(member => (
                <View key={member.user_id} style={styles.memberCard}>
                  <Avatar
                    source={member.avatar_url ?? undefined}
                    name={member.full_name}
                    size={44}
                  />
                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName}>{member.full_name}</Text>
                      <View style={styles.adminBadge}>
                        <MaterialCommunityIcons name="shield-crown-outline" size={12} color="#fff" />
                        <Text style={styles.adminBadgeText}>Admin</Text>
                      </View>
                    </View>
                    <Text style={styles.memberSince}>
                      Desde {new Date(member.joined_at).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                  {member.user_id === user?.id && (
                    <View style={styles.youBadge}>
                      <Text style={styles.youBadgeText}>Você</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Members */}
          {regularMembers.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Membros</Text>
              {regularMembers.map(member => (
                <View key={member.user_id} style={styles.memberCard}>
                  <Avatar
                    source={member.avatar_url ?? undefined}
                    name={member.full_name}
                    size={44}
                  />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.full_name}</Text>
                    <Text style={styles.memberSince}>
                      Desde {new Date(member.joined_at).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                  <View style={styles.memberActions}>
                    {member.user_id === user?.id && (
                      <View style={styles.youBadge}>
                        <Text style={styles.youBadgeText}>Você</Text>
                      </View>
                    )}
                    {isAdmin && member.user_id !== user?.id && (
                      <View style={{ flexDirection: 'row', gap: SPACING.xs, alignItems: 'center' }}>
                        <TouchableOpacity
                          style={styles.promoteBtn}
                          onPress={() => handlePromote(member)}
                          disabled={promoting === member.user_id}
                          activeOpacity={0.7}
                        >
                          {promoting === member.user_id ? (
                            <ActivityIndicator size="small" color={COLORS.secondary} />
                          ) : (
                            <>
                              <MaterialCommunityIcons name="arrow-up-bold" size={14} color={COLORS.secondary} />
                              <Text style={styles.promoteBtnText}>Promover</Text>
                            </>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.promoteBtn, { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.15)' }]}
                          onPress={() => handleRemoveMember(member)}
                          disabled={removing === member.user_id}
                          activeOpacity={0.7}
                        >
                          {removing === member.user_id ? (
                            <ActivityIndicator size="small" color={COLORS.error} />
                          ) : (
                            <>
                              <MaterialCommunityIcons name="account-remove" size={14} color={COLORS.error} />
                              <Text style={[styles.promoteBtnText, { color: COLORS.error }]}>Remover</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {members.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="account-group-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyText}>Nenhum participante encontrado.</Text>
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
  headerTitle: {
    fontSize: FONTS.size.lg, fontFamily: FONTS.family.heading, color: COLORS.primary,
    fontWeight: FONTS.weight.bold,
  },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },

  // Sections
  section: { marginBottom: SPACING.xl },
  sectionLabel: {
    fontSize: FONTS.size.xs, fontFamily: FONTS.family.bodyBold, color: COLORS.textLight,
    fontWeight: FONTS.weight.bold, textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: SPACING.md,
  },

  // Member Card
  memberCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.light,
  },
  memberInfo: { flex: 1, marginLeft: SPACING.md },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  memberName: {
    fontSize: FONTS.size.md, fontFamily: FONTS.family.bodySemibold, color: COLORS.primary,
    fontWeight: FONTS.weight.semibold,
  },
  memberSince: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.body, color: COLORS.textLight, marginTop: 2 },
  memberActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },

  // Admin Badge
  adminBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: COLORS.secondary, paddingHorizontal: SPACING.sm, paddingVertical: 2,
    borderRadius: BORDER_RADIUS.md,
  },
  adminBadgeText: { color: '#fff', fontSize: 10, fontFamily: FONTS.family.bodyBold, fontWeight: FONTS.weight.bold },

  // You Badge
  youBadge: {
    backgroundColor: COLORS.surfaceVariant, paddingHorizontal: SPACING.sm, paddingVertical: 2,
    borderRadius: BORDER_RADIUS.md,
  },
  youBadgeText: { fontSize: 10, fontFamily: FONTS.family.bodyBold, color: COLORS.textLight, fontWeight: FONTS.weight.bold },

  // Promote Button
  promoteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.secondaryMuted, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  promoteBtnText: {
    fontSize: FONTS.size.xs, fontFamily: FONTS.family.bodySemibold, color: COLORS.secondary,
    fontWeight: FONTS.weight.semibold,
  },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyText: {
    fontSize: FONTS.size.sm, fontFamily: FONTS.family.body, color: COLORS.textLight, marginTop: SPACING.sm,
  },
});
