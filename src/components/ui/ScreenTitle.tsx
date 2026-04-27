import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

interface ScreenTitleProps {
  title: string;
}

/**
 * Cabeçalho padronizado das abas: ícone do app + nome da tela.
 * Trocar "wallet-outline" pelo ícone definitivo quando estiver pronto.
 */
export function ScreenTitle({ title }: ScreenTitleProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <Ionicons name="wallet-outline" size={26} color={colors.primary} />
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
});
