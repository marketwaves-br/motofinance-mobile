import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { useTheme } from '@/theme';
import { useAppStore } from '@/stores/app-store';
import { UserProfileRepository } from '@/infrastructure/repositories/UserProfileRepository';
import { profileSchema, ProfileInput } from '@/lib/validation';

export default function ProfileScreen() {
  const { colors, spacing } = useTheme();
  const { completeOnboarding, loadUserProfile } = useAppStore();
  const [isSaving, setIsSaving] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    mode: 'onChange',
    defaultValues: { fullName: '' },
  });

  const onSubmit = async (data: ProfileInput) => {
    setIsSaving(true);
    try {
      await UserProfileRepository.saveProfile(data.fullName);
      await loadUserProfile();
      await completeOnboarding();
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
      {/* Cabeçalho fixo — sempre visível, mesmo com teclado aberto */}
      <View style={[styles.header, { paddingHorizontal: spacing.xl, borderBottomColor: colors.border }]}>
        <Ionicons name="wallet-outline" size={28} color={colors.primary} />
        <Text style={[styles.brandName, { color: colors.primary }]}>MotoFinance</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <Controller
          control={control}
          name="fullName"
          render={({ field: { value, onChange } }) => (
            <AppInput
              label="Informe seu nome ou apelido"
              placeholder="Ex: João, Motorista..."
              value={value}
              onChangeText={onChange}
              error={errors.fullName?.message}
            />
          )}
        />

        <AppInput
          label="Moeda padrão"
          placeholder="BRL"
          value="BRL"
          editable={false}
        />

        <View style={{ marginTop: spacing.xl }}>
          <AppButton
            title="Salvar e Ir para Painel"
            size="lg"
            onPress={handleSubmit(onSubmit)}
            isLoading={isSaving}
            disabled={!isValid || isSaving}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 64,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
