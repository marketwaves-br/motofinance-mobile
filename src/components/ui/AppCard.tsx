import React from 'react';
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
