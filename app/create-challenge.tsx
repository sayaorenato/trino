import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { WebContainer } from '../components/ui/WebContainer';
import { COLORS, SPACING, BORDER_RADIUS, FONTS } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/auth';
import { MOCK_GROUPS, MOCK_CHALLENGES, MOCK_ROUNDS, MOCK_RANKINGS, MOCK_EXTRA_TASKS } from '../constants/mock-data';

export default function CreateChallengeScreen() {
  const router = useRouter();
  const { groupId, challengeId } = useLocalSearchParams<{ groupId?: string; challengeId?: string }>();
  const { user } = useAuth();
  
  const [group, setGroup] = useState<any>(null);
  const [loadingGroup, setLoadingGroup] = useState(true);
  
  // Estado para armazenar grupos administrados se groupId não for provido
  const [adminGroups, setAdminGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  const isEditing = !!challengeId;

  function formatDateForInput(isoDateStr: string): string {
    if (!isoDateStr) return '';
    const parts = isoDateStr.split('T')[0].split('-');
    if (parts.length !== 3) return isoDateStr;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }

  useEffect(() => {
    async function fetchGroupAndChallenge() {
      if (!user) {
        setLoadingGroup(false);
        return;
      }
      
      let currentGroupId = groupId;

      // Se não houver groupId e nem challengeId (novo desafio geral), buscar grupos onde o usuário é admin
      if (!currentGroupId && !challengeId) {
        try {
          const { api } = require('../lib/api');
          const userGroups = await api.getUserGroups(user.id);
          const admins = userGroups.filter((g: any) => g.role === 'admin');
          setAdminGroups(admins);
          if (admins.length > 0) {
            setGroup(admins[0]);
            setSelectedGroupId(admins[0].id);
          }
        } catch (e) {
          console.error('Erro ao buscar grupos do admin:', e);
        }
        setLoadingGroup(false);
        return;
      }

      // Se for edição, precisamos pegar o grupo do desafio se groupId não foi fornecido
      if (challengeId) {
        if (challengeId.startsWith('chal')) {
          const mockChal = MOCK_CHALLENGES[challengeId];
          if (mockChal) {
            currentGroupId = mockChal.group_id;
          }
        } else {
          const { data: chalData } = await supabase
            .from('challenges')
            .select('group_id')
            .eq('id', challengeId)
            .maybeSingle();
          if (chalData) {
            currentGroupId = chalData.group_id;
          }
        }
      }

      if (!currentGroupId) {
        setLoadingGroup(false);
        return;
      }
      
      // Fallback para grupos mockados
      if (currentGroupId.startsWith('group')) {
        const mockGroup = MOCK_GROUPS.find(g => g.id === currentGroupId) || MOCK_GROUPS[0];
        setGroup(mockGroup);
        setSelectedGroupId(mockGroup.id);
      } else {
        const { data, error } = await supabase
          .from('groups')
          .select('*')
          .eq('id', currentGroupId)
          .single();
        if (data && !error) {
          setGroup(data);
          setSelectedGroupId(data.id);
        }
      }

      // Se for edição, carregar dados do desafio
      if (challengeId) {
        if (challengeId.startsWith('chal')) {
          const mockChal = MOCK_CHALLENGES[challengeId];
          if (mockChal) {
            setChallengeName(mockChal.name);
            setStartDate(formatDateForInput(mockChal.start_date));
            setEndDate(formatDateForInput(mockChal.end_date));
            setRules(mockChal.rules || '');
            setHasRounds((MOCK_ROUNDS[challengeId]?.length || 0) > 1);
          }
        } else {
          const { data: chalData } = await supabase
            .from('challenges')
            .select('*, rounds(*)')
            .eq('id', challengeId)
            .maybeSingle();
          if (chalData) {
            setChallengeName(chalData.title || chalData.name || '');
            setStartDate(formatDateForInput(chalData.start_date));
            setEndDate(formatDateForInput(chalData.end_date));
            setRules(chalData.rules || '');
            setHasRounds((chalData.rounds?.length || 0) > 1);
          }
        }
      }
      
      setLoadingGroup(false);
    }
    fetchGroupAndChallenge();
  }, [user, groupId, challengeId]);

  const [challengeName, setChallengeName] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 2);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  });
  
  const [hasRounds, setHasRounds] = useState(true);
  const [roundDuration, setRoundDuration] = useState<'1_week' | '1_month'>('1_week');
  
  const [allowLate, setAllowLate] = useState(true);
  const [latePenalty, setLatePenalty] = useState(true);
  const [rules, setRules] = useState(
    'Check-in diário obrigatório de: Oração (mín. 15min), Leitura Bíblica (mín. 3 caps), Exercício Físico (mín. 30min). Check-in com foto obrigatório.'
  );

  const [loading, setLoading] = useState(false);

  function parseDate(dateStr: string): Date | null {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts.map(Number);
    if (!day || !month || !year) return null;
    return new Date(year, month - 1, day);
  }

  const handleCreate = () => {
    if (!challengeName) {
      if (Platform.OS === 'web') {
        window.alert('Erro: Por favor, informe o nome do desafio.');
      } else {
        Alert.alert('Erro', 'Por favor, informe o nome do desafio.');
      }
      return;
    }
    if (!group?.id) {
      if (Platform.OS === 'web') {
        window.alert('Erro: Grupo não identificado.');
      } else {
        Alert.alert('Erro', 'Grupo não identificado.');
      }
      return;
    }
    if (!user) return;

    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (!start || !end) {
      if (Platform.OS === 'web') {
        window.alert('Erro: Datas inválidas. Use o formato DD/MM/AAAA.');
      } else {
        Alert.alert('Erro', 'Datas inválidas. Use o formato DD/MM/AAAA.');
      }
      return;
    }

    const actionText = isEditing ? 'alterar e atualizar' : 'criar e publicar';
    const confirmBtnText = isEditing ? 'Salvar' : 'Publicar';

    if (Platform.OS === 'web') {
      const confirm = window.confirm(`Tem certeza de que deseja ${actionText} o desafio "${challengeName}" para o grupo "${group?.name}"?`);
      if (confirm) {
        executeCreate(start, end);
      }
    } else {
      Alert.alert(
        isEditing ? 'Confirmar Alterações' : 'Confirmar Publicação',
        `Tem certeza de que deseja ${actionText} o desafio "${challengeName}" para o grupo "${group?.name}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: confirmBtnText, 
            onPress: () => executeCreate(start, end)
          }
        ]
      );
    }
  };

  const executeCreate = async (start: Date, end: Date) => {
    if (!user) return;
    setLoading(true);
    try {
      // --- MODO EDIÇÃO ---
      if (isEditing && challengeId) {
        if (challengeId.startsWith('chal')) {
          const existingChallenge = MOCK_CHALLENGES[challengeId];
          if (existingChallenge) {
            existingChallenge.name = challengeName;
            existingChallenge.rules = rules;
            existingChallenge.start_date = start.toISOString().split('T')[0];
            existingChallenge.end_date = end.toISOString().split('T')[0];
            
            // Recalcula rounds do mock
            const roundDays = roundDuration === '1_week' ? 7 : 30;
            const mockRounds = [];
            let roundStart = new Date(start);
            let roundNumber = 1;
            while (roundStart < end) {
              const roundEnd = new Date(roundStart);
              roundEnd.setDate(roundEnd.getDate() + roundDays - 1);
              if (roundEnd > end) {
                mockRounds.push({
                  id: `round_mock_${Date.now()}_${roundNumber}`,
                  challenge_id: challengeId,
                  round_number: roundNumber,
                  start_date: roundStart.toISOString().split('T')[0],
                  end_date: end.toISOString().split('T')[0],
                  status: roundNumber === 1 ? 'active' as const : 'upcoming' as const
                });
                break;
              }
              mockRounds.push({
                id: `round_mock_${Date.now()}_${roundNumber}`,
                challenge_id: challengeId,
                round_number: roundNumber,
                start_date: roundStart.toISOString().split('T')[0],
                end_date: roundEnd.toISOString().split('T')[0],
                status: roundNumber === 1 ? 'active' as const : 'upcoming' as const
              });
              roundStart = new Date(roundEnd);
              roundStart.setDate(roundStart.getDate() + 1);
              roundNumber++;
            }
            MOCK_ROUNDS[challengeId] = mockRounds;

            // Sincroniza com a propriedade challenge do grupo
            const mockGroupIdx = MOCK_GROUPS.findIndex(g => g.id === existingChallenge.group_id);
            if (mockGroupIdx !== -1) {
              MOCK_GROUPS[mockGroupIdx] = {
                ...MOCK_GROUPS[mockGroupIdx],
                challenge: existingChallenge
              };
            }
          }

          if (Platform.OS === 'web') {
            window.alert(`Sucesso: O desafio "${challengeName}" foi atualizado com sucesso.`);
            router.replace({ pathname: '/(tabs)/challenge', params: { challengeId } });
          } else {
            Alert.alert(
              'Desafio Atualizado!', 
              `O desafio "${challengeName}" foi atualizado com sucesso no grupo mockado.`,
              [
                { text: 'Ir para o Desafio', onPress: () => router.replace({ pathname: '/(tabs)/challenge', params: { challengeId } }) },
                { text: 'Voltar ao Dashboard', onPress: () => router.replace('/(tabs)') },
              ]
            );
          }
          return;
        }

        // Supabase Edição
        const { error: challengeError } = await supabase
          .from('challenges')
          .update({
            title: challengeName,
            rules: rules,
            start_date: start.toISOString().split('T')[0],
            end_date: end.toISOString().split('T')[0],
          })
          .eq('id', challengeId);

        if (challengeError) throw challengeError;

        if (hasRounds) {
          // Deleta rounds anteriores e check-ins vinculados
          const { data: roundsData } = await supabase
            .from('rounds')
            .select('id')
            .eq('challenge_id', challengeId);
          
          const roundIds = (roundsData || []).map(r => r.id);
          if (roundIds.length > 0) {
            await supabase.from('checkins').delete().in('round_id', roundIds);
          }
          await supabase.from('rounds').delete().eq('challenge_id', challengeId);

          // Recria os rounds
          const roundDays = roundDuration === '1_week' ? 7 : 30;
          const rounds = [];
          let roundStart = new Date(start);
          let roundNumber = 1;
          while (roundStart < end) {
            const roundEnd = new Date(roundStart);
            roundEnd.setDate(roundEnd.getDate() + roundDays - 1);
            if (roundEnd > end) {
              rounds.push({
                challenge_id: challengeId,
                round_number: roundNumber,
                start_date: roundStart.toISOString().split('T')[0],
                end_date: end.toISOString().split('T')[0],
              });
              break;
            }
            rounds.push({
              challenge_id: challengeId,
              round_number: roundNumber,
              start_date: roundStart.toISOString().split('T')[0],
              end_date: roundEnd.toISOString().split('T')[0],
            });
            roundStart = new Date(roundEnd);
            roundStart.setDate(roundStart.getDate() + 1);
            roundNumber++;
          }

          const { error: roundsError } = await supabase
            .from('rounds')
            .insert(rounds);
          if (roundsError) throw roundsError;
        }

        if (Platform.OS === 'web') {
          window.alert(`Sucesso: O desafio "${challengeName}" foi atualizado com sucesso.`);
          router.replace({ pathname: '/(tabs)/challenge', params: { challengeId } });
        } else {
          Alert.alert(
            'Desafio Atualizado!', 
            `O desafio "${challengeName}" foi atualizado com sucesso no grupo "${group?.name}".`,
            [
              { text: 'Ir para o Desafio', onPress: () => router.replace({ pathname: '/(tabs)/challenge', params: { challengeId } }) },
              { text: 'Voltar ao Dashboard', onPress: () => router.replace('/(tabs)') },
            ]
          );
        }
        return;
      }

      // --- MODO CRIAÇÃO ---
      const currentGroupId = selectedGroupId || groupId || group?.id;
      if (!currentGroupId) throw new Error('Grupo não identificado.');

      if (currentGroupId.startsWith('group')) {
        const newChallengeId = `chal_${Date.now()}`;
        const newChallenge = {
          id: newChallengeId,
          group_id: currentGroupId,
          name: challengeName,
          rules: rules,
          start_date: start.toISOString().split('T')[0],
          end_date: end.toISOString().split('T')[0],
          total_rounds: hasRounds ? 8 : 1,
          current_round: 1
        };

        // Adiciona ao mock
        MOCK_CHALLENGES[newChallengeId] = newChallenge;

        const mockGroupIdx = MOCK_GROUPS.findIndex(g => g.id === currentGroupId);
        if (mockGroupIdx !== -1) {
          MOCK_GROUPS[mockGroupIdx] = {
            ...MOCK_GROUPS[mockGroupIdx],
            challenge: newChallenge
          };
        }

        // Gera rounds mockados
        const roundDays = roundDuration === '1_week' ? 7 : 30;
        const mockRounds = [];
        let roundStart = new Date(start);
        let roundNumber = 1;
        while (roundStart < end) {
          const roundEnd = new Date(roundStart);
          roundEnd.setDate(roundEnd.getDate() + roundDays - 1);
          if (roundEnd > end) {
            mockRounds.push({
              id: `round_mock_${Date.now()}_${roundNumber}`,
              challenge_id: newChallengeId,
              round_number: roundNumber,
              start_date: roundStart.toISOString().split('T')[0],
              end_date: end.toISOString().split('T')[0],
              status: roundNumber === 1 ? 'active' as const : 'upcoming' as const
            });
            break;
          }
          mockRounds.push({
            id: `round_mock_${Date.now()}_${roundNumber}`,
            challenge_id: newChallengeId,
            round_number: roundNumber,
            start_date: roundStart.toISOString().split('T')[0],
            end_date: roundEnd.toISOString().split('T')[0],
            status: roundNumber === 1 ? 'active' as const : 'upcoming' as const
          });
          roundStart = new Date(roundEnd);
          roundStart.setDate(roundStart.getDate() + 1);
          roundNumber++;
        }
        MOCK_ROUNDS[newChallengeId] = mockRounds;

        MOCK_RANKINGS[newChallengeId] = [
          {
            user_id: user.id,
            name: 'Renato Mello',
            avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
            points: 0,
            streak: 0,
            rounds_won: 0
          }
        ];

        if (Platform.OS === 'web') {
          window.alert(`Sucesso: O desafio "${challengeName}" foi configurado localmente.`);
          router.replace({ pathname: '/(tabs)/challenge', params: { challengeId: newChallengeId } });
        } else {
          Alert.alert(
            'Desafio Criado (Local)!', 
            `O desafio "${challengeName}" foi configurado localmente no grupo mockado.`,
            [
              { text: 'Ir para o Desafio', onPress: () => router.replace({ pathname: '/(tabs)/challenge', params: { challengeId: newChallengeId } }) },
              { text: 'Voltar ao Dashboard', onPress: () => router.replace('/(tabs)') },
            ]
          );
        }
        return;
      }

      const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .insert({
          group_id: currentGroupId,
          title: challengeName,
          rules: rules,
          start_date: start.toISOString().split('T')[0],
          end_date: end.toISOString().split('T')[0],
        })
        .select()
        .single();

      if (challengeError) throw challengeError;

      const rounds = [];
      if (hasRounds) {
        const roundDays = roundDuration === '1_week' ? 7 : 30;
        let roundStart = new Date(start);
        let roundNumber = 1;
        while (roundStart < end) {
          const roundEnd = new Date(roundStart);
          roundEnd.setDate(roundEnd.getDate() + roundDays - 1);
          if (roundEnd > end) {
            rounds.push({
              challenge_id: challenge.id,
              round_number: roundNumber,
              start_date: roundStart.toISOString().split('T')[0],
              end_date: end.toISOString().split('T')[0],
            });
            break;
          }
          rounds.push({
            challenge_id: challenge.id,
            round_number: roundNumber,
            start_date: roundStart.toISOString().split('T')[0],
            end_date: roundEnd.toISOString().split('T')[0],
          });
          roundStart = new Date(roundEnd);
          roundStart.setDate(roundStart.getDate() + 1);
          roundNumber++;
        }
      } else {
        // Criar um round padrão único cobrindo todo o período do desafio
        rounds.push({
          challenge_id: challenge.id,
          round_number: 1,
          start_date: start.toISOString().split('T')[0],
          end_date: end.toISOString().split('T')[0],
        });
      }

      const { error: roundsError } = await supabase
        .from('rounds')
        .insert(rounds);
      if (roundsError) throw roundsError;

      MOCK_RANKINGS[challenge.id] = [
        {
          user_id: user.id,
          name: 'Renato Mello',
          avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
          points: 0,
          streak: 0,
          rounds_won: 0
        }
      ];

      if (Platform.OS === 'web') {
        window.alert(`Sucesso: O desafio "${challengeName}" foi configurado com sucesso.`);
        router.replace({ pathname: '/(tabs)/challenge', params: { challengeId: challenge.id } });
      } else {
        Alert.alert(
          'Desafio Criado!', 
          `O desafio "${challengeName}" foi configurado com sucesso no grupo "${group?.name}".`,
          [
            { text: 'Ir para o Desafio', onPress: () => router.replace({ pathname: '/(tabs)/challenge', params: { challengeId: challenge.id } }) },
            { text: 'Voltar ao Dashboard', onPress: () => router.replace('/(tabs)') },
          ]
        );
      }
    } catch (e: any) {
      if (Platform.OS === 'web') {
        window.alert(`Erro: ${e.message || 'Ocorreu um erro ao salvar o desafio.'}`);
      } else {
        Alert.alert('Erro', e.message || 'Ocorreu um erro ao salvar o desafio.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!challengeId) return;

    if (Platform.OS === 'web') {
      const confirm = window.confirm(`ATENÇÃO: Tem certeza de que deseja excluir permanentemente o desafio "${challengeName}"? Essa ação não poderá ser desfeita.`);
      if (confirm) {
        executeDelete();
      }
    } else {
      Alert.alert(
        'Excluir Desafio',
        `ATENÇÃO: Tem certeza de que deseja excluir permanentemente o desafio "${challengeName}"? Essa ação não poderá ser desfeita.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Excluir permanentemente', 
            style: 'destructive',
            onPress: () => executeDelete()
          }
        ]
      );
    }
  };

  const executeDelete = async () => {
    if (!challengeId) return;
    setLoading(true);
    try {
      // Excluir localmente no Mock
      if (challengeId.startsWith('chal')) {
        delete MOCK_CHALLENGES[challengeId];
        delete MOCK_ROUNDS[challengeId];
        delete MOCK_RANKINGS[challengeId];
        delete MOCK_EXTRA_TASKS[challengeId];

        // Limpar referência do desafio ativo no grupo mock
        MOCK_GROUPS.forEach((g, index) => {
          if (g.challenge?.id === challengeId) {
            MOCK_GROUPS[index] = {
              ...g,
              challenge: undefined
            };
          }
        });

        if (Platform.OS === 'web') {
          window.alert('Sucesso: Desafio excluído com sucesso.');
          router.replace('/(tabs)');
        } else {
          Alert.alert('Sucesso', 'Desafio excluído com sucesso.', [
            { text: 'OK', onPress: () => router.replace('/(tabs)') }
          ]);
        }
        return;
      }

      // Excluir no Supabase
      const { data: roundsData } = await supabase
        .from('rounds')
        .select('id')
        .eq('challenge_id', challengeId);
      
      const roundIds = (roundsData || []).map(r => r.id);
      if (roundIds.length > 0) {
        // Deletar checkins primeiro devido às chaves estrangeiras
        await supabase.from('checkins').delete().in('round_id', roundIds);
      }

      // Deletar rounds
      await supabase.from('rounds').delete().eq('challenge_id', challengeId);
      
      // Deletar tarefas extras (no banco a tabela é tasks)
      await supabase.from('tasks').delete().eq('challenge_id', challengeId);

      // Deletar o desafio principal
      const { data: deletedData, error } = await supabase
        .from('challenges')
        .delete()
        .eq('id', challengeId)
        .select();

      if (error) throw error;

      if (!deletedData || deletedData.length === 0) {
        throw new Error('Não foi possível excluir o desafio. Verifique se possui permissões.');
      }

      if (Platform.OS === 'web') {
        window.alert('Sucesso: Desafio excluído com sucesso.');
        router.replace('/(tabs)');
      } else {
        Alert.alert('Sucesso', 'Desafio excluído com sucesso.', [
          { text: 'OK', onPress: () => router.replace('/(tabs)') }
        ]);
      }
    } catch (e: any) {
      if (Platform.OS === 'web') {
        window.alert(`Erro: ${e.message || 'Ocorreu um erro ao excluir o desafio.'}`);
      } else {
        Alert.alert('Erro', e.message || 'Ocorreu um erro ao excluir o desafio.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingGroup) {
    return (
      <WebContainer>
        <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </SafeAreaView>
      </WebContainer>
    );
  }

  if (!group && adminGroups.length === 0) {
    return (
      <WebContainer>
        <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: SPACING.xl }]}>
          <MaterialCommunityIcons name="shield-alert-outline" size={48} color={COLORS.error} style={{ marginBottom: SPACING.md }} />
          <Text style={{ color: COLORS.text, fontFamily: FONTS.family.heading, fontSize: FONTS.size.md, fontWeight: 'bold', marginBottom: SPACING.sm, textAlign: 'center' }}>
            Acesso Restrito
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontFamily: FONTS.family.body, fontSize: FONTS.size.sm, textAlign: 'center', marginBottom: SPACING.lg }}>
            Você precisa ser administrador de pelo menos um grupo para poder criar um desafio.
          </Text>
          <Button title="Voltar" variant="primary" onPress={() => router.back()} style={{ width: 120 }} />
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
          <Text style={styles.headerTitle}>{isEditing ? 'Editar Desafio' : 'Criar Desafio'}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>
            {isEditing 
              ? `Atualize as configurações e regras do desafio para o grupo `
              : `Configure um novo desafio de constância. `
            }
            {group && !isEditing && (
              <>
                para o grupo <Text style={styles.groupBold}>{group.name}</Text>.
              </>
            )}
          </Text>

          <Card variant="default" style={styles.formCard}>
            {/* Escolha do Grupo se criado fora do contexto de grupo */}
            {!groupId && !isEditing && adminGroups.length > 0 && (
              <View style={[styles.inputGroup, { marginBottom: SPACING.md }]}>
                <Text style={styles.label}>Escolha o Grupo</Text>
                <View style={{ gap: SPACING.xs }}>
                  {adminGroups.map((g: any) => {
                    const isSelected = selectedGroupId === g.id;
                    return (
                      <TouchableOpacity
                        key={g.id}
                        activeOpacity={0.8}
                        onPress={() => {
                          setSelectedGroupId(g.id);
                          setGroup(g);
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: SPACING.sm,
                          borderRadius: BORDER_RADIUS.md,
                          borderWidth: 1,
                          borderColor: isSelected ? COLORS.secondary : COLORS.border,
                          backgroundColor: isSelected ? COLORS.secondaryMuted : COLORS.surface,
                        }}
                      >
                        <MaterialCommunityIcons 
                          name={isSelected ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} 
                          size={20} 
                          color={isSelected ? COLORS.secondary : COLORS.textLight} 
                          style={{ marginRight: SPACING.sm }}
                        />
                        <Text style={{ fontFamily: FONTS.family.heading, fontSize: FONTS.size.sm, color: COLORS.text, fontWeight: 'bold' }}>
                          {g.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

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
              title={isEditing ? 'Salvar Alterações' : 'Criar e Publicar Desafio'}
              variant="primary"
              size="lg"
              loading={loading}
              onPress={handleCreate}
              style={styles.submitBtn}
            />

            {isEditing && (
              <Button
                title="Excluir Desafio"
                variant="ghost"
                size="lg"
                loading={loading}
                onPress={handleDelete}
                style={[styles.deleteBtn, { marginTop: SPACING.md }]}
                textStyle={{ color: '#ff4d4d' }}
              />
            )}
          </Card>
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
  groupBold: {
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    fontFamily: FONTS.family.heading,
  },
  formCard: {
    padding: SPACING.md,
    marginBottom: SPACING.xl,
  },
  formCardTitle: {
    fontFamily: FONTS.family.heading,
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
  subLabel: {
    fontSize: FONTS.size.xs,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    fontFamily: FONTS.family.body,
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
    fontFamily: FONTS.family.heading,
  },
  switchDesc: {
    fontSize: FONTS.size.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 14,
    fontFamily: FONTS.family.body,
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
    fontFamily: FONTS.family.body,
  },
  toggleBtnTextActive: {
    color: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: SPACING.sm,
    fontFamily: FONTS.family.body,
  },
  submitBtn: {
    marginTop: SPACING.md,
    width: '100%',
  },
  deleteBtn: {
    width: '100%',
    borderColor: '#ff4d4d',
  }
});
