import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { WebContainer } from '../../components/ui/WebContainer';
import { COLORS, SPACING, FONTS, BORDER_RADIUS, SHADOWS, ANIMATION } from '../../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode: 'login' | 'signup' }>();

  const [isSignUp, setIsSignUp] = useState(mode === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Staggered entrance animations
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(20)).current;
  const formFade = useRef(new Animated.Value(0)).current;
  const formSlide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.stagger(0, [
      Animated.parallel([
        Animated.timing(headerFade, { toValue: 1, duration: ANIMATION.duration.normal, delay: 100, useNativeDriver: true }),
        Animated.timing(headerSlide, { toValue: 0, duration: ANIMATION.duration.normal, delay: 100, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(formFade, { toValue: 1, duration: ANIMATION.duration.normal, delay: 250, useNativeDriver: true }),
        Animated.timing(formSlide, { toValue: 0, duration: ANIMATION.duration.normal, delay: 250, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const handleSubmit = async () => {
    if (!email || !password || (isSignUp && !name)) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            }
          }
        });
        if (signUpError) throw signUpError;

        if (data?.user && !data?.session) {
          setSuccess('Conta criada! Verifique seu email para confirmar o cadastro.');
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      const msg = err.message || '';
      if (isSignUp && (
        msg.toLowerCase().includes('already registered') ||
        msg.toLowerCase().includes('already exists') ||
        msg.toLowerCase().includes('email_exists')
      )) {
        setError('Este email já está cadastrado. Use o formulário abaixo para fazer login.');
        setIsSignUp(false);
      } else if (!isSignUp && (
        msg.toLowerCase().includes('invalid login credentials') ||
        msg.toLowerCase().includes('invalid_credentials') ||
        msg.toLowerCase().includes('wrong password')
      )) {
        Alert.alert(
          'Senha Incorreta',
          'Deseja redefinir sua senha? Enviaremos um link de recuperação para o seu email.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Redefinir Senha', onPress: handleResetPassword }
          ]
        );
      } else {
        setError(msg || 'Falha ao autenticar. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Informe seu email para receber o link de recuperação.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'trino://reset-password',
      });
      if (error) throw error;
      Alert.alert(
        'Email Enviado',
        'Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.',
      );
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar email de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <WebContainer>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.primary} />
            </TouchableOpacity>

            {/* Header */}
            <Animated.View style={[styles.header, { opacity: headerFade, transform: [{ translateY: headerSlide }] }]}>
              <Text style={styles.title}>
                {isSignUp ? 'Criar Conta' : 'Boas-vindas'}
              </Text>
              <Text style={styles.subtitle}>
                {isSignUp 
                  ? 'Comece sua jornada de corpo, alma e espírito.' 
                  : 'Que bom ver você de volta!'}
              </Text>
            </Animated.View>

            {/* Form */}
            <Animated.View style={[styles.formSection, { opacity: formFade, transform: [{ translateY: formSlide }] }]}>
              {error ? (
                <View style={styles.errorContainer}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color={COLORS.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
              {success ? (
                <View style={styles.successContainer}>
                  <MaterialCommunityIcons name="check-circle-outline" size={16} color={COLORS.secondary} />
                  <Text style={styles.successText}>{success}</Text>
                </View>
              ) : null}

              {isSignUp && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nome Completo</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialCommunityIcons name="account-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Seu nome"
                      placeholderTextColor={COLORS.textLight}
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>E-mail</Text>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="email-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="seuemail@exemplo.com"
                    placeholderTextColor={COLORS.textLight}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Senha</Text>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="lock-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor={COLORS.textLight}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <Button
                title={isSignUp ? 'Criar Conta' : 'Entrar'}
                variant="primary"
                size="lg"
                loading={loading}
                onPress={handleSubmit}
                style={styles.submitBtn}
              />

              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.divider} />
              </View>

              <View style={styles.socialContainer}>
                <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="google" size={20} color={COLORS.text} />
                  <Text style={styles.socialText}>Google</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="apple" size={20} color={COLORS.text} />
                  <Text style={styles.socialText}>Apple</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            <View style={styles.footer}>
              <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
                <Text style={styles.footerText}>
                  {isSignUp 
                    ? 'Já tem uma conta? ' 
                    : 'Não tem uma conta? '}
                  <Text style={styles.footerTextBold}>
                    {isSignUp ? 'Faça Login' : 'Cadastre-se'}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </WebContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.light,
  },
  header: {
    marginBottom: SPACING.xxl,
  },
  title: {
    fontSize: FONTS.size.xxxl,
    fontFamily: FONTS.family.heading,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  formSection: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.medium,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bodySemibold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: SPACING.md,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.body,
    color: COLORS.text,
  },
  submitBtn: {
    marginTop: SPACING.sm,
    width: '100%',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(192, 57, 43, 0.08)',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  errorText: {
    flex: 1,
    color: COLORS.error,
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bodyMedium,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondaryMuted,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  successText: {
    flex: 1,
    color: COLORS.secondary,
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bodyMedium,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: SPACING.lg,
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bodySemibold,
    color: COLORS.textLight,
    textTransform: 'uppercase',
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: SPACING.sm,
  },
  socialText: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bodySemibold,
    color: COLORS.text,
  },
  footer: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.body,
  },
  footerTextBold: {
    color: COLORS.secondary,
    fontFamily: FONTS.family.bodySemibold,
  },
});
