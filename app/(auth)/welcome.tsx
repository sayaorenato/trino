import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, SafeAreaView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../../components/ui/Button';
import { WebContainer } from '../../components/ui/WebContainer';
import { COLORS, SPACING, FONTS, SHADOWS, BORDER_RADIUS, ANIMATION } from '../../constants/theme';

const { width } = Dimensions.get('window');

const PILLARS = [
  { icon: 'hands-pray' as const, label: 'Oração', color: COLORS.gold },
  { icon: 'book-open-variant' as const, label: 'Leitura', color: COLORS.primary },
  { icon: 'dumbbell' as const, label: 'Exercício', color: COLORS.secondary },
];

export default function WelcomeScreen() {
  const router = useRouter();

  // Staggered entrance animations
  const logoFade = useRef(new Animated.Value(0)).current;
  const logoSlide = useRef(new Animated.Value(20)).current;
  const taglineFade = useRef(new Animated.Value(0)).current;
  const taglineSlide = useRef(new Animated.Value(20)).current;
  const pillarsFade = useRef(new Animated.Value(0)).current;
  const pillarsSlide = useRef(new Animated.Value(30)).current;
  const buttonsFade = useRef(new Animated.Value(0)).current;
  const buttonsSlide = useRef(new Animated.Value(30)).current;

  // Ambient ring animation
  const ring1Scale = useRef(new Animated.Value(0.85)).current;
  const ring2Scale = useRef(new Animated.Value(0.9)).current;
  const ring3Scale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // Staggered entrance
    const stagger = (fade: Animated.Value, slide: Animated.Value, delay: number) =>
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: ANIMATION.duration.slow,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(slide, {
          toValue: 0,
          duration: ANIMATION.duration.slow,
          delay,
          useNativeDriver: true,
        }),
      ]);

    Animated.stagger(0, [
      stagger(logoFade, logoSlide, 200),
      stagger(taglineFade, taglineSlide, 400),
      stagger(pillarsFade, pillarsSlide, 600),
      stagger(buttonsFade, buttonsSlide, 800),
    ]).start();

    // Ambient ring pulsation
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ring1Scale, { toValue: 1.1, duration: 5000, useNativeDriver: true }),
          Animated.timing(ring1Scale, { toValue: 0.85, duration: 5000, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(ring2Scale, { toValue: 1.08, duration: 4000, useNativeDriver: true }),
          Animated.timing(ring2Scale, { toValue: 0.9, duration: 4000, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(ring3Scale, { toValue: 1.05, duration: 3500, useNativeDriver: true }),
          Animated.timing(ring3Scale, { toValue: 0.95, duration: 3500, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <WebContainer>
      <LinearGradient
        colors={[COLORS.background, '#EDE8E0']}
        style={styles.container}
      >
        {/* Ambient decorative rings */}
        <View style={styles.ringsContainer}>
          <Animated.View style={[styles.ring, styles.ring1, { transform: [{ scale: ring1Scale }] }]} />
          <Animated.View style={[styles.ring, styles.ring2, { transform: [{ scale: ring2Scale }] }]} />
          <Animated.View style={[styles.ring, styles.ring3, { transform: [{ scale: ring3Scale }] }]} />
        </View>

        <SafeAreaView style={styles.safeArea}>
          {/* Logo + Brand */}
          <Animated.View style={[styles.brandSection, { opacity: logoFade, transform: [{ translateY: logoSlide }] }]}>
            <Image 
              source={require('../../assets/images/trino_logo.png')} 
              style={styles.welcomeLogoImage}
              resizeMode="contain"
            />
          </Animated.View>


          {/* Tagline */}
          <Animated.View style={[styles.taglineSection, { opacity: taglineFade, transform: [{ translateY: taglineSlide }] }]}>
            <Text style={styles.tagline}>Corpo, Alma{'\n'}e Espírito.</Text>
            <Text style={styles.description}>
              Cultive hábitos saudáveis e disciplinas espirituais com seu grupo em desafios motivadores.
            </Text>
          </Animated.View>

          {/* Three Pillars */}
          <Animated.View style={[styles.pillarsRow, { opacity: pillarsFade, transform: [{ translateY: pillarsSlide }] }]}>
            {PILLARS.map((pillar, index) => (
              <View key={pillar.label} style={styles.pillarItem}>
                <View style={[styles.pillarIconBg, { backgroundColor: pillar.color }]}>
                  <MaterialCommunityIcons name={pillar.icon} size={24} color="#fff" />
                </View>
                <Text style={styles.pillarLabel}>{pillar.label}</Text>
              </View>
            ))}
          </Animated.View>

          {/* CTA Buttons */}
          <Animated.View style={[styles.buttonSection, { opacity: buttonsFade, transform: [{ translateY: buttonsSlide }] }]}>
            <Button
              title="Começar Agora"
              variant="primary"
              size="lg"
              onPress={() => router.push({ pathname: '/(auth)/login', params: { mode: 'signup' } })}
              style={styles.btn}
            />
            <Button
              title="Já tenho uma conta"
              variant="ghost"
              size="md"
              onPress={() => router.push({ pathname: '/(auth)/login', params: { mode: 'login' } })}
              style={styles.btnGhost}
            />
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
    </WebContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  ringsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
    opacity: 0.12,
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: COLORS.secondary,
    borderRadius: 9999,
  },
  ring1: { width: width * 1.6, height: width * 1.6 },
  ring2: { width: width * 1.1, height: width * 1.1 },
  ring3: { width: width * 0.7, height: width * 0.7 },

  brandSection: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  welcomeLogoImage: {
    width: 180,
    height: 180,
  },


  taglineSection: {
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
    paddingHorizontal: SPACING.lg,
  },
  tagline: {
    fontSize: FONTS.size.xxxl,
    fontFamily: FONTS.family.heading,
    color: COLORS.primary,
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: SPACING.md,
  },
  description: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  pillarsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xxl,
    marginBottom: SPACING.xxxl,
  },
  pillarItem: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  pillarIconBg: {
    width: 52,
    height: 52,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.light,
  },
  pillarLabel: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bodySemibold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  buttonSection: {
    width: '100%',
    paddingHorizontal: SPACING.lg,
  },
  btn: {
    width: '100%',
  },
  btnGhost: {
    width: '100%',
    marginTop: SPACING.sm,
  },
});
