import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  ActivityIndicator,
  Animated,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, getPendingInviteCode, setPendingInviteCode } from '../../context/auth';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { StreakBadge } from '../../components/ui/StreakBadge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Button } from '../../components/ui/Button';
import { WebContainer } from '../../components/ui/WebContainer';
import { SupportCard } from '../../components/SupportCard';
import { HABIT_LABELS, HabitType, MOCK_RANKINGS, RankingMember, MOCK_CHALLENGE_INVITATIONS, MOCK_FEED, MOCK_EXTRA_TASKS, USER_MOCK_GROUPS, getMockRankings, getChallengeRequests } from '../../constants/mock-data';
import { COLORS, SPACING, FONTS, SHADOWS, BORDER_RADIUS, ANIMATION } from '../../constants/theme';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [weeklyTheme, setWeeklyTheme] = useState({
    text: "Não fui eu que ordenei a você? Seja forte e corajoso! Não se apavore nem desanime, pois o Senhor, o seu Deus, estará com você por onde você andar.",
    reference: "Josué 1:9 • Tema da Semana"
  });

  const [groups, setGroups] = useState<any[]>([]);
  const [habits, setHabits] = useState({ prayer: false, bible: false, exercise: false });
  const [todayCheckins, setTodayCheckins] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [streakCount, setStreakCount] = useState<number>(profile?.streak_count || 0);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState('');



  const showAlert = (title: string, message: string, buttons?: any[]) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
      if (buttons && buttons.length > 0) {
        const actionButton = buttons.find((b: any) => b.onPress && b.text !== 'Cancelar');
        if (actionButton) {
          actionButton.onPress();
        }
      }
    } else {
      Alert.alert(title, message, buttons);
    }
  };

  // Entrance animations
  const headerFade = useRef(new Animated.Value(0)).current;
  const verseFade = useRef(new Animated.Value(0)).current;
  const verseSlide = useRef(new Animated.Value(20)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.stagger(0, [
      Animated.timing(headerFade, { toValue: 1, duration: ANIMATION.duration.normal, delay: 100, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(verseFade, { toValue: 1, duration: ANIMATION.duration.slow, delay: 200, useNativeDriver: true }),
        Animated.timing(verseSlide, { toValue: 0, duration: ANIMATION.duration.slow, delay: 200, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(contentFade, { toValue: 1, duration: ANIMATION.duration.slow, delay: 400, useNativeDriver: true }),
        Animated.timing(contentSlide, { toValue: 0, duration: ANIMATION.duration.slow, delay: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  // Lista 1: Meus Desafios (Apenas os desafios ativos em que o usuário participa do ranking)

  const myActiveChallenges = groups.reduce((acc: any[], g: any) => {
    if (g.challenges && Array.isArray(g.challenges)) {
      g.challenges.forEach((challenge: any) => {
        const isChallengeActive = new Date(challenge.end_date) >= new Date();
        if (isChallengeActive) {
          const ranking = MOCK_RANKINGS[challenge.id] || [];
          const isUserAdmin = g.role === 'admin';
          const userParticipates = isUserAdmin || ranking.some((m: any) => m.user_id === user?.id);
          
          if (userParticipates) {
            if (!acc.some((item: any) => item.challenge.id === challenge.id)) {
              acc.push({
                groupId: g.id,
                groupName: g.name,
                challenge: challenge
              });
            }
          }
        }
      });
    }
    return acc;
  }, []);

  // Lista 2: Todos os Desafios Ativos de Todos os Grupos (Para os Check-ins de Hoje)
  const allActiveChallenges = groups.reduce((acc: any[], g: any) => {
    if (g.challenges && Array.isArray(g.challenges)) {
      g.challenges.forEach((challenge: any) => {
        const isChallengeActive = new Date(challenge.end_date) >= new Date();
        if (isChallengeActive) {
          if (!acc.some((item: any) => item.challenge.id === challenge.id)) {
            acc.push({
              groupId: g.id,
              groupName: g.name,
              challenge: challenge
            });
          }
        }
      });
    }
    return acc;
  }, []);

  // Helper para verificar se um hábito específico de um desafio foi feito hoje
  const isHabitDone = (item: any, type: 'prayer' | 'bible' | 'exercise') => {
    const challenge = item.challenge;
    const dbType = type === 'prayer' ? 'pray' : type === 'bible' ? 'bible' : 'workout';
    
    if (challenge.id.startsWith('chal') && user) {
      const todayStr = new Date().toISOString().split('T')[0];
      return MOCK_FEED.some(c => 
        c.user_id === user.id && 
        c.group_id === item.groupId && 
        c.habit_type === type && 
        c.created_at.split('T')[0] === todayStr
      );
    }
    
    const roundIds = (challenge.rounds || []).map((r: any) => r.id);
    return todayCheckins.some((c: any) => c.type === dbType && roundIds.includes(c.round_id));
  };

  // Helper para obter tarefas extras ativas de um desafio
  const getChallengeExtraTasks = (challengeId: string) => {
    const isToday = (dateString: string) => {
      if (!dateString) return false;
      try {
        const date = new Date(dateString);
        const today = new Date();
        return (
          date.getFullYear() === today.getFullYear() &&
          date.getMonth() === today.getMonth() &&
          date.getDate() === today.getDate()
        );
      } catch (e) {
        return false;
      }
    };

    if (challengeId.startsWith('chal')) {
      return (MOCK_EXTRA_TASKS[challengeId] || [])
        .filter((t: any) => t.active !== false && isToday(t.expires_at));
    }
    return tasks
      .filter((t: any) => t.challenge_id === challengeId)
      .map((t: any) => {
        let parsed = { title: 'Tarefa Extra', description: '', type: 'general', active: true, points: 30, expires_at: '', start_time: '' };
        try {
          parsed = JSON.parse(t.description);
        } catch (e) {}
        return {
          id: t.id,
          challenge_id: t.challenge_id,
          title: parsed.title || 'Tarefa Extra',
          description: parsed.description || t.description,
          type: parsed.type || 'general',
          points: t.points || 30,
          active: parsed.active !== false,
          expires_at: parsed.expires_at || '',
          start_time: parsed.start_time || undefined
        };
      })
      .filter((t: any) => t.active !== false && isToday(t.expires_at));
  };

  // Helper para verificar se a tarefa extra já foi liberada pelo horário de início
  const isTimeReleased = (startTime?: string) => {
    if (!startTime) return true;
    try {
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();

      if (currentHours > startHours) return true;
      if (currentHours === startHours && currentMinutes >= startMinutes) return true;
      return false;
    } catch (e) {
      return true;
    }
  };

  // Helper para verificar se uma tarefa extra foi concluída hoje pelo usuário
  const isExtraTaskDone = (taskId: string, challengeId: string) => {
    if (challengeId.startsWith('chal') && user) {
      if (MOCK_EXTRA_TASKS[challengeId]) {
        const task = MOCK_EXTRA_TASKS[challengeId].find((t: any) => t.id === taskId);
        return task ? task.completed_by.includes(user.id) : false;
      }
      return false;
    }
    return todayCheckins.some((c: any) => c.note && c.note.includes(`[EXTRA_TASK_ID:${taskId}]`));
  };

  const checkPendingInvite = useCallback(async () => {
    const code = getPendingInviteCode();
    if (!code || !user) return;

    // Limpar o código imediatamente para evitar loops de recarga
    setPendingInviteCode(null);

    try {
      setLoading(true);

      // 1. Buscar o grupo pelo código de convite no Supabase
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('invite_code', code)
        .maybeSingle();

      if (groupError || !group) {
        Alert.alert('Erro', 'Grupo de convite não encontrado ou código inválido.');
        setLoading(false);
        return;
      }

      setLoading(false);
      // 2. Perguntar ao usuário se ele deseja entrar no grupo
      Alert.alert(
        'Convite Recebido!',
        `Deseja entrar no grupo "${group.name}"?`,
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => setLoading(false)
          },
          {
            text: 'Entrar no Grupo',
            onPress: () => handleJoinGroup(group.id, group.name)
          }
        ]
      );
    } catch (err) {
      console.error('Erro ao processar convite:', err);
      Alert.alert('Erro', 'Ocorreu um erro ao processar o convite.');
      setLoading(false);
    }
  }, [user, profile]);

  const checkChallengeInvitations = useCallback(() => {
    if (!user) return;
    
    // Buscar convites pendentes para o usuário logado
    const pendingInvites = MOCK_CHALLENGE_INVITATIONS.filter(
      inv => inv.invited_user_id === user.id && inv.status === 'pending'
    );

    if (pendingInvites.length > 0) {
      const invite = pendingInvites[0];

      const acceptAction = () => {
        invite.status = 'accepted';
        
        if (!MOCK_RANKINGS[invite.challenge_id]) {
          MOCK_RANKINGS[invite.challenge_id] = [];
        }
        
        const alreadyInRanking = MOCK_RANKINGS[invite.challenge_id].some(m => m.user_id === user.id);
        if (!alreadyInRanking) {
          MOCK_RANKINGS[invite.challenge_id].push({
            user_id: user.id,
            name: profile?.full_name || 'Participante',
            avatar_url: profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
            points: 0,
            streak: 0,
            rounds_won: 0
          });
        }

        if (Platform.OS === 'web') {
          window.alert('Você aceitou o convite do desafio!');
        } else {
          Alert.alert('Sucesso', 'Você aceitou o convite do desafio!');
        }
        
        api.getDashboardData(user.id).then((data) => {
          setGroups(data.groups);
          setHabits(data.habits);
        });

        checkChallengeInvitations();
      };

      const declineAction = () => {
        invite.status = 'declined';
        checkChallengeInvitations();
      };

      if (Platform.OS === 'web') {
        const confirm = window.confirm(`Você foi convidado para participar do desafio "${invite.challenge_name}" no grupo "${invite.group_name}". Deseja aceitar? (Pressione OK para aceitar ou Cancelar para recusar)`);
        if (confirm) {
          acceptAction();
        } else {
          declineAction();
        }
      } else {
        Alert.alert(
          'Convite de Desafio!',
          `Você foi convidado para participar do desafio "${invite.challenge_name}" no grupo "${invite.group_name}". Deseja aceitar?`,
          [
            {
              text: 'Recusar',
              style: 'destructive',
              onPress: declineAction
            },
            {
              text: 'Aceitar',
              onPress: acceptAction
            }
          ]
        );
      }
    }
  }, [user, profile]);

  const handleJoinWithCode = async (code: string) => {
    if (!user) {
      showAlert('Erro', 'Você precisa estar logado para entrar em um grupo.');
      return;
    }
    if (!code || code.trim() === '') {
      showAlert('Erro', 'Por favor, digite um código de convite válido.');
      return;
    }

    try {
      setLoading(true);
      const cleanCode = code.trim().toUpperCase();

      // Se for um código mockado de testes locais, entra direto sem chamar o Supabase
      if (cleanCode === 'MOCK123' || cleanCode === 'TRINO1' || cleanCode === 'GRUPO1') {
        const groupId = 'group_1';
        const groupName = 'Grupo de Testes Renato';
        await handleJoinGroup(groupId, groupName);
        setInviteCode('');
        return;
      }

      // 1. Buscar o grupo pelo código de convite no Supabase
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('invite_code', cleanCode)
        .maybeSingle();

      if (groupError || !group) {
        showAlert(
          'Grupo não encontrado',
          'Não encontramos nenhum grupo para este código.\n\nSe estiver utilizando o Supabase de produção, certifique-se de que a política RLS (Row Level Security) de SELECT da tabela "groups" permite que usuários autenticados leiam os registros (ou utilize o código mockado MOCK123 para testes locais).'
        );
        return;
      }

      // 2. Associar ao grupo (handleJoinGroup cuidará do resto)
      await handleJoinGroup(group.id, group.name);
      setInviteCode('');
    } catch (err: any) {
      console.error('Erro ao entrar no grupo com código:', err);
      showAlert('Erro', err.message || 'Falha ao entrar no grupo.');
    } finally {
      setLoading(false);
    }
  };

  const handleScanQRCode = () => {
    setLoading(true);
    if (Platform.OS === 'web') {
      const code = window.prompt("Escaneie o QR Code digitando o código impresso nele (Ex: MOCK123):", "MOCK123");
      if (code) {
        handleJoinWithCode(code);
      } else {
        setLoading(false);
      }
    } else {
      showAlert(
        'Simulador de Leitor QR Code',
        'Câmera do dispositivo aberta. Posicione o QR Code do convite no centro da tela...',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => setLoading(false)
          },
          {
            text: 'Simular Leitura de "MOCK123"',
            onPress: () => {
              handleJoinWithCode('MOCK123');
            }
          }
        ]
      );
    }
  };

  const handleJoinGroup = async (groupId: string, groupName: string) => {
    if (!user) return;
    try {
      setLoading(true);
      
      const isMock = groupId.startsWith('group');
      if (isMock) {
        // Simulação de inserção no grupo mockado local
        const alreadyInGroup = USER_MOCK_GROUPS.some((g: any) => g.id === groupId);
        if (!alreadyInGroup) {
          USER_MOCK_GROUPS.push({
            id: groupId,
            name: groupName,
            description: groupId === 'group_1' ? 'Grupo de Testes Renato' : 'Outro Grupo de Testes'
          });
        }
      } else {
        // 1. Inserir na tabela group_members
        const { error: joinError } = await supabase
          .from('group_members')
          .insert({
            user_id: user.id,
            group_id: groupId,
            role: 'member'
          });

        if (joinError) {
          // Se já for membro, o insert falhará com primary key violation
          if (joinError.code === '23505' || joinError.message.includes('duplicate key') || joinError.message.includes('already exists')) {
            showAlert('Aviso', `Você já faz parte do grupo "${groupName}".`);
            
            // Recarregar os dados do dashboard mesmo se já for membro
            const data = await api.getDashboardData(user.id);
            setGroups(data.groups);
            setHabits(data.habits);
            return;
          }
          throw joinError;
        }
      }

      showAlert(
        'Sucesso!', 
        `Você entrou no grupo "${groupName}"!\n\nSe houver um desafio ativo, acesse a página deste grupo para solicitar a sua entrada.`
      );

      // Recarregar os dados do dashboard
      const data = await api.getDashboardData(user.id);
      setGroups(data.groups);
      setHabits(data.habits);
      setTodayCheckins(data.todayCheckins || []);
      setTasks(data.tasks || []);
    } catch (err: any) {
      showAlert('Erro', err.message || 'Erro ao entrar no grupo.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      // Carregar o tema da semana cadastrado pelo admin
      api.getWeeklyTheme().then(theme => {
        if (theme && theme.text) {
          setWeeklyTheme(theme);
        }
      });

      if (!user) return;
      setLoading(true);

      const loadAllData = async () => {
        await getMockRankings();
        await getChallengeRequests();

        api.getDashboardData(user.id).then((data) => {
          setGroups(data.groups);
          setHabits(data.habits);
          setTodayCheckins(data.todayCheckins || []);
          setTasks(data.tasks || []);
          if (data.streakCount !== undefined) {
            setStreakCount(data.streakCount);
          }
          setLoading(false);
          
          // Verificar se há convites pendentes na memória global
          checkPendingInvite();
          // Verificar se há convites para desafios
          checkChallengeInvitations();
        });
      };
      loadAllData();
    }, [user, checkPendingInvite, checkChallengeInvitations])
  );

  // Calcular soma de tarefas e check-ins concluídos de todos os desafios ativos hoje
  let totalTasksCount = 0;
  let completedTasksCount = 0;

  allActiveChallenges.forEach((item: any) => {
    // 3 hábitos diários por desafio
    totalTasksCount += 3;
    
    if (isHabitDone(item, 'prayer')) completedTasksCount += 1;
    if (isHabitDone(item, 'bible')) completedTasksCount += 1;
    if (isHabitDone(item, 'exercise')) completedTasksCount += 1;

    // Tarefas extras
    const extraTasks = getChallengeExtraTasks(item.challenge.id);
    totalTasksCount += extraTasks.length;

    extraTasks.forEach((task: any) => {
      if (isExtraTaskDone(task.id, item.challenge.id)) {
        completedTasksCount += 1;
      }
    });
  });

  if (loading && groups.length === 0) {
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
        <StatusBar barStyle="dark-content" />

        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerFade }]}>
          <View style={styles.headerLeft}>
            <Avatar source={profile?.avatar_url ?? undefined} name={profile?.full_name || 'User'} size={44} />
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingText}>Olá,</Text>
              <Text style={styles.nameText}>{profile?.full_name?.split(' ')[0] || 'Visitante'}</Text>
            </View>
          </View>
          <StreakBadge count={streakCount} />
        </Animated.View>


        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Verse Card */}
          <Animated.View style={{ opacity: verseFade, transform: [{ translateY: verseSlide }] }}>
            <Card variant="gradient" gradientColors={COLORS.gradients.primaryWarm} style={styles.verseCard}>
              <MaterialCommunityIcons name="format-quote-open" size={36} color={COLORS.goldLight} style={styles.quoteIcon} />
              <Text style={styles.verseText}>{weeklyTheme.text}</Text>
              <Text style={styles.verseReference}>{weeklyTheme.reference}</Text>
            </Card>
          </Animated.View>


          <Animated.View style={{ opacity: contentFade, transform: [{ translateY: contentSlide }] }}>
            {/* Summary stats */}
            <View style={styles.summaryRow}>
              {[
                { value: groups.length, label: 'Grupos', color: COLORS.primary },
                { value: myActiveChallenges.length, label: 'Desafios', color: COLORS.secondary },
                { value: `${completedTasksCount}/${totalTasksCount}`, label: 'Hoje', color: COLORS.gold },
              ].map(({ value, label, color }) => (
                <View key={label} style={styles.summaryCard}>
                  <Text style={[styles.summaryNumber, { color }]}>{value}</Text>
                  <Text style={styles.summaryLabel}>{label}</Text>
                </View>
              ))}
            </View>

            {/* My Groups */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Meus Grupos</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity 
                  onPress={handleScanQRCode}
                  style={{ marginRight: SPACING.md }}
                  accessibilityLabel="Escanear QR Code de Convite"
                >
                  <MaterialCommunityIcons name="qrcode-scan" size={20} color={COLORS.secondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/create-group')}>
                  <MaterialCommunityIcons name="plus-circle-outline" size={22} color={COLORS.secondary} />
                </TouchableOpacity>
              </View>
            </View>

            {groups.length === 0 ? (
              <View style={styles.bentoContainer}>
                {/* Opção 1: Criar Novo Grupo (Premium) */}
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => router.push('/create-group')}
                  style={styles.bentoCardPrimary}
                >
                  <LinearGradient
                    colors={COLORS.gradients.primaryWarm}
                    style={styles.bentoGradient}
                  >
                    <View style={styles.bentoIconContainer}>
                      <MaterialCommunityIcons name="account-group" size={32} color={COLORS.goldLight} />
                    </View>
                    <View style={styles.bentoContent}>
                      <Text style={styles.bentoTitlePrimary}>Criar Novo Grupo</Text>
                      <Text style={styles.bentoSubtitlePrimary}>
                        Monte sua comunidade para treinar e crescer espiritualmente em grupo.
                      </Text>
                    </View>
                    <View style={styles.bentoArrow}>
                      <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.goldLight} />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Opção 2: Entrar com Código ou QR Code */}
                <Card variant="default" style={styles.bentoCardSecondary}>
                  <View style={styles.bentoHeaderSecondary}>
                    <View style={[styles.bentoIconContainer, { backgroundColor: '#f0f4f0' }]}>
                      <MaterialCommunityIcons name="qrcode-scan" size={24} color={COLORS.secondary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: SPACING.md }}>
                      <Text style={styles.bentoTitleSecondary}>Entrar em um Grupo</Text>
                      <Text style={styles.bentoSubtitleSecondary}>Insira o código de convite enviado por um amigo.</Text>
                    </View>
                  </View>

                  <View style={styles.inviteInputRow}>
                    <TextInput
                      style={styles.inviteTextInput}
                      placeholder="Código do Convite (ex: MOCK123)"
                      placeholderTextColor={COLORS.textLight}
                      value={inviteCode}
                      onChangeText={setInviteCode}
                      autoCapitalize="characters"
                      maxLength={15}
                    />
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleJoinWithCode(inviteCode)}
                      style={styles.inviteButton}
                    >
                      <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>ou se preferir</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleScanQRCode}
                    style={styles.scanButton}
                  >
                    <MaterialCommunityIcons name="camera-outline" size={18} color={COLORS.secondary} />
                    <Text style={styles.scanButtonText}>Escanear QR Code</Text>
                  </TouchableOpacity>
                </Card>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={styles.groupsScroll}>
                {groups.map((group: any) => {
                  return (
                    <TouchableOpacity
                      key={group.id}
                      activeOpacity={0.9}
                      onPress={() => router.push({ pathname: '/group-dashboard', params: { groupId: group.id } })}
                    >
                      <Card variant="default" style={styles.groupCard}>
                        <View style={styles.groupCardHeader}>
                          <LinearGradient
                            colors={COLORS.gradients.sage}
                            style={styles.groupAvatar}
                          >
                            <Text style={styles.groupAvatarText}>{group.name?.[0]?.toUpperCase()}</Text>
                          </LinearGradient>
                          {group.role === 'admin' && (
                            <MaterialCommunityIcons name="crown" size={14} color={COLORS.gold} />
                          )}
                        </View>
                        <Text style={styles.groupCardName} numberOfLines={1}>{group.name}</Text>
                        
                        <View style={styles.groupMetaContainer}>
                          <View style={styles.groupMetaItem}>
                            <MaterialCommunityIcons name="account-group-outline" size={14} color={COLORS.textSecondary} />
                            <Text style={styles.groupMetaText}>
                              {group.memberCount ?? 0} {group.memberCount === 1 ? 'membro' : 'membros'}
                            </Text>
                          </View>
                          <View style={styles.groupMetaItem}>
                            <MaterialCommunityIcons name="trophy-outline" size={14} color={COLORS.gold} />
                            <Text style={styles.groupMetaText}>
                              {group.activeChallengesCount ?? 0} {group.activeChallengesCount === 1 ? 'ativo' : 'ativos'}
                            </Text>
                          </View>
                        </View>
                      </Card>
                    </TouchableOpacity>
                  );
                })}

                {/* Card de Acesso para novo grupo */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      const code = window.prompt("Digite o código de acesso do convite para entrar no grupo:");
                      if (code) handleJoinWithCode(code);
                    } else {
                      Alert.prompt(
                        "Entrar em um Grupo",
                        "Digite o código de acesso do convite:",
                        [
                          { text: "Cancelar", style: "cancel" },
                          { text: "Entrar", onPress: (code?: string) => { if (code) handleJoinWithCode(code); } }
                        ],
                        "plain-text"
                      );
                    }
                  }}
                >
                  <Card variant="flat" style={[styles.groupCard, { justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: 'transparent' }]}>
                    <View style={[styles.groupAvatar, { backgroundColor: COLORS.surfaceVariant, marginBottom: SPACING.xs }]}>
                      <MaterialCommunityIcons name="plus" size={24} color={COLORS.secondary} />
                    </View>
                    <Text style={[styles.groupCardName, { color: COLORS.secondary, textAlign: 'center', fontWeight: 'bold' }]}>Entrar em Grupo</Text>
                    <Text style={{ fontSize: 9, color: COLORS.textLight, textAlign: 'center', marginTop: 4 }}>Código do convite</Text>
                  </Card>
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* Meus Desafios */}
            <View style={[styles.sectionHeader, { marginTop: SPACING.lg }]}>
              <Text style={styles.sectionTitle}>Meus Desafios</Text>
            </View>

            {myActiveChallenges.length === 0 ? (
              <Card variant="flat" style={styles.noChallengesCard}>
                <MaterialCommunityIcons name="trophy-outline" size={24} color={COLORS.textLight} />
                <Text style={styles.noChallengesText}>Você não participa de nenhum desafio ativo</Text>
              </Card>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={styles.groupsScroll}>
                {myActiveChallenges.map((item: any) => {
                  const challenge = item.challenge;
                  const daysLeft = Math.ceil((new Date(challenge.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <TouchableOpacity
                      key={challenge.id}
                      activeOpacity={0.9}
                      onPress={() => router.push({ pathname: '/(tabs)/challenge', params: { challengeId: challenge.id } })}
                    >
                      <Card variant="gradient" gradientColors={COLORS.gradients.primary} style={styles.groupCard}>
                        <View style={styles.groupCardHeader}>
                          <View style={[styles.groupAvatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                            <MaterialCommunityIcons name="trophy" size={20} color={COLORS.goldLight} />
                          </View>
                        </View>
                        <Text style={[styles.groupCardName, { color: '#fff' }]} numberOfLines={1}>
                          {challenge.title}
                        </Text>
                        <Text style={[styles.groupCardChallenge, { color: COLORS.goldLight }]} numberOfLines={1}>
                          {item.groupName}
                        </Text>
                        <View style={styles.groupCardFooter}>
                          <ProgressBar progress={0.65} height={4} showPercentage={false} style={{ width: '100%' }} />
                          <Text style={[styles.groupCardDays, { color: 'rgba(255,255,255,0.8)' }]}>{daysLeft}d restantes</Text>
                        </View>
                      </Card>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Check-ins de Hoje */}
            <View style={[styles.habitsSection, groups.length === 0 && { opacity: 0.6 }]}>
              <Text style={styles.sectionTitle}>Check-ins de Hoje</Text>
              <Text style={styles.sectionSubtitle}>
                {groups.length === 0 
                  ? 'Crie ou entre em um grupo para fazer check-ins.'
                  : 'Registre o seu hábito tocando nos ícones à direita:'}
              </Text>

              {groups.length === 0 ? (
                <Card variant="flat" style={styles.noChallengesCard}>
                  <MaterialCommunityIcons name="check-decagram-outline" size={24} color={COLORS.textLight} />
                  <Text style={styles.noChallengesText}>Nenhum check-in disponível no momento</Text>
                </Card>
              ) : myActiveChallenges.length === 0 ? (
                <Card variant="flat" style={styles.noChallengesCard}>
                  <MaterialCommunityIcons name="trophy-outline" size={24} color={COLORS.textLight} />
                  <Text style={styles.noChallengesText}>Nenhum desafio ativo para check-in</Text>
                </Card>
              ) : (
                <View style={styles.compactChallengesContainer}>
                  {myActiveChallenges.map((item: any, index: number) => {
                    const challenge = item.challenge;
                    
                    const prayerDone = isHabitDone(item, 'prayer');
                    const bibleDone = isHabitDone(item, 'bible');
                    const exerciseDone = isHabitDone(item, 'exercise');

                    return (
                      <View 
                        key={challenge.id}
                        style={[
                          styles.compactChallengeItem,
                          index === myActiveChallenges.length - 1 && { borderBottomWidth: 0 },
                          { flexDirection: 'column', alignItems: 'stretch' }
                        ]}
                      >
                        <View style={styles.compactChallengeHeaderRow}>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => router.push({ pathname: '/(tabs)/challenge', params: { challengeId: challenge.id } })}
                            style={styles.compactChallengeLeft}
                          >
                            <View style={styles.compactChallengeIconBg}>
                              <MaterialCommunityIcons name="trophy" size={16} color={COLORS.gold} />
                            </View>
                            <View style={styles.compactChallengeInfo}>
                              <Text style={styles.compactChallengeTitle} numberOfLines={1}>
                                {challenge.title}
                              </Text>
                              <Text style={styles.compactChallengeSubtitle} numberOfLines={1}>
                                {item.groupName}
                              </Text>
                            </View>
                          </TouchableOpacity>

                          <View style={styles.compactHabitsRow}>
                            {/* Hábito: Oração */}
                            <TouchableOpacity
                              activeOpacity={0.8}
                              disabled={prayerDone}
                              onPress={() => router.push({ 
                                pathname: '/(tabs)/checkin', 
                                params: { challengeId: challenge.id, habit: 'prayer' } 
                              })}
                              style={[
                                styles.miniHabitButton,
                                prayerDone ? { backgroundColor: COLORS.gold } : styles.miniHabitButtonPending
                              ]}
                            >
                              <MaterialCommunityIcons 
                                name={prayerDone ? "check-bold" : HABIT_LABELS.prayer.icon as any} 
                                size={12} 
                                color="#fff" 
                              />
                            </TouchableOpacity>

                            {/* Hábito: Bíblia */}
                            <TouchableOpacity
                              activeOpacity={0.8}
                              disabled={bibleDone}
                              onPress={() => router.push({ 
                                pathname: '/(tabs)/checkin', 
                                params: { challengeId: challenge.id, habit: 'bible' } 
                              })}
                              style={[
                                styles.miniHabitButton,
                                bibleDone ? { backgroundColor: COLORS.primaryLight } : styles.miniHabitButtonPending
                              ]}
                            >
                              <MaterialCommunityIcons 
                                name={bibleDone ? "check-bold" : HABIT_LABELS.bible.icon as any} 
                                size={12} 
                                color="#fff" 
                              />
                            </TouchableOpacity>

                            {/* Hábito: Exercício */}
                            <TouchableOpacity
                              activeOpacity={0.8}
                              disabled={exerciseDone}
                              onPress={() => router.push({ 
                                pathname: '/(tabs)/checkin', 
                                params: { challengeId: challenge.id, habit: 'exercise' } 
                              })}
                              style={[
                                styles.miniHabitButton,
                                exerciseDone ? { backgroundColor: COLORS.secondary } : styles.miniHabitButtonPending
                              ]}
                            >
                              <MaterialCommunityIcons 
                                name={exerciseDone ? "check-bold" : HABIT_LABELS.exercise.icon as any} 
                                size={12} 
                                color="#fff" 
                              />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Fileira de Tarefas Extras Compacta */}
                        {(() => {
                          const challengeExtraTasks = getChallengeExtraTasks(challenge.id);
                          if (challengeExtraTasks.length === 0) return null;
                          return (
                            <View style={styles.extraTasksRow}>
                              {challengeExtraTasks.map((task: any) => {
                                const done = isExtraTaskDone(task.id, challenge.id);
                                const released = isTimeReleased(task.start_time);
                                
                                const handlePress = () => {
                                  if (done) return;
                                  if (!released) {
                                    Alert.alert(
                                      'Tarefa Não Liberada',
                                      `Esta tarefa estará disponível para check-in somente a partir das ${task.start_time}.`
                                    );
                                    return;
                                  }
                                  router.push({
                                    pathname: '/(tabs)/checkin',
                                    params: { challengeId: challenge.id, taskId: task.id }
                                  });
                                };

                                return (
                                  <TouchableOpacity
                                    key={task.id}
                                    activeOpacity={done ? 1 : 0.8}
                                    onPress={handlePress}
                                    style={[
                                      styles.miniTaskBadge,
                                      done 
                                        ? styles.miniTaskBadgeCompleted 
                                        : !released 
                                          ? styles.miniTaskBadgeLocked 
                                          : styles.miniTaskBadgePending
                                    ]}
                                  >
                                    <MaterialCommunityIcons 
                                      name={done ? "star" : !released ? "lock-outline" : "star-outline"} 
                                      size={10} 
                                      color={done ? "#fff" : !released ? '#8e8e93' : COLORS.goldDark} 
                                      style={{ marginRight: 2 }}
                                    />
                                    <Text 
                                      style={[
                                        styles.miniTaskBadgeText,
                                        done 
                                          ? styles.miniTaskBadgeTextCompleted 
                                          : !released 
                                            ? styles.miniTaskBadgeTextLocked 
                                            : styles.miniTaskBadgeTextPending
                                      ]}
                                      numberOfLines={1}
                                    >
                                      {task.title}{!released && task.start_time ? ` (Libera às ${task.start_time})` : ''}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          );
                        })()}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </Animated.View>

          <SupportCard />

          <View style={{ height: Platform.OS === 'ios' ? 100 : 80 }} />
        </ScrollView>
      </SafeAreaView>
    </WebContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  greetingContainer: { marginLeft: SPACING.md },
  greetingText: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.body, color: COLORS.textLight },
  nameText: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.heading, color: COLORS.primary },
  scrollContent: { paddingBottom: 120 },

  // Verse
  verseCard: {
    marginHorizontal: SPACING.xl, marginTop: SPACING.lg, marginBottom: SPACING.lg,
    padding: SPACING.xl, position: 'relative',
  },
  quoteIcon: { position: 'absolute', top: SPACING.md, left: SPACING.md, opacity: 0.15 },
  verseText: {
    color: '#fff', fontSize: FONTS.size.md, fontFamily: FONTS.family.body,
    fontStyle: 'italic', lineHeight: 24, textAlign: 'center', marginBottom: SPACING.sm,
  },
  verseReference: { color: COLORS.goldLight, fontSize: FONTS.size.sm, fontFamily: FONTS.family.bodySemibold, textAlign: 'right' },

  // Summary row
  summaryRow: {
    flexDirection: 'row', marginHorizontal: SPACING.xl, marginBottom: SPACING.lg, gap: SPACING.sm,
  },
  summaryCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.light,
  },
  summaryNumber: { fontSize: FONTS.size.xl, fontFamily: FONTS.family.heading },
  summaryLabel: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.bodyMedium, color: COLORS.textLight, marginTop: 2 },

  // Section
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.xl, marginBottom: SPACING.md,
  },
  sectionTitle: { fontSize: FONTS.size.lg, fontFamily: FONTS.family.heading, color: COLORS.primary },
  sectionSubtitle: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.body, color: COLORS.textLight, marginBottom: SPACING.md },

  // Group cards
  groupsScroll: { 
    paddingHorizontal: SPACING.xl, 
    paddingBottom: Platform.OS === 'web' ? SPACING.md : SPACING.sm, 
    gap: SPACING.sm 
  },
  groupCard: { width: 180, padding: SPACING.md },
  groupCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm,
  },
  groupAvatar: {
    width: 36, height: 36, borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center', alignItems: 'center',
  },
  groupAvatarText: { color: '#fff', fontFamily: FONTS.family.heading, fontSize: FONTS.size.md },
  groupCardName: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bodySemibold, color: COLORS.primary },
  groupMetaContainer: {
    marginTop: SPACING.xs,
    gap: 4,
  },
  groupMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  groupMetaText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: FONTS.family.body,
  },
  groupCardChallenge: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.body, color: COLORS.textSecondary, marginTop: 2 },
  groupCardNoChallenge: { fontSize: FONTS.size.xs, color: COLORS.secondary, marginTop: SPACING.sm, fontFamily: FONTS.family.bodySemibold },
  groupCardFooter: { marginTop: SPACING.sm },
  groupCardDays: { fontSize: 10, fontFamily: FONTS.family.bodyMedium, color: COLORS.textLight, marginTop: 4 },

  // Habits
  habitsSection: { paddingHorizontal: SPACING.xl, marginTop: SPACING.lg, marginBottom: SPACING.lg },
  habitsGrid: { gap: SPACING.md },
  habitCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.light,
  },
  habitCardCompleted: { backgroundColor: COLORS.secondaryMuted, borderColor: 'rgba(61, 123, 84, 0.2)' },
  habitIconBg: { width: 44, height: 44, borderRadius: BORDER_RADIUS.md, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
  habitInfo: { flex: 1 },
  habitTitle: { fontSize: FONTS.size.md, fontFamily: FONTS.family.bodySemibold, color: COLORS.primary },
  habitDesc: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.body, color: COLORS.textSecondary },
  habitStatusContainer: { justifyContent: 'center' },
  statusBadge: {
    paddingHorizontal: SPACING.sm + 2, paddingVertical: SPACING.xs,
    backgroundColor: COLORS.surfaceVariant, borderRadius: BORDER_RADIUS.full,
  },
  statusBadgeCompleted: { backgroundColor: COLORS.secondary, flexDirection: 'row', alignItems: 'center', gap: 3 },
  statusText: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.bodySemibold, color: COLORS.textSecondary },
  statusTextCompleted: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.bodyBold, color: '#fff' },

  // Shortcuts
  shortcutsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl, gap: SPACING.sm,
  },
  shortcutCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.light,
  },
  shortcutIconBg: { width: 40, height: 40, borderRadius: BORDER_RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  shortcutTitle: { fontSize: FONTS.size.sm, fontFamily: FONTS.family.bodySemibold, color: COLORS.primary },
  shortcutSubtitle: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.body, color: COLORS.textLight },

  // Welcome empty state
  noGroupsCard: {
    marginHorizontal: SPACING.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.surface,
  },
  noGroupsIconBg: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.secondaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  noGroupsTitle: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.heading,
    color: COLORS.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  noGroupsSubtitle: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  noChallengesCard: {
    marginHorizontal: SPACING.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceVariant,
  },
  noChallengesText: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.body,
    color: COLORS.textSecondary,
  },
  emptyGroupDashboardCard: {
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  emptyGroupIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.secondaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyGroupDashboardTitle: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.heading,
    color: COLORS.primary,
    fontWeight: FONTS.weight.bold,
  },
  emptyGroupDashboardSubtitle: {
    fontSize: 10,
    fontFamily: FONTS.family.body,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  // Compact Challenges
  compactChallengesContainer: {
    marginHorizontal: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.light,
  },
  compactChallengeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  compactChallengeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  compactChallengeIconBg: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactChallengeInfo: {
    flex: 1,
  },
  compactChallengeTitle: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bodySemibold,
    color: COLORS.primary,
  },
  compactChallengeSubtitle: {
    fontSize: 10,
    fontFamily: FONTS.family.body,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  compactChallengeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  compactChallengeDays: {
    fontSize: 10,
    fontFamily: FONTS.family.bodyMedium,
    color: COLORS.textLight,
  },
  compactHabitsRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    alignItems: 'center',
  },
  miniHabitButton: {
    width: 28,
    height: 28,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniHabitButtonPending: {
    backgroundColor: COLORS.border,
  },
  compactChallengeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  extraTasksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingLeft: 48,
  },
  miniTaskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
  },
  miniTaskBadgePending: {
    backgroundColor: '#fff9eb',
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  miniTaskBadgeCompleted: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  miniTaskBadgeLocked: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  miniTaskBadgeText: {
    fontSize: 9,
    fontFamily: FONTS.family.bodyMedium,
  },
  miniTaskBadgeTextPending: {
    color: COLORS.goldDark,
  },
  miniTaskBadgeTextCompleted: {
    color: '#fff',
  },
  miniTaskBadgeTextLocked: {
    color: '#8e8e93',
  },
  bentoContainer: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  bentoCardPrimary: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.light,
  },
  bentoGradient: {
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 110,
  },
  bentoIconContainer: {
    width: 46,
    height: 46,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bentoContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  bentoTitlePrimary: {
    fontSize: 16,
    fontFamily: FONTS.family.heading,
    color: '#fff',
  },
  bentoSubtitlePrimary: {
    fontSize: 11,
    fontFamily: FONTS.family.body,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
    lineHeight: 15,
  },
  bentoArrow: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bentoCardSecondary: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bentoHeaderSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bentoTitleSecondary: {
    fontSize: 16,
    fontFamily: FONTS.family.heading,
    color: COLORS.text,
  },
  bentoSubtitleSecondary: {
    fontSize: 11,
    fontFamily: FONTS.family.body,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  inviteInputRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  inviteTextInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    fontSize: 13,
    fontFamily: FONTS.family.body,
    color: COLORS.text,
    backgroundColor: '#fbfbfb',
  },
  inviteButton: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.secondary,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.light,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: 10,
    fontFamily: FONTS.family.body,
    color: COLORS.textLight,
    paddingHorizontal: SPACING.sm,
    marginHorizontal: SPACING.sm,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
  },
  scanButtonText: {
    fontSize: 12,
    fontFamily: FONTS.family.bodyMedium,
    color: COLORS.secondary,
  },
});
