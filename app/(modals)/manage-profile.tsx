import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { UserProfileRepository } from '@/infrastructure/repositories/UserProfileRepository';
import { useAppStore } from '@/stores/app-store';

export default function ManageProfileModal() {
  const { colors, spacing } = useTheme();
  const { loadUserProfile } = useAppStore();
  const scrollRef = useRef<ScrollView>(null);
  
  const handleInputFocus = () => {
    setTimeout(() => { scrollRef.current?.scrollToEnd({ animated: true }); }, 150);
  };
  
  const [fullName, setFullName] = useState('');
  const [activityType, setActivityType] = useState('Moto de Aplicativo');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    UserProfileRepository.getProfile().then(profile => {
      if (profile) {
        setFullName(profile.fullName);
        setActivityType(profile.activityType);
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Atenção', 'O nome não pode ficar vazio.');
      return;
    }
    try {
      await UserProfileRepository.saveProfile(fullName.trim(), activityType.trim() || 'Moto de Aplicativo');
      await loadUserProfile(); // Atualiza a store global para refletir na Home imediatamente
      Alert.alert('Sucesso', 'Seus dados foram atualizados.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível salvar os dados.');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior="padding" 
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}
    >
      <ScrollView 
        ref={scrollRef}
        style={[styles.container, { backgroundColor: colors.background }]} 
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: colors.text }]}>Meus Dados</Text>

        {!loading && (
          <View style={{ marginTop: spacing.md, gap: spacing.lg }}>
            <AppInput
              label="Seu Nome ou Apelido"
              placeholder="Como quer ser chamado?"
              value={fullName}
              onChangeText={setFullName}
              onFocus={handleInputFocus}
            />
            
            <AppInput
              label="Qual é a sua atividade principal?"
              placeholder="Ex: Moto de Aplicativo, Entregador..."
              value={activityType}
              onChangeText={setActivityType}
              onFocus={handleInputFocus}
            />

            <AppButton
              title="Salvar Alterações"
              size="lg"
              onPress={handleSave}
              style={{ marginTop: spacing.md }}
              disabled={!fullName.trim()}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
});
