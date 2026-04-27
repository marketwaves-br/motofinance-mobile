import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Alert, TouchableOpacity,
  ScrollView, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import {
  RecurringRulesRepository,
  type RecurringRuleWithLabel,
  type RecurringFrequency,
  type RecurringType,
} from '@/infrastructure/repositories/RecurringRulesRepository';
import { TransactionsRepository } from '@/infrastructure/repositories/TransactionsRepository';
import { applyBRLMask, centsToMaskedBRL, parseBRLToCents, formatBRL } from '@/lib/formatters/currency';

// ─── Constantes ───────────────────────────────────────────────────────────────

const DOW_SHORT  = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DOW_LONG   = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

function frequencyLabel(rule: RecurringRuleWithLabel): string {
  if (rule.frequency === 'daily')   return 'Todo dia';
  if (rule.frequency === 'weekly')  return `Toda ${DOW_LONG[rule.day_of_week ?? 0]}`;
  if (rule.frequency === 'monthly') return `Todo dia ${rule.day_of_month}`;
  return '';
}

function formatDateBR(date: Date): string {
  return `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}`;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  type:          z.enum(['income', 'expense']),
  ref_id:        z.string().min(1, 'Selecione uma fonte ou categoria'),
  amount_cents:  z.number({ required_error: 'Informe um valor' }).min(1, 'Valor deve ser maior que zero'),
  frequency:     z.enum(['daily', 'weekly', 'monthly']),
  day_of_week:   z.number().min(0).max(6).nullable(),
  day_of_month:  z.number().min(1).max(31).nullable(),
  start_date:    z.date(),
  notes:         z.string().optional().transform(v => v?.trim() || undefined),
}).superRefine((data, ctx) => {
  if (data.frequency === 'weekly' && data.day_of_week === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Selecione o dia da semana', path: ['day_of_week'] });
  }
  if (data.frequency === 'monthly' && data.day_of_month === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe o dia (1–31)', path: ['day_of_month'] });
  }
});

type FormInput = z.input<typeof schema>;

// ─── Tela ─────────────────────────────────────────────────────────────────────

