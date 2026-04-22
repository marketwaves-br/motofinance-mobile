import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { seedTestData } from '@/infrastructure/db/seedTestData';
import { getDatabase } from '@/infrastructure/db/sqlite';

export default function SettingsScreen() {
  const { colors, spacing } = useTheme();
  const [seeding, setSeeding] = useState(false);

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


  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
    >
      <Text style={[styles.headerTitle, { color: colors.text }]}>Ajustes</Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>Configurações do app</Text>

      {/* ── Perfil ────────────────────────────────────────────── */}
      <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>PERFIL</Text>
      </View>

      <View style={styles.menuWrapper}>
        <Link href="/(modals)/manage-profile" asChild>
          <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.menuLeft}>
              <Ionicons name="person" size={22} color={colors.primary} style={{ marginRight: 14 }} />
              <Text style={[styles.menuText, { color: colors.text }]}>Meus Dados</Text>
            </View>
          </TouchableOpacity>
        </Link>
      </View>

      {/* ── Gerenciar ─────────────────────────────────────────── */}
      <View style={[styles.sectionHeader, { borderBottomColor: colors.border, marginTop: spacing.xl }]}>
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>GERENCIAR</Text>
      </View>

      <View style={styles.menuWrapper}>
        <Link href="/(modals)/manage-categories" asChild>
          <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.menuLeft}>
              <Ionicons name="pricetag" size={22} color={colors.expense} style={{ marginRight: 14 }} />
              <Text style={[styles.menuText, { color: colors.text }]}>Categorias de Despesa</Text>
            </View>
          </TouchableOpacity>
        </Link>
      </View>

      <View style={styles.menuWrapper}>
        <Link href="/(modals)/manage-sources" asChild>
          <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.menuLeft}>
              <Ionicons name="business" size={22} color={colors.income} style={{ marginRight: 14 }} />
              <Text style={[styles.menuText, { color: colors.text }]}>Fontes de Receita</Text>
            </View>
          </TouchableOpacity>
        </Link>
      </View>

      <View style={styles.menuWrapper}>
        <Link href="/(modals)/manage-goals" asChild>
          <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.menuLeft}>
              <Ionicons name="flag-outline" size={22} color={colors.primary} style={{ marginRight: 14 }} />
              <Text style={[styles.menuText, { color: colors.text }]}>Metas Mensais</Text>
            </View>
          </TouchableOpacity>
        </Link>
      </View>

      {/* ── Desenvolvedor ─────────────────────────────────────── */}
      <View style={[styles.sectionHeader, { borderBottomColor: colors.border, marginTop: spacing.xl }]}>
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>DESENVOLVEDOR</Text>
      </View>

      <View style={styles.menuWrapper}>
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
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  menuWrapper: {
    marginBottom: 16,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  menuText: { fontSize: 16 },
});
