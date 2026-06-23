import React, { useState } from 'react';
import { View, Image, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, BORDER_RADIUS, FONTS } from '../../constants/theme';

interface AvatarProps {
  source?: string;
  name: string;
  size?: number;
  style?: ViewStyle;
}

export function Avatar({
  source,
  name,
  size = 40,
  style,
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length === 0 || !parts[0]) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + (parts[parts.length - 1][0] || '')).toUpperCase();
  };

  const hasImage = source && !hasError;

  if (hasImage) {
    return (
      <View style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: COLORS.borderLight,
          borderWidth: 2,
        },
        style,
      ]}>
        <Image
          source={{ uri: source }}
          style={{ width: '100%', height: '100%', borderRadius: size / 2 }}
          onError={() => setHasError(true)}
        />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={COLORS.gradients.primaryWarm}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.initialsText,
          {
            fontSize: size * 0.38,
          },
        ]}
      >
        {getInitials(name)}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  initialsText: {
    fontFamily: FONTS.family.heading,
    color: '#FFFFFF',
  },
});
