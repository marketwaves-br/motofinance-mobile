import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Painel de Configurações</Text>

      <Link href="/(modals)/manage-sources" asChild>
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="business" size={24} color={colors.income} style={{ marginRight: 15 }} />
            <Text style={{ color: colors.text, fontSize: 16 }}>Fontes de Receita</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.icon} />
        </TouchableOpacity>
      </Link>

      <Link href="/(modals)/manage-categories" asChild>
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 12 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="pricetag" size={24} color={colors.expense} style={{ marginRight: 15 }} />
            <Text style={{ color: colors.text, fontSize: 16 }}>Categorias de Despesa</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.icon} />
        </TouchableOpacity>
      </Link>
    </View>
  );
}
const styles = StyleSheet.create({ 
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 30 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderRadius: 10, borderWidth: 1 }
});
