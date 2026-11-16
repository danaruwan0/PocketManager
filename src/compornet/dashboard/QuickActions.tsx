
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import {
  ArrowDownLeft,
  ArrowUpRight,
  Target,
  Plus,
} from 'lucide-react-native';

import colors from '../../theme/colors';
import { TransactionType } from '../../database/repositories/transactionRepository';

interface QuickActionsProps {
  onAction: (type: TransactionType) => void;
}

const actions = [
  {
    title: 'Add Income',
    icon: ArrowDownLeft,
    color: '#22C55E',
    type: 'income' as TransactionType,
  },
  {
    title: 'Add Expense',
    icon: ArrowUpRight,
    color: '#EF4444',
    type: 'expense' as TransactionType,
  },
];

export default function QuickActions({
  onAction,
}: QuickActionsProps) {
  return (
    <View style={styles.container}>
      {actions.map(item => {
        const Icon = item.icon;

        return (
          <Pressable
            key={item.type}
            style={styles.action}
            onPress={() => onAction(item.type)}
          >
            <View style={styles.iconBox}>
              <Icon size={23} color={item.color} />
            </View>

            <Text style={styles.label}>
              {item.title}
            </Text>
          </Pressable>
        );
      })}

      <Pressable
        style={styles.action}
        onPress={() => {}}
      >
        <View style={styles.iconBox}>
          <Target size={23} color="#A78BFA" />
        </View>

        <Text style={styles.label}>Add Savings</Text>
      </Pressable>

      <Pressable
        style={styles.action}
        onPress={() => {}}
      >
        <View style={styles.iconBox}>
          <Plus size={23} color="#60A5FA" />
        </View>

        <Text style={styles.label}>More</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },

  action: {
    alignItems: 'center',
    width: '24%',
  },

  iconBox: {
    width: 55,
    height: 55,
    backgroundColor: colors.surface,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

  label: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 9,
    textAlign: 'center',
  },
});
