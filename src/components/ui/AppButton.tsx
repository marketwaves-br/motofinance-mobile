import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/theme';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  testID?: string;
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  style,
  textStyle,
  icon,
  testID,
}: AppButtonProps) {
  const { colors, spacing, radius } = useTheme();

  const getVariantStyles = (): { btn: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'secondary':
        return {
          btn: { backgroundColor: colors.secondary },
          text: { color: '#fff' }
        };
      case 'danger':
        return {
          btn: { backgroundColor: colors.danger },
          text: { color: '#fff' }
        };
      case 'outline':
        return {
          btn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
          text: { color: colors.text }
        };
      case 'ghost':
        return {
          btn: { backgroundColor: 'transparent' },
          text: { color: colors.primary }
        };
      case 'primary':
      default:
        return {
          btn: { backgroundColor: colors.primary },
          text: { color: '#fff' }
        };
    }
  };

  const getSizeStyles = (): ViewStyle => {
    switch(size) {
      case 'sm': return { paddingVertical: spacing.sm, paddingHorizontal: spacing.md };
      case 'lg': return { paddingVertical: spacing.md + 4, paddingHorizontal: spacing.xl };
      case 'md':
      default: return { paddingVertical: spacing.md, paddingHorizontal: spacing.lg };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <TouchableOpacity
      testID={testID}
      style={[
        styles.baseButton,
        { borderRadius: radius.md },
        variantStyles.btn,
        sizeStyles,
        disabled && { opacity: 0.5 },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator color={variantStyles.text.color} />
      ) : (
        <>
          {icon && <React.Fragment>{icon}</React.Fragment>}
          <Text style={[styles.baseText, variantStyles.text, textStyle, icon && { marginLeft: spacing.sm }]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  baseButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  baseText: {
    fontWeight: '600',
    fontSize: 16,
  },
});
