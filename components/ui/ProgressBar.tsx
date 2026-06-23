import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ViewStyle, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, BORDER_RADIUS, SPACING, FONTS } from '../../constants/theme';

interface ProgressBarProps {
  progress: number; // de 0 a 1
  showPercentage?: boolean;
  height?: number;
  gradientColors?: readonly [string, string, ...string[]];
  style?: ViewStyle;
  animated?: boolean;
}

export function ProgressBar({
  progress,
  showPercentage = true,
  height = 8,
  gradientColors = COLORS.gradients.sage,
  style,
  animated = true,
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const percentage = Math.round(clampedProgress * 100);

  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.timing(widthAnim, {
        toValue: clampedProgress,
        duration: 800,
        useNativeDriver: false,
      }).start();
    } else {
      widthAnim.setValue(clampedProgress);
    }
  }, [clampedProgress, animated]);

  const animatedWidth = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.barContainer, { height }]}>
        <View style={styles.backgroundBar} />
        <Animated.View style={[styles.fillWrapper, { width: animatedWidth }]}>
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fillGradient, { height }]}
          />
        </Animated.View>
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
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.surfaceVariant,
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
    fontFamily: FONTS.family.bodyBold,
    color: COLORS.secondary,
    width: 36,
    textAlign: 'right',
  },
});
