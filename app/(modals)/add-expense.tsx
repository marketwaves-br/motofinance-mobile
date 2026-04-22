import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { SortableChipGrid, SortableChipItem } from '@/components/ui/SortableChipGrid';
import { useTheme } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { TransactionsRepository } from '@/infrastructure/repositories/TransactionsRepository';
import { ExpenseCategoriesRepository } from '@/infrastructure/repositories/ExpenseCategoriesRepository';

const formatDateBR = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const centsToMasked = (cents: number): string => {
  let numeric = String(cents).padStart(3, '0');
  const dec = numeric.slice(-2);
  let int = numeric.slice(0, -2);
  int = parseInt(int, 10).toString();
  int = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${int},${dec}`;
};

export default function AddExpenseModal() {
  const { colors, spacing, radius } = useTheme();
  const params = useLocalSearchParams<{ id?: string; amountCents?: string; refId?: string; dateISO?: string; notes?: string }>();
  const isEditing = !!params.id;

  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [categories, setCategories] = useState<SortableChipItem[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const handleAmountChange = (text: string) => {
    let numericValue = text.replace(/\D/g, '');
    if (!numericValue) { setAmount(''); return; }
    numericValue = numericValue.padStart(3, '0');
    const decimalPart = numericValue.slice(-2);
    let integerPart = numericValue.slice(0, -2);
    integerPart = parseInt(integerPart, 10).toString();
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    setAmount(`R$ ${integerPart},${decimalPart}`);
  };

  useEffect(() => {
    TransactionsRepository.getExpenseCategories().then(setCategories);
    if (params.amountCents) setAmount(centsToMasked(parseInt(params.amountCents, 10)));
    if (params.refId)       setSelectedCat(params.refId);
    if (params.dateISO)     setSelectedDate(new Date(params.dateISO));
    if (params.notes)       setNotes(params.notes);
  }, []);

  const handleAmountFocus = () => {
    setTimeout(() => { scrollRef.current?.scrollToEnd({ animated: true }); }, 150);
  };

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(false);
    if (date) setSelectedDate(date);
  };

  const handleSave = async () => {
    if (!amount || !selectedCat) {
      Alert.alert('Atenção', 'Preencha o valor e selecione a categoria de gasto.');
      return;
    }
    const cents = parseInt(amount.replace(/\D/g, ''), 10) || 0;
    if (cents <= 0) return;
    try {
      const notesValue = notes.trim() || undefined;
      if (isEditing) {
        await TransactionsRepository.updateExpense(params.id!, selectedCat, cents, selectedDate, notesValue);
      } else {
        await TransactionsRepository.addExpense(selectedCat, cents, selectedDate, notesValue);
      }
      router.back();
    } catch (error) {
      console.error('Erro ao salvar despesa:', error);
      Alert.alert('Erro', 'Não foi possível salvar a despesa. Tente novamente.');
    }
  };

  const handleOrderChange = async (newItems: SortableChipItem[]) => {
    setCategories(newItems);
    try {
      await ExpenseCategoriesRepository.updateCategoriesOrder(newItems.map((c) => c.id));
    } catch (error) {
      console.error('Erro ao salvar ordem das categorias:', error);
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
        <Text style={[styles.title, { color: colors.text }]}>{isEditing ? 'Editar Despesa' : 'Nova Despesa'}</Text>

        {/* 1. SELEÇÃO DA CATEGORIA */}
        <Text style={[styles.label, { color: colors.text }]}>Categoria</Text>

        {/* Hint de uso do drag & drop */}
        <View style={[styles.hintRow, { marginBottom: spacing.sm }]}>
          <Ionicons name="hand-left-outline" size={14} color="#E67E22" style={{ marginRight: 5 }} />
          <Text style={[styles.hintText, { color: colors.icon }]}>
            Segure e arraste para reposicionar
          </Text>
        </View>

        <SortableChipGrid
          items={categories}
          selectedId={selectedCat}
          onSelect={setSelectedCat}
          onOrderChange={handleOrderChange}
          accentColor={colors.danger}
          borderColor={colors.border}
          textColor={colors.text}
          radiusMd={radius.md}
        />

        {/* 2. VALOR + DATA (lado a lado) */}
        <View style={[styles.valueRow, { marginTop: spacing.lg }]}>
          <View style={styles.valueField}>
            <AppInput
              label="Valor Gasto"
              placeholder="R$ 0,00"
              keyboardType="numeric"
              value={amount}
              onChangeText={handleAmountChange}
              onFocus={handleAmountFocus}
              style={{ marginBottom: 0 }}
            />
          </View>

          <View style={styles.dateField}>
            <Text style={[styles.dateLabel, { color: colors.text }]}>Data</Text>
            <TouchableOpacity
              style={[styles.dateButton, {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: spacing.md,
              }]}
              onPress={() => { Keyboard.dismiss(); setShowDatePicker(true); }}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={16} color={colors.danger} style={{ marginRight: 6 }} />
              <Text style={[styles.dateText, { color: colors.text }]}>
                {formatDateBR(selectedDate)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onValueChange={handleDateChange}
          onDismiss={() => setShowDatePicker(false)}
          />
        )}

        {/* 3. OBSERVAÇÃO */}
        <AppInput
          label="Observação (opcional)"
          placeholder="Ex: Manutenção preventiva, pneu furado..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={2}
          style={{ marginTop: spacing.md, textAlignVertical: 'top' } as any}
        />

        {/* 4. BOTÃO SALVAR */}
        <AppButton
          title={isEditing ? 'Salvar Alterações' : 'Registrar Saída'}
          variant="danger"
          size="lg"
          onPress={handleSave}
          style={{ marginTop: spacing.xl }}
          disabled={!amount || !selectedCat}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  label: { fontSize: 16, fontWeight: '500', marginBottom: 8 },
  hintRow: { flexDirection: 'row', alignItems: 'center' },
  hintText: { fontSize: 12, fontStyle: 'italic' },
  valueRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  valueField: { flex: 3 },
  dateField: { flex: 2 },
  dateLabel: { fontWeight: '500', marginBottom: 8, fontSize: 14 },
  dateButton: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  dateText: { fontSize: 14, fontWeight: '500' },
});
