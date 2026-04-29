import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { seedTestData } from '@/infrastructure/db/seedTestData';
import { getDatabase, clearAllData } from '@/infrastructure/db/sqlite';
import { exportBackup, importBackup } from '@/lib/backup';
import { useAppStore } from '@/stores/app-store';
import type { ThemePreference } from '@/infrastructure/repositories/AppSettingsRepository';

export default function SettingsScreen() {
  const { colors, spacing } = useTheme();
  const [seeding,          setSeeding]          = useState(false);
  const [clearing,         setClearing]         = useState(false);
  const [exportingBackup,  setExportingBackup]  = useState(false);
  const [importingBackup,  setImportingBackup]  = useState(false);

  const resetAppState          = useAppStore((s) => s.resetAppState);
  const themePreference        = useAppStore((s) => s.themePreference);
  const setThemePreference     = useAppStore((s) => s.setThemePreference);
  const notificationsEnabled   = useAppStore((s) => s.notificationsEnabled);
  const reminderTime           = useAppStore((s) => s.reminderTime);
  const setNotificationsEnabled = useAppStore((s) => s.setNotificationsEnabled);
  const setReminderTime        = useAppStore((s) => s.setReminderTime);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const reminderDate = (() => {
    const [h, m] = reminderTime.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  })();

  const handleExportBackup = async () => {
    setExportingBackup(true);
    try {
      await exportBackup();
    } catch (err) {
      console.error('Erro ao exportar backup:', err);
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível exportar o backup.');
    } finally {
      setExportingBackup(false);
    }
  };

  const handleImportBackup = () => {
    Alert.alert(
      'Restaurar Backup',
      'Isso substituirá todos os seus dados atuais pelo conteúdo do backup selecionado.\n\nEssa ação não pode ser desfeita. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: async () => {
            setImportingBackup(true);
            try {
              const outcome = await importBackup();
              if (outcome === 'success') {
                Alert.alert(
                  'Backup Restaurado',
                  'Seus dados foram restaurados com sucesso. Feche e abra o app para carregar tudo corretamente.'
                );
              }
            } catch (err) {
              console.error('Erro ao restaurar backup:', err);
              Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível restaurar o backup.');
            } finally {
              setImportingBackup(false);
            }
          },
        },
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Limpar Dados de Teste',
      'Isso apagará TODOS os dados — transações, metas, recorrentes e perfil — e voltará ao onboarding.\n\nDeseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar Tudo',
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            try {
              await clearAllData();
              resetAppState();
              router.replace('/');
            } catch (err) {
              console.error('Erro ao limpar dados:', err);
              Alert.alert('Erro', 'Não foi possível limpar os dados. Tente novamente.');
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  };

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenTitle title="Ajustes" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
      >

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

      <View style={styles.menuWrapper}>
        <Link href="/(modals)/manage-recurring" asChild>
          <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.menuLeft}>
              <Ionicons name="repeat-outline" size={22} color={colors.primary} style={{ marginRight: 14 }} />
              <Text style={[styles.menuText, { color: colors.text }]}>Lançamentos Recorrentes</Text>
            </View>
          </TouchableOpacity>
        </Link>
      </View>

      {/* ── Aparência ────────────────────────────────────────── */}
      <View style={[styles.sectionHeader, { borderBottomColor: colors.border, marginTop: spacing.xl }]}>
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>APARÊNCIA</Text>
      </View>

      <View style={[styles.themeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.themeRow}>
          {([
            { value: 'system', label: 'Sistema', icon: 'phone-portrait-outline' },
            { value: 'light',  label: 'Claro',   icon: 'sunny-outline' },
            { value: 'dark',   label: 'Escuro',  icon: 'moon-outline' },
          ] as { value: ThemePreference; label: string; icon: string }[]).map((opt) => {
            const isActive = themePreference === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setThemePreference(opt.value)}
                style={[styles.themeOption, {
                  backgroundColor: isActive ? colors.primary : colors.background,
                  borderColor:     isActive ? colors.primary : colors.border,
                }]}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={opt.icon as any}
                  size={20}
                  color={isActive ? '#fff' : colors.muted}
                />
                <Text style={[styles.themeOptionText, { color: isActive ? '#fff' : colors.muted }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Notificações ─────────────────────────────────────── */}
      <View style={[styles.sectionHeader, { borderBottomColor: colors.border, marginTop: spacing.xl }]}>
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>NOTIFICAÇÕES</Text>
      </View>

      <View style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 16 }]}>
        <View style={styles.menuLeft}>
          <Ionicons name="notifications-outline" size={22} color={colors.primary} style={{ marginRight: 14 }} />
          <View>
            <Text style={[styles.menuText, { color: colors.text }]}>Lembrete Diário</Text>
            <Text style={[styles.menuSubtext, { color: colors.muted }]}>
              Lembrar de registrar lançamentos
            </Text>
          </View>
        </View>
        <Switch
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
          trackColor={{ false: colors.border, true: `${colors.primary}80` }}
          thumbColor={notificationsEnabled ? colors.primary : colors.muted}
        />
      </View>

      {notificationsEnabled && (
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 16 }]}
          onPress={() => setShowTimePicker(true)}
          activeOpacity={0.7}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="time-outline" size={22} color={colors.primary} style={{ marginRight: 14 }} />
            <View>
              <Text style={[styles.menuText, { color: colors.text }]}>Horário do Lembrete</Text>
              <Text style={[styles.menuSubtext, { color: colors.muted }]}>
                Todo dia às {reminderTime}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </TouchableOpacity>
      )}

      {showTimePicker && (
        <DateTimePicker
          value={reminderDate}
          mode="time"
          is24Hour
          display="default"
          onChange={(_e, date) => {
            setShowTimePicker(false);
            if (date) {
              const h = String(date.getHours()).padStart(2, '0');
              const m = String(date.getMinutes()).padStart(2, '0');
              setReminderTime(`${h}:${m}`);
            }
          }}
        />
      )}

      {/* ── Dados ────────────────────────────────────────────── */}
      <View style={[styles.sectionHeader, { borderBottomColor: colors.border, marginTop: spacing.xl }]}>
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>DADOS</Text>
      </View>

      <View style={styles.menuWrapper}>
        <TouchableOpacity
          onPress={handleExportBackup}
          disabled={exportingBackup}
          style={[styles.menuItem, {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: exportingBackup ? 0.6 : 1,
          }]}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="cloud-upload-outline" size={22} color={colors.primary} style={{ marginRight: 14 }} />
            <View>
              <Text style={[styles.menuText, { color: colors.text }]}>
                {exportingBackup ? 'Exportando...' : 'Fazer Backup'}
              </Text>
              <Text style={[styles.menuSubtext, { color: colors.muted }]}>
                Salvar cópia dos dados
              </Text>
            </View>
          </View>
          <Ionicons name="share-outline" size={18} color={colors.muted} />
        </TouchableOpacity>
      </View>

      <View style={styles.menuWrapper}>
        <TouchableOpacity
          onPress={handleImportBackup}
          disabled={importingBackup}
          style={[styles.menuItem, {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: importingBackup ? 0.6 : 1,
          }]}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="cloud-download-outline" size={22} color={colors.expense} style={{ marginRight: 14 }} />
            <View>
              <Text style={[styles.menuText, { color: colors.text }]}>
                {importingBackup ? 'Restaurando...' : 'Restaurar Backup'}
              </Text>
              <Text style={[styles.menuSubtext, { color: colors.muted }]}>
                Substituir dados por um backup
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </TouchableOpacity>
      </View>

      {/* ── Desenvolvedor ─────────────────────────────────────── */}
      {__DEV__ && (
        <>
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

          <View style={styles.menuWrapper}>
            <TouchableOpacity
              onPress={handleClearData}
              disabled={clearing}
              style={[styles.menuItem, {
                backgroundColor: colors.surface,
                borderColor: clearing ? colors.border : colors.expense,
                opacity: clearing ? 0.6 : 1,
              }]}
            >
              <View style={styles.menuLeft}>
                <Ionicons name="trash-outline" size={22} color={colors.expense} style={{ marginRight: 14 }} />
                <Text style={[styles.menuText, { color: colors.text }]}>
                  {clearing ? 'Limpando...' : 'Limpar Dados de Teste'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </>
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  menuLeft:    { flexDirection: 'row', alignItems: 'center', flex: 1 },
  menuText:    { fontSize: 16 },
  menuSubtext: { fontSize: 12, marginTop: 2 },

  themeCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  themeRow: { flexDirection: 'row', gap: 8 },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  themeOptionText: { fontSize: 12, fontWeight: '600' },
});
