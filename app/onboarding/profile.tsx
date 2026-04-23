import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
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
  const { completeOnboarding } = useAppStore();
  const [isSaving, setIsSaving] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    mode: 'onChange',
    defaultValues: { fullName: '', activityType: '' },
  });

  const onSubmit = async (data: ProfileInput) => {
    setIsSaving(true);
    try {
      await UserProfileRepository.saveProfile(data.fullName, data.activityType ?? '');
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
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingTop: 80 }}>
        <Text style={[styles.title, { color: colors.text }]}>Conte sobre você</Text>
        <Text style={[styles.subtitle, { color: colors.muted, marginBottom: spacing.xl }]}>
          Defina seu perfil básico para iniciarmos o MotoFinance de forma configurada.
        </Text>

        <Controller
          control={control}
          name="fullName"
          render={({ field: { value, onChange } }) => (
            <AppInput
              label="Como devemos te chamar?"
              placeholder="Ex: João, Motorista..."
              value={value}
              onChangeText={onChange}
              error={errors.fullName?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="activityType"
          render={({ field: { value, onChange } }) => (
            <AppInput
              label="O que você faz predominantemente?"
              placeholder="Ex: Uber, iFood, Motofrete"
              value={value ?? ''}
              onChangeText={onChange}
              error={errors.activityType?.message}
            />
          )}
        />

        <AppInput label="Moeda Padrão" placeholder="Ex: BRL" value="BRL" editable={false} />

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
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, lineHeight: 24 },
});
