export const COLORS = {
  // Primário: Azul Marinho Profundo, Spiritual e Premium
  primary: '#03192e',
  primaryLight: '#0d2d4c',
  primaryDark: '#010c17',
  
  // Secundário: Verde Sálvia / Oliva (representa saúde física e crescimento)
  secondary: '#4a654a',
  secondaryLight: '#608060',
  secondaryDark: '#354835',
  
  // Terciário: Ouro/Âmbar (Gold/Spiritual/Fogo/Streak/Vitória)
  gold: '#ae8f64',
  goldLight: '#cbab7e',
  goldDark: '#8d7049',
  
  // Cores de Apoio e Status
  success: '#2e7d32',
  warning: '#ed6c02',
  error: '#d32f2f',
  info: '#0288d1',
  
  // Neutros
  background: '#fbf9fb', // Fundo claro off-white levemente rosado/lilás
  surface: '#ffffff',
  surfaceCard: '#ffffff',
  surfaceVariant: '#f0edf1',
  
  text: '#1a1a1c',
  textSecondary: '#6e6d7a',
  textLight: '#a09fa6',
  textOnPrimary: '#ffffff',
  textOnSecondary: '#ffffff',
  
  border: '#e1dee3',
  borderDark: '#c7c4cb',
  
  // Gradientes
  gradients: {
    primary: ['#03192e', '#0d2d4c'] as const,
    sage: ['#4a654a', '#608060'] as const,
    gold: ['#ae8f64', '#cbab7e'] as const,
    fire: ['#ff4e50', '#f9d423'] as const, // Streak
    card: ['#ffffff', '#fbf9fb'] as const,
  }
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const BORDER_RADIUS = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

export const FONTS = {
  // Usando fontes do sistema como fallback, Plus Jakarta Sans e Manrope são ideais se carregadas
  family: {
    heading: 'System', // Mapeado para Plus Jakarta Sans se carregado
    body: 'System',    // Mapeado para Manrope se carregado
  },
  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
    xxxl: 36,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
  }
};

export const SHADOWS = {
  light: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  dark: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
};
