import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Wallet } from 'lucide-react-native';

import { getBalance } from '../../database/repositories/transactionRepository';
import colors from '../../theme/colors';

const formatMoney = (amount: number): string =>
  `Rs. ${amount.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function BalanceCard() {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Refresh whenever the Home tab becomes active.
  // This prevents showing an old balance after adding/editing a transaction.
  const loadBalance = useCallback(async () => {
    try {
      setError('');
      const result = await getBalance();
      setBalance(Number.isFinite(result) ? result : 0);
    } catch (err) {
      console.error('Balance loading error:', err);
      setError('Unable to load balance');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBalance();
    }, [loadBalance]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>Total Balance</Text>
          <Text style={styles.subtitle}>All-time income minus expenses</Text>
        </View>
        <View style={styles.iconBox}>
          <Wallet size={23} color={colors.white} />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.white} style={styles.loader} />
      ) : (
        <Text style={styles.amount}>{formatMoney(balance)}</Text>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.footer}>
        Based on all transactions recorded in PocketManager
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    borderRadius: 22,
    padding: 22,
    marginTop: 22,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: '#DBEAFE',
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    color: '#BFDBFE',
    fontSize: 11,
    marginTop: 5,
  },
  iconBox: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: '#FFFFFF25',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amount: {
    color: colors.white,
    fontSize: 29,
    fontWeight: 'bold',
    marginTop: 23,
  },
  loader: {
    marginTop: 23,
    alignSelf: 'flex-start',
  },
  footer: {
    color: '#DBEAFE',
    fontSize: 10,
    marginTop: 12,
  },
  error: {
    color: '#FECACA',
    fontSize: 11,
    marginTop: 8,
  },
});
