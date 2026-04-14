import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { useTheme } from '@/theme';
import { useAppStore } from '@/stores/app-store';
import { UserProfileRepository } from '@/infrastructure/repositories/UserProfileRepository';

export default function ProfileScreen() {
  const { colors, spacing } = useTheme();
  const { completeOnboarding } = useAppStore();
  const [fullName, setFullName] = useState('');
  const [activityType, setActivityType] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleFinish = async () => {
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      Alert.alert('Atenção', 'Por favor, informe seu nome ou apelido.');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Gravar perfil no SQLite
      await UserProfileRepository.saveProfile(trimmedName, activityType.trim());
      // 2. Marcar onboarding como concluído (SQLite + Zustand)
      await completeOnboarding();
      // 3. Redirecionar para dashboard
      router.replace('/');
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      Alert.alert('Erro', 'Não foi possível salvar seu perfil. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingTop: 80 }}>
        <Text style={[styles.title, { color: colors.text }]}>Conte sobre você</Text>
        <Text style={[styles.subtitle, { color: colors.muted, marginBottom: spacing.xl }]}>
          Defina seu perfil básico para iniciarmos o MotoFinance de forma configurada.
        </Text>

        <AppInput 
          label="Como devemos te chamar?" 
          placeholder="Ex: João, Motorista..." 
          value={fullName}
          onChangeText={setFullName}
        />
        <AppInput 
          label="O que você faz predominantemente?" 
          placeholder="Ex: Uber, iFood, Motofrete" 
          value={activityType}
          onChangeText={setActivityType}
        />
        <AppInput label="Moeda Padrão" placeholder="Ex: BRL" value="BRL" editable={false} />

        <View style={{ marginTop: spacing.xl }}>
          <AppButton 
            title="Salvar e Ir para Painel" 
            size="lg" 
            onPress={handleFinish}
            isLoading={isSaving}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, lineHeight: 24 }
});
