import React from 'react';
import { View, StyleSheet, ViewStyle, Platform, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, BORDER_RADIUS, SHADOWS, SPACING } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'flat' | 'gradient' | 'elevated' | 'glass';
  gradientColors?: readonly [string, string, ...string[]];
}

export function Card({
  children,
  style,
  variant = 'default',
  gradientColors = COLORS.gradients.card,
}: CardProps) {
  
  if (variant === 'gradient') {
    return (
      <LinearGradient
        colors={gradientColors}
        style={[styles.card, styles.gradientCard, SHADOWS.medium, style]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {children}
      </LinearGradient>
    );
  }

  const getVariantStyle = () => {
    switch (variant) {
      case 'flat':
        return styles.flatCard;
      case 'elevated':
        return [styles.defaultCard, SHADOWS.strong];
      case 'glass':
        return styles.glassCard;
      case 'default':
      default:
        return [styles.defaultCard, SHADOWS.light];
    }
  };

  return (
    <View style={[styles.card, getVariantStyle(), style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    overflow: 'hidden',
  },
  defaultCard: {
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  flatCard: {
    backgroundColor: COLORS.surfaceVariant,
    borderWidth: 0,
  },
  gradientCard: {
    borderWidth: 0,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.80)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    ...Platform.select({
      ios: {},
      android: {
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
      },
      web: {
        backdropFilter: 'blur(20px)',
      } as any,
    }),
  },
});
