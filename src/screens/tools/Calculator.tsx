
import React, { useState } from 'react';

import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Delete } from 'lucide-react-native';

import colors from '../../theme/colors';

type Props = {
  navigation: any;
};

export default function Calculator({ navigation }: Props) {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [finished, setFinished] = useState(false);

  const buttons = [
    ['AC', 'DEL', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '−'],
    ['1', '2', '3', '+'],
    ['00', '0', '.', '='],
  ];

  const input = (value: string) => {
    if (value === 'AC') {
      setDisplay('0');
      setExpression('');
      setFinished(false);
      return;
    }

    if (value === 'DEL') {
      setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
      return;
    }

    if (value === '=') {
      try {
        const result = calculate(expression + display);
        setDisplay(String(result));
        setExpression('');
        setFinished(true);
      } catch {
        setDisplay('Error');
        setExpression('');
        setFinished(true);
      }
      return;
    }

    if (['+', '−', '×', '÷', '%'].includes(value)) {
      if (display === 'Error') return;

      const operator = value === '−' ? '-' :
        value === '×' ? '*' :
        value === '÷' ? '/' : value;

      setExpression(prev => prev + display + operator);
      setDisplay('0');
      setFinished(false);
      return;
    }

    if (value === '.') {
      if (!display.includes('.')) {
        setDisplay(prev => prev + '.');
      }
      return;
    }

    setDisplay(prev => {
      if (finished || prev === '0' || prev === 'Error') {
        setFinished(false);
        return value;
      }
      return prev + value;
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft color={colors.textPrimary} size={24} />
        </Pressable>
        <Text style={styles.heading}>Calculator</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.calculator}>
        <ScrollView
          horizontal
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
        >
          <Text style={styles.expression}>{expression}</Text>
        </ScrollView>

        <Text
          style={styles.display}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {display}
        </Text>

        {buttons.map((row, index) => (
          <View style={styles.row} key={index}>
            {row.map(button => (
              <Pressable
                key={button}
                style={[
                  styles.key,
                  ['AC', 'DEL', '%'].includes(button) && styles.utility,
                  ['÷', '×', '−', '+'].includes(button) && styles.operator,
                  button === '=' && styles.equal,
                ]}
                onPress={() => input(button)}
              >
                <Text
                  style={[
                    styles.keyText,
                    ['AC', 'DEL', '%'].includes(button) && styles.utilityText,
                    ['÷', '×', '−', '+', '='].includes(button) && styles.operatorText,
                  ]}
                >
                  {button}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

function calculate(input: string): number {
  const tokens = input.match(/\d*\.?\d+|[+\-*/%]/g);

  if (!tokens || tokens.length === 0) {
    throw new Error('Invalid expression');
  }

  const values: number[] = [];
  const operators: string[] = [];

  const precedence = (op: string) =>
    op === '*' || op === '/' || op === '%' ? 2 : 1;

  const apply = () => {
    const b = values.pop()!;
    const a = values.pop()!;
    const op = operators.pop()!;

    switch (op) {
      case '+': values.push(a + b); break;
      case '-': values.push(a - b); break;
      case '*': values.push(a * b); break;
      case '/':
        if (b === 0) throw new Error('Division by zero');
        values.push(a / b);
        break;
      case '%': values.push(a % b); break;
    }
  };

  for (const token of tokens) {
    if (!isNaN(Number(token))) {
      values.push(Number(token));
    } else {
      while (
        operators.length &&
        precedence(operators[operators.length - 1]) >= precedence(token)
      ) {
        apply();
      }
      operators.push(token);
    }
  }

  while (operators.length) apply();

  if (values.length !== 1 || !Number.isFinite(values[0])) {
    throw new Error('Invalid expression');
  }

  return Number(values[0].toFixed(10));
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },

  heading: {
    color: colors.textPrimary,
    fontSize: 21,
    fontWeight: 'bold',
  },

  calculator: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
    paddingBottom: 30,
  },

  expression: {
    color: colors.textSecondary,
    fontSize: 20,
    textAlign: 'right',
  },

  display: {
    color: colors.textPrimary,
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'right',
    marginVertical: 25,
  },

  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },

  key: {
    flex: 1,
    height: 65,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  utility: {
    backgroundColor: colors.surfaceLight,
  },

  operator: {
    backgroundColor: colors.surface,
  },

  equal: {
    backgroundColor: colors.primary,
  },

  keyText: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '600',
  },

  utilityText: {
    color: colors.primaryLight,
  },

  operatorText: {
    color: colors.primaryLight,
  },
});
