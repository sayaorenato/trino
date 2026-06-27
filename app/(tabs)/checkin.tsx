import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Image, 
  ScrollView, 
  SafeAreaView, 
  ActivityIndicator,
  Platform,
  Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { WebContainer } from '../../components/ui/WebContainer';
import { useAuth } from '../../context/auth';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { 
  HABIT_LABELS, 
  HabitType, 
  MOCK_EXTRA_TASKS, 
  MOCK_RANKINGS, 
  MOCK_FEED, 
  MOCK_CURRENT_USER,
  ExtraTask, 
  Checkin 
} from '../../constants/mock-data';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, SHADOWS } from '../../constants/theme';

// Mapeamento UI → schema do banco
const HABIT_DB_TYPE: Record<HabitType, 'pray' | 'bible' | 'workout'> = {
  prayer: 'pray',
  bible: 'bible',
  exercise: 'workout',
};

export default function CheckinScreen() {
  const router = useRouter();
  const { challengeId: queryChallengeId, habit: queryHabit, taskId: queryTaskId } = useLocalSearchParams<{ challengeId?: string, habit?: string, taskId?: string }>();
  const { user } = useAuth();

  // Estados do Fluxo de Check-in
  const [step, setStep] = useState<'select' | 'upload' | 'success'>('select');
  const [selectedHabit, setSelectedHabit] = useState<HabitType | null>(null);
  const [selectedTask, setSelectedTask] = useState<ExtraTask | null>(null);
  const [extraTasks, setExtraTasks] = useState<ExtraTask[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);

  // Múltiplos desafios/grupos do usuário
  const [activeChallengesList, setActiveChallengesList] = useState<any[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [loadingRound, setLoadingRound] = useState(true);
  const [challengeChosen, setChallengeChosen] = useState(false);

  // Multi-grupo: IDs dos grupos selecionados para o check-in padrão
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());

  // Hábitos diários concluídos hoje pelo usuário
  const [completedHabitsToday, setCompletedHabitsToday] = useState<{ prayer: boolean; bible: boolean; exercise: boolean }>({
    prayer: false,
    bible: false,
    exercise: false
  });

  // Busca todos os grupos do usuário com desafios ativos
  useEffect(() => {
    if (!user) return;
    setLoadingRound(true);

    api.getDashboardData(user.id).then(({ groups }) => {
      const list: any[] = [];

      groups.forEach((g: any) => {
        if (!g.challenges || !Array.isArray(g.challenges)) return;

        // Para cada grupo, pega o primeiro desafio ativo (mais recente)
        const activeChallenge = g.challenges.find(
          (c: any) => new Date(c.end_date) >= new Date()
        );
        if (!activeChallenge) return;

        const isMockGroup = Boolean(g.id?.startsWith('group'));

        list.push({
          groupId: g.id,
          groupName: g.name,
          challengeId: activeChallenge.id,
          // mocks usam 'name', o banco usa 'title'
          challengeTitle: activeChallenge.title || activeChallenge.name || 'Desafio',
          rounds: activeChallenge.rounds || [],
          isMock: isMockGroup,
        });
      });

      setActiveChallengesList(list);
      // Pré-seleciona TODOS os grupos por padrão
      setSelectedGroupIds(new Set(list.map((i: any) => i.groupId)));
      // Usa o primeiro item como contexto para tarefas extras
      setSelectedChallenge(list[0] ?? null);

      // Se veio por deep-link com challengeId + habit, vai direto ao upload
      if (queryChallengeId && queryHabit && ['prayer', 'bible', 'exercise'].includes(queryHabit)) {
        const found = list.find(i => i.challengeId === queryChallengeId);
        if (found) {
          setSelectedChallenge(found);
          setSelectedHabit(queryHabit as HabitType);
          setSelectedTask(null);
          setStep('upload');
        }
      }

      setLoadingRound(false);
    }).catch(err => {
      console.error('Erro ao carregar grupos:', err);
      setLoadingRound(false);
    });
  }, [user, queryChallengeId, queryHabit]);

  // Atualiza as tarefas extras e o round ativo de acordo com o desafio selecionado
  useEffect(() => {
    if (!selectedChallenge) {
      setExtraTasks([]);
      setActiveRoundId(null);
      setActiveGroupId(null);
      return;
    }

    const rounds = selectedChallenge.rounds || [];
    const now = new Date();
    
    // Tenta encontrar o round ativo no intervalo atual
    let currentRound = rounds.find((r: any) => {
      const start = new Date(r.start_date);
      const end = new Date(r.end_date);
      return now >= start && now <= end;
    });

    // Fallback: round mais recente
    if (!currentRound && rounds.length > 0) {
      currentRound = rounds.reduce((prev: any, curr: any) =>
        curr.round_number > prev.round_number ? curr : prev
      );
    }

    const roundId = currentRound?.id || null;
    setActiveRoundId(roundId);
    setActiveGroupId(selectedChallenge.groupId);
    
    const isMockChallenge = selectedChallenge.isMock === true;
    const challengeId = selectedChallenge.challengeId;

    if (isMockChallenge) {
      const filteredMock = (MOCK_EXTRA_TASKS[challengeId] || []).filter(t => t.active !== false);
      setExtraTasks(filteredMock);
      
      if (queryTaskId) {
        const foundTask = filteredMock.find(t => t.id === queryTaskId);
        const isCompleted = foundTask?.completed_by.includes(user?.id || '');
        if (foundTask && !isCompleted) {
          setSelectedTask(foundTask);
          setSelectedHabit(null);
          setStep('upload');
        }
      }
    } else {
      // Buscar tarefas do Supabase
      supabase
        .from('tasks')
        .select('*')
        .eq('challenge_id', challengeId)
        .then(async ({ data: tasksData, error: tasksError }) => {
          if (tasksError) {
            console.error('Erro ao buscar tarefas do banco:', tasksError);
            setExtraTasks([]);
            return;
          }
          if (!tasksData || tasksData.length === 0) {
            setExtraTasks([]);
            return;
          }

          // Buscar quais check-ins desse round ativo já foram concluídos como tarefas extras
          let completedMap: Record<string, string[]> = {};
          if (roundId) {
            const { data: checkinsData, error: checkinsError } = await supabase
              .from('checkins')
              .select('user_id, note')
              .eq('round_id', roundId);

            if (!checkinsError) {
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
          }

          // Converter registros de tasks para a interface ExtraTask
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

          const filteredTasks = parsedTasks.filter(t => t.active !== false);
          setExtraTasks(filteredTasks);
          
          if (queryTaskId) {
            const foundTask = filteredTasks.find(t => t.id === queryTaskId);
            const isCompleted = foundTask?.completed_by.includes(user?.id || '');
            if (foundTask && !isCompleted) {
              setSelectedTask(foundTask);
              setSelectedHabit(null);
              setStep('upload');
            }
          }
        });
    }
  }, [selectedChallenge, step, queryTaskId, user]);

  // Atualiza hábitos concluídos hoje para o desafio/round ativo
  useEffect(() => {
    if (!user || !activeRoundId) {
      setCompletedHabitsToday({ prayer: false, bible: false, exercise: false });
      return;
    }

    const isMock = selectedChallenge?.isMock === true;
    if (isMock) {
      const completed = { prayer: false, bible: false, exercise: false };
      const todayStr = new Date().toISOString().split('T')[0];
      MOCK_FEED.forEach(c => {
        const checkinDateStr = c.created_at.split('T')[0];
        if (c.user_id === user.id && c.group_id === activeGroupId && checkinDateStr === todayStr) {
          if (c.habit_type === 'prayer') completed.prayer = true;
          if (c.habit_type === 'bible') completed.bible = true;
          if (c.habit_type === 'exercise') completed.exercise = true;
        }
      });
      setCompletedHabitsToday(completed);
    } else {
      api.getTodayCheckins(user.id, activeRoundId).then((checkins) => {
        const completed = { prayer: false, bible: false, exercise: false };
        (checkins || []).forEach((c: any) => {
          if (c.type === 'pray') completed.prayer = true;
          if (c.type === 'bible') completed.bible = true;
          if (c.type === 'workout') completed.exercise = true;
        });
        setCompletedHabitsToday(completed);
      }).catch(err => {
        console.error('Erro ao buscar checkins de hoje:', err);
      });
    }
  }, [user, activeRoundId, activeGroupId, selectedChallenge, step]);

  const handleSelectHabit = (type: HabitType) => {
    setSelectedHabit(type);
    setSelectedTask(null);
    setStep('upload');
  };

  const handleSelectTask = (task: ExtraTask) => {
    setSelectedTask(task);
    setSelectedHabit(null);
    setStep('upload');
  };

  const handlePickImage = async () => {
    // Solicitar permissão de câmera/galeria
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissão necessária', 
        'Precisamos de acesso às suas fotos para validar o check-in.',
        [
          { text: 'Simular Foto', onPress: () => handleSimulatedPhoto() },
          { text: 'Cancelar', style: 'cancel' }
        ]
      );
      return;
    }

    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e) {
      // Fallback em caso de erro no emulador/ambiente
      handleSimulatedPhoto();
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      handleSimulatedPhoto();
      return;
    }

    try {
      let result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e) {
      handleSimulatedPhoto();
    }
  };

  const handleSimulatedPhoto = () => {
    // Fotos do Unsplash simulando o hábito para o MVP
    let simulatedUrl = '';
    if (selectedTask) {
      if (selectedTask.type === 'presence') {
        simulatedUrl = 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=600&q=80'; // Evento
      } else if (selectedTask.type === 'punctuality') {
        simulatedUrl = 'https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=600&q=80'; // Devocional
      } else {
        simulatedUrl = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80'; // Geral
      }
    } else if (selectedHabit === 'prayer') {
      simulatedUrl = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80'; // Lugar de oração
    } else if (selectedHabit === 'bible') {
      simulatedUrl = 'https://images.unsplash.com/photo-1504052434569-70ad5836ab90?auto=format&fit=crop&w=600&q=80'; // Bíblia aberta
    } else {
      simulatedUrl = 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80'; // Academia
    }
    
    setImageUri(simulatedUrl);
  };

  const handleConfirmCheckin = async () => {
    if (!imageUri) {
      Alert.alert('Mídia Obrigatória', 'Para validar seu hábito e garantir a honestidade no grupo, você precisa anexar uma foto de comprovação.');
      return;
    }
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }

    // Para hábitos padrão multi-grupo, permitir mesmo sem activeRoundId se houver grupos selecionados
    const isMultiGroup = !selectedTask && selectedGroupIds.size > 0;
    if (!activeRoundId && !isMultiGroup) {
      Alert.alert('Sem Desafio Ativo', 'Você precisa participar de um grupo com desafio ativo para fazer check-in.');
      return;
    }

    setLoading(true);
    try {
      // Upload da imagem (apenas se for URI local, não URL simulada)
      let finalImageUrl: string | null = null;
      const isLocalUri = imageUri.startsWith('file://') || imageUri.startsWith('content://');
      if (isLocalUri) {
        finalImageUrl = await api.uploadCheckinImage(user.id, imageUri);
        if (!finalImageUrl) {
          throw new Error('Falha no upload da imagem.');
        }
      } else {
        // URI simulada (testes) — usar diretamente
        finalImageUrl = imageUri;
      }

      if (selectedTask) {
        // ── TAREFA EXTRA (afeta apenas o desafio selecionado) ──
        const challengeId = selectedChallenge.challengeId;
        const isMock = selectedChallenge.isMock === true;

        if (isMock) {
          MOCK_EXTRA_TASKS[challengeId] = (MOCK_EXTRA_TASKS[challengeId] || []).map(t => {
            if (t.id === selectedTask.id) {
              return { ...t, completed_by: [...t.completed_by, user.id] };
            }
            return t;
          });

          if (MOCK_RANKINGS[challengeId]) {
            MOCK_RANKINGS[challengeId] = MOCK_RANKINGS[challengeId].map(member => {
              if (member.user_id === user.id) {
                return { ...member, points: member.points + selectedTask.points };
              }
              return member;
            });
          }

          const newCheckin: Checkin = {
            id: `check_extra_${Date.now()}`,
            user_id: user.id,
            user_name: user.email?.split('@')[0] || 'Usuário',
            user_avatar: MOCK_CURRENT_USER.avatar_url,
            group_id: activeGroupId || 'group_1',
            habit_type: 'prayer',
            media_url: finalImageUrl || imageUri,
            is_late: false,
            caption: caption.trim() || `Tarefa Extra Concluída: ${selectedTask.title}`,
            points: selectedTask.points,
            created_at: new Date().toISOString(),
            reactions: []
          };
          MOCK_FEED.unshift(newCheckin);
        } else {
          const { error } = await supabase.from('checkins').insert({
            user_id: user.id,
            round_id: activeRoundId,
            type: 'pray',
            image_url: finalImageUrl,
            note: `[EXTRA_TASK_ID:${selectedTask.id}] ${caption.trim()}`.trim(),
            verified: false,
          });
          if (error) throw error;
        }
      } else {
        // ── HÁBITO PADRÃO MULTI-GRUPO ──
        // Determina os itens de desafio que correspondem aos grupos selecionados
        const targetItems = activeChallengesList.filter(item => selectedGroupIds.has(item.groupId));

        for (const item of targetItems) {
          const isMock = item.isMock === true;

          if (isMock) {
            // Adiciona no feed mock para cada grupo selecionado
            const newCheckin: Checkin = {
              id: `check_${item.groupId}_${Date.now()}`,
              user_id: user.id,
              user_name: user.email?.split('@')[0] || 'Usuário',
              user_avatar: MOCK_CURRENT_USER.avatar_url,
              group_id: item.groupId,
              habit_type: selectedHabit as 'prayer' | 'bible' | 'exercise',
              media_url: finalImageUrl || imageUri,
              is_late: false,
              caption: caption.trim() || undefined,
              points: 10,
              created_at: new Date().toISOString(),
              reactions: []
            };
            MOCK_FEED.unshift(newCheckin);
          } else {
            // Encontra o round ativo do item para o grupo real
            const rounds = item.rounds || [];
            const now = new Date();
            let currentRound = rounds.find((r: any) => {
              const start = new Date(r.start_date);
              const end = new Date(r.end_date);
              return now >= start && now <= end;
            });
            if (!currentRound && rounds.length > 0) {
              currentRound = rounds.reduce((prev: any, curr: any) =>
                curr.round_number > prev.round_number ? curr : prev
              );
            }
            const roundId = currentRound?.id;
            if (!roundId) continue; // pula grupo sem round ativo

            const { error } = await supabase.from('checkins').insert({
              user_id: user.id,
              round_id: roundId,
              type: HABIT_DB_TYPE[selectedHabit!],
              image_url: finalImageUrl,
              note: caption.trim() || null,
              verified: false,
            });
            if (error) {
              console.error(`Erro no check-in do grupo ${item.groupName}:`, error);
            }
          }
        }
      }

      setStep('success');
    } catch (e: any) {
      console.error('Erro no check-in:', e);
      Alert.alert('Erro', e.message ?? 'Ocorreu um erro ao enviar o check-in. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('select');
    setSelectedHabit(null);
    setSelectedTask(null);
    setImageUri(null);
    setCaption('');
  };

  // Tela de loading enquanto busca round ativo
  if (loadingRound) {
    return (
      <WebContainer>
        <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: SPACING.md, color: COLORS.textSecondary, fontSize: FONTS.size.sm, fontFamily: FONTS.family.body }}>
            Verificando desafio ativo…
          </Text>
        </SafeAreaView>
      </WebContainer>
    );
  }

  // RENDER PASSO 1: SELECIONAR HÁBITO
  if (step === 'select') {
    return (
      <WebContainer>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Novo Check-in</Text>
          </View>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {activeChallengesList.length === 0 ? (
              <Card variant="flat" style={styles.noChallengesCard}>
                <MaterialCommunityIcons name="trophy-outline" size={32} color={COLORS.textLight} style={{ marginBottom: SPACING.sm }} />
                <Text style={styles.noChallengesText}>
                  Você não está participando de nenhum desafio ativo no momento.
                </Text>
                <Text style={styles.noChallengesSubtext}>
                  Entre em um grupo com desafio ativo ou crie um novo para poder realizar check-ins!
                </Text>
                <Button 
                  title="Ir para Meus Grupos" 
                  variant="primary" 
                  onPress={() => router.push('/(tabs)')}
                  style={{ marginTop: SPACING.md, width: '100%' }}
                />
              </Card>
            ) : (
              <>
                {/* Flags de Grupo — apenas para hábitos padrão */}
                {activeChallengesList.length > 1 && (
                  <Card variant="flat" style={{ marginBottom: SPACING.md, padding: SPACING.sm }}>
                    <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: SPACING.xs }]}>
                      Compartilhar em qual grupo?
                    </Text>
                    <Text style={{ fontSize: FONTS.size.xs, color: COLORS.textSecondary, fontFamily: FONTS.family.body, marginBottom: SPACING.sm }}>
                      Selecione todos os grupos onde este hábito deve ser registrado:
                    </Text>
                    {activeChallengesList.map((item: any) => {
                      const isSelected = selectedGroupIds.has(item.groupId);
                      return (
                        <TouchableOpacity
                          key={item.groupId}
                          activeOpacity={0.8}
                          onPress={() => {
                            setSelectedGroupIds(prev => {
                              const next = new Set(prev);
                              if (next.has(item.groupId)) {
                                next.delete(item.groupId);
                              } else {
                                next.add(item.groupId);
                              }
                              return next;
                            });
                          }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: SPACING.xs,
                            paddingHorizontal: SPACING.sm,
                            borderRadius: BORDER_RADIUS.sm,
                            marginBottom: 4,
                            backgroundColor: isSelected ? COLORS.primaryMuted ?? 'rgba(3,25,46,0.06)' : 'transparent',
                          }}
                        >
                          <MaterialCommunityIcons
                            name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                            size={22}
                            color={isSelected ? COLORS.primary : COLORS.border}
                            style={{ marginRight: SPACING.sm }}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: FONTS.size.sm, fontFamily: FONTS.family.heading, color: COLORS.text, fontWeight: '600' }}>
                              {item.groupName}
                            </Text>
                            <Text style={{ fontSize: FONTS.size.xs, color: COLORS.textLight, fontFamily: FONTS.family.body }} numberOfLines={1}>
                              {item.challengeTitle}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </Card>
                )}

                <Text style={styles.instructionText}>
                  Qual hábito de fé ou saúde você concluiu e deseja validar hoje?
                </Text>

                <Text style={[styles.sectionTitle, { marginTop: SPACING.md }]}>Tarefas Diárias</Text>
                <View style={styles.habitButtonsContainer}>
                  {/* ORAÇÃO */}
                  <TouchableOpacity 
                    style={[
                      styles.habitButton, 
                      { borderColor: 'rgba(174, 143, 100, 0.3)' },
                      completedHabitsToday.prayer && styles.habitButtonCompleted
                    ]}
                    onPress={() => {
                      if (selectedGroupIds.size === 0) {
                        Alert.alert('Selecione um grupo', 'Selecione ao menos um grupo acima para registrar este hábito.');
                        return;
                      }
                      handleSelectHabit('prayer');
                    }}
                    disabled={completedHabitsToday.prayer}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.habitIconBg, { backgroundColor: completedHabitsToday.prayer ? COLORS.secondary : COLORS.gold }]}>
                      <MaterialCommunityIcons name={completedHabitsToday.prayer ? "check" : HABIT_LABELS.prayer.icon} size={28} color="#fff" />
                    </View>
                    <View style={styles.habitButtonDetails}>
                      <Text style={[styles.habitButtonTitle, completedHabitsToday.prayer && styles.habitButtonTitleCompleted]}>
                        {HABIT_LABELS.prayer.title}
                      </Text>
                      <Text style={styles.habitButtonDesc}>{HABIT_LABELS.prayer.description}</Text>
                    </View>
                    <View style={[
                      styles.pointsBadge, 
                      { backgroundColor: completedHabitsToday.prayer ? COLORS.secondaryMuted : '#fff9eb' }
                    ]}>
                      <Text style={[
                        styles.pointsText, 
                        { color: completedHabitsToday.prayer ? COLORS.secondary : COLORS.goldDark }
                      ]}>
                        {completedHabitsToday.prayer ? 'Concluído' : '+10 pts'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* BÍBLIA */}
                  <TouchableOpacity 
                    style={[
                      styles.habitButton, 
                      { borderColor: 'rgba(3, 25, 46, 0.1)' },
                      completedHabitsToday.bible && styles.habitButtonCompleted
                    ]}
                    onPress={() => {
                      if (selectedGroupIds.size === 0) {
                        Alert.alert('Selecione um grupo', 'Selecione ao menos um grupo acima para registrar este hábito.');
                        return;
                      }
                      handleSelectHabit('bible');
                    }}
                    disabled={completedHabitsToday.bible}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.habitIconBg, { backgroundColor: completedHabitsToday.bible ? COLORS.secondary : COLORS.primary }]}>
                      <MaterialCommunityIcons name={completedHabitsToday.bible ? "check" : HABIT_LABELS.bible.icon} size={28} color="#fff" />
                    </View>
                    <View style={styles.habitButtonDetails}>
                      <Text style={[styles.habitButtonTitle, completedHabitsToday.bible && styles.habitButtonTitleCompleted]}>
                        {HABIT_LABELS.bible.title}
                      </Text>
                      <Text style={styles.habitButtonDesc}>{HABIT_LABELS.bible.description}</Text>
                    </View>
                    <View style={[
                      styles.pointsBadge, 
                      { backgroundColor: completedHabitsToday.bible ? COLORS.secondaryMuted : '#eef3f8' }
                    ]}>
                      <Text style={[
                        styles.pointsText, 
                        { color: completedHabitsToday.bible ? COLORS.secondary : COLORS.primary }
                      ]}>
                        {completedHabitsToday.bible ? 'Concluído' : '+10 pts'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* EXERCÍCIO */}
                  <TouchableOpacity 
                    style={[
                      styles.habitButton, 
                      { borderColor: 'rgba(74, 101, 74, 0.2)' },
                      completedHabitsToday.exercise && styles.habitButtonCompleted
                    ]}
                    onPress={() => {
                      if (selectedGroupIds.size === 0) {
                        Alert.alert('Selecione um grupo', 'Selecione ao menos um grupo acima para registrar este hábito.');
                        return;
                      }
                      handleSelectHabit('exercise');
                    }}
                    disabled={completedHabitsToday.exercise}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.habitIconBg, { backgroundColor: completedHabitsToday.exercise ? COLORS.secondary : COLORS.secondary }]}>
                      <MaterialCommunityIcons name={completedHabitsToday.exercise ? "check" : HABIT_LABELS.exercise.icon} size={28} color="#fff" />
                    </View>
                    <View style={styles.habitButtonDetails}>
                      <Text style={[styles.habitButtonTitle, completedHabitsToday.exercise && styles.habitButtonTitleCompleted]}>
                        {HABIT_LABELS.exercise.title}
                      </Text>
                      <Text style={styles.habitButtonDesc}>{HABIT_LABELS.exercise.description}</Text>
                    </View>
                    <View style={[
                      styles.pointsBadge, 
                      { backgroundColor: completedHabitsToday.exercise ? COLORS.secondaryMuted : '#eefcf4' }
                    ]}>
                      <Text style={[
                        styles.pointsText, 
                        { color: completedHabitsToday.exercise ? COLORS.secondary : COLORS.secondary }
                      ]}>
                        {completedHabitsToday.exercise ? 'Concluído' : '+10 pts'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.dividerLine} />

                <Text style={[styles.sectionTitle, { marginTop: 0 }]}>Tarefas Extras</Text>
                {extraTasks.length === 0 ? (
                  <Text style={{ fontSize: FONTS.size.xs, color: COLORS.textLight, fontFamily: FONTS.family.body, fontStyle: 'italic', textAlign: 'center', marginVertical: SPACING.md }}>
                    Nenhuma tarefa extra cadastrada para este desafio.
                  </Text>
                ) : (
                  <View style={styles.extraTasksContainer}>
                    {extraTasks.map(task => {
                      const isCompleted = task.completed_by.includes(user?.id || '');
                      
                      // Determina bloqueio
                      let isLocked = false;
                      let warningText = '';
                      if (!isCompleted && (task.type === 'presence' || task.type === 'punctuality')) {
                        const taskDateStr = task.expires_at.split('T')[0];
                        const [hour, minute] = (task.start_time || '00:00').split(':');
                        const startDateTime = new Date(`${taskDateStr}T${hour}:${minute}:00`);
                        const now = new Date();
                        isLocked = now < startDateTime;
                        
                        if (isLocked) {
                          const day = String(startDateTime.getDate()).padStart(2, '0');
                          const month = String(startDateTime.getMonth() + 1).padStart(2, '0');
                          warningText = `Disponível a partir de ${day}/${month} às ${task.start_time}`;
                        }
                      }

                      // Ícones baseados no tipo
                      const iconName = task.type === 'presence' ? 'map-marker-check-outline' :
                                       task.type === 'punctuality' ? 'clock-check-outline' :
                                       'star-check-outline';
                      const iconColor = task.type === 'presence' ? COLORS.primary :
                                        task.type === 'punctuality' ? COLORS.secondary :
                                        COLORS.gold;

                      return (
                        <TouchableOpacity
                          key={task.id}
                          style={[
                            styles.taskButton,
                            isCompleted && styles.taskButtonCompleted,
                            isLocked && styles.taskButtonLocked
                          ]}
                          disabled={isCompleted || isLocked}
                          onPress={() => handleSelectTask(task)}
                          activeOpacity={0.8}
                        >
                          <View style={[
                            styles.taskIconBg,
                            { backgroundColor: isCompleted ? COLORS.secondary : isLocked ? COLORS.border : iconColor }
                          ]}>
                            <MaterialCommunityIcons 
                              name={isCompleted ? 'check' : isLocked ? 'lock' : iconName} 
                              size={24} 
                              color="#fff" 
                            />
                          </View>
                          <View style={styles.taskButtonDetails}>
                            <Text style={[
                              styles.taskButtonTitle,
                              isCompleted && styles.taskButtonTitleCompleted
                            ]}>{task.title}</Text>
                            {isLocked ? (
                              <Text style={styles.warningText}>{warningText}</Text>
                            ) : (
                              <Text style={styles.taskButtonDesc}>{task.description}</Text>
                            )}
                          </View>
                          <View style={[
                            styles.pointsBadge,
                            { backgroundColor: isCompleted ? COLORS.secondaryMuted : isLocked ? COLORS.surfaceVariant : '#eef3f8' }
                          ]}>
                            <Text style={[
                              styles.pointsText,
                              { color: isCompleted ? COLORS.secondary : isLocked ? COLORS.textLight : COLORS.primary }
                            ]}>+{task.points} pts</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </WebContainer>
    );
  }

  // RENDER PASSO 2: UPLOAD E LEGENDA
  if (step === 'upload' && (selectedHabit || selectedTask)) {
    const habitInfo = selectedTask ? { title: selectedTask.title } : HABIT_LABELS[selectedHabit!];
    // Labels dos grupos selecionados para o resumo no passo 2
    const selectedGroupLabels = !selectedTask
      ? activeChallengesList.filter(i => selectedGroupIds.has(i.groupId)).map(i => i.groupName)
      : null;
    return (
      <WebContainer>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleReset} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Validar {habitInfo.title}</Text>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Card variant="default" style={styles.uploadCard}>
              <Text style={styles.uploadCardTitle}>Comprovação em Foto</Text>
              <Text style={styles.uploadCardSubtitle}>
                {selectedTask 
                  ? 'tire uma foto comprovando a realização da tarefa' 
                  : 'tire uma foto estudando, orando ou treinando'}
              </Text>

              {imageUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                  <TouchableOpacity 
                    style={styles.changeImageBtn}
                    onPress={handlePickImage}
                  >
                    <MaterialCommunityIcons name="camera-retake" size={20} color="#fff" />
                    <Text style={styles.changeImageText}>Trocar foto</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.uploadPlaceholderContainer}>
                  <MaterialCommunityIcons name="camera-plus-outline" size={48} color={COLORS.textLight} />
                  <Text style={styles.placeholderText}>Anexe sua foto de comprovação</Text>
                  
                  <View style={styles.uploadActionsRow}>
                    <Button 
                      title="Tirar Foto" 
                      variant="outline" 
                      size="sm" 
                      icon={<MaterialCommunityIcons name="camera" size={16} color={COLORS.primary} />}
                      onPress={handleTakePhoto}
                      style={styles.uploadActionBtn}
                    />
                    <Button 
                      title="Galeria" 
                      variant="outline" 
                      size="sm" 
                      icon={<MaterialCommunityIcons name="image" size={16} color={COLORS.primary} />}
                      onPress={handlePickImage}
                      style={styles.uploadActionBtn}
                    />
                  </View>
                  
                  <TouchableOpacity onPress={handleSimulatedPhoto} style={styles.simulatedLink}>
                    <Text style={styles.simulatedLinkText}>Simular foto do mock (para testes)</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Indicador de grupos para o post */}
              {selectedGroupLabels && selectedGroupLabels.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: SPACING.sm }}>
                  <MaterialCommunityIcons name="account-group" size={14} color={COLORS.textLight} />
                  <Text style={{ fontSize: FONTS.size.xs, color: COLORS.textLight, fontFamily: FONTS.family.body, flex: 1 }}>
                    Post irá para: {selectedGroupLabels.join(', ')}
                  </Text>
                </View>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.captionLabel}>Legenda / Devocional (Opcional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Compartilhe um aprendizado, versículo ou incentivo para o grupo..."
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                />
              </View>

              <Button
                title={`Confirmar e Postar${selectedGroupLabels && selectedGroupLabels.length > 1 ? ` (${selectedGroupLabels.length} grupos)` : ''}`}
                variant="secondary"
                size="lg"
                loading={loading}
                onPress={handleConfirmCheckin}
                style={{ marginTop: SPACING.sm }}
              />
            </Card>
          </ScrollView>
        </SafeAreaView>
      </WebContainer>
    );
  }

  // RENDER PASSO 3: SUCESSO!
  return (
    <WebContainer>
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successCircles}>
            <View style={[styles.successCircle, styles.circle1]} />
            <View style={[styles.successCircle, styles.circle2]} />
            <View style={styles.checkIconWrapper}>
              <MaterialCommunityIcons name="checkbox-marked-circle" size={80} color={COLORS.secondary} />
            </View>
          </View>

          <Text style={styles.successTitle}>Check-in Confirmado!</Text>
          
          <View style={styles.pointsEarnedCard}>
            <Text style={styles.pointsEarnedText}>Você ganhou</Text>
            <Text style={styles.pointsEarnedValue}>+{selectedTask ? selectedTask.points : 10} Pontos</Text>
            <Text style={styles.pointsEarnedSub}>para o round atual do desafio</Text>
          </View>

          <Text style={styles.successText}>
            Seu check-in foi publicado no Feed da comunidade. Continue assim, seu grupo se inspira na sua constância!
          </Text>

          <View style={styles.successActionButtons}>
            <Button
              title="Ir para o Feed do Grupo"
              variant="primary"
              size="lg"
              onPress={() => {
                handleReset();
                router.push({
                  pathname: '/feed',
                  params: { groupId: activeGroupId ?? '' },
                });
              }}
              style={styles.successBtn}
            />
            <Button
              title="Voltar ao Início"
              variant="outline"
              size="lg"
              onPress={() => {
                handleReset();
                router.push('/(tabs)');
              }}
              style={[styles.successBtn, { marginTop: SPACING.md }]}
            />
          </View>
        </View>
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
  backButton: {
    marginRight: SPACING.md,
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
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  instructionText: {
    fontSize: FONTS.size.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
    lineHeight: 22,
    fontFamily: FONTS.family.body,
  },
  habitButtonsContainer: {
    gap: SPACING.lg,
  },
  habitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1.5,
    ...SHADOWS.light,
  },
  habitIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  habitButtonDetails: {
    flex: 1,
  },
  habitButtonTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
  },
  habitButtonDesc: {
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  pointsBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  pointsText: {
    fontSize: FONTS.size.xs,
    fontWeight: FONTS.weight.bold,
  },
  uploadCard: {
    padding: SPACING.lg,
  },
  uploadCardTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    textAlign: 'center',
    fontFamily: FONTS.family.heading,
  },
  uploadCardSubtitle: {
    fontSize: FONTS.size.xs,
    color: COLORS.textLight,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: SPACING.lg,
    fontWeight: FONTS.weight.bold,
  },
  uploadPlaceholderContainer: {
    height: 200,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  placeholderText: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  uploadActionsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  uploadActionBtn: {
    minWidth: 100,
  },
  simulatedLink: {
    marginTop: SPACING.md,
  },
  simulatedLinkText: {
    fontSize: FONTS.size.xs,
    color: COLORS.secondary,
    textDecorationLine: 'underline',
    fontWeight: FONTS.weight.semibold,
  },
  imagePreviewContainer: {
    position: 'relative',
    height: 220,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  changeImageBtn: {
    position: 'absolute',
    bottom: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: SPACING.xs * 1.5,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  changeImageText: {
    color: '#fff',
    fontSize: FONTS.size.xs,
    fontWeight: FONTS.weight.semibold,
    marginLeft: SPACING.xs,
  },
  inputContainer: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  captionLabel: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.semibold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  textInput: {
    height: 80,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: FONTS.size.sm,
    color: COLORS.text,
    textAlignVertical: 'top',
  },
  confirmBtn: {
    width: '100%',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS.background,
  },
  successCircles: {
    position: 'relative',
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  successCircle: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
  },
  circle1: {
    width: 140,
    height: 140,
    borderColor: 'rgba(74, 101, 74, 0.15)',
  },
  circle2: {
    width: 110,
    height: 110,
    borderColor: 'rgba(74, 101, 74, 0.3)',
  },
  checkIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  successTitle: {
    fontSize: FONTS.size.xxl,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    marginBottom: SPACING.md,
    textAlign: 'center',
    fontFamily: FONTS.family.heading,
  },
  pointsEarnedCard: {
    backgroundColor: '#eefcf4',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74, 101, 74, 0.15)',
    marginBottom: SPACING.md,
  },
  pointsEarnedText: {
    fontSize: FONTS.size.xs,
    color: COLORS.secondary,
    fontWeight: FONTS.weight.semibold,
    textTransform: 'uppercase',
  },
  pointsEarnedValue: {
    fontSize: FONTS.size.xl,
    fontWeight: FONTS.weight.extraBold,
    color: COLORS.secondaryDark,
    marginVertical: 2,
  },
  pointsEarnedSub: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  successText: {
    fontSize: FONTS.size.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xxl,
    paddingHorizontal: SPACING.sm,
  },
  successActionButtons: {
    width: '100%',
  },
  successBtn: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    fontFamily: FONTS.family.heading,
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  extraTasksContainer: {
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  taskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(225, 222, 227, 0.4)',
    ...SHADOWS.light,
  },
  taskButtonCompleted: {
    backgroundColor: '#f6fbf6',
    borderColor: 'rgba(74, 101, 74, 0.2)',
  },
  taskButtonLocked: {
    backgroundColor: COLORS.surfaceVariant,
    borderColor: COLORS.border,
    opacity: 0.75,
  },
  taskIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  taskButtonDetails: {
    flex: 1,
  },
  taskButtonTitle: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    fontFamily: FONTS.family.heading,
  },
  taskButtonTitleCompleted: {
    color: COLORS.secondaryDark,
    textDecorationLine: 'line-through',
  },
  taskButtonDesc: {
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontFamily: FONTS.family.body,
  },
  warningText: {
    fontSize: FONTS.size.xs,
    color: COLORS.error,
    fontWeight: FONTS.weight.semibold,
    marginTop: 2,
    fontFamily: FONTS.family.body,
  },
  dividerLine: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.lg,
  },
  noChallengesCard: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.lg,
  },
  noChallengesText: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  noChallengesSubtext: {
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: SPACING.sm,
  },
  selectorContainer: {
    marginBottom: SPACING.lg,
  },
  selectorLabel: {
    fontSize: FONTS.size.xs,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
  },
  selectorScroll: {
    gap: SPACING.sm,
    paddingVertical: 2,
  },
  selectorButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs * 1.5,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectorButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  selectorButtonText: {
    fontSize: FONTS.size.xs,
    fontWeight: FONTS.weight.semibold,
    color: COLORS.textSecondary,
  },
  selectorButtonTextActive: {
    color: '#fff',
  },
  singleChallengeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(174, 143, 100, 0.08)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(174, 143, 100, 0.2)',
    marginBottom: SPACING.lg,
    gap: SPACING.xs,
  },
  singleChallengeText: {
    fontSize: FONTS.size.xs,
    color: COLORS.text,
  },
  habitButtonCompleted: {
    backgroundColor: '#f6fbf6',
    borderColor: 'rgba(74, 101, 74, 0.25)',
    opacity: 0.85,
  },
  habitButtonTitleCompleted: {
    color: COLORS.secondaryDark,
    textDecorationLine: 'line-through',
  },
  challengeChoiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    ...SHADOWS.light,
    marginBottom: SPACING.sm,
  },
  challengeChoiceIconBg: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.goldMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  challengeChoiceDetails: {
    flex: 1,
  },
  challengeChoiceGroup: {
    fontSize: 10,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  challengeChoiceTitle: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    marginTop: 2,
    fontFamily: FONTS.family.heading,
  },
  changeChallengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    ...SHADOWS.light,
  },
  changeChallengeHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  changeChallengeGroup: {
    fontSize: 10,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  changeChallengeTitle: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    fontFamily: FONTS.family.heading,
  },
  changeChallengeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondaryMuted,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    gap: 4,
  },
  changeChallengeButtonText: {
    fontSize: 10,
    fontWeight: FONTS.weight.bold,
    color: COLORS.secondaryDark,
  }
});
