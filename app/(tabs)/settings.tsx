import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { GoalsRepository } from '@/infrastructure/repositories/GoalsRepository';
import { seedTestData } from '@/infrastructure/db/seedTestData';
import { getDatabase } from '@/infrastructure/db/sqlite';

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

export default function SettingsScreen() {
  const { colors, spacing } = useTheme();
  const [incomeGoal, setIncomeGoal] = useState('');
  const [netGoal, setNetGoal] = useState('');
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useFocusEffect(
    useCallback(() => {
      GoalsRepository.getMonthlyGoals()
        .then(goals => {
          setIncomeGoal(goals.income !== null ? centsToField(goals.income) : '');
          setNetGoal(goals.net !== null ? centsToField(goals.net) : '');
        })
        .catch(err => console.error('Erro ao carregar metas:', err));
    }, [])
  );

  const handleSeedData = () => {
    Alert.alert(
      'Gerar Dados de Teste',
      'Isso inserirá 12 meses de transações simuladas (incluindo meses com prejuízo). Os dados existentes não serão apagados.\n\nDeseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Gerar',
          onPress: async () => {
            setSeeding(true);
            try {
              const db = await getDatabase();
              const total = await seedTestData(db);
              Alert.alert('Concluído', `${total} transações inseridas com sucesso!`);
            } catch (err) {
              console.error('Erro ao gerar dados de teste:', err);
              Alert.alert('Erro', 'Não foi possível gerar os dados. Tente novamente.');
            } finally {
              setSeeding(false);
            }
          },
        },
      ]
    );
  };

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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.headerTitle, { color: colors.text }]}>Ajustes</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Configurações do app</Text>

        {/* ── Metas Mensais ─────────────────────────────────────── */}
        <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>METAS MENSAIS</Text>
        </View>

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
        />

        <AppButton
          title="Salvar Metas"
          size="lg"
          onPress={handleSave}
          disabled={saving}
          style={{ marginTop: 8, marginBottom: spacing.xl }}
        />

        {/* ── Gerenciar ─────────────────────────────────────────── */}
        <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>GERENCIAR</Text>
        </View>

        <Link href="/(modals)/manage-sources" asChild>
          <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.menuLeft}>
              <Ionicons name="business" size={22} color={colors.income} style={{ marginRight: 14 }} />
              <Text style={[styles.menuText, { color: colors.text }]}>Fontes de Receita</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.icon} />
          </TouchableOpacity>
        </Link>

        <Link href="/(modals)/manage-categories" asChild>
          <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 10 }]}>
            <View style={styles.menuLeft}>
              <Ionicons name="pricetag" size={22} color={colors.expense} style={{ marginRight: 14 }} />
              <Text style={[styles.menuText, { color: colors.text }]}>Categorias de Despesa</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.icon} />
          </TouchableOpacity>
        </Link>

        {/* ── Desenvolvedor ─────────────────────────────────────── */}
        <View style={[styles.sectionHeader, { borderBottomColor: colors.border, marginTop: spacing.xl }]}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>DESENVOLVEDOR</Text>
        </View>

        <TouchableOpacity
          onPress={handleSeedData}
          disabled={seeding}
          style={[styles.menuItem, {
            backgroundColor: colors.surface,
            borderColor: seeding ? colors.border : '#E67E22',
            opacity: seeding ? 0.6 : 1,
          }]}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="flask-outline" size={22} color="#E67E22" style={{ marginRight: 14 }} />
            <Text style={[styles.menuText, { color: colors.text }]}>
              {seeding ? 'Gerando dados...' : 'Gerar Dados de Teste'}
            </Text>
          </View>
          {!seeding && <Ionicons name="chevron-forward" size={20} color={colors.icon} />}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', marginTop: 56, marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 32 },
  sectionHeader: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
    paddingBottom: 6,
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  menuText: { fontSize: 16 },
});
