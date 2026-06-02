import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  TextInput,
  Switch,
  Platform,
  Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MOCK_GROUPS } from '../constants/mock-data';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, SHADOWS } from '../constants/theme';

export default function CreateChallengeScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  
  const group = MOCK_GROUPS.find(g => g.id === groupId) || MOCK_GROUPS[0];

  // Estados do Formulário
  const [challengeName, setChallengeName] = useState('');
  const [startDate, setStartDate] = useState('01/06/2026');
  const [endDate, setEndDate] = useState('31/07/2026');
  
  const [hasRounds, setHasRounds] = useState(true);
  const [roundDuration, setRoundDuration] = useState<'1_week' | '1_month'>('1_week');
  
  const [allowLate, setAllowLate] = useState(true);
  const [latePenalty, setLatePenalty] = useState(true); // 50% de penalidade
  const [rules, setRules] = useState(
    'Check-in diário obrigatório de: Oração (mín. 15min), Leitura Bíblica (mín. 3 caps), Exercício Físico (mín. 30min). Check-in com foto obrigatório.'
  );

  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!challengeName) {
      Alert.alert('Erro', 'Por favor, informe o nome do desafio.');
      return;
    }

    setLoading(true);
    try {
      // Simular delay de gravação no banco
      await new Promise(resolve => setTimeout(resolve, 1200));
      Alert.alert(
        'Desafio Criado!', 
        `O desafio "${challengeName}" foi configurado com sucesso e todos os participantes do grupo "${group.name}" foram notificados.`,
        [
          { text: 'Ok, ir para o Desafio', onPress: () => router.replace('/(tabs)/challenge') }
        ]
      );
    } catch (e) {
      Alert.alert('Erro', 'Ocorreu um erro ao criar o desafio.');
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
        <Text style={styles.headerTitle}>Criar Desafio</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          Configure um novo desafio de constância para o grupo <Text style={styles.groupBold}>{group.name}</Text>.
        </Text>

        <Card variant="default" style={styles.formCard}>
          {/* Nome do Desafio */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome do Desafio</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Fé em Constância 2.0"
              value={challengeName}
              onChangeText={setChallengeName}
            />
          </View>

          {/* Datas */}
          <View style={styles.datesRow}>
            <View style={[styles.inputGroup, { width: '48%' }]}>
              <Text style={styles.label}>Data de Início</Text>
              <TextInput
                style={styles.input}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="DD/MM/AAAA"
              />
            </View>
            <View style={[styles.inputGroup, { width: '48%' }]}>
              <Text style={styles.label}>Data de Término</Text>
              <TextInput
                style={styles.input}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="DD/MM/AAAA"
              />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Configuração de Rounds */}
          <View style={styles.switchGroup}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchLabel}>Dividir em Rounds?</Text>
              <Text style={styles.switchDesc}>Zera a pontuação no fim de cada round, acumula coroas ao vencedor.</Text>
            </View>
            <Switch
              value={hasRounds}
              onValueChange={setHasRounds}
              trackColor={{ false: COLORS.border, true: COLORS.secondaryLight }}
              thumbColor={hasRounds ? COLORS.secondary : COLORS.borderDark}
            />
          </View>

          {hasRounds && (
            <View style={styles.roundsOptionContainer}>
              <Text style={styles.subLabel}>Duração do Round</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    roundDuration === '1_week' && styles.toggleBtnActive
                  ]}
                  onPress={() => setRoundDuration('1_week')}
                >
                  <Text style={[
                    styles.toggleBtnText,
                    roundDuration === '1_week' && styles.toggleBtnTextActive
                  ]}>
                    1 Semana
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    roundDuration === '1_month' && styles.toggleBtnActive
                  ]}
                  onPress={() => setRoundDuration('1_month')}
                >
                  <Text style={[
                    styles.toggleBtnText,
                    roundDuration === '1_month' && styles.toggleBtnTextActive
                  ]}>
                    1 Mês
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.divider} />

          {/* Regras de Atraso */}
          <View style={styles.switchGroup}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchLabel}>Permitir Check-in Atrasado?</Text>
              <Text style={styles.switchDesc}>Permite validar no dia seguinte até as 12h.</Text>
            </View>
            <Switch
              value={allowLate}
              onValueChange={setAllowLate}
              trackColor={{ false: COLORS.border, true: COLORS.secondaryLight }}
              thumbColor={allowLate ? COLORS.secondary : COLORS.borderDark}
            />
          </View>

          {allowLate && (
            <View style={styles.switchGroup}>
              <View style={styles.switchTextContainer}>
                <Text style={styles.switchLabel}>Penalidade de 50% nos Pontos?</Text>
                <Text style={styles.switchDesc}>Check-ins atrasados rendem metade da pontuação.</Text>
              </View>
              <Switch
                value={latePenalty}
                onValueChange={setLatePenalty}
                trackColor={{ false: COLORS.border, true: COLORS.secondaryLight }}
                thumbColor={latePenalty ? COLORS.secondary : COLORS.borderDark}
              />
            </View>
          )}

          <View style={styles.divider} />

          {/* Regras e Informações Adicionais */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descrição / Regras Extras do Desafio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={4}
              value={rules}
              onChangeText={setRules}
            />
          </View>

          <Button
            title="Criar e Publicar Desafio"
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
  groupBold: {
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
  },
  formCard: {
    padding: SPACING.md,
    marginBottom: SPACING.xl,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.semibold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subLabel: {
    fontSize: FONTS.size.xs,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
  },
  input: {
    height: 48,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    fontSize: FONTS.size.sm,
    color: COLORS.text,
    fontFamily: FONTS.family.body,
  },
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  switchGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  switchTextContainer: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  switchLabel: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
  },
  switchDesc: {
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 14,
  },
  roundsOptionContainer: {
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  toggleBtn: {
    flex: 1,
    height: 38,
    backgroundColor: COLORS.surfaceCard,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  toggleBtnText: {
    fontSize: FONTS.size.xs,
    fontWeight: FONTS.weight.semibold,
    color: COLORS.textSecondary,
  },
  toggleBtnTextActive: {
    color: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: SPACING.sm,
  },
  submitBtn: {
    marginTop: SPACING.md,
    width: '100%',
  }
});
