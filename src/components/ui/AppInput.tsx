import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { useTheme } from '@/theme';

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function AppInput({ label, error, style, onFocus, onBlur, ...props }: AppInputProps) {
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
        onFocus={(e) => { setIsFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setIsFocused(false); onBlur?.(e); }}
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
