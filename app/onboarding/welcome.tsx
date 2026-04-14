import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { AppButton } from '@/components/ui/AppButton';
import { useTheme } from '@/theme';
import { Ionicons } from '@expo/vector-icons';

export default function WelcomeScreen() {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="wallet-outline" size={56} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>MotoFinance</Text>
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
  container: { flex: 1 },
  iconBox: { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', marginBottom: 32, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 36, fontWeight: 'bold', marginBottom: 12, letterSpacing: -0.5 },
  subtitle: { fontSize: 18, textAlign: 'center', lineHeight: 28 },
  footer: { padding: 32, paddingBottom: 48 }
});
