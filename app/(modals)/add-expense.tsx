import React, { useEffect, useRef, useState } from 'react';
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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { SortableChipGrid, SortableChipItem } from '@/components/ui/SortableChipGrid';
import { useTheme } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { TransactionsRepository } from '@/infrastructure/repositories/TransactionsRepository';
import { ExpenseCategoriesRepository } from '@/infrastructure/repositories/ExpenseCategoriesRepository';
import { expenseSchema, ExpenseInput } from '@/lib/validation';
import { applyBRLMask, centsToMaskedBRL, parseBRLToCents } from '@/lib/formatters/currency';

const formatDateBR = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function AddExpenseModal() {
  const { colors, spacing, radius } = useTheme();
  const params = useLocalSearchParams<{ id?: string; amountCents?: string; refId?: string; dateISO?: string; notes?: string }>();
  const isEditing = !!params.id;

  const [categories, setCategories] = useState<SortableChipItem[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    mode: 'onChange',
    defaultValues: {
      amountCents: params.amountCents ? parseInt(params.amountCents, 10) : (undefined as unknown as number),
      refId: params.refId ?? '',
      date: params.dateISO ? new Date(params.dateISO) : new Date(),
      notes: params.notes ?? undefined,
    },
  });

  useEffect(() => {
    TransactionsRepository.getExpenseCategories().then(setCategories);
  }, []);

  const handleAmountFocus = () => {
    setTimeout(() => { scrollRef.current?.scrollToEnd({ animated: true }); }, 150);
  };

  const onSubmit = async (data: ExpenseInput) => {
    try {
      if (isEditing) {
        await TransactionsRepository.updateExpense(params.id!, data.refId, data.amountCents, data.date, data.notes);
      } else {
        await TransactionsRepository.addExpense(data.refId, data.amountCents, data.date, data.notes);
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

  const selectedRefId = watch('refId');

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

        <Text style={[styles.label, { color: colors.text }]}>Categoria</Text>

        <View style={[styles.hintRow, { marginBottom: spacing.sm }]}>
          <Ionicons name="hand-left-outline" size={14} color="#E67E22" style={{ marginRight: 5 }} />
          <Text style={[styles.hintText, { color: colors.icon }]}>
            Segure e arraste para reposicionar
          </Text>
        </View>

        <Controller
          control={control}
          name="refId"
          render={({ field: { onChange } }) => (
            <SortableChipGrid
              items={categories}
              selectedId={selectedRefId || null}
              onSelect={(id) => onChange(id ?? '')}
              onOrderChange={handleOrderChange}
              accentColor={colors.danger}
              borderColor={colors.border}
              textColor={colors.text}
              radiusMd={radius.md}
            />
          )}
        />
        {errors.refId && <Text style={[styles.fieldError, { color: colors.danger }]}>{errors.refId.message}</Text>}

        <View style={[styles.valueRow, { marginTop: spacing.lg }]}>
          <View style={styles.valueField}>
            <Controller
              control={control}
              name="amountCents"
              render={({ field: { value, onChange } }) => (
                <AppInput
                  label="Valor Gasto"
                  placeholder="R$ 0,00"
                  keyboardType="numeric"
                  value={value ? centsToMaskedBRL(value) : ''}
                  onChangeText={(t) => {
                    const masked = applyBRLMask(t);
                    onChange(masked ? parseBRLToCents(masked) : undefined);
                  }}
                  onFocus={handleAmountFocus}
                  error={errors.amountCents?.message}
                  style={{ marginBottom: 0 }}
                />
              )}
            />
          </View>

          <View style={styles.dateField}>
            <Text style={[styles.dateLabel, { color: colors.text }]}>Data</Text>
            <Controller
              control={control}
              name="date"
              render={({ field: { value, onChange } }) => (
                <>
                  <TouchableOpacity
                    style={[styles.dateButton, {
                      backgroundColor: colors.surface,
                      borderColor: errors.date ? colors.danger : colors.border,
                      borderRadius: radius.md,
                      padding: spacing.md,
                    }]}
                    onPress={() => { Keyboard.dismiss(); setShowDatePicker(true); }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="calendar-outline" size={16} color={colors.danger} style={{ marginRight: 6 }} />
                    <Text style={[styles.dateText, { color: colors.text }]}>
                      {formatDateBR(value)}
                    </Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={value}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      maximumDate={new Date()}
                      onValueChange={(_e: DateTimePickerEvent, d?: Date) => {
                        setShowDatePicker(false);
                        if (d) onChange(d);
                      }}
                      onDismiss={() => setShowDatePicker(false)}
                    />
                  )}
                </>
              )}
            />
          </View>
        </View>
        {errors.date && <Text style={[styles.fieldError, { color: colors.danger }]}>{errors.date.message}</Text>}

        <Controller
          control={control}
          name="notes"
          render={({ field: { value, onChange } }) => (
            <AppInput
              label="Observação (opcional)"
              placeholder="Ex: Manutenção preventiva, pneu furado..."
              value={value ?? ''}
              onChangeText={onChange}
              onFocus={handleAmountFocus}
              error={errors.notes?.message}
              multiline
              numberOfLines={2}
              style={{ marginTop: spacing.md, textAlignVertical: 'top' } as any}
            />
          )}
        />

        <AppButton
          title={isEditing ? 'Salvar Alterações' : 'Registrar Saída'}
          variant="danger"
          size="lg"
          onPress={handleSubmit(onSubmit)}
          style={{ marginTop: spacing.xl }}
          disabled={!isValid || isSubmitting}
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
  fieldError: { fontSize: 12, marginTop: 4, marginBottom: 4 },
});
