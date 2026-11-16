import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import colors from '../../theme/colors';

interface SummaryCardProps {
  title: string;
  amount: string;
  type: 'income' | 'expense';
  icon: React.ReactNode;
}

export default function SummaryCard({
  title,
  amount,
  type,
  icon,
}: SummaryCardProps) {
  const isIncome = type === 'income';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>

        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isIncome
                ? '#22C55E20'
                : '#EF444420',
            },
          ]}
        >
          {icon}
        </View>
      </View>

      <Text style={styles.amount}>{amount}</Text>

      <Text
        style={[
          styles.label,
          {
            color: isIncome ? '#22C55E' : '#EF4444',
          },
        ]}
      >
        {isIncome ? 'Total Income' : 'Total Expenses'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },

  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  amount: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },

  label: {
    fontSize: 11,
    marginTop: 8,
  },
});