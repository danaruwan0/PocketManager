
import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import {
  ShoppingCart,
  Coffee,
  Car,
  Wallet,
} from 'lucide-react-native';

import {
  getRecentTransactions,
  Transaction,
} from '../../database/repositories/transactionRepository';

import colors from '../../theme/colors';

export default function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const data = await getRecentTransactions(5);
        setTransactions(data);
      } catch (error) {
        console.log('Recent transactions error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, []);

  const formatDate = (date: string) => {
    const parsedDate = new Date(`${date}T00:00:00`);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getIcon = (category: string | null | undefined) => {
    const name = category?.toLowerCase() ?? '';

    if (name.includes('shop') || name.includes('grocery')) {
      return ShoppingCart;
    }

    if (name.includes('transport') || name.includes('travel')) {
      return Car;
    }

    if (name.includes('food') || name.includes('breakfast') ||
        name.includes('lunch') || name.includes('dinner')) {
      return Coffee;
    }

    return Wallet;
  };

  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator color={colors.primaryLight} />
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Wallet size={28} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No transactions yet</Text>
        <Text style={styles.emptySubtitle}>
          Your transactions will appear here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {transactions.map((item) => {
        const Icon = getIcon(item.category_name);
        const isIncome = item.type === 'income';

        return (
          <View key={item.id} style={styles.item}>
            <View style={styles.left}>
              <View style={styles.iconBox}>
                <Icon
                  size={20}
                  color={isIncome ? colors.success : '#60A5FA'}
                />
              </View>

              <View style={styles.details}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.title}
                </Text>

                <Text style={styles.subtitle}>
                  {item.category_name ?? 'Uncategorized'} • {formatDate(item.date)}
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.amount,
                {
                  color: isIncome
                    ? colors.success
                    : colors.danger,
                },
              ]}
            >
              {isIncome ? '+' : '-'} Rs.{' '}
              {item.amount.toLocaleString('en-US')}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  details: {
    flex: 1,
  },
  iconBox: {
    width: 43,
    height: 43,
    backgroundColor: colors.surface,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 5,
  },
  amount: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 11,
  },
});
