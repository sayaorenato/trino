import React from 'react';
import { View, StyleSheet, Platform, ViewStyle, StyleProp } from 'react-native';

interface WebContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  maxWidth?: number;
}

/**
 * Limita a largura do conteúdo na web para simular viewport mobile.
 * Em plataformas nativas (iOS/Android) renderiza os filhos diretamente.
 */
export function WebContainer({ 
  children, 
  style, 
  maxWidth = 480 
}: WebContainerProps) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.innerContainer, { maxWidth }, style]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#E8E4DF', // Slightly darker than app bg to frame the content
  },
  innerContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#F7F5F2', // matches COLORS.background
    // Sombra sutil nas laterais para profundidade na web
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 0,
  },
});
