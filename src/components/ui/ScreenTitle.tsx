import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

interface ScreenTitleProps {
  title: string;
  /** Conteúdo opcional à direita do título (ex.: botão Exportar). */
  rightContent?: React.ReactNode;
}

/**
 * Barra de título fixa de cada aba.
 * Responsável por: background surface, borda inferior, safe area superior.
 * Trocar "wallet-outline" pelo ícone definitivo quando estiver pronto.
 */
export function ScreenTitle({ title, rightContent }: ScreenTitleProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          paddingTop: insets.top + 8,
          paddingHorizontal: spacing.lg,
          paddingBottom: 6,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.titleRow}>
          <Ionicons name="wallet-outline" size={24} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        </View>
        {rightContent}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
