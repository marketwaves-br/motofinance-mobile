import os

files = {
    "src/constants/colors.ts": """const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#F8FAFC',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    surface: '#FFFFFF',
    border: '#E2E8F0',
    primary: '#10B981',
    primaryDark: '#047857',
    secondary: '#3B82F6',
    danger: '#EF4444', 
    expense: '#F43F5E',
    income: '#10B981',
    muted: '#94A3B8',
  },
  dark: {
    text: '#ECEDEE',
    background: '#0F172A',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    surface: '#1E293B',
    border: '#334155',
    primary: '#10B981',
    primaryDark: '#047857',
    secondary: '#3B82F6',
    danger: '#EF4444',
    expense: '#F43F5E',
    income: '#10B981',
    muted: '#64748B',
  },
};
""",
    "src/constants/spacing.ts": """export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999
};
""",
    "src/theme/index.ts": """import { Colors } from '../constants/colors';
import { Spacing, Radius } from '../constants/spacing';
import { useColorScheme } from 'react-native';

export const useTheme = () => {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return {
    colors: theme,
    spacing: Spacing,
    radius: Radius,
    isDark: colorScheme === 'dark',
  };
};
""",
    "src/components/ui/AppButton.tsx": """import React from 'react';
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
""",
    "src/components/ui/AppCard.tsx": """import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

interface AppCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function AppCard({ children, style }: AppCardProps) {
  const { colors, spacing, radius, isDark } = useTheme();

  return (
    <View style={[
      styles.card, 
      { 
        backgroundColor: colors.surface, 
        padding: spacing.md, 
        borderRadius: radius.lg,
        borderColor: colors.border,
        shadowColor: isDark ? '#000' : '#888',
      }, 
      style
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  }
});
""",
    "src/components/ui/AppInput.tsx": """import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { useTheme } from '@/theme';

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function AppInput({ label, error, style, ...props }: AppInputProps) {
  const { colors, spacing, radius } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[{ marginBottom: spacing.md }, style]}>
      {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          { 
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor: error ? colors.danger : (isFocused ? colors.primary : colors.border),
            borderRadius: radius.md,
            padding: spacing.md,
          }
        ]}
        placeholderTextColor={colors.muted}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      {error && <Text style={[styles.error, { color: colors.danger, marginTop: spacing.xs }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontWeight: '500',
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    fontSize: 16,
  },
  error: {
    fontSize: 12,
  }
});
"""
}

for path, content in files.items():
    full_path = os.path.join("d:/MotoFinance/motofinance-mobile", path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Created components!")
