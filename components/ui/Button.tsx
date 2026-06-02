import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ViewStyle, 
  TextStyle,
  StyleProp,
  TouchableOpacityProps,
  View
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, FONTS } from '../../constants/theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
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
    <TouchableOpacity
      style={getButtonStyles()}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getLoadingColor()} />
      ) : (
        <>
          {icon && <PlatformIconWrapper>{icon}</PlatformIconWrapper>}
          <Text style={getTextStyle()}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// Wrapper simples para dar espaçamento ao ícone
const PlatformIconWrapper = ({ children }: { children: React.ReactNode }) => (
  <View style={{ marginRight: SPACING.sm }}>{children}</View>
);

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  // Tamanhos
  sm: {
    paddingVertical: SPACING.xs * 1.5,
    paddingHorizontal: SPACING.md,
  },
  md: {
    paddingVertical: SPACING.sm * 1.5,
    paddingHorizontal: SPACING.lg,
  },
  lg: {
    paddingVertical: SPACING.md * 1.25,
    paddingHorizontal: SPACING.xl,
  },
  // Variantes
  primary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  secondary: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
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
    fontFamily: FONTS.family.body,
    fontWeight: FONTS.weight.semibold,
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
