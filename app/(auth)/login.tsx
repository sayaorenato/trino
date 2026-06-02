import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { COLORS, SPACING, FONTS } from '../../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode: 'login' | 'signup' }>();

  const [isSignUp, setIsSignUp] = useState(mode === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email || !password || (isSignUp && !name)) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            }
          }
        });
        if (signUpError) throw signUpError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInError) throw signInError;
      }
      // O InitialLayout no root cuidará de redirecionar para a Home (tabs) após mudança no onAuthStateChange
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>
              {isSignUp ? 'Criar Conta' : 'Boas-vindas'}
            </Text>
            <Text style={styles.subtitle}>
              {isSignUp 
                ? 'Comece sua jornada de corpo, mente e espírito.' 
                : 'Que bom ver você de volta! Faça login para continuar.'}
            </Text>
          </View>

          <Card variant="default" style={styles.formCard}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {isSignUp && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome Completo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Seu nome"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Endereço de E-mail</Text>
              <TextInput
                style={styles.input}
                placeholder="seuemail@exemplo.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Senha</Text>
              <TextInput
                style={styles.input}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <Button
              title={isSignUp ? 'Cadastrar' : 'Entrar'}
              variant="primary"
              size="lg"
              loading={loading}
              onPress={handleSubmit}
              style={styles.submitBtn}
            />

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>ou continuar com</Text>
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
          </Card>

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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceCard,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(225, 222, 227, 0.5)',
  },
  header: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONTS.size.xxl,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
    fontFamily: FONTS.family.heading,
  },
  subtitle: {
    fontSize: FONTS.size.md,
    color: COLORS.textSecondary,
    fontFamily: FONTS.family.body,
    lineHeight: 20,
  },
  formCard: {
    padding: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.semibold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    fontFamily: FONTS.family.body,
  },
  input: {
    height: 50,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: FONTS.size.md,
    color: COLORS.text,
    fontFamily: FONTS.family.body,
  },
  submitBtn: {
    marginTop: SPACING.md,
    width: '100%',
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONTS.size.sm,
    marginBottom: SPACING.md,
    fontWeight: FONTS.weight.semibold,
    textAlign: 'center',
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
    marginHorizontal: SPACING.md,
    fontSize: FONTS.size.xs,
    color: COLORS.textLight,
    textTransform: 'uppercase',
    fontWeight: FONTS.weight.bold,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    backgroundColor: '#fff',
  },
  socialText: {
    marginLeft: SPACING.sm,
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.semibold,
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
    color: COLORS.primary,
    fontWeight: FONTS.weight.bold,
  }
});
