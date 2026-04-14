import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { useTheme } from '@/theme';
import { IncomeSourcesRepository } from '@/infrastructure/repositories/IncomeSourcesRepository';

type Source = {
  id: string;
  name: string;
  is_active: number;
};

export default function ManageSourcesModal() {
  const { colors } = useTheme();
  const [sources, setSources] = useState<Source[]>([]);
  const [newName, setNewName] = useState('');

  const loadSources = async () => {
    const data = await IncomeSourcesRepository.getAllSources();
    setSources(data);
  };

  useEffect(() => {
    loadSources();
  }, []);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await IncomeSourcesRepository.addSource(name);
      setNewName('');
      loadSources();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível adicionar a empresa.');
    }
  };

  const handleToggle = async (source: Source) => {
    try {
      const newStatus = source.is_active === 1 ? false : true;
      await IncomeSourcesRepository.toggleSourceActive(source.id, newStatus);
      loadSources();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível alterar o status da empresa.');
    }
  };

  const renderItem = ({ item }: { item: Source }) => {
    const isActive = item.is_active === 1;
    return (
      <View style={[styles.sourceItem, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sourceName, { color: isActive ? colors.text : colors.icon }]}>
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
          placeholder="Fonte da Receita"
          placeholderTextColor={colors.icon}
          value={newName}
          onChangeText={setNewName}
        />
        <TouchableOpacity onPress={handleAdd} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.addBtnText}>Adicionar</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={sources}
        keyExtractor={s => s.id}
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
  sourceItem: { flexDirection: 'row', paddingVertical: 16, borderBottomWidth: 1, alignItems: 'center', justifyContent: 'space-between' },
  sourceName: { fontSize: 16, fontWeight: '500' },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }
});
