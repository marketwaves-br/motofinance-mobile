import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { ExpenseCategoriesRepository } from '@/infrastructure/repositories/ExpenseCategoriesRepository';

type Category = {
  id: string;
  name: string;
  is_active: number;
};

export default function ManageCategoriesModal() {
  const { colors, spacing } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName]       = useState('');
  const [loading, setLoading]       = useState(false);

  const loadCategories = async () => {
    try {
      const data = await ExpenseCategoriesRepository.getAllCategories();
      setCategories(data);
    } catch (e) {
      console.error('Erro ao carregar categorias:', e);
    }
  };

  useEffect(() => { loadCategories(); }, []);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setLoading(true);
    try {
      await ExpenseCategoriesRepository.addCategory(name);
      setNewName('');
      await loadCategories();
    } catch (e) {
      console.error('Erro ao adicionar categoria:', e);
      Alert.alert('Erro', 'Não foi possível adicionar a categoria.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (category: Category) => {
    try {
      await ExpenseCategoriesRepository.toggleCategoryActive(category.id, category.is_active !== 1);
      await loadCategories();
    } catch (e) {
      console.error('Erro ao alterar status da categoria:', e);
      Alert.alert('Erro', 'Não foi possível alterar o status.');
    }
  };

  const renderItem = ({ item }: { item: Category }) => {
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
          placeholder="Nova categoria de despesa"
          value={newName}
          onChangeText={setNewName}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
          style={styles.input}
        />
        <AppButton
          testID="btn-add-category"
          title="Adicionar"
          onPress={handleAdd}
          variant="danger"
          isLoading={loading}
          disabled={!newName.trim()}
          style={styles.addBtn}
        />
      </View>

      <FlatList
        data={categories}
        keyExtractor={c => c.id}
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
