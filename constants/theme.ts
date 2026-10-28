// Design System — Trino (Fé em Constância)
// Filosofia Stitch: "Sanctuary & Habit — Acolhedor, moderno, sereno, espiritual, motivador e premium."
// Cores oficiais do Stitch: Navy sagrado (#03192E) + Verde vida (#4A654A) + Ouro fé (#C4963C) + Fundo (#FBF9FB).

export const COLORS = {
  // Primário: Navy Profundo Sagrado — serenidade, constância, fé
  primary: '#03192E',
  primaryLight: '#1A2E44',
  primaryDark: '#02101E',
  primaryMuted: 'rgba(3, 25, 46, 0.08)',

  // Secundário: Verde Vida — saúde, crescimento, natureza espiritual
  secondary: '#4A654A',
  secondaryLight: '#5C7E5C',
  secondaryDark: '#364B36',
  secondaryMuted: 'rgba(74, 101, 74, 0.12)',

  // Terciário: Ouro Fé — streak, vitória, espiritualidade, centelha divina
  gold: '#C4963C',
  goldLight: '#E3C193',
  goldDark: '#9A7630',
  goldMuted: 'rgba(196, 150, 60, 0.14)',

  // Status
  success: '#2D8A3E',
  warning: '#E67E22',
  error: '#BA1A1A',
  info: '#2980B9',

  // Neutros — Sanctuary Off-White do Stitch
  background: '#FBF9FB',
  surface: '#FFFFFF',
  surfaceCard: '#FFFFFF',
  surfaceVariant: '#EFEDEF',
  surfaceElevated: '#F5F3F5',

  // Texto — hierarquia clara
  text: '#1B1C1D',
  textSecondary: '#43474D',
  textLight: '#74777D',
  textOnPrimary: '#FFFFFF',
  textOnSecondary: '#FFFFFF',
  textOnGold: '#1B1C1D',

  // Bordas — Outline do Stitch
  border: '#E4E2E4',
  borderLight: 'rgba(228, 226, 228, 0.6)',
  borderDark: '#C4C6CD',

  // Gradientes
  gradients: {
    primary: ['#03192E', '#1A2E44'] as const,
    primaryWarm: ['#03192E', '#1B3456'] as const,
    sage: ['#4A654A', '#5C7E5C'] as const,
    gold: ['#C4963C', '#E3C193'] as const,
    fire: ['#E74C3C', '#F39C12'] as const,
    warmBg: ['#FBF9FB', '#F5F3F5'] as const,
    card: ['#FFFFFF', '#FBF9FB'] as const,
    checkinSuccess: ['#2D8A3E', '#4A654A'] as const,
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

// Tipografia — Plus Jakarta Sans (headings) + Manrope (corpo/labels) [Design Google Stitch]
export const FONTS = {
  family: {
    heading: 'PlusJakartaSans_700Bold',
    headingSemibold: 'PlusJakartaSans_600SemiBold',
    headingMedium: 'PlusJakartaSans_600SemiBold',
    headingExtraBold: 'PlusJakartaSans_800ExtraBold',
    body: 'Manrope_400Regular',
    bodyMedium: 'Manrope_500Medium',
    bodySemibold: 'Manrope_600SemiBold',
    bodyBold: 'Manrope_700Bold',
    // Fallbacks retrocompatíveis
    outfitHeading: 'Outfit_700Bold',
    interBody: 'Inter_400Regular',
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
