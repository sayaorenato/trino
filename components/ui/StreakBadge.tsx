import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ViewStyle, Animated, Easing } from 'react-native';
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
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (count > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [count]);

  return (
    <LinearGradient
      colors={COLORS.gradients.fire}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, SHADOWS.glow, style]}
    >
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <MaterialCommunityIcons name="fire" size={18} color="#fff" />
      </Animated.View>
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
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.full,
  },
  text: {
    color: '#fff',
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bodyBold,
    marginLeft: 3,
  },
});
