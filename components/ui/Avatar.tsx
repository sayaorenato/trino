import React, { useState } from 'react';
import { View, Image, Text, StyleSheet, ViewStyle } from 'react-native';
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

  // Extrair iniciais do nome
  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length === 0 || !parts[0]) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + (parts[parts.length - 1][0] || '')).toUpperCase();
  };

  const hasImage = source && !hasError;

  return (
    <View 
      style={[
        styles.container, 
        { 
          width: size, 
          height: size, 
          borderRadius: size / 2,
          backgroundColor: hasImage ? 'transparent' : COLORS.surfaceVariant,
          borderColor: COLORS.border,
          borderWidth: hasImage ? 1 : 1,
        }, 
        style
      ]}
    >
      {hasImage ? (
        <Image
          source={{ uri: source }}
          style={{ width: '100%', height: '100%', borderRadius: size / 2 }}
          onError={() => setHasError(true)}
        />
      ) : (
        <Text 
          style={[
            styles.initialsText, 
            { 
              fontSize: size * 0.4, 
              color: COLORS.primary 
            }
          ]}
        >
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  initialsText: {
    fontWeight: FONTS.weight.bold,
    fontFamily: FONTS.family.body,
  }
});
