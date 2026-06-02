import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  TextInput,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { COLORS, SPACING, FONTS } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/auth';

export default function CreateGroupScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name) {
      Alert.alert('Erro', 'Por favor, informe o nome do grupo.');
      return;
    }
    
    if (!user) return;

    setLoading(true);
    try {
      // 1. Criar o Grupo
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({ name, description })
        .select()
        .single();

      if (groupError) throw groupError;

      // 2. Adicionar o usuário como Admin do grupo
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          user_id: user.id,
          group_id: group.id,
          role: 'admin'
        });

      if (memberError) throw memberError;

      Alert.alert(
        'Grupo Criado!', 
        `O grupo "${name}" foi criado com sucesso. Agora crie um desafio para começar.`,
        [
          { text: 'Criar Desafio', onPress: () => router.replace({ pathname: '/create-challenge', params: { groupId: group.id } }) }
        ]
      );
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Ocorreu um erro ao criar o grupo.');
    } finally {
      setLoading(false);
    }
  };

  return (
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
  },
  input: {
    height: 48, backgroundColor: COLORS.background, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md,
    fontSize: FONTS.size.sm, color: COLORS.text, fontFamily: FONTS.family.body,
  },
  textArea: { height: 80, textAlignVertical: 'top', paddingTop: SPACING.sm },
  submitBtn: { marginTop: SPACING.md, width: '100%' }
});
