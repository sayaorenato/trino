import React, { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { WebContainer } from '../components/ui/WebContainer';
import { supabase } from '../lib/supabase';
import { MOCK_EXTRA_TASKS, ExtraTask } from '../constants/mock-data';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, SHADOWS } from '../constants/theme';

export default function AdminScreen() {
  const router = useRouter();
  const { challengeId } = useLocalSearchParams<{ challengeId?: string }>();
  
  const currentChallengeId = challengeId || 'chal_1';

  const [tasks, setTasks] = useState<ExtraTask[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  useEffect(() => {
    const isMock = currentChallengeId.startsWith('chal');
    if (isMock) {
      setTasks(MOCK_EXTRA_TASKS[currentChallengeId] || []);
    } else {
      setLoading(true);
      // Buscar do Supabase e carregar check-ins para saber o total de membros que concluíram
      supabase
        .from('tasks')
        .select('*')
        .eq('challenge_id', currentChallengeId)
        .then(async ({ data: tasksData, error: tasksError }) => {
          if (tasksError) {
            console.error(tasksError);
            setTasks([]);
            setLoading(false);
            return;
          }
          if (!tasksData || tasksData.length === 0) {
            setTasks([]);
            setLoading(false);
            return;
          }

          // Buscar check-ins do round ativo para mapear quem concluiu (opcional para exibir no painel, mas ótimo)
          // Para saber quais rounds pertencem a esse desafio
          const { data: roundsData } = await supabase
            .from('rounds')
            .select('id')
            .eq('challenge_id', currentChallengeId);
          const roundIds = (roundsData || []).map(r => r.id);

          let completedMap: Record<string, string[]> = {};
          if (roundIds.length > 0) {
            const { data: checkinsData } = await supabase
              .from('checkins')
              .select('user_id, note')
              .in('round_id', roundIds);

            (checkinsData || []).forEach((c: any) => {
              if (c.note && c.note.startsWith('[EXTRA_TASK_ID:')) {
                const match = c.note.match(/^\[EXTRA_TASK_ID:([^\]]+)\]/);
                if (match) {
                  const taskId = match[1];
                  if (!completedMap[taskId]) {
                    completedMap[taskId] = [];
                  }
                  completedMap[taskId].push(c.user_id);
                }
              }
            });
          }

          const parsedTasks: ExtraTask[] = tasksData.map((t: any) => {
            let parsed = { title: 'Tarefa Extra', description: t.description, type: 'general' as const, expires_at: t.created_at, start_time: undefined, active: true };
            try {
              parsed = JSON.parse(t.description);
            } catch (e) {
              // não era JSON
            }
            return {
              id: t.id,
              challenge_id: t.challenge_id,
              title: parsed.title || 'Tarefa Extra',
              description: parsed.description || t.description,
              type: (parsed.type || 'general') as 'general' | 'presence' | 'punctuality',
              points: t.points || 30,
              expires_at: parsed.expires_at || t.created_at,
              start_time: parsed.start_time,
              completed_by: completedMap[t.id] || [],
              active: parsed.active !== false
            };
          });

          setTasks(parsedTasks);
          setLoading(false);
        });
    }
  }, [currentChallengeId]);

  // Estados do Form de nova tarefa
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState<'general' | 'presence' | 'punctuality'>('general');
  const [points, setPoints] = useState('30');
  const [expiryDate, setExpiryDate] = useState(() => {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    return `${d}/${m}/${y}`;
  });
  const [startTime, setStartTime] = useState('19:30');

  const [loading, setLoading] = useState(false);

  const handleEditSelect = (task: ExtraTask) => {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setDesc(task.description);
    setType(task.type);
    setPoints(String(task.points));
    
    try {
      const date = new Date(task.expires_at);
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      setExpiryDate(`${d}/${m}/${y}`);
    } catch (e) {
      // fallback
    }
    
    if (task.start_time) {
      setStartTime(task.start_time);
    }
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setTitle('');
    setDesc('');
    setType('general');
    setPoints('30');
    
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    setExpiryDate(`${d}/${m}/${y}`);
    setStartTime('19:30');
  };

  const handleCreateTask = async () => {
    if (!title || !desc || !points) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos da tarefa.');
      return;
    }

    if (title.length > 100) {
      Alert.alert('Erro', 'O título da tarefa deve ter no máximo 100 caracteres.');
      return;
    }

    if (desc.length > 1000) {
      Alert.alert('Erro', 'A descrição da tarefa deve ter no máximo 1000 caracteres.');
      return;
    }

    setLoading(true);
    try {
      let isoExpiresAt = '2026-06-20T23:59:59Z';
      try {
        const [day, month, year] = expiryDate.split('/');
        if (day && month && year) {
          isoExpiresAt = `${year}-${month}-${day}T23:59:59Z`;
        }
      } catch (err) {
        console.warn('Erro ao formatar data de expiração:', err);
      }

      const isMock = currentChallengeId.startsWith('chal');
      const payload = {
        title: title,
        description: desc,
        type: type,
        expires_at: isoExpiresAt,
        active: true,
        ...(type === 'presence' || type === 'punctuality' ? { start_time: startTime } : {})
      };

      if (editingTaskId) {
        // --- MODO EDIÇÃO ---
        if (isMock) {
          MOCK_EXTRA_TASKS[currentChallengeId] = (MOCK_EXTRA_TASKS[currentChallengeId] || []).map(t => {
            if (t.id === editingTaskId) {
              return {
                ...t,
                title: title,
                description: desc,
                type: type,
                points: parseInt(points) || 30,
                expires_at: isoExpiresAt,
                active: true,
                ...(type === 'presence' || type === 'punctuality' ? { start_time: startTime } : {})
              };
            }
            return t;
          });

          setTasks(prev => prev.map(t => {
            if (t.id === editingTaskId) {
              return {
                ...t,
                title: title,
                description: desc,
                type: type,
                points: parseInt(points) || 30,
                expires_at: isoExpiresAt,
                active: true,
                ...(type === 'presence' || type === 'punctuality' ? { start_time: startTime } : {})
              };
            }
            return t;
          }));
        } else {
          // Gravar no banco de dados do Supabase
          const { error } = await supabase
            .from('tasks')
            .update({
              description: JSON.stringify(payload),
              points: parseInt(points) || 30,
            })
            .eq('id', editingTaskId);

          if (error) throw error;

          setTasks(prev => prev.map(t => {
            if (t.id === editingTaskId) {
              return {
                ...t,
                title: title,
                description: desc,
                type: type,
                points: parseInt(points) || 30,
                expires_at: isoExpiresAt,
                active: true,
                ...(type === 'presence' || type === 'punctuality' ? { start_time: startTime } : {})
              };
            }
            return t;
          }));
        }

        Alert.alert('Sucesso', 'A tarefa extra foi atualizada com sucesso!');
        setEditingTaskId(null);
      } else {
        // --- MODO CRIAÇÃO ---
        if (isMock) {
          const newTask: ExtraTask = {
            id: `task_${Date.now()}`,
            challenge_id: currentChallengeId,
            title: title,
            description: desc,
            type: type,
            points: parseInt(points) || 30,
            expires_at: isoExpiresAt,
            completed_by: [],
            active: true,
            ...((type === 'presence' || type === 'punctuality') ? { start_time: startTime } : {})
          };

          // Mutar o mock global
          MOCK_EXTRA_TASKS[currentChallengeId] = [newTask, ...(MOCK_EXTRA_TASKS[currentChallengeId] || [])];
          setTasks(prev => [newTask, ...prev]);
        } else {
          // Gravar no banco de dados do Supabase
          const { data, error } = await supabase
            .from('tasks')
            .insert({
              challenge_id: currentChallengeId,
              description: JSON.stringify(payload),
              points: parseInt(points) || 30,
              type: 'other'
            })
            .select()
            .single();

          if (error) throw error;

          const newTask: ExtraTask = {
            id: data.id,
            challenge_id: currentChallengeId,
            title: title,
            description: desc,
            type: type,
            points: parseInt(points) || 30,
            expires_at: isoExpiresAt,
            completed_by: [],
            active: true,
            ...(type === 'presence' || type === 'punctuality' ? { start_time: startTime } : {})
          };
          setTasks(prev => [newTask, ...prev]);
        }

        Alert.alert('Sucesso', 'Nova tarefa extra foi publicada no desafio ativo para todos os membros!');
      }
      
      // Resetar form
      setTitle('');
      setDesc('');
      setPoints('30');
      
      const today = new Date();
      const d = String(today.getDate()).padStart(2, '0');
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const y = today.getFullYear();
      setExpiryDate(`${d}/${m}/${y}`);
      setStartTime('19:30');
      setType('general');
    } catch (e: any) {
      console.error(e);
      Alert.alert('Erro', e.message || 'Falha ao salvar tarefa.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    Alert.alert(
      'Desativar Tarefa',
      'Deseja mesmo desativar esta tarefa extra do desafio? Ela não estará mais disponível para novos check-ins.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Desativar', 
          style: 'destructive', 
          onPress: async () => {
            const isMock = currentChallengeId.startsWith('chal');
            setLoading(true);
            try {
              if (isMock) {
                MOCK_EXTRA_TASKS[currentChallengeId] = (MOCK_EXTRA_TASKS[currentChallengeId] || []).map(t => {
                  if (t.id === taskId) {
                    return { ...t, active: false };
                  }
                  return t;
                });
                setTasks(prev => prev.map(t => {
                  if (t.id === taskId) {
                    return { ...t, active: false };
                  }
                  return t;
                }));
              } else {
                const taskToDisable = tasks.find(t => t.id === taskId);
                if (taskToDisable) {
                  const payload = {
                    title: taskToDisable.title,
                    description: taskToDisable.description,
                    type: taskToDisable.type,
                    expires_at: taskToDisable.expires_at,
                    start_time: taskToDisable.start_time,
                    active: false
                  };

                  const { error } = await supabase
                    .from('tasks')
                    .update({
                      description: JSON.stringify(payload)
                    })
                    .eq('id', taskId);

                  if (error) throw error;
                  setTasks(prev => prev.map(t => {
                    if (t.id === taskId) {
                      return { ...t, active: false };
                    }
                    return t;
                  }));
                }
              }
              Alert.alert('Sucesso', 'Tarefa desativada com sucesso.');
            } catch (e: any) {
              console.error(e);
              Alert.alert('Erro', 'Não foi possível desativar a tarefa.');
            } finally {
              setLoading(false);
            }
          } 
        }
      ]
    );
  };

  return (
    <WebContainer>
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
            <Text style={styles.cardTitle}>{editingTaskId ? 'Editar Tarefa Extra' : 'Criar Nova Tarefa Extra'}</Text>
            <View style={styles.divider} />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Título da Tarefa</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Jejum da Célula"
                value={title}
                onChangeText={setTitle}
                maxLength={100}
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
                maxLength={1000}
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

            {(type === 'presence' || type === 'punctuality') && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Horário da Tarefa (HH:MM)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 19:30"
                  value={startTime}
                  onChangeText={setStartTime}
                />
              </View>
            )}

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
              title={editingTaskId ? 'Salvar Alterações' : 'Publicar Tarefa'}
              variant="primary"
              size="lg"
              loading={loading}
              onPress={handleCreateTask}
              style={styles.submitBtn}
            />

            {editingTaskId && (
              <Button
                title="Cancelar Edição"
                variant="outline"
                size="lg"
                onPress={handleCancelEdit}
                style={{ marginTop: SPACING.md, width: '100%' }}
              />
            )}
          </Card>

          {/* LISTA DE TAREFAS ATIVAS */}
          <View style={styles.listSection}>
            <Text style={styles.sectionTitle}>Tarefas Ativas no Desafio</Text>
            
            <View style={styles.tasksList}>
              {tasks.filter(task => task.active !== false).map(task => (
                <Card key={task.id} variant="default" style={styles.taskCard}>
                  <View style={styles.taskHeader}>
                    <View style={styles.taskTitleRow}>
                      <View style={styles.taskTypeBadge}>
                        <Text style={styles.taskTypeText}>{task.type.toUpperCase()}</Text>
                      </View>
                      <Text style={styles.taskPoints}>+{task.points} pts</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: SPACING.md, alignItems: 'center' }}>
                      <TouchableOpacity onPress={() => handleEditSelect(task)}>
                        <MaterialCommunityIcons name="pencil-outline" size={20} color={COLORS.secondary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteTask(task.id)}>
                        <MaterialCommunityIcons name="trash-can-outline" size={20} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <Text style={styles.taskName}>{task.title}</Text>
                  <Text style={styles.taskDescText}>{task.description}</Text>
                  {task.start_time && (
                    <View style={styles.taskTimeBadge}>
                      <MaterialCommunityIcons name="clock-outline" size={12} color={COLORS.textSecondary} />
                      <Text style={styles.taskTimeText}>Início: {task.start_time}</Text>
                    </View>
                  )}
                  
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
  formCard: {
    padding: SPACING.md,
    marginBottom: SPACING.xl,
  },
  cardTitle: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    fontFamily: FONTS.family.heading,
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
    fontFamily: FONTS.family.heading,
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
    fontFamily: FONTS.family.body,
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
    fontFamily: FONTS.family.body,
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
    fontFamily: FONTS.family.body,
  },
  taskPoints: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    color: COLORS.secondary,
    marginLeft: SPACING.sm,
    fontFamily: FONTS.family.body,
  },
  taskName: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    marginBottom: 2,
    fontFamily: FONTS.family.heading,
  },
  taskDescText: {
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: SPACING.sm,
    fontFamily: FONTS.family.body,
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
    fontFamily: FONTS.family.body,
  },
  completedText: {
    fontSize: 9,
    fontWeight: FONTS.weight.semibold,
    color: COLORS.secondary,
    fontFamily: FONTS.family.body,
  },
  taskTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.xs,
  },
  taskTimeText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: FONTS.family.body,
  }
});
