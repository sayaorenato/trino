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
import { MOCK_EXTRA_TASKS, ExtraTask } from '../constants/mock-data';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, SHADOWS } from '../constants/theme';

export default function AdminScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<ExtraTask[]>(
    MOCK_EXTRA_TASKS['chal_1'] || []
  );

  // Estados do Form de nova tarefa
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState<'general' | 'presence' | 'punctuality'>('general');
  const [points, setPoints] = useState('30');
  const [expiryDate, setExpiryDate] = useState('30/05/2026');

  const [loading, setLoading] = useState(false);

  const handleCreateTask = async () => {
    if (!title || !desc || !points) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos da tarefa.');
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newTask: ExtraTask = {
        id: `task_${tasks.length + 1}`,
        challenge_id: 'chal_1',
        title: title,
        description: desc,
        type: type,
        points: parseInt(points) || 30,
        expires_at: '2026-05-30T23:59:59Z',
        completed_by: []
      };

      setTasks(prev => [newTask, ...prev]);
      
      // Resetar form
      setTitle('');
      setDesc('');
      setPoints('30');
      
      Alert.alert('Sucesso', 'Nova tarefa extra foi publicada no desafio ativa para todos os membros!');
    } catch (e) {
      Alert.alert('Erro', 'Falha ao criar tarefa.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    Alert.alert(
      'Apagar Tarefa',
      'Deseja mesmo remover esta tarefa extra do desafio? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Apagar', 
          style: 'destructive', 
          onPress: () => {
            setTasks(prev => prev.filter(t => t.id !== taskId));
          } 
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Painel do Admin</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          Crie tarefas extras ou apague as existentes para dinamizar a constância do seu grupo.
        </Text>

        {/* FORMULÁRIO DE NOVA TAREFA */}
        <Card variant="default" style={styles.formCard}>
          <Text style={styles.cardTitle}>Criar Nova Tarefa Extra</Text>
          <View style={styles.divider} />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Título da Tarefa</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Jejum da Célula"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descrição / Como Validar</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Ex: Participar do jejum coletivo no sábado e registrar..."
              value={desc}
              onChangeText={setDesc}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Tipo de Tarefa */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Categoria da Tarefa</Text>
            <View style={styles.toggleRow}>
              {[
                { key: 'general', label: 'Geral' },
                { key: 'presence', label: 'Presença' },
                { key: 'punctuality', label: 'Pontualidade' }
              ].map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.toggleBtn,
                    type === opt.key && styles.toggleBtnActive
                  ]}
                  onPress={() => setType(opt.key as any)}
                >
                  <Text style={[
                    styles.toggleBtnText,
                    type === opt.key && styles.toggleBtnTextActive
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Pontos e Expiração */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { width: '48%' }]}>
              <Text style={styles.label}>Pontos Bônus</Text>
              <TextInput
                style={styles.input}
                value={points}
                onChangeText={setPoints}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.inputGroup, { width: '48%' }]}>
              <Text style={styles.label}>Data Limite</Text>
              <TextInput
                style={styles.input}
                value={expiryDate}
                onChangeText={setExpiryDate}
                placeholder="DD/MM/AAAA"
              />
            </View>
          </View>

          <Button
            title="Publicar Tarefa"
            variant="primary"
            size="lg"
            loading={loading}
            onPress={handleCreateTask}
            style={styles.submitBtn}
          />
        </Card>

        {/* LISTA DE TAREFAS ATIVAS */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Tarefas Ativas no Desafio</Text>
          
          <View style={styles.tasksList}>
            {tasks.map(task => (
              <Card key={task.id} variant="default" style={styles.taskCard}>
                <View style={styles.taskHeader}>
                  <View style={styles.taskTitleRow}>
                    <View style={styles.taskTypeBadge}>
                      <Text style={styles.taskTypeText}>{task.type.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.taskPoints}>+{task.points} pts</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteTask(task.id)}>
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.taskName}>{task.title}</Text>
                <Text style={styles.taskDescText}>{task.description}</Text>
                
                <View style={styles.taskFooter}>
                  <Text style={styles.expiryText}>
                    Expira em: {new Date(task.expires_at).toLocaleDateString('pt-BR')}
                  </Text>
                  <Text style={styles.completedText}>
                    {task.completed_by.length} membros completaram
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        </View>
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
  formCard: {
    padding: SPACING.md,
    marginBottom: SPACING.xl,
  },
  cardTitle: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
    marginBottom: SPACING.md,
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  toggleBtn: {
    flex: 1,
    height: 38,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: FONTS.weight.semibold,
    color: COLORS.textSecondary,
  },
  toggleBtnTextActive: {
    color: '#fff',
  },
  submitBtn: {
    marginTop: SPACING.md,
    width: '100%',
  },
  listSection: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    fontFamily: FONTS.family.heading,
    marginBottom: SPACING.md,
  },
  tasksList: {
    gap: SPACING.md,
  },
  taskCard: {
    padding: SPACING.md,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskTypeBadge: {
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.md,
  },
  taskTypeText: {
    fontSize: 9,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textSecondary,
  },
  taskPoints: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    color: COLORS.secondary,
    marginLeft: SPACING.sm,
  },
  taskName: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    marginBottom: 2,
  },
  taskDescText: {
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: SPACING.sm,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  expiryText: {
    fontSize: 9,
    color: COLORS.textLight,
  },
  completedText: {
    fontSize: 9,
    fontWeight: FONTS.weight.semibold,
    color: COLORS.secondary,
  }
});
