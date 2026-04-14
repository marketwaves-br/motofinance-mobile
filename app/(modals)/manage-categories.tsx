import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { useTheme } from '@/theme';
import { ExpenseCategoriesRepository } from '@/infrastructure/repositories/ExpenseCategoriesRepository';

type Category = {
  id: string;
  name: string;
  is_active: number;
};

export default function ManageCategoriesModal() {
  const { colors } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');

  const loadCategories = async () => {
    const data = await ExpenseCategoriesRepository.getAllCategories();
    setCategories(data);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await ExpenseCategoriesRepository.addCategory(name);
      setNewName('');
      loadCategories();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível adicionar a categoria.');
    }
  };

  const handleToggle = async (category: Category) => {
    try {
      const newStatus = category.is_active === 1 ? false : true;
      await ExpenseCategoriesRepository.toggleCategoryActive(category.id, newStatus);
      loadCategories();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível alterar o status da categoria.');
    }
  };

  const renderItem = ({ item }: { item: Category }) => {
    const isActive = item.is_active === 1;
    return (
      <View style={[styles.categoryItem, { borderBottomColor: colors.border }]}>
        <Text style={[styles.categoryName, { color: isActive ? colors.text : colors.icon }]}>
          {item.name} {!isActive && '(Arquivo)'}
        </Text>
        <TouchableOpacity
          onPress={() => handleToggle(item)}
          style={[styles.toggleBtn, { backgroundColor: isActive ? `${colors.danger}18` : `${colors.income}18` }]}
        >
          <Text style={{ color: isActive ? colors.danger : colors.income, fontWeight: 'bold' }}>
            {isActive ? 'Arquivar' : 'Reativar'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.addSection}>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder="Categoria de Despesa"
          placeholderTextColor={colors.icon}
          value={newName}
          onChangeText={setNewName}
        />
        <TouchableOpacity onPress={handleAdd} style={[styles.addBtn, { backgroundColor: colors.danger }]}>
          <Text style={styles.addBtnText}>Adicionar</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={categories}
        keyExtractor={c => c.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  addSection: { flexDirection: 'row', marginBottom: 24, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 12, marginRight: 12, fontSize: 16 },
  addBtn: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: 'bold' },
  categoryItem: { flexDirection: 'row', paddingVertical: 16, borderBottomWidth: 1, alignItems: 'center', justifyContent: 'space-between' },
  categoryName: { fontSize: 16, fontWeight: '500' },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }
});
