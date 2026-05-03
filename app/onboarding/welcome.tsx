import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { AppButton } from '@/components/ui/AppButton';
import { useTheme } from '@/theme';
import { Ionicons } from '@expo/vector-icons';

const brandIconDark  = require('../../assets/brand/icon.png');
const brandIconLight = require('../../assets/brand/icon-azul.png');

export default function WelcomeScreen() {
  const { colors, isDark } = useTheme();
  const brandIcon = isDark ? brandIconDark : brandIconLight;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Image source={brandIcon} style={styles.icon} resizeMode="cover" />
        <Text style={styles.logoText}>
          <Text style={[styles.logoMoto, { color: colors.text }]}>moto</Text>
          <Text style={[styles.logoFinance, { color: colors.primary }]}>finance</Text>
        </Text>
        <Text style={[styles.slogan, { color: colors.primary }]}>
          SUAS FINANÇAS NA DIREÇÃO CERTA
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Controle financeiro ágil para quem trabalha nas ruas. Descubra seu lucro real no fim do dia.
        </Text>
      </View>
      <View style={styles.footer}>
        <AppButton
          title="Começar Agora"
          size="lg"
          icon={<Ionicons name="arrow-forward" size={20} color="#fff" />}
          onPress={() => router.push('/onboarding/profile')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },
  content:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  icon:        { width: 130, height: 130, borderRadius: 28, marginBottom: 24 },
  logoText:    { fontSize: 40, fontWeight: 'bold', letterSpacing: -0.5, marginBottom: 8 },
  logoMoto:    { fontWeight: 'bold' },
  logoFinance: { fontWeight: 'bold' },
  slogan:      { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, marginBottom: 20 },
  subtitle:    { fontSize: 17, textAlign: 'center', lineHeight: 26 },
  footer:      { padding: 32, paddingBottom: 48 },
});
