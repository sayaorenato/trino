import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, BORDER_RADIUS, SPACING, FONTS } from '../../constants/theme';

interface ProgressBarProps {
  progress: number; // de 0 a 1
  showPercentage?: boolean;
  height?: number;
  gradientColors?: readonly [string, string, ...string[]];
  style?: ViewStyle;
}

export function ProgressBar({
  progress,
  showPercentage = true,
  height = 8,
  gradientColors = COLORS.gradients.sage,
  style,
}: ProgressBarProps) {
  // Garantir que o progresso está entre 0 e 1
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const percentage = Math.round(clampedProgress * 100);

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.barContainer, { height }]}>
        <View style={styles.backgroundBar} />
        <View style={[styles.fillWrapper, { width: `${percentage}%` }]}>
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fillGradient, { height }]}
          />
        </View>
      </View>
      {showPercentage && (
        <Text style={styles.percentageText}>{percentage}%</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  barContainer: {
    flex: 1,
    position: 'relative',
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  backgroundBar: {
    ...StyleSheet.absoluteFill,
    backgroundColor: COLORS.border,
    borderRadius: BORDER_RADIUS.full,
  },
  fillWrapper: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  fillGradient: {
    width: '100%',
    borderRadius: BORDER_RADIUS.full,
  },
  percentageText: {
    marginLeft: SPACING.sm,
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    color: COLORS.secondary,
    width: 32,
    textAlign: 'right',
  }
});
