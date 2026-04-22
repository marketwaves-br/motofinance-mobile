import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme } from '@/theme';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { GoalsRepository } from '@/infrastructure/repositories/GoalsRepository';

const centsToField = (cents: number): string => {
  const str = String(cents).padStart(3, '0');
  const dec = str.slice(-2);
  let int = str.slice(0, -2);
  int = parseInt(int, 10).toString();
  int = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${int},${dec}`;
};

const applyBRLMask = (text: string): string => {
  let numeric = text.replace(/\D/g, '');
  if (!numeric) return '';
  numeric = numeric.padStart(3, '0');
  const dec = numeric.slice(-2);
  let int = numeric.slice(0, -2);
  int = parseInt(int, 10).toString();
  int = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${int},${dec}`;
};

export default function ManageGoalsModal() {
  const { colors, spacing } = useTheme();
  const [incomeGoal, setIncomeGoal] = useState('');
  const [netGoal, setNetGoal] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    GoalsRepository.getMonthlyGoals()
      .then(goals => {
        setIncomeGoal(goals.income !== null ? centsToField(goals.income) : '');
        setNetGoal(goals.net !== null ? centsToField(goals.net) : '');
      })
      .catch(err => console.error('Erro ao carregar metas:', err));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const incomeCents = incomeGoal ? parseInt(incomeGoal.replace(/\D/g, ''), 10) || null : null;
      const netCents = netGoal ? parseInt(netGoal.replace(/\D/g, ''), 10) || null : null;
      await Promise.all([
        GoalsRepository.setMonthlyGoal('income', incomeCents),
        GoalsRepository.setMonthlyGoal('net', netCents),
      ]);
      Alert.alert('Salvo', 'Metas mensais atualizadas com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar metas:', err);
      Alert.alert('Erro', 'Não foi possível salvar as metas. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        <AppInput
          label="Meta de Receita"
          placeholder="R$ 0,00"
          keyboardType="numeric"
          value={incomeGoal}
          onChangeText={t => setIncomeGoal(applyBRLMask(t))}
        />

        <AppInput
          label="Meta de Lucro Líquido (opcional)"
          placeholder="Deixe em branco para desativar"
          keyboardType="numeric"
          value={netGoal}
          onChangeText={t => setNetGoal(applyBRLMask(t))}
          style={{ marginTop: spacing.md }}
        />

        <View style={{ height: spacing.xl }} />

        <AppButton
          title="Salvar Metas"
          size="lg"
          onPress={handleSave}
          disabled={saving}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
