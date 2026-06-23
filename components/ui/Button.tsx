import React, { useRef } from 'react';
import { 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ViewStyle, 
  TextStyle,
  StyleProp,
  Pressable,
  PressableProps,
  View,
  Animated,
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, ANIMATION } from '../../constants/theme';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  style,
  textStyle,
  disabled,
  ...props
}: ButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: ANIMATION.press.scale,
      useNativeDriver: true,
      ...ANIMATION.spring.stiff,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      ...ANIMATION.spring.bouncy,
    }).start();
  };

  const getButtonStyles = () => {
    const variantStyle = disabled || loading ? styles.disabled :
      variant === 'primary' ? styles.primary :
      variant === 'secondary' ? styles.secondary :
      variant === 'outline' ? styles.outline :
      styles.ghost;

    return [styles.button, styles[size], variantStyle, style];
  };

  const getTextStyle = () => {
    const sizeStyle = size === 'sm' ? styles.text_sm :
      size === 'md' ? styles.text_md :
      styles.text_lg;

    const variantTextStyle = disabled || loading ? styles.text_disabled :
      variant === 'primary' ? styles.text_primary :
      variant === 'secondary' ? styles.text_secondary :
      variant === 'outline' ? styles.text_outline :
      styles.text_ghost;

    return [styles.text, sizeStyle, variantTextStyle, textStyle];
  };

  const getLoadingColor = () => {
    if (variant === 'primary' || variant === 'secondary') {
      return COLORS.textOnPrimary;
    }
    return COLORS.primary;
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={getButtonStyles()}
        disabled={disabled || loading}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        {...props}
      >
        {loading ? (
          <ActivityIndicator size="small" color={getLoadingColor()} />
        ) : (
          <>
            {icon && <View style={{ marginRight: SPACING.sm }}>{icon}</View>}<Text style={getTextStyle()}>{title}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  // Tamanhos
  sm: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
  },
  md: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
  },
  lg: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxl,
    borderRadius: BORDER_RADIUS.xl,
  },
  // Variantes
  primary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  secondary: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 12,
    elevation: 4,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: COLORS.borderDark,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  disabled: {
    backgroundColor: COLORS.surfaceVariant,
    borderColor: COLORS.surfaceVariant,
  },
  // Textos
  text: {
    fontFamily: FONTS.family.bodySemibold,
    textAlign: 'center',
  },
  text_sm: {
    fontSize: FONTS.size.sm,
  },
  text_md: {
    fontSize: FONTS.size.md,
  },
  text_lg: {
    fontSize: FONTS.size.lg,
  },
  text_primary: {
    color: COLORS.textOnPrimary,
  },
  text_secondary: {
    color: COLORS.textOnSecondary,
  },
  text_outline: {
    color: COLORS.text,
  },
  text_ghost: {
    color: COLORS.primary,
  },
  text_disabled: {
    color: COLORS.textLight,
  },
});
