
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import { Wallet } from 'lucide-react-native';
import { getBalance } from '../../database/repositories/transactionRepository';
import colors from '../../theme/colors';

export default function BalanceCard() {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBalance = async () => {
      try {
        const result = await getBalance();
        setBalance(result);
      } catch (error) {
        console.log('Balance loading error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBalance();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>Total Balance</Text>
          <Text style={styles.subtitle}>Your available balance</Text>
        </View>

        <View style={styles.iconBox}>
          <Wallet size={23} color={colors.white} />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator
          color={colors.white}
          style={styles.loader}
        />
      ) : (
        <Text style={styles.amount}>
          Rs. {balance.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
      )}

      <Text style={styles.footer}>
        All your recorded income and expenses
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
});
