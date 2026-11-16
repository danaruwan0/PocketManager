
import React, { useCallback, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import {
  ArrowDownLeft,
  ArrowUpRight,
  ReceiptText,
} from 'lucide-react-native';

import {
  getAllTransactions,
  Transaction,
  TransactionType,
} from '../../database/repositories/transactionRepository';

import colors from '../../theme/colors';

type FilterType = 'all' | TransactionType;

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllTransactions();
      setTransactions(data);
    } catch (error) {
      console.log('Transaction loading error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [loadTransactions]),
  );

  const filteredTransactions = transactions.filter(item => {
    return filter === 'all' || item.type === filter;
  });

  const totalIncome = transactions
    .filter(item => item.type === 'income')
    .reduce((sum, item) => sum + item.amount, 0);

  const totalExpense = transactions
    .filter(item => item.type === 'expense')
    .reduce((sum, item) => sum + item.amount, 0);

  const formatMoney = (amount: number) =>
    `Rs. ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const renderItem = ({ item }: { item: Transaction }) => {
    const income = item.type === 'income';

    return (
      <View style={styles.transactionCard}>
        <View
          style={[
            styles.transactionIcon,
            {
              backgroundColor: income
                ? '#16372D'
                : '#3A2028',
            },
          ]}
        >
          {income ? (
            <ArrowDownLeft size={21} color={colors.success} />
          ) : (
            <ArrowUpRight size={21} color={colors.danger} />
          )}
        </View>

        <View style={styles.transactionDetails}>
          <Text style={styles.transactionTitle}>
            {item.title}
          </Text>

          <Text style={styles.transactionDate}>
            {item.date}
          </Text>
        </View>

        <Text
          style={[
            styles.amount,
            {
              color: income
                ? colors.success
                : colors.danger,
            },
          ]}
        >
          {income ? '+' : '-'} {formatMoney(item.amount)}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Transactions</Text>
        <Text style={styles.subtitle}>
          Manage your money movements
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Income</Text>
          <Text style={[styles.summaryAmount, { color: colors.success }]}>
            {formatMoney(totalIncome)}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Expenses</Text>
          <Text style={[styles.summaryAmount, { color: colors.danger }]}>
            {formatMoney(totalExpense)}
          </Text>
        </View>
      </View>

      <View style={styles.filters}>
        {(['all', 'income', 'expense'] as FilterType[]).map(item => (
          <Pressable
            key={item}
            onPress={() => setFilter(item)}
            style={[
              styles.filterButton,
              filter === item && styles.activeFilter,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                filter === item && styles.activeFilterText,
              ]}
            >
              {item === 'all'
                ? 'All'
                : item === 'income'
                  ? 'Income'
                  : 'Expenses'}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={styles.loader}
        />
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={loadTransactions}
          ListEmptyComponent={
            <View style={styles.empty}>
              <ReceiptText size={42} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>
                No transactions found
              </Text>
              <Text style={styles.emptyText}>
                Your transactions will appear here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 15,
    marginBottom: 22,
  },
  heading: {
    fontSize: 25,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 5,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 9,
  },
  filters: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 22,
  },
  filterButton: {
    paddingHorizontal: 19,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  activeFilter: {
    backgroundColor: colors.primary,
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  activeFilterText: {
    color: colors.white,
  },
  listContent: {
    paddingBottom: 25,
    flexGrow: 1,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 15,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: colors.border,
  },
  transactionIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionDetails: {
    flex: 1,
    marginLeft: 12,
  },
  transactionTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  transactionDate: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 5,
  },
  amount: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 60,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 15,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 7,
  },
});
