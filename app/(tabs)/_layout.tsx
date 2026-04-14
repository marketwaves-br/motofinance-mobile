import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.icon,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Resumo',
          tabBarIcon: ({ color }) => <Ionicons name="pie-chart" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="entries"
        options={{
          title: 'Lançamentos',
          tabBarIcon: ({ color }) => <Ionicons name="list" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Relatórios',
          tabBarIcon: ({ color }) => <Ionicons name="bar-chart" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color }) => <Ionicons name="settings" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
