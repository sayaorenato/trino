// Design System — Trino
// Filosofia: "Acolhedor, moderno, limpo, espiritual (sem exageros), motivador, premium porém simples."
// Cores: Navy quente + Verde vida + Ouro fé. Geometria: extremos (sharp OU soft, nunca meio-termo).

export const COLORS = {
  // Primário: Navy Profundo Quente — espiritual, confiável, premium
  primary: '#0A1628',
  primaryLight: '#162A4A',
  primaryDark: '#050D18',
  primaryMuted: 'rgba(10, 22, 40, 0.08)',

  // Secundário: Verde Vida — saúde, crescimento, natureza
  secondary: '#3D7B54',
  secondaryLight: '#4E9B6A',
  secondaryDark: '#2D5E3F',
  secondaryMuted: 'rgba(61, 123, 84, 0.10)',

  // Terciário: Ouro Fé — streak, vitória, espiritualidade, fogo
  gold: '#C4963C',
  goldLight: '#D4AD5C',
  goldDark: '#9A7630',
  goldMuted: 'rgba(196, 150, 60, 0.12)',

  // Status
  success: '#2D8A3E',
  warning: '#E67E22',
  error: '#C0392B',
  info: '#2980B9',

  // Neutros — off-white quente (levemente creme, sem azulado)
  background: '#F7F5F2',
  surface: '#FFFFFF',
  surfaceCard: '#FFFFFF',
  surfaceVariant: '#EDEBE8',
  surfaceElevated: '#FAFAF8',

  // Texto — hierarquia clara
  text: '#1A1A1F',
  textSecondary: '#5C5C66',
  textLight: '#9494A0',
  textOnPrimary: '#FFFFFF',
  textOnSecondary: '#FFFFFF',
  textOnGold: '#1A1A1F',

  // Bordas
  border: '#E2DED8',
  borderLight: 'rgba(226, 222, 216, 0.5)',
  borderDark: '#C8C2BA',

  // Gradientes
  gradients: {
    primary: ['#0A1628', '#162A4A'] as const,
    primaryWarm: ['#0A1628', '#1B3456'] as const,
    sage: ['#3D7B54', '#4E9B6A'] as const,
    gold: ['#C4963C', '#D4AD5C'] as const,
    fire: ['#E74C3C', '#F39C12'] as const,
    warmBg: ['#F7F5F2', '#F0ECE6'] as const,
    card: ['#FFFFFF', '#FAFAF8'] as const,
    checkinSuccess: ['#2D8A3E', '#3D7B54'] as const,
  },
};

// Grid de 8 pontos genuíno
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
};

// Geometria em extremos — sharp-premium OU friendly-soft, nunca zona segura
export const BORDER_RADIUS = {
  none: 0,
  sharp: 2,     // Tech, luxury, premium — botões primários, badges
  sm: 6,
  md: 10,
  lg: 16,
  xl: 20,       // Cards, containers — soft e acolhedor
  xxl: 28,      // Inputs, elementos grandes
  full: 9999,   // Pílulas, avatares
};

// Tipografia — Inter (corpo) + Outfit (headings)
export const FONTS = {
  family: {
    heading: 'Outfit_700Bold',
    headingSemibold: 'Outfit_600SemiBold',
    headingMedium: 'Outfit_500Medium',
    body: 'Inter_400Regular',
    bodyMedium: 'Inter_500Medium',
    bodySemibold: 'Inter_600SemiBold',
    bodyBold: 'Inter_700Bold',
  },
  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 22,
    xxl: 28,
    xxxl: 36,
    display: 48,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
  },
};

// Sombras com mais profundidade e glow
export const SHADOWS = {
  light: {
    shadowColor: '#1A1A1F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: '#1A1A1F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
  },
  strong: {
    shadowColor: '#1A1A1F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  glow: {
    shadowColor: '#C4963C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  glowGreen: {
    shadowColor: '#3D7B54',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.20,
    shadowRadius: 12,
    elevation: 4,
  },
};

// Tokens de animação — spring physics
export const ANIMATION = {
  spring: {
    gentle: { tension: 120, friction: 14 },
    bouncy: { tension: 180, friction: 12 },
    stiff: { tension: 300, friction: 20 },
  },
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
    dramatic: 800,
  },
  press: {
    scale: 0.97,
    opacity: 0.85,
  },
};