export default function ManageRecurringModal() {
  const { colors, spacing, radius } = useTheme();

  const [rules,       setRules]       = useState<RecurringRuleWithLabel[]>([]);
  const [showForm,    setShowForm]    = useState(false);
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [sources,     setSources]     = useState<{ id: string; name: string }[]>([]);
  const [categories,  setCategories]  = useState<{ id: string; name: string }[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const {
    control, handleSubmit, watch, reset, setValue,
    formState: { errors, isValid },
  } = useForm<FormInput>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      type: 'expense', ref_id: '', amount_cents: undefined as unknown as number,
      frequency: 'monthly', day_of_week: null, day_of_month: null,
      start_date: new Date(), notes: '',
    },
  });

  const watchType      = watch('type');
  const watchFrequency = watch('frequency');
  const watchStartDate = watch('start_date');

  // ── Carregamento ─────────────────────────────────────────────────────────────

  const loadRules = useCallback(async () => {
    const data = await RecurringRulesRepository.getAllRules();
    setRules(data);
  }, []);

  useEffect(() => { loadRules(); }, []);

  useEffect(() => {
    TransactionsRepository.getIncomeSources().then(setSources);
    TransactionsRepository.getExpenseCategories().then(setCategories);
  }, []);

  // ── Abre formulário ───────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingId(null);
    reset({
      type: 'expense', ref_id: '', amount_cents: undefined as unknown as number,
      frequency: 'monthly', day_of_week: null, day_of_month: null,
      start_date: new Date(), notes: '',
    });
    setShowForm(true);
  };

  const openEdit = (rule: RecurringRuleWithLabel) => {
    setEditingId(rule.id);
    reset({
      type:         rule.type,
      ref_id:       rule.ref_id,
      amount_cents: rule.amount_cents,
      frequency:    rule.frequency,
      day_of_week:  rule.day_of_week,
      day_of_month: rule.day_of_month,
      start_date:   new Date(rule.start_date + 'T12:00:00'),
      notes:        rule.notes ?? '',
    });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingId(null); };

  // ── Salvar ────────────────────────────────────────────────────────────────────

  const onSubmit = async (data: z.output<typeof schema>) => {
    setSaving(true);
    try {
      const dateKey = data.start_date.toLocaleDateString('en-CA');
      const payload = {
        type:         data.type,
        ref_id:       data.ref_id,
        amount_cents: data.amount_cents,
        frequency:    data.frequency,
        day_of_week:  data.frequency === 'weekly'  ? data.day_of_week  : null,
        day_of_month: data.frequency === 'monthly' ? data.day_of_month : null,
        start_date:   dateKey,
        notes:        data.notes ?? null,
        is_active:    1,
      };

      if (editingId) {
        await RecurringRulesRepository.updateRule(editingId, payload);
      } else {
        await RecurringRulesRepository.addRule(payload);
      }

      closeForm();
      await loadRules();
    } catch (err) {
      console.error('Erro ao salvar regra recorrente:', err);
      Alert.alert('Erro', 'Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle / Delete ───────────────────────────────────────────────────────────

  const handleToggle = async (rule: RecurringRuleWithLabel) => {
    try {
      await RecurringRulesRepository.toggleActive(rule.id, rule.is_active !== 1);
      await loadRules();
    } catch (err) {
      console.error('Erro ao alterar status:', err);
      Alert.alert('Erro', 'Não foi possível alterar o status.');
    }
  };

  const handleDelete = (rule: RecurringRuleWithLabel) => {
    Alert.alert(
      'Excluir regra?',
      `"${rule.label}" – ${frequencyLabel(rule)}\n\nOs lançamentos já gerados serão mantidos. Essa ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir', style: 'destructive',
          onPress: async () => {
            try {
              await RecurringRulesRepository.deleteRule(rule.id);
              await loadRules();
            } catch (err) {
              console.error('Erro ao excluir regra:', err);
              Alert.alert('Erro', 'Não foi possível excluir a regra.');
            }
          },
        },
      ]
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  const chips = watchType === 'income' ? sources : categories;

  const renderRule = ({ item }: { item: RecurringRuleWithLabel }) => {
    const isActive  = item.is_active === 1;
    const isIncome  = item.type === 'income';
    const aColor    = isIncome ? colors.income : colors.expense;
    return (
      <View style={[styles.ruleRow, { borderBottomColor: colors.border }]}>
        <View style={[styles.ruleIcon, { backgroundColor: `${aColor}18` }]}>
          <Ionicons name={isIncome ? 'arrow-up-circle' : 'arrow-down-circle'} size={20} color={aColor} />
        </View>
        <View style={styles.ruleInfo}>
          <Text style={[styles.ruleLabel, { color: isActive ? colors.text : colors.muted }]} numberOfLines={1}>
            {item.label}{!isActive && ' (Pausado)'}
          </Text>
          <Text style={[styles.ruleFreq, { color: colors.muted }]}>
            {frequencyLabel(item)} · {formatBRL(item.amount_cents)}
          </Text>
        </View>
        <TouchableOpacity onPress={() => openEdit(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginRight: 8 }}>
          <Ionicons name="pencil-outline" size={18} color={colors.muted} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleToggle(item)}
          style={[styles.toggleBtn, { backgroundColor: isActive ? `${colors.danger}18` : `${colors.income}18` }]}
        >
          <Text style={{ color: isActive ? colors.danger : colors.income, fontWeight: '600', fontSize: 12 }}>
            {isActive ? 'Pausar' : 'Ativar'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginLeft: 8 }}>
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>
    );
  };

  const ListHeader = (
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>

      {/* Botão Nova Regra / Cancelar */}
      {!showForm ? (
        <AppButton title="+ Nova Regra" onPress={openAdd} style={{ marginBottom: spacing.md }} />
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>
              {editingId ? 'Editar Regra' : 'Nova Regra'}
            </Text>

            {/* Tipo: Receita / Despesa */}
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Tipo</Text>
            <Controller control={control} name="type" render={({ field: { value, onChange } }) => (
              <View style={styles.pillRow}>
                {(['income', 'expense'] as RecurringType[]).map(t => {
                  const isActive = value === t;
                  const color    = t === 'income' ? colors.income : colors.expense;
                  return (
                    <TouchableOpacity key={t}
                      onPress={() => { onChange(t); setValue('ref_id', ''); }}
                      style={[styles.pill, { backgroundColor: isActive ? color : colors.background, borderColor: isActive ? color : colors.border }]}
                    >
                      <Text style={{ color: isActive ? '#fff' : colors.muted, fontWeight: '600', fontSize: 14 }}>
                        {t === 'income' ? '↑ Receita' : '↓ Despesa'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )} />

            {/* Fonte / Categoria */}
            <Text style={[styles.fieldLabel, { color: colors.text, marginTop: 12 }]}>
              {watchType === 'income' ? 'Fonte de Receita' : 'Categoria de Despesa'}
            </Text>
            <Controller control={control} name="ref_id" render={({ field: { value, onChange } }) => (
              <View style={[styles.chipRow, { marginBottom: 4 }]}>
                  {chips.map(c => {
                    const isSelected = value === c.id;
                    return (
                      <TouchableOpacity key={c.id} onPress={() => onChange(c.id)}
                        style={[styles.chip, {
                          backgroundColor: isSelected ? colors.primary : colors.background,
                          borderColor:     isSelected ? colors.primary : colors.border,
                        }]}
                      >
                        <Text style={{ color: isSelected ? '#fff' : colors.text, fontSize: 13, fontWeight: '500' }}>
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            )} />
            {errors.ref_id && <Text style={[styles.err, { color: colors.danger }]}>{errors.ref_id.message}</Text>}

            {/* Valor */}
            <Controller control={control} name="amount_cents" render={({ field: { value, onChange } }) => (
              <AppInput
                label="Valor"
                placeholder="R$ 0,00"
                keyboardType="numeric"
                value={value ? centsToMaskedBRL(value) : ''}
                onChangeText={t => { const m = applyBRLMask(t); onChange(m ? parseBRLToCents(m) : undefined); }}
                error={errors.amount_cents?.message}
                style={{ marginTop: 12 }}
              />
            )} />

            {/* Frequência */}
            <Text style={[styles.fieldLabel, { color: colors.text, marginTop: 4 }]}>Frequência</Text>
            <Controller control={control} name="frequency" render={({ field: { value, onChange } }) => (
              <View style={styles.pillRow}>
                {([['daily','Diário'], ['weekly','Semanal'], ['monthly','Mensal']] as [RecurringFrequency, string][]).map(([f, label]) => {
                  const isActive = value === f;
                  return (
                    <TouchableOpacity key={f} onPress={() => { onChange(f); setValue('day_of_week', null); setValue('day_of_month', null); }}
                      style={[styles.pill, { backgroundColor: isActive ? colors.primary : colors.background, borderColor: isActive ? colors.primary : colors.border }]}
                    >
                      <Text style={{ color: isActive ? '#fff' : colors.muted, fontWeight: '600', fontSize: 14 }}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )} />

            {/* Dia da semana (weekly) */}
            {watchFrequency === 'weekly' && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.text, marginTop: 12 }]}>Dia da semana</Text>
                <Controller control={control} name="day_of_week" render={({ field: { value, onChange } }) => (
                  <View style={styles.dowRow}>
                    {DOW_SHORT.map((d, i) => {
                      const isActive = value === i;
                      return (
                        <TouchableOpacity key={i} onPress={() => onChange(i)}
                          style={[styles.dowBtn, { backgroundColor: isActive ? colors.primary : colors.background, borderColor: isActive ? colors.primary : colors.border }]}
                        >
                          <Text style={{ color: isActive ? '#fff' : colors.muted, fontSize: 12, fontWeight: '600' }}>{d}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )} />
                {errors.day_of_week && <Text style={[styles.err, { color: colors.danger }]}>{errors.day_of_week.message}</Text>}
              </>
            )}

            {/* Dia do mês (monthly) */}
            {watchFrequency === 'monthly' && (
              <Controller control={control} name="day_of_month" render={({ field: { value, onChange } }) => (
                <AppInput
                  label="Dia do mês (1–31)"
                  placeholder="Ex: 5"
                  keyboardType="numeric"
                  value={value != null ? String(value) : ''}
                  onChangeText={t => {
                    const n = parseInt(t, 10);
                    onChange(!isNaN(n) && n >= 1 && n <= 31 ? n : null);
                  }}
                  error={errors.day_of_month?.message}
                  style={{ marginTop: 12 }}
                />
              )} />
            )}

            {/* Data de início */}
            <Text style={[styles.fieldLabel, { color: colors.text, marginTop: 12 }]}>Data de início</Text>
            <Controller control={control} name="start_date" render={({ field: { value, onChange } }) => (
              <>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={[styles.dateBtn, { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                  <Text style={[styles.dateBtnText, { color: colors.text }]}>{formatDateBR(value)}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={value}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_: DateTimePickerEvent, d?: Date) => { setShowDatePicker(false); if (d) onChange(d); }}
                  />
                )}
              </>
            )} />

            {/* Notas */}
            <Controller control={control} name="notes" render={({ field: { value, onChange } }) => (
              <AppInput
                label="Observação (opcional)"
                placeholder="Ex: Aluguel do box, parcela moto..."
                value={value ?? ''}
                onChangeText={onChange}
                multiline
                numberOfLines={2}
                style={{ marginTop: 12, textAlignVertical: 'top' } as any}
              />
            )} />

            {/* Botões */}
            <View style={styles.formActions}>
              <AppButton title="Cancelar" onPress={closeForm} variant="outline" style={{ flex: 1 }} />
              <AppButton
                title={editingId ? 'Salvar' : 'Adicionar'}
                onPress={handleSubmit(onSubmit)}
                isLoading={saving}
                disabled={!isValid || saving}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      {rules.length > 0 && (
        <Text style={[styles.sectionLabel, { color: colors.muted, marginTop: showForm ? 16 : 0 }]}>
          REGRAS CONFIGURADAS
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <FlatList
        data={rules}
        keyExtractor={r => r.id}
        renderItem={renderRule}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          !showForm ? (
            <View style={styles.empty}>
              <Ionicons name="repeat-outline" size={56} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhuma regra configurada</Text>
              <Text style={[styles.emptySub, { color: colors.muted }]}>
                Adicione despesas ou receitas que se repetem automaticamente.
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 48 }}
      />
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  formCard: { borderWidth: 1, padding: 16, marginBottom: 8 },
  formTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 16 },

  fieldLabel: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  err:        { fontSize: 12, marginTop: 2, marginBottom: 4 },

  pillRow: { flexDirection: 'row', gap: 8 },
  pill: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderRadius: 8, borderWidth: 1,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
  },

  dowRow: { flexDirection: 'row', gap: 6 },
  dowBtn: {
    flex: 1, paddingVertical: 8, alignItems: 'center',
    borderRadius: 6, borderWidth: 1,
  },

  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1,
  },
  dateBtnText: { fontSize: 14, fontWeight: '500' },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },

  ruleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  ruleIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  ruleInfo: { flex: 1, marginRight: 8 },
  ruleLabel: { fontSize: 15, fontWeight: '600' },
  ruleFreq:  { fontSize: 12, marginTop: 2 },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },

  empty:      { alignItems: 'center', paddingTop: 60, gap: 10, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptySub:   { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
