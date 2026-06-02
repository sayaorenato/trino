import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, BORDER_RADIUS, SPACING, FONTS, SHADOWS } from '../../constants/theme';

interface StreakBadgeProps {
  count: number;
  showText?: boolean;
  style?: ViewStyle;
}

export function StreakBadge({
  count,
  showText = true,
  style,
}: StreakBadgeProps) {
  return (
    <LinearGradient
      colors={COLORS.gradients.fire}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, SHADOWS.light, style]}
    >
      <MaterialCommunityIcons name="fire" size={18} color="#fff" />
      {showText && (
        <Text style={styles.text}>{count} dias</Text>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs * 1.5,
    paddingHorizontal: SPACING.sm * 1.25,
    borderRadius: BORDER_RADIUS.full,
  },
  text: {
    color: '#fff',
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    marginLeft: 2,
    fontFamily: FONTS.family.body,
  }
});
