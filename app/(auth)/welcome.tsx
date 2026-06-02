import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, Animated, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { COLORS, SPACING, FONTS } from '../../constants/theme';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  
  // Animações para os anéis concêntricos
  const ring1Scale = useRef(new Animated.Value(0.9)).current;
  const ring2Scale = useRef(new Animated.Value(0.95)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animação cíclica dos anéis (pulsação)
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ring1Scale, {
            toValue: 1.1,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(ring1Scale, {
            toValue: 0.9,
            duration: 4000,
            useNativeDriver: true,
          })
        ]),
        Animated.sequence([
          Animated.timing(ring2Scale, {
            toValue: 1.05,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(ring2Scale, {
            toValue: 0.95,
            duration: 3000,
            useNativeDriver: true,
          })
        ])
      ])
    ).start();

    // Fade in do conteúdo do card
    Animated.timing(contentFade, {
      toValue: 1,
      duration: 1200,
      delay: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Background Decorativo com Anéis Concêntricos */}
      <View style={styles.ringsContainer}>
        <Animated.View 
          style={[
            styles.ring, 
            styles.ringOuter, 
            { transform: [{ scale: ring1Scale }] }
          ]} 
        />
        <Animated.View 
          style={[
            styles.ring, 
            styles.ringInner, 
            { transform: [{ scale: ring2Scale }] }
          ]} 
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        {/* Parte Superior: Ilustração / Foto com Máscara de Fé e Comunidade */}
        <View style={styles.heroSection}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=600&q=80' }} // Grupo de amigos felizes ao pôr do sol
            style={styles.heroImage}
          />
          <View style={styles.imageOverlay} />
        </View>

        {/* Parte Inferior: Card Glassmorphism com Logo e Ações */}
        <Animated.View style={[styles.cardWrapper, { opacity: contentFade }]}>
          <Card variant="glass" style={styles.welcomeCard}>
            <View style={styles.logoContainer}>
              <View style={styles.logoIcon}>
                <Text style={styles.logoTextSymbol}>T</Text>
              </View>
              <Text style={styles.logoText}>Trino</Text>
            </View>

            <Text style={styles.tagline}>
              Corpo, Alma e Espírito em Sintonia.
            </Text>
            <Text style={styles.description}>
              Cultive hábitos saudáveis e disciplinas espirituais com seu pequeno grupo em desafios motivadores.
            </Text>

            <View style={styles.buttonContainer}>
              <Button
                title="Criar uma conta"
                variant="primary"
                size="lg"
                onPress={() => router.push({ pathname: '/(auth)/login', params: { mode: 'signup' } })}
                style={styles.btn}
              />
              <Button
                title="Já tenho conta"
                variant="outline"
                size="lg"
                onPress={() => router.push({ pathname: '/(auth)/login', params: { mode: 'login' } })}
                style={[styles.btn, { marginTop: SPACING.md }]}
              />
            </View>
          </Card>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  ringsContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
    opacity: 0.35,
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
    borderRadius: 999,
  },
  ringOuter: {
    width: width * 1.5,
    height: width * 1.5,
  },
  ringInner: {
    width: width * 1.0,
    height: width * 1.0,
  },
  heroSection: {
    flex: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginTop: SPACING.xl,
  },
  heroImage: {
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: width * 0.375, // Círculo perfeito
  },
  imageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
    // Simulando máscara radial
  },
  cardWrapper: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    justifyContent: 'flex-end',
  },
  welcomeCard: {
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  logoIcon: {
    backgroundColor: COLORS.primary,
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  logoTextSymbol: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  logoText: {
    fontSize: FONTS.size.xl,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    fontFamily: FONTS.family.heading,
  },
  tagline: {
    fontSize: FONTS.size.lg,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
    fontFamily: FONTS.family.heading,
  },
  description: {
    fontSize: FONTS.size.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.sm,
    fontFamily: FONTS.family.body,
  },
  buttonContainer: {
    width: '100%',
  },
  btn: {
    width: '100%',
  }
});
