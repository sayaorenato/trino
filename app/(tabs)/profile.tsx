import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  Platform,
  ActivityIndicator,
  Alert,
  Share,
  Modal,
  TextInput,
  KeyboardAvoidingView
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/auth';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { WebContainer } from '../../components/ui/WebContainer';
import { SupportCard } from '../../components/SupportCard';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, SHADOWS } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [hasAdminGroups, setHasAdminGroups] = useState(false);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);

  // Estados para Modal de Edição de Dados (Nome e Senha)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // Estados para Modal de Versículo / Tema da Semana (Admin)
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [themeText, setThemeText] = useState('');
  const [themeReference, setThemeReference] = useState('');
  const [savingTheme, setSavingTheme] = useState(false);
  const [themeError, setThemeError] = useState('');
  const [themeSuccess, setThemeSuccess] = useState('');

  const handleOpenThemeModal = async () => {
    setThemeError('');
    setThemeSuccess('');
    setSavingTheme(true);
    setIsThemeModalOpen(true);

    try {
      const currentTheme = await api.getWeeklyTheme();
      setThemeText(currentTheme.text || '');
      setThemeReference(currentTheme.reference || '');
    } catch (err) {
      console.error('Erro ao carregar tema atual:', err);
    } finally {
      setSavingTheme(false);
    }
  };

  const handleSaveTheme = async () => {
    if (!themeText.trim()) {
      setThemeError('O texto do versículo/assunto não pode ficar em branco.');
      return;
    }

    setThemeError('');
    setThemeSuccess('');
    setSavingTheme(true);

    try {
      await api.updateWeeklyTheme({
        text: themeText.trim(),
        reference: themeReference.trim() || 'Tema da Semana'
      });

      const msg = 'Versículo/Assunto Tema atualizado com sucesso!';
      setThemeSuccess(msg);

      if (Platform.OS === 'web') {
        window.alert(msg);
        setIsThemeModalOpen(false);
      } else {
        Alert.alert('Sucesso', msg, [
          { text: 'OK', onPress: () => setIsThemeModalOpen(false) }
        ]);
      }
    } catch (err: any) {
      console.error('Erro ao salvar tema:', err);
      setThemeError(err.message || 'Erro ao salvar o tema da semana.');
    } finally {
      setSavingTheme(false);
    }
  };


  const handleOpenEditModal = () => {
    setEditFullName(profile?.full_name || '');
    setNewPassword('');
    setConfirmPassword('');
    setEditError('');
    setEditSuccess('');
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    const trimmedName = editFullName.trim();
    if (!trimmedName) {
      setEditError('O nome completo não pode ficar em branco.');
      return;
    }

    const wantsPasswordChange = newPassword.length > 0 || confirmPassword.length > 0;
    if (wantsPasswordChange) {
      if (newPassword.length < 6) {
        setEditError('A nova senha deve ter no mínimo 6 caracteres.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setEditError('A confirmação da senha não coincide.');
        return;
      }
    }

    setEditError('');
    setEditSuccess('');
    setSavingProfile(true);

    try {
      let nameUpdated = false;
      let passwordUpdated = false;

      // 1. Atualizar Nome se foi alterado
      if (trimmedName !== (profile?.full_name || '')) {
        await api.updateProfileName(user.id, trimmedName);
        await refreshProfile();
        nameUpdated = true;
      }

      // 2. Atualizar Senha se foi informada
      if (wantsPasswordChange) {
        await api.updatePassword(newPassword);
        passwordUpdated = true;
        setNewPassword('');
        setConfirmPassword('');
      }

      if (!nameUpdated && !passwordUpdated) {
        setEditError('Nenhuma alteração foi realizada.');
        setSavingProfile(false);
        return;
      }

      const successMessage = passwordUpdated && nameUpdated
        ? 'Nome e senha atualizados com sucesso!'
        : nameUpdated
        ? 'Nome de perfil atualizado com sucesso!'
        : 'Senha alterada com sucesso!';

      setEditSuccess(successMessage);

      if (Platform.OS === 'web') {
        window.alert(successMessage);
        setIsEditModalOpen(false);
      } else {
        Alert.alert('Sucesso', successMessage, [
          { text: 'OK', onPress: () => setIsEditModalOpen(false) }
        ]);
      }
    } catch (err: any) {
      console.error('Erro ao atualizar perfil:', err);
      setEditError(err.message || 'Erro ao atualizar dados do perfil.');
    } finally {
      setSavingProfile(false);
    }
  };


  const handleShareApp = async () => {
    const shareUrl = 'https://trino-cyan.vercel.app/';
    const shareMessage = `Venha fazer parte do Trino! Acompanhe hábitos, desafios e constância na fé com o aplicativo: ${shareUrl}`;

    try {
      if (Clipboard && typeof Clipboard.setStringAsync === 'function') {
        await Clipboard.setStringAsync(shareUrl);
      }
      
      if (Platform.OS === 'web') {
        window.alert('Link Copiado!\n\nO link de acesso do aplicativo foi copiado para a área de transferência. Escolha onde compartilhar!');
      } else {
        Alert.alert('Link Copiado!', 'O link de acesso do aplicativo foi copiado para a área de transferência. Escolha onde compartilhar!');
      }

      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({
          title: 'Trino — Fé em Constância',
          text: shareMessage,
          url: shareUrl,
        });
      } else {
        await Share.share({
          message: shareMessage,
          url: shareUrl,
          title: 'Trino — Fé em Constância',
        });
      }
    } catch (e) {
      console.log('Compartilhamento finalizado ou cancelado.');
    }
  };

  const handleChangeAvatar = async () => {
    if (!user) return;

    const uploadAndSaveAvatar = async (localUri: string) => {
      setUpdatingAvatar(true);
      try {
        const publicUrl = await api.uploadAvatarImage(user.id, localUri);
        if (!publicUrl) {
          throw new Error('Falha ao fazer upload do avatar.');
        }
        await api.updateProfileAvatar(user.id, publicUrl);
        await refreshProfile();
        
        if (Platform.OS === 'web') {
          window.alert('Foto de perfil atualizada com sucesso!');
        } else {
          Alert.alert('Sucesso', 'Foto de perfil atualizada!');
        }
      } catch (err: any) {
        console.error('Erro ao atualizar avatar:', err);
        if (Platform.OS === 'web') {
          window.alert(err.message || 'Erro ao atualizar foto de perfil.');
        } else {
          Alert.alert('Erro', err.message || 'Erro ao atualizar foto de perfil.');
        }
      } finally {
        setUpdatingAvatar(false);
      }
    };

    const pickFromGallery = async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        if (Platform.OS === 'web') {
          window.alert('Precisamos de acesso às fotos para alterar sua foto de perfil.');
        } else {
          Alert.alert('Permissão necessária', 'Precisamos de acesso às fotos para alterar sua foto de perfil.');
        }
        return;
      }
      try {
        let result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
        if (!result.canceled && result.assets && result.assets[0]) {
          await uploadAndSaveAvatar(result.assets[0].uri);
        }
      } catch (e) {
        console.error('Erro ao escolher imagem:', e);
      }
    };

    const takePhoto = async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        if (Platform.OS === 'web') {
          window.alert('Precisamos de acesso à câmera para tirar sua foto.');
        } else {
          Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para tirar sua foto.');
        }
        return;
      }
      try {
        let result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
        if (!result.canceled && result.assets && result.assets[0]) {
          await uploadAndSaveAvatar(result.assets[0].uri);
        }
      } catch (e) {
        console.error('Erro ao tirar foto:', e);
      }
    };

    if (Platform.OS === 'web') {
      const chooseOption = window.confirm("Deseja alterar sua foto de perfil?\n\nClique em OK para escolher da Galeria.\nClique em Cancelar para abrir a Câmera.");
      if (chooseOption) {
        await pickFromGallery();
      } else {
        try {
          await takePhoto();
        } catch (err) {
          console.error(err);
        }
      }
    } else {
      Alert.alert(
        'Alterar Foto de Perfil',
        'Escolha uma das opções abaixo:',
        [
          { text: 'Escolher da Galeria', onPress: pickFromGallery },
          { text: 'Tirar Foto', onPress: takePhoto },
          { text: 'Cancelar', style: 'cancel' }
        ]
      );
    }
  };

  useEffect(() => {
    if (!user) return;
    
    const isRenatoMock = user.email === 'renato@trino.app' || user.id === 'user_1';
    if (isRenatoMock) {
      setHasAdminGroups(true);
      return;
    }

    const checkAdminStatus = async () => {
      try {
        const { data } = await supabase
          .from('group_members')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .limit(1)
          .maybeSingle();

        setHasAdminGroups(!!data);
      } catch (err) {
        console.error('Erro ao verificar se possui grupos administrados:', err);
      }
    };

    checkAdminStatus();
  }, [user]);

  const [totalPoints, setTotalPoints] = useState(0);
  const [habitAverages, setHabitAverages] = useState({ prayer: 0, bible: 0, exercise: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchUserStats = async () => {
      try {
        setLoadingStats(true);

        // 1. Buscar todos os check-ins do usuário no Supabase
        const { data: allCheckins, error: checkinsError } = await supabase
          .from('checkins')
          .select('type, note, created_at')
          .eq('user_id', user.id);

        if (checkinsError) throw checkinsError;

        let points = 0;
        const fourWeeksAgo = new Date();
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
        fourWeeksAgo.setHours(0, 0, 0, 0);

        // Conjuntos para guardar dias únicos de check-in de cada hábito nas últimas 4 semanas
        const prayDays = new Set<string>();
        const bibleDays = new Set<string>();
        const workoutDays = new Set<string>();

        if (allCheckins) {
          allCheckins.forEach((c: any) => {
            // Calcular pontuação histórica total
            if (c.type === 'pray') {
              points += 10;
            } else if (c.type === 'bible') {
              points += 15;
            } else if (c.type === 'workout') {
              points += 20;
            }
            
            if (c.note && c.note.includes('[EXTRA_TASK_ID:')) {
              points += 30;
            }

            // Calcular a média móvel das últimas 4 semanas
            const checkinDate = new Date(c.created_at);
            if (checkinDate >= fourWeeksAgo) {
              const dayStr = checkinDate.toISOString().split('T')[0];
              if (c.type === 'pray') prayDays.add(dayStr);
              if (c.type === 'bible') bibleDays.add(dayStr);
              if (c.type === 'workout') workoutDays.add(dayStr);
            }
          });
        }

        setTotalPoints(points);

        // Média de conclusão baseada no número de dias únicos com check-in nos últimos 28 dias
        const prayerAvg = Math.round((prayDays.size / 28) * 100);
        const bibleAvg = Math.round((bibleDays.size / 28) * 100);
        const exerciseAvg = Math.round((workoutDays.size / 28) * 100);

        setHabitAverages({
          prayer: Math.min(100, prayerAvg),
          bible: Math.min(100, bibleAvg),
          exercise: Math.min(100, exerciseAvg),
        });

      } catch (err) {
        console.error('Erro ao buscar estatísticas do perfil:', err);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchUserStats();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <WebContainer>
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meu Perfil</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        
        {/* CARD PRINCIPAL DO USUÁRIO */}
        <Card variant="gradient" gradientColors={COLORS.gradients.primary} style={styles.userCard}>
          <View style={styles.userInfoRow}>
            <TouchableOpacity 
              activeOpacity={0.85} 
              onPress={handleChangeAvatar}
              disabled={updatingAvatar}
              style={styles.avatarWrapper}
            >
              <Avatar 
                source={profile?.avatar_url ?? undefined} 
                name={profile?.full_name || 'User'} 
                size={70} 
                style={styles.avatarBorder}
              />
              <View style={styles.cameraIconContainer}>
                {updatingAvatar ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialCommunityIcons name="camera" size={12} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
            <View style={styles.userInfoText}>
              <Text style={styles.userName}>{profile?.full_name}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>

            <TouchableOpacity 
              style={styles.editProfileCardButton}
              onPress={handleOpenEditModal}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="pencil-outline" size={16} color="#fff" />
              <Text style={styles.editProfileCardButtonText}>Editar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsDivider} />

          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statValue}>{profile?.streak_count ?? 0}d</Text>
              <Text style={styles.statLabel}>Streak Atual</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statValue}>{profile?.streak_count ?? 0}d</Text>
              <Text style={styles.statLabel}>Recorde</Text>
            </View>
            <View style={styles.statCol}>
              {loadingStats ? (
                <ActivityIndicator size="small" color="#fff" style={{ height: 27 }} />
              ) : (
                <Text style={styles.statValue}>{totalPoints}</Text>
              )}
              <Text style={styles.statLabel}>Pontos</Text>
            </View>
          </View>
        </Card>

        {/* ESTATÍSTICAS DOS TRÊS HÁBITOS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Desempenho de Hábitos</Text>
          <Text style={styles.sectionSubtitle}>Média de conclusão nas últimas 4 semanas</Text>

          <View style={styles.habitsStats}>
            {loadingStats ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ paddingVertical: SPACING.md }} />
            ) : (
              <>
                {/* ORAÇÃO */}
                <View style={styles.habitStatItem}>
                  <View style={[styles.habitIconBg, { backgroundColor: COLORS.gold }]}>
                    <MaterialCommunityIcons name="hands-pray" size={20} color="#fff" />
                  </View>
                  <View style={styles.habitStatDetails}>
                    <View style={styles.habitStatHeader}>
                      <Text style={styles.habitStatTitle}>Oração</Text>
                      <Text style={styles.habitStatPercentage}>{habitAverages.prayer}%</Text>
                    </View>
                    <View style={styles.barBg}>
                      <View style={[styles.barFill, { width: `${habitAverages.prayer}%`, backgroundColor: COLORS.gold }]} />
                    </View>
                  </View>
                </View>

                {/* BÍBLIA */}
                <View style={styles.habitStatItem}>
                  <View style={[styles.habitIconBg, { backgroundColor: COLORS.primary }]}>
                    <MaterialCommunityIcons name="book-open-variant" size={20} color="#fff" />
                  </View>
                  <View style={styles.habitStatDetails}>
                    <View style={styles.habitStatHeader}>
                      <Text style={styles.habitStatTitle}>Leitura Bíblica</Text>
                      <Text style={styles.habitStatPercentage}>{habitAverages.bible}%</Text>
                    </View>
                    <View style={styles.barBg}>
                      <View style={[styles.barFill, { width: `${habitAverages.bible}%`, backgroundColor: COLORS.primary }]} />
                    </View>
                  </View>
                </View>

                {/* EXERCÍCIO */}
                <View style={styles.habitStatItem}>
                  <View style={[styles.habitIconBg, { backgroundColor: COLORS.secondary }]}>
                    <MaterialCommunityIcons name="run-fast" size={20} color="#fff" />
                  </View>
                  <View style={styles.habitStatDetails}>
                    <View style={styles.habitStatHeader}>
                      <Text style={styles.habitStatTitle}>Exercício Físico</Text>
                      <Text style={styles.habitStatPercentage}>{habitAverages.exercise}%</Text>
                    </View>
                    <View style={styles.barBg}>
                      <View style={[styles.barFill, { width: `${habitAverages.exercise}%`, backgroundColor: COLORS.secondary }]} />
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* OPÇÕES E ATALHOS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configurações e Ações</Text>
          
          <Card variant="default" style={styles.optionsCard}>
            {/* Alterar Dados de Perfil */}
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={handleOpenEditModal}
            >
              <View style={styles.optionLeft}>
                <MaterialCommunityIcons name="account-edit-outline" size={22} color={COLORS.primary} />
                <Text style={styles.optionText}>Editar Dados (Nome e Senha)</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
            </TouchableOpacity>

            {/* Versículo / Assunto Tema (Admin) */}
            {hasAdminGroups && (
              <TouchableOpacity 
                style={styles.optionItem}
                onPress={handleOpenThemeModal}
              >
                <View style={styles.optionLeft}>
                  <MaterialCommunityIcons name="book-open-page-variant-outline" size={22} color={COLORS.primary} />
                  <Text style={styles.optionText}>Versículo/Assunto Tema</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            )}

            {/* Painel do Admin */}
            {hasAdminGroups && (
              <TouchableOpacity 
                style={styles.optionItem}
                onPress={() => router.push('/admin')}
              >
                <View style={styles.optionLeft}>
                  <MaterialCommunityIcons name="shield-crown-outline" size={22} color={COLORS.primary} />
                  <Text style={styles.optionText}>Painel do Admin</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            )}

            {/* Compartilhar App */}
            <TouchableOpacity 
              style={[styles.optionItem, { borderBottomWidth: 0 }]}
              onPress={handleShareApp}
            >
              <View style={styles.optionLeft}>

                <MaterialCommunityIcons name="share-variant-outline" size={22} color={COLORS.primary} />
                <Text style={styles.optionText}>Compartilhar Aplicativo</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* BOTÃO LOGOUT */}
        <View style={styles.logoutContainer}>
          <Button
            title="Sair da Conta"
            variant="outline"
            size="md"
            icon={<MaterialCommunityIcons name="logout" size={18} color={COLORS.error} />}
            onPress={handleSignOut}
            style={styles.logoutBtn}
            textStyle={{ color: COLORS.error }}
          />
          <Text style={styles.versionText}>Trino v1.0.0 — Fé em Constância</Text>
        </View>

        <SupportCard />

        {/* Espaçamento TabBar */}
        <View style={{ height: Platform.OS === 'ios' ? 100 : 80 }} />
      </ScrollView>

      {/* MODAL DE EDIÇÃO DE PERFIL */}
      <Modal
        visible={isEditModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboardAvoid}
          >
            <View style={styles.modalContent}>
              {/* Header do Modal */}
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleRow}>
                  <MaterialCommunityIcons name="account-edit-outline" size={24} color={COLORS.primary} />
                  <Text style={styles.modalTitle}>Editar Dados do Perfil</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setIsEditModalOpen(false)}
                  style={styles.closeModalButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialCommunityIcons name="close" size={22} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {editError ? (
                  <View style={styles.modalErrorContainer}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={16} color={COLORS.error} />
                    <Text style={styles.modalErrorText}>{editError}</Text>
                  </View>
                ) : null}

                {editSuccess ? (
                  <View style={styles.modalSuccessContainer}>
                    <MaterialCommunityIcons name="check-circle-outline" size={16} color={COLORS.secondary} />
                    <Text style={styles.modalSuccessText}>{editSuccess}</Text>
                  </View>
                ) : null}

                {/* Nome Completo */}
                <View style={styles.inputGroupModal}>
                  <Text style={styles.inputLabelModal}>Nome Completo</Text>
                  <View style={styles.inputWrapperModal}>
                    <MaterialCommunityIcons name="account-outline" size={20} color={COLORS.textLight} style={styles.inputIconModal} />
                    <TextInput
                      style={styles.textInputModal}
                      placeholder="Seu nome completo"
                      placeholderTextColor={COLORS.textLight}
                      value={editFullName}
                      onChangeText={setEditFullName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View style={styles.modalSectionDivider} />

                {/* Alterar Senha */}
                <Text style={styles.passwordSectionTitle}>Alterar Senha</Text>
                <Text style={styles.passwordSectionSubtitle}>Preencha apenas se desejar trocar a senha atual.</Text>

                <View style={styles.inputGroupModal}>
                  <Text style={styles.inputLabelModal}>Nova Senha</Text>
                  <View style={styles.inputWrapperModal}>
                    <MaterialCommunityIcons name="lock-outline" size={20} color={COLORS.textLight} style={styles.inputIconModal} />
                    <TextInput
                      style={styles.textInputModal}
                      placeholder="Mínimo 6 caracteres"
                      placeholderTextColor={COLORS.textLight}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.inputGroupModal}>
                  <Text style={styles.inputLabelModal}>Confirmar Nova Senha</Text>
                  <View style={styles.inputWrapperModal}>
                    <MaterialCommunityIcons name="lock-check-outline" size={20} color={COLORS.textLight} style={styles.inputIconModal} />
                    <TextInput
                      style={styles.textInputModal}
                      placeholder="Repita a nova senha"
                      placeholderTextColor={COLORS.textLight}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {/* Botões de Ação */}
                <View style={styles.modalActions}>
                  <Button
                    title="Salvar Alterações"
                    variant="primary"
                    size="lg"
                    loading={savingProfile}
                    onPress={handleSaveProfile}
                    style={styles.saveButton}
                  />
                  <Button
                    title="Cancelar"
                    variant="outline"
                    size="md"
                    disabled={savingProfile}
                    onPress={() => setIsEditModalOpen(false)}
                    style={styles.cancelButton}
                  />
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* MODAL DE EDIÇÃO DE VERSÍCULO / TEMA DA SEMANA (ADMIN) */}
      <Modal
        visible={isThemeModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsThemeModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboardAvoid}
          >
            <View style={styles.modalContent}>
              {/* Header do Modal */}
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleRow}>
                  <MaterialCommunityIcons name="book-open-page-variant-outline" size={24} color={COLORS.primary} />
                  <Text style={styles.modalTitle}>Versículo/Assunto Tema</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setIsThemeModalOpen(false)}
                  style={styles.closeModalButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialCommunityIcons name="close" size={22} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {themeError ? (
                  <View style={styles.modalErrorContainer}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={16} color={COLORS.error} />
                    <Text style={styles.modalErrorText}>{themeError}</Text>
                  </View>
                ) : null}

                {themeSuccess ? (
                  <View style={styles.modalSuccessContainer}>
                    <MaterialCommunityIcons name="check-circle-outline" size={16} color={COLORS.secondary} />
                    <Text style={styles.modalSuccessText}>{themeSuccess}</Text>
                  </View>
                ) : null}

                <Text style={styles.passwordSectionSubtitle}>
                  Defina o texto e a referência que serão exibidos no topo da tela Início para todos os membros.
                </Text>

                {/* Texto do Versículo / Assunto */}
                <View style={styles.inputGroupModal}>
                  <Text style={styles.inputLabelModal}>Texto do Versículo ou Tema</Text>
                  <View style={[styles.inputWrapperModal, { height: 'auto', minHeight: 90, alignItems: 'flex-start', paddingTop: SPACING.sm }]}>
                    <TextInput
                      style={[styles.textInputModal, { height: 'auto', minHeight: 80, textAlignVertical: 'top' }]}
                      placeholder="Ex: Não fui eu que ordenei a você? Seja forte e corajoso..."
                      placeholderTextColor={COLORS.textLight}
                      value={themeText}
                      onChangeText={setThemeText}
                      multiline
                      numberOfLines={4}
                    />
                  </View>
                </View>

                {/* Referência / Título */}
                <View style={styles.inputGroupModal}>
                  <Text style={styles.inputLabelModal}>Referência / Título do Tema</Text>
                  <View style={styles.inputWrapperModal}>
                    <MaterialCommunityIcons name="format-quote-close" size={20} color={COLORS.textLight} style={styles.inputIconModal} />
                    <TextInput
                      style={styles.textInputModal}
                      placeholder="Ex: Josué 1:9 • Tema da Semana"
                      placeholderTextColor={COLORS.textLight}
                      value={themeReference}
                      onChangeText={setThemeReference}
                    />
                  </View>
                </View>

                {/* Botões de Ação */}
                <View style={styles.modalActions}>
                  <Button
                    title="Salvar Tema da Semana"
                    variant="primary"
                    size="lg"
                    loading={savingTheme}
                    onPress={handleSaveTheme}
                    style={styles.saveButton}
                  />
                  <Button
                    title="Cancelar"
                    variant="outline"
                    size="md"
                    disabled={savingTheme}
                    onPress={() => setIsThemeModalOpen(false)}
                    style={styles.cancelButton}
                  />
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  headerTitle: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.heading,
    color: COLORS.primary,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: 120,
  },
  userCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBorder: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  userInfoText: {
    marginLeft: SPACING.md,
  },
  userName: {
    color: '#fff',
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.heading,
  },
  userEmail: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: FONTS.size.sm,
    marginTop: 2,
  },
  statsDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCol: {
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: FONTS.size.xl,
    fontFamily: FONTS.family.heading,
  },
  statLabel: {
    color: COLORS.goldLight,
    fontSize: 10,
    fontFamily: FONTS.family.bodySemibold,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.heading,
    color: COLORS.primary,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.body,
    color: COLORS.textLight,
    marginBottom: SPACING.md,
  },
  habitsStats: {
    backgroundColor: COLORS.surfaceCard,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: SPACING.md,
  },
  habitStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  habitIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  habitStatDetails: {
    flex: 1,
  },
  habitStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  habitStatTitle: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bodySemibold,
    color: COLORS.primary,
  },
  habitStatPercentage: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bodyBold,
    color: COLORS.textSecondary,
  },
  barBg: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  optionsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    marginLeft: SPACING.md,
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bodySemibold,
    color: COLORS.text,
  },
  logoutContainer: {
    marginTop: SPACING.md,
    alignItems: 'center',
    gap: SPACING.md,
  },
  logoutBtn: {
    width: '100%',
    borderColor: 'rgba(211, 47, 47, 0.3)',
  },
  versionText: {
    fontSize: FONTS.size.xs,
    color: COLORS.textLight,
  },
  avatarWrapper: {
    position: 'relative',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.secondary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  editProfileCardButton: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.lg,
    gap: 4,
  },
  editProfileCardButtonText: {
    color: '#fff',
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bodySemibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalKeyboardAvoid: {
    width: '100%',
    maxWidth: 500,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    maxHeight: '90%',
    ...SHADOWS.medium,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  modalTitle: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.heading,
    color: COLORS.primary,
  },
  closeModalButton: {
    padding: SPACING.xs,
  },
  modalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(192, 57, 43, 0.08)',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  modalErrorText: {
    flex: 1,
    color: COLORS.error,
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bodyMedium,
  },
  modalSuccessContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondaryMuted,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  modalSuccessText: {
    flex: 1,
    color: COLORS.secondary,
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bodyMedium,
  },
  inputGroupModal: {
    marginBottom: SPACING.md,
  },
  inputLabelModal: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bodySemibold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  inputWrapperModal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
  },
  inputIconModal: {
    marginRight: SPACING.sm,
  },
  textInputModal: {
    flex: 1,
    height: 48,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.body,
    color: COLORS.text,
  },
  modalSectionDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  passwordSectionTitle: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.heading,
    color: COLORS.primary,
    marginBottom: 2,
  },
  passwordSectionSubtitle: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.body,
    color: COLORS.textLight,
    marginBottom: SPACING.md,
  },
  modalActions: {
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  saveButton: {
    width: '100%',
  },
  cancelButton: {
    width: '100%',
  }
});

