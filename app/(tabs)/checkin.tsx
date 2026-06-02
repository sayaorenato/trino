import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { HABIT_LABELS, HabitType } from '../../constants/mock-data';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, SHADOWS } from '../../constants/theme';

export default function CheckinScreen() {
  const router = useRouter();
  
  // Estados do Fluxo de Check-in
  const [step, setStep] = useState<'select' | 'upload' | 'success'>('select');
  const [selectedHabit, setSelectedHabit] = useState<HabitType | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSelectHabit = (type: HabitType) => {
    setSelectedHabit(type);
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
    if (selectedHabit === 'prayer') {
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

    setLoading(true);
    try {
      // Simular delay de upload para o Supabase
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStep('success');
    } catch (e) {
      Alert.alert('Erro', 'Ocorreu um erro ao enviar o check-in.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('select');
    setSelectedHabit(null);
    setImageUri(null);
    setCaption('');
  };

  // RENDER PASSO 1: SELECIONAR HÁBITO
  if (step === 'select') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Novo Check-in</Text>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.instructionText}>
            Qual hábito de fé ou saúde você concluiu e deseja validar hoje?
          </Text>

          <View style={styles.habitButtonsContainer}>
            {/* ORAÇÃO */}
            <TouchableOpacity 
              style={[styles.habitButton, { borderColor: 'rgba(174, 143, 100, 0.3)' }]}
              onPress={() => handleSelectHabit('prayer')}
              activeOpacity={0.8}
            >
              <View style={[styles.habitIconBg, { backgroundColor: COLORS.gold }]}>
                <MaterialCommunityIcons name={HABIT_LABELS.prayer.icon} size={28} color="#fff" />
              </View>
              <View style={styles.habitButtonDetails}>
                <Text style={styles.habitButtonTitle}>{HABIT_LABELS.prayer.title}</Text>
                <Text style={styles.habitButtonDesc}>{HABIT_LABELS.prayer.description}</Text>
              </View>
              <View style={[styles.pointsBadge, { backgroundColor: '#fff9eb' }]}>
                <Text style={[styles.pointsText, { color: COLORS.goldDark }]}>+10 pts</Text>
              </View>
            </TouchableOpacity>

            {/* BÍBLIA */}
            <TouchableOpacity 
              style={[styles.habitButton, { borderColor: 'rgba(3, 25, 46, 0.1)' }]}
              onPress={() => handleSelectHabit('bible')}
              activeOpacity={0.8}
            >
              <View style={[styles.habitIconBg, { backgroundColor: COLORS.primary }]}>
                <MaterialCommunityIcons name={HABIT_LABELS.bible.icon} size={28} color="#fff" />
              </View>
              <View style={styles.habitButtonDetails}>
                <Text style={styles.habitButtonTitle}>{HABIT_LABELS.bible.title}</Text>
                <Text style={styles.habitButtonDesc}>{HABIT_LABELS.bible.description}</Text>
              </View>
              <View style={[styles.pointsBadge, { backgroundColor: '#eef3f8' }]}>
                <Text style={[styles.pointsText, { color: COLORS.primary }]}>+10 pts</Text>
              </View>
            </TouchableOpacity>

            {/* EXERCÍCIO */}
            <TouchableOpacity 
              style={[styles.habitButton, { borderColor: 'rgba(74, 101, 74, 0.2)' }]}
              onPress={() => handleSelectHabit('exercise')}
              activeOpacity={0.8}
            >
              <View style={[styles.habitIconBg, { backgroundColor: COLORS.secondary }]}>
                <MaterialCommunityIcons name={HABIT_LABELS.exercise.icon} size={28} color="#fff" />
              </View>
              <View style={styles.habitButtonDetails}>
                <Text style={styles.habitButtonTitle}>{HABIT_LABELS.exercise.title}</Text>
                <Text style={styles.habitButtonDesc}>{HABIT_LABELS.exercise.description}</Text>
              </View>
              <View style={[styles.pointsBadge, { backgroundColor: '#eefcf4' }]}>
                <Text style={[styles.pointsText, { color: COLORS.secondary }]}>+10 pts</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // RENDER PASSO 2: UPLOAD E LEGENDA
  if (step === 'upload' && selectedHabit) {
    const habitInfo = HABIT_LABELS[selectedHabit];
    return (
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
            <Text style={styles.uploadCardSubtitle}>tire uma foto estudando, orando ou treinando</Text>

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
              title="Confirmar e Postar"
              variant="secondary"
              size="lg"
              loading={loading}
              onPress={handleConfirmCheckin}
              style={styles.confirmBtn}
            />
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // RENDER PASSO 3: SUCESSO!
  return (
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
          <Text style={styles.pointsEarnedValue}>+10 Pontos</Text>
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
              router.push('/feed');
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
  }
});
