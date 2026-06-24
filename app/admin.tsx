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
  ActivityIndicator,
  Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { WebContainer } from '../components/ui/WebContainer';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { useAuth } from '../context/auth';
import { MOCK_EXTRA_TASKS, ExtraTask } from '../constants/mock-data';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, SHADOWS } from '../constants/theme';

export default function AdminScreen() {
  const router = useRouter();
  const { challengeId, groupId } = useLocalSearchParams<{ challengeId?: string; groupId?: string }>();
  const { user } = useAuth();

  // Estados de carregamento
  const [loading, setLoading] = useState(true);
  const [loadingGroupDetails, setLoadingGroupDetails] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  // Dados administrativos
  const [adminGroups, setAdminGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  
  const [challenges, setChallenges] = useState<any[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  
  const [members, setMembers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<ExtraTask[]>([]);

  // Abas do painel: 'tasks' | 'members' | 'challenges'
  const [activeTab, setActiveTab] = useState<'tasks' | 'members' | 'challenges'>('tasks');

  // Estados de nova/editação de tarefa extra
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
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // 1. Carregar grupos em que o usuário logado é administrador
  useEffect(() => {
    if (!user) return;

    const loadAdminGroups = async () => {
      try {
        setLoading(true);
        const { data: memberData, error: memberError } = await supabase
          .from('group_members')
          .select('group_id, role, groups(*)')
          .eq('user_id', user.id)
          .eq('role', 'admin');

        if (memberError) throw memberError;

        const groupsList = (memberData || [])
          .map((item: any) => ({
            ...item.groups,
            role: item.role,
          }))
          .filter(g => g.id);

        setAdminGroups(groupsList);

        // Definir grupo selecionado por padrão
        if (groupsList.length > 0) {
          let defaultGroupId = groupsList[0].id;
          if (groupId && groupsList.some(g => g.id === groupId)) {
            defaultGroupId = groupId;
          } else if (challengeId) {
            // Buscar grupo dono do desafio
            const { data: chalData } = await supabase
              .from('challenges')
              .select('group_id')
              .eq('id', challengeId)
              .maybeSingle();
            
            if (chalData && groupsList.some(g => g.id === chalData.group_id)) {
              defaultGroupId = chalData.group_id;
            }
          }
          setSelectedGroupId(defaultGroupId);
        }
      } catch (err) {
        console.error('Erro ao buscar grupos do administrador:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAdminGroups();
  }, [user, groupId, challengeId]);

  // 2. Carregar desafios e participantes toda vez que o grupo selecionado mudar
  useEffect(() => {
    if (!selectedGroupId) return;

    const loadGroupDetails = async () => {
      try {
        setLoadingGroupDetails(true);
        
        // Buscar desafios do grupo
        const challengesData = await api.getGroupChallenges(selectedGroupId);
        setChallenges(challengesData);

        // Selecionar desafio padrão
        let defaultChallengeId: string | null = null;
        if (challengesData.length > 0) {
          defaultChallengeId = challengesData[0].id;
          if (challengeId && challengesData.some(c => c.id === challengeId)) {
            defaultChallengeId = challengeId;
          }
        }
        setSelectedChallengeId(defaultChallengeId);

        // Buscar membros do grupo
        const membersData = await api.getGroupMembers(selectedGroupId);
        setMembers(membersData);

      } catch (err) {
        console.error('Erro ao carregar detalhes do grupo administrador:', err);
      } finally {
        setLoadingGroupDetails(false);
      }
    };

    loadGroupDetails();
  }, [selectedGroupId, challengeId]);

  // 3. Carregar tarefas do desafio ativo selecionado
  useEffect(() => {
    if (!selectedChallengeId) {
      setTasks([]);
      return;
    }

    const loadChallengeTasks = async () => {
      try {
        const isMock = selectedChallengeId.startsWith('chal');
        if (isMock) {
          setTasks(MOCK_EXTRA_TASKS[selectedChallengeId] || []);
        } else {
          // Buscar tarefas do Supabase
          const { data: tasksData, error: tasksError } = await supabase
            .from('tasks')
            .select('*')
            .eq('challenge_id', selectedChallengeId);

          if (tasksError) throw tasksError;

          // Buscar check-ins do round ativo para mapear quem concluiu
          const { data: roundsData } = await supabase
            .from('rounds')
            .select('id')
            .eq('challenge_id', selectedChallengeId);
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

          const parsedTasks: ExtraTask[] = (tasksData || []).map((t: any) => {
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
        }
      } catch (err) {
        console.error('Erro ao buscar tarefas:', err);
        setTasks([]);
      }
    };

    loadChallengeTasks();
  }, [selectedChallengeId]);

  // Ações de Participantes
  const handleUpdateMemberRole = async (memberId: string, name: string, currentRole: 'admin' | 'member') => {
    if (!selectedGroupId || !user) return;
    if (memberId === user.id) {
      Alert.alert('Operação Negada', 'Você não pode rebaixar seu próprio cargo administrativo.');
      return;
    }

    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    const cargoTitle = newRole === 'admin' ? 'Administrador' : 'Membro comum';

    Alert.alert(
      'Alterar Cargo',
      `Deseja mesmo alterar o cargo de ${name} para ${cargoTitle}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Alterar', 
          onPress: async () => {
            setLoadingAction(true);
            try {
              const { error } = await supabase
                .from('group_members')
                .update({ role: newRole })
                .eq('group_id', selectedGroupId)
                .eq('user_id', memberId);

              if (error) throw error;
              
              Alert.alert('Sucesso', 'Cargo atualizado com sucesso!');
              // Recarregar lista de membros
              const membersData = await api.getGroupMembers(selectedGroupId);
              setMembers(membersData);
            } catch (err: any) {
              Alert.alert('Erro', err.message || 'Falha ao atualizar cargo.');
            } finally {
              setLoadingAction(false);
            }
          }
        }
      ]
    );
  };

  const handleRemoveMember = async (memberId: string, name: string) => {
    if (!selectedGroupId || !user) return;
    if (memberId === user.id) {
      Alert.alert('Operação Negada', 'Você não pode se remover do grupo por este painel. Use a área de membros geral.');
      return;
    }

    Alert.alert(
      'Remover do Grupo',
      `Você tem certeza de que deseja remover ${name} do grupo? O participante perderá o acesso às atividades e rankings do grupo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Remover', 
          style: 'destructive',
          onPress: async () => {
            setLoadingAction(true);
            try {
              const { error } = await supabase
                .from('group_members')
                .delete()
                .eq('group_id', selectedGroupId)
                .eq('user_id', memberId);

              if (error) throw error;
              
              Alert.alert('Sucesso', 'Participante removido do grupo!');
              // Recarregar lista de membros
              const membersData = await api.getGroupMembers(selectedGroupId);
              setMembers(membersData);
            } catch (err: any) {
              Alert.alert('Erro', err.message || 'Falha ao remover participante.');
            } finally {
              setLoadingAction(false);
            }
          }
        }
      ]
    );
  };

  // Ações de Tarefas Extras
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
    if (!selectedChallengeId) {
      Alert.alert('Erro', 'Nenhum desafio ativo selecionado para publicar a tarefa.');
      return;
    }

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

    setLoadingAction(true);
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

      const isMock = selectedChallengeId.startsWith('chal');
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
          MOCK_EXTRA_TASKS[selectedChallengeId] = (MOCK_EXTRA_TASKS[selectedChallengeId] || []).map(t => {
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
            challenge_id: selectedChallengeId,
            title: title,
            description: desc,
            type: type,
            points: parseInt(points) || 30,
            expires_at: isoExpiresAt,
            completed_by: [],
            active: true,
            ...((type === 'presence' || type === 'punctuality') ? { start_time: startTime } : {})
          };

          MOCK_EXTRA_TASKS[selectedChallengeId] = [newTask, ...(MOCK_EXTRA_TASKS[selectedChallengeId] || [])];
          setTasks(prev => [newTask, ...prev]);
        } else {
          // Gravar no banco de dados do Supabase
          const { data, error } = await supabase
            .from('tasks')
            .insert({
              challenge_id: selectedChallengeId,
              description: JSON.stringify(payload),
              points: parseInt(points) || 30,
              type: 'other'
            })
            .select()
            .single();

          if (error) throw error;

          const newTask: ExtraTask = {
            id: data.id,
            challenge_id: selectedChallengeId,
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

        Alert.alert('Sucesso', 'Nova tarefa extra foi publicada para os membros!');
      }
      
      // Resetar formulário
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
      setLoadingAction(false);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    Alert.alert(
      'Desativar Tarefa',
      'Deseja mesmo desativar esta tarefa extra? Ela sumirá da tela de check-in dos membros.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Desativar', 
          style: 'destructive', 
          onPress: async () => {
            if (!selectedChallengeId) return;
            const isMock = selectedChallengeId.startsWith('chal');
            setLoadingAction(true);
            try {
              if (isMock) {
                MOCK_EXTRA_TASKS[selectedChallengeId] = (MOCK_EXTRA_TASKS[selectedChallengeId] || []).map(t => {
                  if (t.id === taskId) return { ...t, active: false };
                  return t;
                });
                setTasks(prev => prev.map(t => {
                  if (t.id === taskId) return { ...t, active: false };
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
                    if (t.id === taskId) return { ...t, active: false };
                    return t;
                  }));
                }
              }
              Alert.alert('Sucesso', 'Tarefa desativada com sucesso.');
            } catch (e: any) {
              console.error(e);
              Alert.alert('Erro', 'Não foi possível desativar a tarefa.');
            } finally {
              setLoadingAction(false);
            }
          } 
        }
      ]
    );
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

  // Se o usuário não administrar nenhum grupo
  if (adminGroups.length === 0) {
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
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="shield-lock-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>Acesso Restrito</Text>
            <Text style={styles.emptySubtitle}>
              Você não possui grupos nos quais seja o administrador principal. Crie um grupo no Início para gerenciar.
            </Text>
            <Button
              title="Voltar ao Início"
              variant="primary"
              onPress={() => router.replace('/(tabs)')}
              style={{ width: 200, marginTop: SPACING.md }}
            />
          </View>
        </SafeAreaView>
      </WebContainer>
    );
  }

  const activeGroup = adminGroups.find(g => g.id === selectedGroupId);

  return (
    <WebContainer>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Painel do Admin</Text>
          <View style={{ width: 24 }} />
        </View>

        {loadingAction && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.secondary} />
          </View>
        )}

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* SELETOR DE GRUPOS */}
          <View style={styles.groupSelectorContainer}>
            <Text style={styles.selectorLabel}>Grupo Administrado:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupSelectorScroll}>
              {adminGroups.map(g => (
                <TouchableOpacity
                  key={g.id}
                  style={[
                    styles.groupSelectBadge,
                    selectedGroupId === g.id && styles.groupSelectBadgeActive
                  ]}
                  onPress={() => {
                    setSelectedGroupId(g.id);
                    handleCancelEdit();
                  }}
                >
                  <Text style={[
                    styles.groupSelectBadgeText,
                    selectedGroupId === g.id && styles.groupSelectBadgeTextActive
                  ]}>
                    {g.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* TAB BAR DO PAINEL */}
          <View style={styles.tabBar}>
            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'tasks' && styles.tabItemActive]}
              onPress={() => setActiveTab('tasks')}
            >
              <MaterialCommunityIcons 
                name="star-outline" 
                size={20} 
                color={activeTab === 'tasks' ? COLORS.secondary : COLORS.textLight} 
              />
              <Text style={[styles.tabText, activeTab === 'tasks' && styles.tabTextActive]}>Tarefas Extras</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'members' && styles.tabItemActive]}
              onPress={() => setActiveTab('members')}
            >
              <MaterialCommunityIcons 
                name="account-group-outline" 
                size={20} 
                color={activeTab === 'members' ? COLORS.secondary : COLORS.textLight} 
              />
              <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>Participantes</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'challenges' && styles.tabItemActive]}
              onPress={() => setActiveTab('challenges')}
            >
              <MaterialCommunityIcons 
                name="trophy-outline" 
                size={20} 
                color={activeTab === 'challenges' ? COLORS.secondary : COLORS.textLight} 
              />
              <Text style={[styles.tabText, activeTab === 'challenges' && styles.tabTextActive]}>Desafios</Text>
            </TouchableOpacity>
          </View>

          {loadingGroupDetails ? (
            <ActivityIndicator size="large" color={COLORS.secondary} style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* ABA: TAREFAS EXTRAS */}
              {activeTab === 'tasks' && (
                <View>
                  {/* Seletor de desafios se houver mais de um */}
                  {challenges.length > 0 ? (
                    <>
                      {challenges.length > 1 && (
                        <View style={styles.challengeSelectorContainer}>
                          <Text style={styles.selectorLabel}>Desafio Vinculado:</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.challengeSelectorScroll}>
                            {challenges.map(c => (
                              <TouchableOpacity
                                key={c.id}
                                style={[
                                  styles.challengeSelectBadge,
                                  selectedChallengeId === c.id && styles.challengeSelectBadgeActive
                                ]}
                                onPress={() => {
                                  setSelectedChallengeId(c.id);
                                  handleCancelEdit();
                                }}
                              >
                                <Text style={[
                                  styles.challengeSelectBadgeText,
                                  selectedChallengeId === c.id && styles.challengeSelectBadgeTextActive
                                ]}>
                                  {c.title}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}

                      {/* FORMULÁRIO DE TAREFA EXTRA */}
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
                        {tasks.filter(task => task.active !== false).length === 0 ? (
                          <Card variant="flat" style={styles.emptyTabCard}>
                            <MaterialCommunityIcons name="star-off-outline" size={24} color={COLORS.textLight} />
                            <Text style={styles.emptyTabText}>Nenhuma tarefa extra ativa.</Text>
                          </Card>
                        ) : (
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
                                    {task.completed_by?.length || 0} membros completaram
                                  </Text>
                                </View>
                              </Card>
                            ))}
                          </View>
                        )}
                      </View>
                    </>
                  ) : (
                    <Card variant="flat" style={styles.emptyTabCard}>
                      <MaterialCommunityIcons name="trophy-outline" size={32} color={COLORS.textLight} style={{ marginBottom: SPACING.sm }} />
                      <Text style={styles.emptyTabTitle}>Nenhum Desafio Ativo</Text>
                      <Text style={styles.emptyTabSubtitle}>
                        Você precisa criar um desafio antes de gerenciar tarefas extras.
                      </Text>
                      <Button
                        title="Criar Desafio"
                        variant="secondary"
                        size="sm"
                        onPress={() => router.push({ pathname: '/create-challenge', params: { groupId: selectedGroupId } })}
                        style={{ marginTop: SPACING.sm, width: 150 }}
                      />
                    </Card>
                  )}
                </View>
              )}

              {/* ABA: GERENCIAR PARTICIPANTES */}
              {activeTab === 'members' && (
                <View style={styles.listSection}>
                  <Text style={styles.sectionTitle}>Participantes do Grupo ({members.length})</Text>
                  
                  <Card variant="default" style={{ paddingHorizontal: SPACING.md, paddingVertical: 0 }}>
                    {members.map((member, index) => (
                      <View 
                        key={member.user_id} 
                        style={[
                          styles.memberRow,
                          index === members.length - 1 && { borderBottomWidth: 0 }
                        ]}
                      >
                        <View style={styles.memberInfo}>
                          <Avatar source={member.avatar_url} name={member.full_name} size={38} />
                          <View style={{ marginLeft: SPACING.sm, flex: 1 }}>
                            <Text style={styles.memberName} numberOfLines={1}>{member.full_name}</Text>
                            <Text style={styles.memberEmail} numberOfLines={1}>{member.email}</Text>
                          </View>
                        </View>

                        <View style={styles.memberActions}>
                          <TouchableOpacity
                            style={[
                              styles.actionBadgeBtn,
                              member.role === 'admin' ? styles.actionBadgeAdmin : styles.actionBadgeMember
                            ]}
                            onPress={() => handleUpdateMemberRole(member.user_id, member.full_name, member.role)}
                          >
                            <Text style={[
                              styles.actionBadgeText,
                              member.role === 'admin' ? styles.actionBadgeTextAdmin : styles.actionBadgeTextMember
                            ]}>
                              {member.role === 'admin' ? 'Admin' : 'Membro'}
                            </Text>
                          </TouchableOpacity>

                          {member.user_id !== user?.id && (
                            <TouchableOpacity 
                              onPress={() => handleRemoveMember(member.user_id, member.full_name)}
                              style={styles.kickBtn}
                            >
                              <MaterialCommunityIcons name="account-remove" size={18} color={COLORS.error} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))}
                  </Card>
                </View>
              )}

              {/* ABA: LISTAGEM DE DESAFIOS */}
              {activeTab === 'challenges' && (
                <View style={styles.listSection}>
                  <View style={styles.challengesHeaderRow}>
                    <Text style={styles.sectionTitle}>Histórico de Desafios</Text>
                    <Button
                      title="Novo Desafio"
                      variant="secondary"
                      size="sm"
                      icon={<MaterialCommunityIcons name="plus" size={14} color="#fff" />}
                      onPress={() => router.push({ pathname: '/create-challenge', params: { groupId: selectedGroupId } })}
                    />
                  </View>

                  {challenges.length === 0 ? (
                    <Card variant="flat" style={styles.emptyTabCard}>
                      <MaterialCommunityIcons name="trophy-outline" size={32} color={COLORS.textLight} style={{ marginBottom: SPACING.sm }} />
                      <Text style={styles.emptyTabTitle}>Nenhum desafio registrado</Text>
                      <Text style={styles.emptyTabSubtitle}>Inicie o primeiro desafio para motivar os membros!</Text>
                    </Card>
                  ) : (
                    <View style={styles.challengesList}>
                      {challenges.map(c => {
                        const now = new Date();
                        const isActive = new Date(c.end_date) >= now;
                        return (
                          <Card key={c.id} variant="default" style={styles.challengeCard}>
                            <View style={styles.challengeCardHeader}>
                              <View style={styles.challengeCardTitleRow}>
                                <MaterialCommunityIcons 
                                  name="trophy" 
                                  size={18} 
                                  color={isActive ? COLORS.gold : COLORS.textLight} 
                                />
                                <Text style={styles.challengeCardTitle} numberOfLines={1}>{c.title}</Text>
                              </View>
                              <View style={[
                                styles.challengeStatusBadge,
                                { backgroundColor: isActive ? COLORS.secondaryMuted : COLORS.surfaceVariant }
                              ]}>
                                <Text style={[
                                  styles.challengeStatusText,
                                  { color: isActive ? COLORS.secondary : COLORS.textLight }
                                ]}>
                                  {isActive ? 'Ativo' : 'Encerrado'}
                                </Text>
                              </View>
                            </View>
                            
                            <Text style={styles.challengeCardDates}>
                              Duração: {new Date(c.start_date).toLocaleDateString('pt-BR')} até {new Date(c.end_date).toLocaleDateString('pt-BR')}
                            </Text>

                            <TouchableOpacity 
                              style={styles.challengeLink}
                              onPress={() => router.push({ pathname: '/(tabs)/challenge', params: { challengeId: c.id } })}
                            >
                              <Text style={styles.challengeLinkText}>Ver detalhes do desafio</Text>
                              <MaterialCommunityIcons name="arrow-right" size={14} color={COLORS.secondary} />
                            </TouchableOpacity>
                          </Card>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* DADOS DO GRUPO (BOTÃO DE REDIRECIONAMENTO RÁPIDO) */}
              {activeGroup && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.groupSettingsRow}
                  onPress={() => router.push({ pathname: '/edit-group', params: { groupId: activeGroup.id } })}
                >
                  <MaterialCommunityIcons name="cog-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.groupSettingsText}>Editar Nome/Descrição ou Excluir o Grupo</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              )}
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
  
  // Seletor de Grupos/Desafios
  groupSelectorContainer: {
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  selectorLabel: {
    fontSize: 10,
    fontFamily: FONTS.family.bodyBold,
    color: COLORS.textLight,
    textTransform: 'uppercase',
    marginBottom: SPACING.xs,
    letterSpacing: 0.5,
  },
  groupSelectorScroll: {
    gap: SPACING.xs,
    paddingVertical: 2,
  },
  groupSelectBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  groupSelectBadgeActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  groupSelectBadgeText: {
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    fontFamily: FONTS.family.bodySemibold,
  },
  groupSelectBadgeTextActive: {
    color: '#fff',
  },

  challengeSelectorContainer: {
    marginBottom: SPACING.md,
  },
  challengeSelectorScroll: {
    gap: SPACING.xs,
  },
  challengeSelectBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceVariant,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  challengeSelectBadgeActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  challengeSelectBadgeText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: FONTS.family.bodyMedium,
  },
  challengeSelectBadgeTextActive: {
    color: '#fff',
    fontFamily: FONTS.family.bodySemibold,
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: SPACING.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: COLORS.secondary,
  },
  tabText: {
    fontSize: 12,
    fontFamily: FONTS.family.bodySemibold,
    color: COLORS.textLight,
  },
  tabTextActive: {
    color: COLORS.secondary,
    fontFamily: FONTS.family.bodyBold,
  },

  // Empty state para abas
  emptyTabCard: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
    backgroundColor: COLORS.surface,
  },
  emptyTabTitle: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.heading,
    color: COLORS.primary,
    fontWeight: FONTS.weight.bold,
    marginTop: SPACING.xs,
  },
  emptyTabSubtitle: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  emptyTabText: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  // Formulário Tarefas
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

  // Seções gerais
  listSection: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    fontFamily: FONTS.family.heading,
    marginBottom: SPACING.md,
  },
  tasksList: {
    gap: SPACING.md,
  },

  // Cards de Tarefa
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
  },

  // Participantes (Membros)
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberName: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bodySemibold,
    color: COLORS.primary,
  },
  memberEmail: {
    fontSize: 10,
    color: COLORS.textLight,
    fontFamily: FONTS.family.body,
    marginTop: 2,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  actionBadgeBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.md,
  },
  actionBadgeAdmin: {
    backgroundColor: COLORS.secondaryMuted,
  },
  actionBadgeMember: {
    backgroundColor: COLORS.surfaceVariant,
  },
  actionBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.family.bodyBold,
  },
  actionBadgeTextAdmin: {
    color: COLORS.secondary,
  },
  actionBadgeTextMember: {
    color: COLORS.textSecondary,
  },
  kickBtn: {
    padding: 4,
  },

  // Desafios
  challengesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  challengesList: {
    gap: SPACING.md,
  },
  challengeCard: {
    padding: SPACING.md,
  },
  challengeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  challengeCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flex: 1,
  },
  challengeCardTitle: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.heading,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
  },
  challengeStatusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.md,
  },
  challengeStatusText: {
    fontSize: 9,
    fontFamily: FONTS.family.bodyBold,
  },
  challengeCardDates: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  challengeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  challengeLinkText: {
    fontSize: 11,
    fontFamily: FONTS.family.bodySemibold,
    color: COLORS.secondary,
  },

  // Redirecionamento de configurações rápidas do grupo
  groupSettingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.lg,
    ...SHADOWS.light,
  },
  groupSettingsText: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bodySemibold,
    color: COLORS.primary,
  },

  // Overlays & Estilizações da Tela de Acesso Negado
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: SPACING.md,
    marginTop: 80,
  },
  emptyTitle: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.heading,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
  },
  emptySubtitle: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  }
});
