import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  TextInput,
  Alert,
  Platform,
  ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { WebContainer } from '../components/ui/WebContainer';
import { COLORS, SPACING, FONTS, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/auth';

export default function EditGroupScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { user } = useAuth();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user || !groupId) return;

    const loadGroupData = async () => {
      try {
        setLoading(true);

        // 1. Verificar se o usuário logado é admin do grupo
        const { data: memberData, error: memberError } = await supabase
          .from('group_members')
          .select('role')
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (memberError || !memberData || memberData.role !== 'admin') {
          Alert.alert('Acesso Negado', 'Apenas administradores podem gerenciar as configurações deste grupo.');
          router.back();
          return;
        }

        setIsAdmin(true);

        // 2. Carregar dados do grupo
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('*')
          .eq('id', groupId)
          .single();

        if (groupError) throw groupError;

        if (groupData) {
          setName(groupData.name);
          setDescription(groupData.description || '');
        }
      } catch (e: any) {
        Alert.alert('Erro', e.message || 'Erro ao carregar dados do grupo.');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadGroupData();
  }, [user, groupId]);

  const showNotice = (title: string, message: string, onOk?: () => void) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
      if (onOk) onOk();
    } else {
      Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
    }
  };

  const handleUpdate = async () => {
    if (!name.trim()) {
      showNotice('Erro', 'Por favor, informe o nome do grupo.');
      return;
    }
    
    if (!user || !groupId || !isAdmin) return;

    setSaving(true);
    try {
      // 1. Verificar se o nome alterado já existe em outro grupo (case-insensitive)
      const { data: existingGroup } = await supabase
        .from('groups')
        .select('id')
        .ilike('name', name.trim())
        .neq('id', groupId)
        .maybeSingle();

      if (existingGroup) {
        showNotice('Nome Indisponível', 'Já existe um grupo cadastrado com este nome. Por favor, escolha outro nome para o seu grupo.');
        setSaving(false);
        return;
      }

      // 2. Atualizar o Grupo
      const { error: updateError } = await supabase
        .from('groups')
        .update({ name: name.trim(), description: description.trim() })
        .eq('id', groupId);

      if (updateError) throw updateError;

      showNotice('Sucesso', 'Configurações do grupo atualizadas!', () => {
        router.back();
      });
    } catch (e: any) {
      console.error('Erro ao atualizar grupo:', e);
      const isDuplicate = e?.code === '23505' || (e?.message || '').toLowerCase().includes('duplicate') || (e?.message || '').toLowerCase().includes('unique');
      if (isDuplicate) {
        showNotice('Nome Indisponível', 'Já existe um grupo cadastrado com este nome. Por favor, escolha outro nome para o seu grupo.');
      } else {
        showNotice('Erro', e.message || 'Erro ao salvar alterações.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !groupId || !isAdmin) return;

    const performDelete = async () => {
      setDeleting(true);
      try {
        const { error: deleteError } = await supabase
          .from('groups')
          .delete()
          .eq('id', groupId);

        if (deleteError) throw deleteError;

        if (Platform.OS === 'web') {
          window.alert('Grupo excluído com sucesso!');
          router.replace('/(tabs)');
        } else {
          Alert.alert(
            'Sucesso', 
            'Grupo excluído com sucesso!',
            [
              { 
                text: 'OK', 
                onPress: () => router.replace('/(tabs)')
              }
            ]
          );
        }
      } catch (e: any) {
        Alert.alert('Erro', e.message || 'Erro ao excluir grupo.');
      } finally {
        setDeleting(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmFirst = window.confirm('ATENÇÃO: Você tem certeza absoluta de que deseja excluir este grupo? Todos os desafios, rounds e check-ins serão excluídos para sempre. Esta ação NÃO pode ser desfeita!');
      if (confirmFirst) {
        const confirmSecond = window.confirm('CONFIRMAÇÃO FINAL: Deseja mesmo deletar o grupo? Digite OK para excluir.');
        if (confirmSecond) {
          await performDelete();
        }
      }
    } else {
      Alert.alert(
        'Excluir Grupo',
        'ATENÇÃO: Todos os desafios, rounds e check-ins dos membros deste grupo serão excluídos para sempre. Deseja mesmo excluir este grupo?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Excluir Definitivamente', 
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Confirmação Final',
                'Você tem certeza absoluta? Esta ação NÃO pode ser desfeita e todos os dados serão perdidos.',
                [
                  { text: 'Voltar', style: 'cancel' },
                  { text: 'Sim, Deletar Tudo', style: 'destructive', onPress: performDelete }
                ]
              );
            }
          }
        ]
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

  return (
    <WebContainer>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Configurações do Grupo</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>
            Altere os dados básicos do grupo ou execute sua exclusão definitiva.
          </Text>

          <Card variant="default" style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome do Grupo</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Jovens IBB"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Descrição</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Qual o propósito deste grupo?"
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            <Button
              title="Salvar Alterações"
              variant="primary"
              size="lg"
              loading={saving}
              disabled={deleting}
              onPress={handleUpdate}
              style={styles.submitBtn}
            />
          </Card>

          {/* Danger Zone */}
          <Text style={styles.sectionTitle}>Zona de Perigo</Text>
          <Card variant="flat" style={styles.dangerCard}>
            <View style={styles.dangerContent}>
              <MaterialCommunityIcons name="alert-octagon" size={24} color={COLORS.error} />
              <View style={styles.dangerTextContainer}>
                <Text style={styles.dangerTitle}>Excluir este grupo</Text>
                <Text style={styles.dangerDesc}>
                  A exclusão apagará de forma irreversível este grupo e todo o histórico de desafios dos participantes.
                </Text>
              </View>
            </View>
            <Button
              title="Excluir Grupo"
              variant="secondary"
              loading={deleting}
              disabled={saving}
              onPress={handleDelete}
              style={styles.deleteBtn}
            />
          </Card>
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
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: 'rgba(225, 222, 227, 0.4)',
  },
  backButton: { padding: 2 },
  headerTitle: {
    fontSize: FONTS.size.lg, fontWeight: FONTS.weight.bold,
    color: COLORS.primary, fontFamily: FONTS.family.heading,
  },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: 40 },
  subtitle: {
    fontSize: FONTS.size.sm, color: COLORS.textSecondary,
    marginBottom: SPACING.lg, fontFamily: FONTS.family.body,
  },
  formCard: { padding: SPACING.md, marginBottom: SPACING.xl },
  inputGroup: { marginBottom: SPACING.md },
  label: {
    fontSize: FONTS.size.sm, fontWeight: FONTS.weight.semibold,
    color: COLORS.text, marginBottom: SPACING.xs,
    fontFamily: FONTS.family.heading,
  },
  input: {
    height: 48, backgroundColor: COLORS.background, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md,
    fontSize: FONTS.size.sm, color: COLORS.text, fontFamily: FONTS.family.body,
  },
  textArea: { height: 80, textAlignVertical: 'top', paddingTop: SPACING.sm },
  submitBtn: { marginTop: SPACING.md, width: '100%' },

  // Danger Zone
  sectionTitle: {
    fontSize: FONTS.size.md, fontFamily: FONTS.family.heading, color: COLORS.error,
    fontWeight: FONTS.weight.bold, marginBottom: SPACING.md,
  },
  dangerCard: {
    padding: SPACING.md,
    backgroundColor: '#fff5f5',
    borderColor: 'rgba(235, 94, 94, 0.2)',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.light,
  },
  dangerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  dangerTextContainer: {
    flex: 1,
  },
  dangerTitle: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.heading,
    color: COLORS.error,
    fontWeight: FONTS.weight.bold,
  },
  dangerDesc: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.body,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  deleteBtn: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
    width: '100%',
  }
});
