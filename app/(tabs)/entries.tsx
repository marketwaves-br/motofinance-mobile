import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { TransactionsRepository } from '@/infrastructure/repositories/TransactionsRepository';
import { formatBRL } from '@/lib/formatters/currency';
import type { UnifiedTransaction, TransactionSection } from '@/types/transaction';

export default function EntriesScreen() {
  const { colors, spacing, radius } = useTheme();
  const [sections, setSections] = useState<TransactionSection[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const data = await TransactionsRepository.getTransactionHistory();
      setSections(data);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  const handleDelete = (item: UnifiedTransaction) => {
    const typeLabel = item.type === 'income' ? 'receita' : 'despesa';
    const formattedAmount = formatBRL(item.amountCents);

    Alert.alert(
      'Excluir lançamento?',
      `Deseja excluir esta ${typeLabel} de ${formattedAmount} (${item.label})?\n\nEssa ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await TransactionsRepository.deleteTransaction(item.id, item.type);
            await fetchHistory();
          },
        },
      ]
    );
  };

  const renderTransaction = ({ item }: { item: UnifiedTransaction }) => {
    const isIncome = item.type === 'income';
    const amountColor = isIncome ? colors.income : colors.expense;
    const arrowIcon = isIncome ? 'arrow-up-circle' : 'arrow-down-circle';
    const sign = isIncome ? '+' : '-';

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onLongPress={() => handleDelete(item)}
        delayLongPress={500}
      >
        <View style={[styles.transactionRow, { borderBottomColor: colors.border }]}>
          {/* Ícone de direção (receita/despesa) */}
          <View style={[styles.iconContainer, { backgroundColor: isIncome ? `${colors.income}18` : `${colors.expense}18` }]}>
            <Ionicons
              name={arrowIcon}
              size={22}
              color={amountColor}
            />
          </View>

          {/* Label + horário */}
          <View style={styles.labelContainer}>
            <Text style={[styles.transactionLabel, { color: colors.text }]} numberOfLines={1}>
              {item.label}
            </Text>
            <Text style={[styles.transactionTime, { color: colors.muted }]}>
              {new Date(item.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              {item.notes ? ` · ${item.notes}` : ''}
            </Text>
          </View>

          {/* Valor */}
          <Text style={[styles.transactionAmount, { color: amountColor }]}>
            {sign} {formatBRL(item.amountCents)}
          </Text>

          {/* Bolinha colorida da fonte/categoria */}
          {item.color && (
            <View style={[styles.colorDot, { backgroundColor: item.color }]} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: TransactionSection }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
      {/* Subtotal da seção */}
      <Text style={[styles.sectionSubtotal, { color: colors.muted }]}>
        {(() => {
          const incTotal = section.data
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amountCents, 0);
          const expTotal = section.data
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amountCents, 0);
          const net = incTotal - expTotal;
          const color = net >= 0 ? colors.income : colors.expense;
          return (
            <Text style={{ color, fontWeight: '600', fontSize: 13 }}>
              {net >= 0 ? '+' : ''}{formatBRL(net)}
            </Text>
          );
        })()}
      </Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={64} color={colors.muted} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        Nenhum lançamento ainda
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
        Adicione receitas e despesas pelo{'\n'}dashboard para vê-las aqui.
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header fixo */}
      <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Lançamentos</Text>
        <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
          Últimas transações
        </Text>
        {sections.length > 0 && (
          <View style={styles.hintRow}>
            <Ionicons name="information-circle-outline" size={14} color="#E67E22" />
            <Text style={[styles.hintText, { color: colors.text }]}>
              Pressione um item para excluí-lo
            </Text>
          </View>
        )}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        stickySectionHeadersEnabled
        contentContainerStyle={[
          { paddingHorizontal: spacing.lg, paddingBottom: 100 },
          sections.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ItemSeparatorComponent={() => null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 56,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    opacity: 0.7,
  },
  hintText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionSubtotal: {
    fontSize: 13,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelContainer: {
    flex: 1,
  },
  transactionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  transactionTime: {
    fontSize: 12,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyListContent: {
    flexGrow: 1,
  },
});
