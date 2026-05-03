import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

interface ScreenTitleProps {
  /** Título da tela (ex: "Lançamentos"). Omitir no Dashboard para exibir só o ícone. */
  title?: string;
  /** Renderiza o logotipo "motofinance" em dois tons no lugar do título. */
  brandTitle?: boolean;
  /** Conteúdo opcional à direita (ex.: botão Exportar). */
  rightContent?: React.ReactNode;
}

const brandIconDark  = require('../../../assets/brand/icon.png');
const brandIconLight = require('../../../assets/brand/icon-azul.png');

/**
 * Barra de título fixa de cada aba.
 * - Sem título: exibe só o ícone da marca (Dashboard).
 * - Com título: exibe ícone pequeno + título da tela.
 */
export function ScreenTitle({ title, brandTitle, rightContent }: ScreenTitleProps) {
  const { colors, spacing, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const brandIcon = isDark ? brandIconDark : brandIconLight;

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
          {brandTitle ? (
            <>
              <Image source={brandIcon} style={styles.iconSmall} resizeMode="cover" />
              <Text style={styles.logoText}>
                <Text style={[styles.logoMoto, { color: colors.text }]}>moto</Text>
                <Text style={[styles.logoFinance, { color: colors.primary }]}>finance</Text>
              </Text>
            </>
          ) : title ? (
            <>
              <Image source={brandIcon} style={styles.iconSmall} resizeMode="cover" />
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            </>
          ) : (
            <Image source={brandIcon} style={styles.iconLarge} resizeMode="cover" />
          )}
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
  iconSmall: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  iconLarge: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  logoText: {
    fontSize: 26,
    fontWeight: 'bold',
    letterSpacing: -0.3,
  },
  logoMoto:    { fontWeight: 'bold' },
  logoFinance: { fontWeight: 'bold' },
});
