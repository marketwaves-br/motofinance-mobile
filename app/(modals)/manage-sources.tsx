import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { IncomeSourcesRepository } from '@/infrastructure/repositories/IncomeSourcesRepository';

type Source = {
  id: string;
  name: string;
  is_active: number;
};

export default function ManageSourcesModal() {
  const { colors, spacing } = useTheme();
  const [sources, setSources]   = useState<Source[]>([]);
  const [newName, setNewName]   = useState('');
  const [loading, setLoading]   = useState(false);

  const loadSources = async () => {
    try {
      const data = await IncomeSourcesRepository.getAllSources();
      setSources(data);
    } catch (e) {
      console.error('Erro ao carregar fontes:', e);
    }
  };

  useEffect(() => { loadSources(); }, []);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setLoading(true);
    try {
      await IncomeSourcesRepository.addSource(name);
      setNewName('');
      await loadSources();
    } catch (e) {
      console.error('Erro ao adicionar fonte:', e);
      Alert.alert('Erro', 'Não foi possível adicionar a fonte.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (source: Source) => {
    try {
      await IncomeSourcesRepository.toggleSourceActive(source.id, source.is_active !== 1);
      await loadSources();
    } catch (e) {
      console.error('Erro ao alterar status da fonte:', e);
      Alert.alert('Erro', 'Não foi possível alterar o status.');
    }
  };

  const renderItem = ({ item }: { item: Source }) => {
    const isActive = item.is_active === 1;
    return (
      <View style={[styles.row, { borderBottomColor: colors.border }]}>
        <Text style={[styles.rowName, { color: isActive ? colors.text : colors.muted }]}>
          {item.name}{!isActive && ' (Arquivado)'}
        </Text>
        <TouchableOpacity
          onPress={() => handleToggle(item)}
          style={[styles.toggleBtn, {
            backgroundColor: isActive ? `${colors.danger}18` : `${colors.income}18`,
          }]}
        >
          <Text style={{ color: isActive ? colors.danger : colors.income, fontWeight: '600' }}>
            {isActive ? 'Arquivar' : 'Reativar'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <View style={[styles.addSection, { paddingHorizontal: spacing.lg, paddingTop: spacing.md }]}>
        <AppInput
          placeholder="Nova fonte de receita"
          value={newName}
          onChangeText={setNewName}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
          style={styles.input}
        />
        <AppButton
          testID="btn-add-source"
          title="Adicionar"
          onPress={handleAdd}
          isLoading={loading}
          disabled={!newName.trim()}
          style={styles.addBtn}
        />
      </View>

      <FlatList
        data={sources}
        keyExtractor={s => s.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 40 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  addSection: { gap: 8, marginBottom: 8 },
  input:      { marginBottom: 0 },
  addBtn:     { alignSelf: 'flex-end' },
  row: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowName:   { fontSize: 16, fontWeight: '500', flex: 1, marginRight: 12 },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
});
