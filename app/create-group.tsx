import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  TextInput,
  Alert,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { WebContainer } from '../components/ui/WebContainer';
import { COLORS, SPACING, FONTS } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/auth';

function generateInviteCode(groupName: string): string {
  const cleanName = groupName.replace(/[^A-Za-z]/g, '').toUpperCase();
  const prefix = cleanName.substring(0, 3).padEnd(3, 'T');
  const randomNum = Math.floor(100 + Math.random() * 900);
  return `TRI-${prefix}-${randomNum}`;
}

export default function CreateGroupScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const showNotice = (title: string, message: string, onOk?: () => void) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
      if (onOk) onOk();
    } else {
      Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      showNotice('Erro', 'Por favor, informe o nome do grupo.');
      return;
    }
    
    if (!user) return;

    setLoading(true);
    try {
      // 1. Verificar se o grupo com o mesmo nome já existe (case-insensitive)
      const { data: existingGroup } = await supabase
        .from('groups')
        .select('id')
        .ilike('name', name.trim())
        .maybeSingle();

      if (existingGroup) {
        showNotice('Nome Indisponível', 'Já existe um grupo cadastrado com este nome. Por favor, escolha outro nome para o seu grupo.');
        setLoading(false);
        return;
      }

      // 2. Criar o Grupo com invite_code
      const inviteCode = generateInviteCode(name);
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({ name: name.trim(), description: description.trim(), invite_code: inviteCode })
        .select()
        .single();

      if (groupError) throw groupError;

      // 3. Adicionar o usuário como Admin do grupo
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          user_id: user.id,
          group_id: group.id,
          role: 'admin'
        });

      if (memberError) throw memberError;

      showNotice('Sucesso', 'Grupo criado com sucesso!', () => {
        router.replace({ pathname: '/group-dashboard', params: { groupId: group.id } });
      });
    } catch (e: any) {
      console.error('Erro ao criar grupo:', e);
      const isDuplicate = e?.code === '23505' || (e?.message || '').toLowerCase().includes('duplicate') || (e?.message || '').toLowerCase().includes('unique');
      if (isDuplicate) {
        showNotice('Nome Indisponível', 'Já existe um grupo cadastrado com este nome. Por favor, escolha outro nome para o seu grupo.');
      } else {
        showNotice('Erro', e.message || 'Ocorreu um erro ao criar o grupo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <WebContainer>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Criar Grupo</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>
            Crie um novo grupo para reunir seus amigos ou igreja.
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
              <Text style={styles.label}>Descrição (Opcional)</Text>
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
              title="Criar Grupo"
              variant="primary"
              size="lg"
              loading={loading}
              onPress={handleCreate}
              style={styles.submitBtn}
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
  scrollContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
  subtitle: {
    fontSize: FONTS.size.sm, color: COLORS.textSecondary,
    marginBottom: SPACING.lg, fontFamily: FONTS.family.body,
  },
  formCard: { padding: SPACING.md },
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
  submitBtn: { marginTop: SPACING.md, width: '100%' }
});
