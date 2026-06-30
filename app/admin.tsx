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
import { MOCK_EXTRA_TASKS, ExtraTask, MOCK_CHALLENGES, MOCK_ROUNDS, MOCK_RANKINGS, CHALLENGE_REQUESTS, loadPersistedMockData, savePersistedMockData, getChallengeRequests, saveChallengeRequests, ChallengeRequest, getMockRankings, saveMockRankings } from '../constants/mock-data';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, SHADOWS } from '../constants/theme';

function formatDateForInput(isoDateStr: string): string {
  if (!isoDateStr) return '';
  const parts = isoDateStr.split('T')[0].split('-');
  if (parts.length !== 3) return isoDateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

function parseDate(dateStr: string): Date | null {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
}

export default function AdminScreen() {
  const router = useRouter();
  const { challengeId, groupId, tab } = useLocalSearchParams<{ challengeId?: string; groupId?: string; tab?: string }>();
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
  const [challengeRequests, setChallengeRequests] = useState<ChallengeRequest[]>([]);

  // Abas do painel: 'group' | 'tasks' | 'members' | 'challenges' | 'approvals'
  const [activeTab, setActiveTab] = useState<'group' | 'tasks' | 'members' | 'challenges' | 'approvals'>('group');

  // Ajusta a aba padrão ao iniciar se for informada na URL
  useEffect(() => {
    if (tab && ['group', 'tasks', 'members', 'challenges', 'approvals'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [tab]);

  // Estados de Criar Grupo Inline
  const [showCreateGroupForm, setShowCreateGroupForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  // Estados de Editar Grupo Selecionado
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');

  // Estados de Editar Desafio Selecionado
  const [challengeName, setChallengeName] = useState('');
  const [challengeStartDate, setChallengeStartDate] = useState('');
  const [challengeEndDate, setChallengeEndDate] = useState('');
  const [challengeRules, setChallengeRules] = useState('');

  // Estados de nova/edição de tarefa extra
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
        const reqs = await getChallengeRequests();
        setChallengeRequests(reqs);
        await getMockRankings();
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

        // Injetar grupo mockado de testes locais APENAS para o Renato/mock para viabilizar testes no MVP
        const isRenatoMock = user.email === 'renato@trino.app' || user.id === 'user_1';
        if (isRenatoMock) {
          const alreadyHasMock = groupsList.some(g => g.id === 'group_1');
          if (!alreadyHasMock) {
            groupsList.push({
              id: 'group_1',
              name: 'Célula Videira (Mock)',
              description: 'Grupo da nossa célula para crescer espiritualmente e manter o corpo ativo na fé!',
              role: 'admin',
            });
          }
        }

        setAdminGroups(groupsList);

        // Definir grupo selecionado por padrão
        if (groupsList.length > 0) {
          let defaultGroupId = groupsList[0].id;
          if (groupId && groupsList.some(g => g.id === groupId)) {
            defaultGroupId = groupId;
          } else if (challengeId) {
            // Buscar grupo dono do desafio
            if (challengeId.startsWith('chal')) {
              defaultGroupId = 'group_1';
            } else {
              const { data: chalData } = await supabase
                .from('challenges')
                .select('group_id')
                .eq('id', challengeId)
                .maybeSingle();
              
              if (chalData && groupsList.some(g => g.id === chalData.group_id)) {
                defaultGroupId = chalData.group_id;
              }
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

  // 2. Sincronizar campos de edição com o grupo selecionado
  const activeGroup = adminGroups.find(g => g.id === selectedGroupId);

  useEffect(() => {
    if (activeGroup) {
      setGroupName(activeGroup.name);
      setGroupDesc(activeGroup.description || '');
    } else {
      setGroupName('');
      setGroupDesc('');
    }
  }, [selectedGroupId, adminGroups]);

  // Sincronizar campos de edição com o desafio selecionado
  const activeChallenge = challenges.find(c => c.id === selectedChallengeId);

  useEffect(() => {
    if (activeChallenge) {
      setChallengeName(activeChallenge.title || activeChallenge.name || '');
      setChallengeStartDate(formatDateForInput(activeChallenge.start_date));
      setChallengeEndDate(formatDateForInput(activeChallenge.end_date));
      setChallengeRules(activeChallenge.rules || '');
    } else {
      setChallengeName('');
      setChallengeStartDate('');
      setChallengeEndDate('');
      setChallengeRules('');
    }
  }, [selectedChallengeId, challenges]);

  // 3. Carregar desafios e participantes toda vez que o grupo selecionado mudar
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

  // 4. Carregar tarefas do desafio ativo selecionado
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

  // Ações de CRUD de Grupo
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('Erro', 'Por favor, informe o nome do grupo.');
      return;
    }
    
    if (!user) return;

    setLoadingAction(true);
    try {
      // 1. Verificar se o nome alterado já existe
      const { data: existingGroup } = await supabase
        .from('groups')
        .select('id')
        .ilike('name', newGroupName.trim())
        .maybeSingle();

      if (existingGroup) {
        Alert.alert('Erro', 'Já existe um grupo com este nome.');
        setLoadingAction(false);
        return;
      }

      // 2. Inserir o grupo
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({ name: newGroupName.trim(), description: newGroupDesc.trim() })
        .select()
        .single();

      if (groupError) throw groupError;

      // 3. Adicionar o criador como admin
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          user_id: user.id,
          group_id: group.id,
          role: 'admin'
        });

      if (memberError) throw memberError;

      Alert.alert('Sucesso', 'Grupo criado com sucesso!');

      // Resetar form
      setNewGroupName('');
      setNewGroupDesc('');
      setShowCreateGroupForm(false);

      // Recarregar grupos
      const { data: memberData } = await supabase
        .from('group_members')
        .select('group_id, role, groups(*)')
        .eq('user_id', user.id)
        .eq('role', 'admin');

      const groupsList = (memberData || [])
        .map((item: any) => ({
          ...item.groups,
          role: item.role,
        }))
        .filter(g => g.id);

      setAdminGroups(groupsList);
      setSelectedGroupId(group.id);
      setActiveTab('group');

    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Erro ao criar grupo.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleUpdateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Erro', 'Por favor, informe o nome do grupo.');
      return;
    }

    if (!selectedGroupId || !user) return;

    setLoadingAction(true);
    try {
      // 1. Verificar nome existente
      const { data: existingGroup } = await supabase
        .from('groups')
        .select('id')
        .ilike('name', groupName.trim())
        .neq('id', selectedGroupId)
        .maybeSingle();

      if (existingGroup) {
        Alert.alert('Erro', 'Já existe um grupo com este nome.');
        setLoadingAction(false);
        return;
      }

      // 2. Atualizar no banco
      const { error: updateError } = await supabase
        .from('groups')
        .update({ name: groupName.trim(), description: groupDesc.trim() })
        .eq('id', selectedGroupId);

      if (updateError) throw updateError;

      Alert.alert('Sucesso', 'Dados do grupo atualizados com sucesso!');

      // Recarregar os grupos administrados
      const { data: memberData } = await supabase
        .from('group_members')
        .select('group_id, role, groups(*)')
        .eq('user_id', user.id)
        .eq('role', 'admin');

      const groupsList = (memberData || [])
        .map((item: any) => ({
          ...item.groups,
          role: item.role,
        }))
        .filter(g => g.id);

      setAdminGroups(groupsList);

    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Erro ao salvar alterações.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroupId || !user) return;

    const performDelete = async () => {
      setLoadingAction(true);
      try {
        const { error: deleteError } = await supabase
          .from('groups')
          .delete()
          .eq('id', selectedGroupId);

        if (deleteError) throw deleteError;

        Alert.alert('Sucesso', 'Grupo excluído com sucesso!');

        // Recarregar lista de grupos
        const { data: memberData } = await supabase
          .from('group_members')
          .select('group_id, role, groups(*)')
          .eq('user_id', user.id)
          .eq('role', 'admin');

        const groupsList = (memberData || [])
          .map((item: any) => ({
            ...item.groups,
            role: item.role,
          }))
          .filter(g => g.id);

        setAdminGroups(groupsList);

        if (groupsList.length > 0) {
          setSelectedGroupId(groupsList[0].id);
          setActiveTab('group');
        } else {
          setSelectedGroupId(null);
        }

      } catch (e: any) {
        Alert.alert('Erro', e.message || 'Erro ao excluir grupo.');
      } finally {
        setLoadingAction(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmFirst = window.confirm('ATENÇÃO: Você tem certeza absoluta de que deseja excluir este grupo? Todos os desafios, rounds, check-ins e membros serão excluídos para sempre. Esta ação é irreversível!');
      if (confirmFirst) {
        const confirmSecond = window.confirm('CONFIRMAÇÃO FINAL: Deseja mesmo deletar o grupo? Pressione OK para excluir definitivamente.');
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
                'Você tem certeza absoluta? Esta ação NÃO pode ser desfeita.',
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

  const handleUpdateChallenge = async () => {
    if (!challengeName.trim()) {
      Alert.alert('Erro', 'Por favor, informe o nome do desafio.');
      return;
    }

    if (!selectedChallengeId || !selectedGroupId || !user) return;

    const start = parseDate(challengeStartDate);
    const end = parseDate(challengeEndDate);
    if (!start || !end) {
      Alert.alert('Erro', 'Datas inválidas. Use o formato DD/MM/AAAA.');
      return;
    }

    setLoadingAction(true);
    try {
      const isMock = selectedChallengeId.startsWith('chal');
      if (isMock) {
        // Mock Update
        const existingChallenge = MOCK_CHALLENGES[selectedChallengeId];
        if (existingChallenge) {
          existingChallenge.name = challengeName.trim();
          existingChallenge.rules = challengeRules;
          existingChallenge.start_date = start.toISOString().split('T')[0];
          existingChallenge.end_date = end.toISOString().split('T')[0];

          // Atualizar lista local
          setChallenges(prev => prev.map(c => c.id === selectedChallengeId ? { ...c, name: challengeName.trim(), rules: challengeRules, start_date: existingChallenge.start_date, end_date: existingChallenge.end_date } : c));
        }
      } else {
        // Supabase Update
        const { error: challengeError } = await supabase
          .from('challenges')
          .update({
            title: challengeName.trim(),
            rules: challengeRules,
            start_date: start.toISOString().split('T')[0],
            end_date: end.toISOString().split('T')[0],
          })
          .eq('id', selectedChallengeId);

        if (challengeError) throw challengeError;

        // Atualizar lista local
        setChallenges(prev => prev.map(c => c.id === selectedChallengeId ? { ...c, title: challengeName.trim(), rules: challengeRules, start_date: start.toISOString().split('T')[0], end_date: end.toISOString().split('T')[0] } : c));
      }

      Alert.alert('Sucesso', 'Configurações do desafio atualizadas com sucesso!');
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Erro ao atualizar o desafio.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteChallenge = async () => {
    if (!selectedChallengeId || !selectedGroupId || !user) return;

    const performDelete = async () => {
      setLoadingAction(true);
      try {
        const isMock = selectedChallengeId.startsWith('chal');
        if (isMock) {
          // Mock Delete
          delete MOCK_CHALLENGES[selectedChallengeId];
          delete MOCK_ROUNDS[selectedChallengeId];
          delete MOCK_RANKINGS[selectedChallengeId];
          delete MOCK_EXTRA_TASKS[selectedChallengeId];
        } else {
          // Supabase Delete
          const { data: roundsData } = await supabase
            .from('rounds')
            .select('id')
            .eq('challenge_id', selectedChallengeId);
          
          const roundIds = (roundsData || []).map(r => r.id);
          if (roundIds.length > 0) {
            // Deletar checkins primeiro devido às chaves estrangeiras
            await supabase.from('checkins').delete().in('round_id', roundIds);
          }

          // Deletar rounds
          await supabase.from('rounds').delete().eq('challenge_id', selectedChallengeId);
          
          // Deletar tarefas extras
          await supabase.from('tasks').delete().eq('challenge_id', selectedChallengeId);

          // Deletar o desafio principal
          const { error } = await supabase
            .from('challenges')
            .delete()
            .eq('id', selectedChallengeId);

          if (error) throw error;
        }

        Alert.alert('Sucesso', 'Desafio excluído com sucesso!');

        // Atualizar lista de desafios do grupo
        const challengesData = await api.getGroupChallenges(selectedGroupId);
        setChallenges(challengesData);

        if (challengesData.length > 0) {
          setSelectedChallengeId(challengesData[0].id);
        } else {
          setSelectedChallengeId(null);
        }

      } catch (e: any) {
        Alert.alert('Erro', e.message || 'Erro ao excluir o desafio.');
      } finally {
        setLoadingAction(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmFirst = window.confirm(`ATENÇÃO: Tem certeza de que deseja excluir permanentemente o desafio "${challengeName}"? Todos os rounds, check-ins e pontos deste desafio serão excluídos de forma irreversível!`);
      if (confirmFirst) {
        const confirmSecond = window.confirm('CONFIRMAÇÃO FINAL: Deseja mesmo deletar o desafio? Pressione OK para excluir definitivamente.');
        if (confirmSecond) {
          await performDelete();
        }
      }
    } else {
      Alert.alert(
        'Excluir Desafio',
        `ATENÇÃO: Todos os rounds, check-ins e pontos deste desafio serão excluídos para sempre. Deseja mesmo excluir o desafio "${challengeName}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Excluir Definitivamente', 
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Confirmação Final',
                'Você tem certeza absoluta? Esta ação NÃO pode ser desfeita.',
                [
                  { text: 'Voltar', style: 'cancel' },
                  { text: 'Sim, Deletar Desafio', style: 'destructive', onPress: performDelete }
                ]
              );
            }
          }
        ]
      );
    }
  };

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
      Alert.alert('Operação Negada', 'Você não pode se banir do grupo por este painel.');
      return;
    }

    Alert.alert(
      'Banir do Grupo',
      `Você tem certeza de que deseja banir ${name} do grupo? O participante perderá permanentemente o acesso às atividades e rankings deste grupo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Banir', 
          style: 'destructive',
          onPress: async () => {
            setLoadingAction(true);
            try {
              const isMock = selectedGroupId.startsWith('group');
              if (isMock) {
                // Remover o participante do ranking mockado
                const challengeId = selectedGroupId === 'group_1' ? 'chal_1' : 'chal_2';
                if (MOCK_RANKINGS[challengeId]) {
                  MOCK_RANKINGS[challengeId] = MOCK_RANKINGS[challengeId].filter(m => m.user_id !== memberId);
                }
              } else {
                // Banco de dados real do Supabase
                const { error } = await supabase
                  .from('group_members')
                  .delete()
                  .eq('group_id', selectedGroupId)
                  .eq('user_id', memberId);

                if (error) throw error;
              }
              
              Alert.alert('Sucesso', 'Participante banido com sucesso!');
              // Recarregar lista de membros
              const membersData = await api.getGroupMembers(selectedGroupId);
              setMembers(membersData);
            } catch (err: any) {
              Alert.alert('Erro', err.message || 'Falha ao banir participante.');
            } finally {
              setLoadingAction(false);
            }
          }
        }
      ]
    );
  };

  const handleApproveRequest = async (requestId: string, approve: boolean) => {
    const updatedRequests = challengeRequests.map((r: any) => {
      if (r.id === requestId) {
        return { ...r, status: approve ? 'approved' : 'declined' };
      }
      return r;
    });

    const targetRequest = challengeRequests.find((r: any) => r.id === requestId);
    if (!targetRequest) return;

    if (approve) {
      // Adicionar o participante no MOCK_RANKINGS do desafio
      if (!MOCK_RANKINGS[targetRequest.challenge_id]) {
        MOCK_RANKINGS[targetRequest.challenge_id] = [];
      }
      
      const alreadyInRank = MOCK_RANKINGS[targetRequest.challenge_id].some(m => m.user_id === targetRequest.user_id);
      if (!alreadyInRank) {
        MOCK_RANKINGS[targetRequest.challenge_id].push({
          user_id: targetRequest.user_id,
          name: targetRequest.user_name,
          avatar_url: targetRequest.user_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
          points: 0,
          streak: 0,
          rounds_won: 0
        });
      }
      
      if (Platform.OS === 'web') {
        window.alert(`Solicitação de ${targetRequest.user_name} aprovada! Ele agora participa do desafio.`);
      } else {
        Alert.alert('Sucesso', `Solicitação de ${targetRequest.user_name} aprovada! Ele agora participa do desafio.`);
      }
    } else {
      if (Platform.OS === 'web') {
        window.alert(`Solicitação de ${targetRequest.user_name} recusada.`);
      } else {
        Alert.alert('Sucesso', `Solicitação de ${targetRequest.user_name} recusada.`);
      }
    }
    
    setChallengeRequests(updatedRequests);
    await saveChallengeRequests(updatedRequests);
    await saveMockRankings();

    // Forçar re-render da tela
    setMembers([...members]);
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

  // Formulário de Criação de Grupo Inline
  if (showCreateGroupForm) {
    return (
      <WebContainer>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowCreateGroupForm(false)} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Criar Grupo</Text>
            <View style={{ width: 24 }} />
          </View>

          {loadingAction && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.secondary} />
            </View>
          )}

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.subtitle}>Crie um novo grupo para reunir seus amigos ou igreja.</Text>
            <Card variant="default" style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome do Grupo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Jovens IBB"
                  value={newGroupName}
                  onChangeText={setNewGroupName}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Descrição (Opcional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Qual o propósito deste grupo?"
                  multiline
                  numberOfLines={3}
                  value={newGroupDesc}
                  onChangeText={setNewGroupDesc}
                />
              </View>
              <Button
                title="Criar Grupo"
                variant="primary"
                size="lg"
                onPress={handleCreateGroup}
                style={styles.submitBtn}
              />
              <Button
                title="Cancelar"
                variant="outline"
                size="lg"
                onPress={() => setShowCreateGroupForm(false)}
                style={{ marginTop: SPACING.md, width: '100%' }}
              />
            </Card>
          </ScrollView>
        </SafeAreaView>
      </WebContainer>
    );
  }

  // Se o usuário não administrar nenhum grupo (apresenta aviso + botão de criar grupo inline)
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
              Você não possui nenhum grupo no qual seja o administrador principal. Crie o seu primeiro grupo agora mesmo!
            </Text>
            <Button
              title="Criar Meu Grupo"
              variant="primary"
              onPress={() => setShowCreateGroupForm(true)}
              style={{ width: 200, marginTop: SPACING.md }}
            />
            <Button
              title="Voltar ao Início"
              variant="outline"
              onPress={() => router.replace('/(tabs)')}
              style={{ width: 200, marginTop: SPACING.sm }}
            />
          </View>
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
          {/* SELETOR DE GRUPOS COM BOTAO DE CRIAR GRUPO (+ ) */}
          <View style={styles.groupSelectorContainer}>
            <View style={styles.groupSelectorHeader}>
              <Text style={styles.selectorLabel}>Grupo Administrado:</Text>
              <TouchableOpacity 
                style={styles.inlineCreateGroupBtn}
                onPress={() => setShowCreateGroupForm(true)}
              >
                <MaterialCommunityIcons name="plus" size={16} color={COLORS.secondary} />
                <Text style={styles.inlineCreateGroupText}>Novo Grupo</Text>
              </TouchableOpacity>
            </View>
            
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
              style={[styles.tabItem, activeTab === 'group' && styles.tabItemActive]}
              onPress={() => setActiveTab('group')}
            >
              <MaterialCommunityIcons 
                name="cog-outline" 
                size={18} 
                color={activeTab === 'group' ? COLORS.secondary : COLORS.textLight} 
              />
              <Text style={[styles.tabText, activeTab === 'group' && styles.tabTextActive]}>Grupo</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'tasks' && styles.tabItemActive]}
              onPress={() => setActiveTab('tasks')}
            >
              <MaterialCommunityIcons 
                name="star-outline" 
                size={18} 
                color={activeTab === 'tasks' ? COLORS.secondary : COLORS.textLight} 
              />
              <Text style={[styles.tabText, activeTab === 'tasks' && styles.tabTextActive]}>Tarefas</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'members' && styles.tabItemActive]}
              onPress={() => setActiveTab('members')}
            >
              <MaterialCommunityIcons 
                name="account-group-outline" 
                size={18} 
                color={activeTab === 'members' ? COLORS.secondary : COLORS.textLight} 
              />
              <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>Membros</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'challenges' && styles.tabItemActive]}
              onPress={() => setActiveTab('challenges')}
            >
              <MaterialCommunityIcons 
                name="trophy-outline" 
                size={18} 
                color={activeTab === 'challenges' ? COLORS.secondary : COLORS.textLight} 
              />
              <Text style={[styles.tabText, activeTab === 'challenges' && styles.tabTextActive]}>Desafios</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'approvals' && styles.tabItemActive]}
              onPress={() => setActiveTab('approvals')}
            >
              <MaterialCommunityIcons 
                name="clipboard-check-outline" 
                size={18} 
                color={activeTab === 'approvals' ? COLORS.secondary : COLORS.textLight} 
              />
              <Text style={[styles.tabText, activeTab === 'approvals' && styles.tabTextActive]}>Aprovações</Text>
            </TouchableOpacity>
          </View>

          {loadingGroupDetails ? (
            <ActivityIndicator size="large" color={COLORS.secondary} style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* ABA: DADOS DO GRUPO (CRUD) */}
              {activeTab === 'group' && activeGroup && (
                <View style={styles.listSection}>
                  <Text style={styles.sectionTitle}>Dados Básicos do Grupo</Text>
                  
                  <Card variant="default" style={styles.formCard}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Nome do Grupo</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Ex: Jovens IBB"
                        value={groupName}
                        onChangeText={setGroupName}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Descrição</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Qual o propósito deste grupo?"
                        multiline
                        numberOfLines={3}
                        value={groupDesc}
                        onChangeText={setGroupDesc}
                      />
                    </View>

                    <Button
                      title="Salvar Alterações"
                      variant="primary"
                      size="lg"
                      onPress={handleUpdateGroup}
                      style={styles.submitBtn}
                    />
                  </Card>

                  {/* Danger Zone */}
                  <Text style={[styles.sectionTitle, { color: COLORS.error, marginTop: SPACING.md }]}>Zona de Perigo</Text>
                  <Card variant="flat" style={styles.dangerCard}>
                    <View style={styles.dangerContent}>
                      <MaterialCommunityIcons name="alert-octagon" size={24} color={COLORS.error} />
                      <View style={styles.dangerTextContainer}>
                        <Text style={styles.dangerTitle}>Excluir este grupo</Text>
                        <Text style={styles.dangerDesc}>
                          A exclusão apagará de forma irreversível este grupo e todo o histórico de desafios, check-ins e pontos dos participantes.
                        </Text>
                      </View>
                    </View>
                    <Button
                      title="Excluir Grupo"
                      variant="secondary"
                      onPress={handleDeleteGroup}
                      style={styles.deleteBtn}
                    />
                  </Card>
                </View>
              )}

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

              {/* ABA: GERENCIAR SOLICITAÇÕES DE LIBERAÇÃO (APROVAÇÕES) */}
              {activeTab === 'approvals' && (() => {
                const pendingRequests = challengeRequests.filter(
                  r => r.group_id === selectedGroupId && r.status === 'pending'
                );
                return (
                  <View style={styles.listSection}>
                    <Text style={styles.sectionTitle}>Pedidos de Liberação de Desafios</Text>
                    <Text style={styles.emptyTabSubtitle}>
                      Gerencie as solicitações enviadas pelos participantes para ingressar nos desafios deste grupo.
                    </Text>

                    {pendingRequests.length === 0 ? (
                      <Card variant="flat" style={styles.emptyTabCard}>
                        <MaterialCommunityIcons name="clipboard-check-outline" size={32} color={COLORS.textLight} style={{ marginBottom: SPACING.xs }} />
                        <Text style={styles.emptyTabTitle}>Nenhum Pedido Pendente</Text>
                        <Text style={styles.emptyTabSubtitle}>
                          Não há novas solicitações de liberação para participação dos desafios deste grupo no momento.
                        </Text>
                      </Card>
                    ) : (
                      <View style={{ gap: SPACING.md }}>
                        {pendingRequests.map(request => (
                          <Card key={request.id} variant="default" style={styles.requestCard}>
                            <View style={styles.requestCardHeader}>
                              <Avatar source={request.user_avatar || undefined} name={request.user_name} size={36} />
                              <View style={{ marginLeft: SPACING.sm, flex: 1 }}>
                                <Text style={styles.requestName} numberOfLines={1}>{request.user_name}</Text>
                                <Text style={styles.requestHint}>Solicitou entrar no desafio:</Text>
                                <Text style={styles.requestChallengeName} numberOfLines={1}>{request.challenge_name}</Text>
                              </View>
                            </View>
                            <View style={styles.requestCardActions}>
                              <TouchableOpacity
                                style={[styles.btnActionApprove, { marginRight: SPACING.sm }]}
                                onPress={() => handleApproveRequest(request.id, true)}
                              >
                                <MaterialCommunityIcons name="check" size={16} color="#fff" />
                                <Text style={styles.btnActionApproveText}>Aprovar</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.btnActionDecline}
                                onPress={() => handleApproveRequest(request.id, false)}
                              >
                                <MaterialCommunityIcons name="close" size={16} color={COLORS.textSecondary} />
                                <Text style={styles.btnActionDeclineText}>Recusar</Text>
                              </TouchableOpacity>
                            </View>
                          </Card>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })()}

              {/* ABA: GERENCIAR PARTICIPANTES */}
              {activeTab === 'members' && (() => {
                const pendingRequests = challengeRequests.filter(
                  r => r.group_id === selectedGroupId && r.status === 'pending'
                );
                return (
                  <View style={styles.listSection}>
                    {/* Solicitações de Entrada em Desafios */}
                    {pendingRequests.length > 0 && (
                      <View style={{ marginBottom: SPACING.lg }}>
                        <Text style={[styles.sectionTitle, { color: COLORS.secondary }]}>
                          Solicitações de Entrada em Desafios ({pendingRequests.length})
                        </Text>
                        <View style={{ gap: SPACING.md }}>
                          {pendingRequests.map(request => (
                            <Card key={request.id} variant="default" style={styles.requestCard}>
                              <View style={styles.requestCardHeader}>
                                <Avatar source={request.user_avatar || undefined} name={request.user_name} size={36} />
                                <View style={{ marginLeft: SPACING.sm, flex: 1 }}>
                                  <Text style={styles.requestName} numberOfLines={1}>{request.user_name}</Text>
                                  <Text style={styles.requestHint}>Solicitou entrar no desafio:</Text>
                                  <Text style={styles.requestChallengeName} numberOfLines={1}>{request.challenge_name}</Text>
                                </View>
                              </View>
                              <View style={styles.requestCardActions}>
                                <TouchableOpacity
                                  style={[styles.btnActionApprove, { marginRight: SPACING.sm }]}
                                  onPress={() => handleApproveRequest(request.id, true)}
                                >
                                  <MaterialCommunityIcons name="check" size={16} color="#fff" />
                                  <Text style={styles.btnActionApproveText}>Aprovar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.btnActionDecline}
                                  onPress={() => handleApproveRequest(request.id, false)}
                                >
                                  <MaterialCommunityIcons name="close" size={16} color={COLORS.textSecondary} />
                                  <Text style={styles.btnActionDeclineText}>Recusar</Text>
                                </TouchableOpacity>
                              </View>
                            </Card>
                          ))}
                        </View>
                      </View>
                    )}

                    <Text style={styles.sectionTitle}>Participantes do Grupo ({members.length})</Text>
                  
                  {members.length === 0 ? (
                    <Card variant="flat" style={styles.emptyTabCard}>
                      <MaterialCommunityIcons name="account-multiple-outline" size={24} color={COLORS.textLight} />
                      <Text style={styles.emptyTabText}>Nenhum participante no grupo.</Text>
                    </Card>
                  ) : (
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
                  )}
                </View>
              )})()}

              {/* ABA: LISTAGEM DE DESAFIOS */}
              {activeTab === 'challenges' && (
                <View style={styles.listSection}>
                  {/* Seletor de Desafios com botão inline de criar (+ Novo Desafio) */}
                  <View style={styles.groupSelectorContainer}>
                    <View style={styles.groupSelectorHeader}>
                      <Text style={styles.selectorLabel}>Desafios do Grupo:</Text>
                      <TouchableOpacity 
                        style={styles.inlineCreateGroupBtn}
                        onPress={() => router.push({ pathname: '/create-challenge', params: { groupId: selectedGroupId } })}
                      >
                        <MaterialCommunityIcons name="plus" size={16} color={COLORS.secondary} />
                        <Text style={styles.inlineCreateGroupText}>Novo Desafio</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {challenges.length === 0 ? (
                      <Text style={{ fontSize: 12, color: COLORS.textLight, fontFamily: FONTS.family.body, marginTop: 4 }}>
                        Nenhum desafio criado neste grupo.
                      </Text>
                    ) : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupSelectorScroll}>
                        {challenges.map(c => {
                          const now = new Date();
                          const isActive = new Date(c.end_date) >= now;
                          return (
                            <TouchableOpacity
                              key={c.id}
                              style={[
                                styles.groupSelectBadge,
                                selectedChallengeId === c.id && styles.groupSelectBadgeActive
                              ]}
                              onPress={() => setSelectedChallengeId(c.id)}
                            >
                              <Text style={[
                                styles.groupSelectBadgeText,
                                selectedChallengeId === c.id && styles.groupSelectBadgeTextActive
                              ]}>
                                {c.title || c.name} {isActive ? '(Ativo)' : '(Encerrado)'}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>

                  {challenges.length === 0 ? (
                    <Card variant="flat" style={styles.emptyTabCard}>
                      <MaterialCommunityIcons name="trophy-outline" size={32} color={COLORS.textLight} style={{ marginBottom: SPACING.sm }} />
                      <Text style={styles.emptyTabTitle}>Nenhum desafio registrado</Text>
                      <Text style={styles.emptyTabSubtitle}>Inicie o primeiro desafio para motivar os membros!</Text>
                      <Button
                        title="Criar Desafio"
                        variant="secondary"
                        size="sm"
                        onPress={() => router.push({ pathname: '/create-challenge', params: { groupId: selectedGroupId } })}
                        style={{ marginTop: SPACING.md, width: 150 }}
                      />
                    </Card>
                  ) : activeChallenge ? (
                    <View>
                      <Text style={styles.sectionTitle}>Dados Básicos do Desafio</Text>
                      
                      <Card variant="default" style={styles.formCard}>
                        <View style={styles.inputGroup}>
                          <Text style={styles.label}>Nome do Desafio</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="Ex: Fé em Constância 2.0"
                            value={challengeName}
                            onChangeText={setChallengeName}
                          />
                        </View>

                        <View style={styles.row}>
                          <View style={[styles.inputGroup, { width: '48%' }]}>
                            <Text style={styles.label}>Data de Início</Text>
                            <TextInput
                              style={styles.input}
                              value={challengeStartDate}
                              onChangeText={setChallengeStartDate}
                              placeholder="DD/MM/AAAA"
                            />
                          </View>
                          <View style={[styles.inputGroup, { width: '48%' }]}>
                            <Text style={styles.label}>Data de Término</Text>
                            <TextInput
                              style={styles.input}
                              value={challengeEndDate}
                              onChangeText={setChallengeEndDate}
                              placeholder="DD/MM/AAAA"
                            />
                          </View>
                        </View>

                        <View style={styles.inputGroup}>
                          <Text style={styles.label}>Regras e Descrição</Text>
                          <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Regras do desafio..."
                            multiline
                            numberOfLines={4}
                            value={challengeRules}
                            onChangeText={setChallengeRules}
                          />
                        </View>

                        <Button
                          title="Salvar Alterações do Desafio"
                          variant="primary"
                          size="lg"
                          onPress={handleUpdateChallenge}
                          style={styles.submitBtn}
                        />
                        
                        <TouchableOpacity
                          style={styles.challengeLink}
                          onPress={() => router.push({ pathname: '/(tabs)/challenge', params: { challengeId: selectedChallengeId } })}
                        >
                          <Text style={styles.challengeLinkText}>Ver detalhes na aba Desafio</Text>
                          <MaterialCommunityIcons name="arrow-right" size={14} color={COLORS.secondary} />
                        </TouchableOpacity>
                      </Card>

                      {/* Danger Zone do Desafio */}
                      <Text style={[styles.sectionTitle, { color: COLORS.error, marginTop: SPACING.md }]}>Zona de Perigo</Text>
                      <Card variant="flat" style={styles.dangerCard}>
                        <View style={styles.dangerContent}>
                          <MaterialCommunityIcons name="alert-octagon" size={24} color={COLORS.error} />
                          <View style={styles.dangerTextContainer}>
                            <Text style={styles.dangerTitle}>Excluir este desafio</Text>
                            <Text style={styles.dangerDesc}>
                              A exclusão apagará de forma irreversível este desafio e todos os check-ins, rounds e pontos dos membros associados a ele.
                            </Text>
                          </View>
                        </View>
                        <Button
                          title="Excluir Desafio"
                          variant="secondary"
                          onPress={handleDeleteChallenge}
                          style={styles.deleteBtn}
                        />
                      </Card>
                    </View>
                  ) : null}
                </View>
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
  groupSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  selectorLabel: {
    fontSize: 10,
    fontFamily: FONTS.family.bodyBold,
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inlineCreateGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.secondaryMuted,
  },
  inlineCreateGroupText: {
    fontSize: 10,
    fontFamily: FONTS.family.bodyBold,
    color: COLORS.secondary,
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
    fontSize: 11,
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

  // Formulário Geral
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

  // Danger Zone do Grupo
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
  subtitle: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  requestCard: {
    padding: SPACING.md,
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    ...SHADOWS.light,
  },
  requestCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestName: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bodyBold,
    color: COLORS.primary,
  },
  requestHint: {
    fontSize: 10,
    fontFamily: FONTS.family.body,
    color: COLORS.textLight,
    marginTop: 1,
  },
  requestChallengeName: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bodySemibold,
    color: COLORS.secondary,
    marginTop: 2,
  },
  requestCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.sm,
  },
  btnActionApprove: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
  },
  btnActionApproveText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: FONTS.family.bodyBold,
  },
  btnActionDecline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
  },
  btnActionDeclineText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: FONTS.family.bodyBold,
  },
});
