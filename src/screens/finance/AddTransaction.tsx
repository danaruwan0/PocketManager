
import React, { useCallback, useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  FileText,
  Tag,
} from 'lucide-react-native';

import colors from '../../theme/colors';

import {
  addTransaction,
  TransactionType,
} from '../../database/repositories/transactionRepository';

import {
  getCategories,
  Category,
  Occupation,
} from '../../database/repositories/categoryRepository';

import { db, initializeDatabase } from '../../database/database';

// =====================================================
// PROPS
// =====================================================

interface AddTransactionProps {
  initialType: TransactionType;
  onCancel: () => void;
  onSaved: () => void;
}

// =====================================================
// HELPERS
// =====================================================

const getToday = (): string => {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const formatAmount = (value: string): string => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '0.00';
  }

  return number.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const supportedOccupations: Occupation[] = [
  'student',
  'employee',
  'farmer',
  'fisherman',
  'business',
  'all',
];

const getUserOccupation = async (): Promise<Occupation> => {
  const result = await db.execute(
    `SELECT occupation
     FROM user_profile
     ORDER BY id DESC
     LIMIT 1`,
  );

  const occupation = String(
    result.rows[0]?.occupation ?? 'all',
  ) as Occupation;

  return supportedOccupations.includes(occupation)
    ? occupation
    : 'all';
};

// =====================================================
// COMPONENT
// =====================================================

export default function AddTransaction({
  initialType,
  onCancel,
  onSaved,
}: AddTransactionProps) {
  const [type, setType] = useState<TransactionType>(initialType);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getToday());
  const [note, setNote] = useState('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<number | null>(null);

  const [loadingCategories, setLoadingCategories] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isIncome = type === 'income';
  const accentColor = isIncome ? colors.success : colors.danger;

  // ---------------------------------------------------
  // LOAD CATEGORIES
  // ---------------------------------------------------

  const loadCategories = useCallback(async () => {
    try {
      setLoadingCategories(true);
      setError('');

      await initializeDatabase();

      const occupation = await getUserOccupation();

      const result = await getCategories(occupation, type);

      setCategories(result);

      setSelectedCategory(current => {
        const stillExists = result.some(
          category => category.id === current,
        );

        return stillExists
          ? current
          : result.length > 0
            ? result[0].id
            : null;
      });
    } catch (err) {
      console.error('Category loading error:', err);
      setError('Unable to load categories. Please try again.');
    } finally {
      setLoadingCategories(false);
    }
  }, [type]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // ---------------------------------------------------
  // CHANGE TRANSACTION TYPE
  // ---------------------------------------------------

  const handleTypeChange = (newType: TransactionType) => {
    if (newType === type) {
      return;
    }

    setType(newType);
    setSelectedCategory(null);
    setError('');
  };

  // ---------------------------------------------------
  // AMOUNT INPUT
  // ---------------------------------------------------

  const handleAmountChange = (value: string) => {
    // Allow only numbers and one decimal point.
    const cleaned = value.replace(/[^0-9.]/g, '');

    const parts = cleaned.split('.');

    if (parts.length > 2) {
      return;
    }

    if (parts[1] && parts[1].length > 2) {
      return;
    }

    setAmount(cleaned);
  };

  // ---------------------------------------------------
  // SAVE TRANSACTION
  // ---------------------------------------------------

  const handleSave = async () => {
    setError('');

    const trimmedTitle = title.trim();
    const numericAmount = Number(amount);

    if (!trimmedTitle) {
      setError('Please enter a transaction title.');
      return;
    }

    if (!amount || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }

    if (!selectedCategory) {
      setError('Please select a category.');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Date must use YYYY-MM-DD format.');
      return;
    }

    const [year, month, day] = date.split('-').map(Number);
    const parsedDate = new Date(Date.UTC(year, month - 1, day));

    if (
      parsedDate.getUTCFullYear() !== year ||
      parsedDate.getUTCMonth() !== month - 1 ||
      parsedDate.getUTCDate() !== day
    ) {
      setError('Please enter a valid calendar date.');
      return;
    }

    try {
      setSaving(true);

      await addTransaction({
        title: trimmedTitle,
        amount: numericAmount,
        type,
        category_id: selectedCategory,
        date,
        note: note.trim() || undefined,
      });

      Alert.alert(
        'Transaction Saved',
        `${isIncome ? 'Income' : 'Expense'} has been saved successfully.`,
        [
          {
            text: 'OK',
            onPress: onSaved,
          },
        ],
      );
    } catch (err) {
      console.error('Save transaction error:', err);

      const message =
        err instanceof Error
          ? err.message
          : 'Something went wrong while saving.';

      setError(message);
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------
  // UI
  // ---------------------------------------------------

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* HEADER */}

          <View style={styles.header}>
            <Pressable
              onPress={onCancel}
              style={styles.backButton}
            >
              <ArrowLeft size={21} color={colors.textPrimary} />
            </Pressable>

            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>
                Add Transaction
              </Text>

              <Text style={styles.headerSubtitle}>
                Record your money movement
              </Text>
            </View>
          </View>

          {/* TYPE SELECTOR */}

          <View style={styles.typeContainer}>
            <Pressable
              onPress={() => handleTypeChange('income')}
              style={[
                styles.typeButton,
                isIncome && styles.incomeActive,
              ]}
            >
              <ArrowDownLeft
                size={19}
                color={isIncome ? colors.success : colors.textSecondary}
              />

              <Text
                style={[
                  styles.typeText,
                  isIncome && { color: colors.success },
                ]}
              >
                Income
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleTypeChange('expense')}
              style={[
                styles.typeButton,
                !isIncome && styles.expenseActive,
              ]}
            >
              <ArrowUpRight
                size={19}
                color={!isIncome ? colors.danger : colors.textSecondary}
              />

              <Text
                style={[
                  styles.typeText,
                  !isIncome && { color: colors.danger },
                ]}
              >
                Expense
              </Text>
            </Pressable>
          </View>

          {/* AMOUNT */}

          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>
              {isIncome ? 'Income Amount' : 'Expense Amount'}
            </Text>

            <View style={styles.amountInputRow}>
              <Text style={[styles.currency, { color: accentColor }]}>
                Rs.
              </Text>

              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                maxLength={15}
              />
            </View>

            <Text style={styles.amountHint}>
              Enter the transaction amount in LKR
            </Text>
          </View>

          {/* TITLE */}

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Transaction Title</Text>

            <View style={styles.inputWrapper}>
              <FileText size={19} color={colors.textSecondary} />

              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder={
                  isIncome
                    ? 'e.g. Monthly Salary'
                    : 'e.g. Grocery Shopping'
                }
                placeholderTextColor={colors.textMuted}
                maxLength={80}
              />
            </View>
          </View>

          {/* CATEGORY */}

          <View style={styles.fieldContainer}>
            <View style={styles.labelRow}>
              <Tag size={17} color={colors.textSecondary} />
              <Text style={styles.label}>Select Category</Text>
            </View>

            {loadingCategories ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={colors.primaryLight} />
                <Text style={styles.loadingText}>
                  Loading categories...
                </Text>
              </View>
            ) : categories.length === 0 ? (
              <Text style={styles.emptyText}>
                No categories available for this transaction type.
              </Text>
            ) : (
              <View style={styles.categoryList}>
                {categories.map(category => {
                  const selected =
                    selectedCategory === category.id;

                  return (
                    <Pressable
                      key={category.id}
                      onPress={() => setSelectedCategory(category.id)}
                      style={[
                        styles.categoryChip,
                        selected && {
                          borderColor: accentColor,
                          backgroundColor: isIncome
                            ? '#16372D'
                            : '#3A2028',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          selected && { color: accentColor },
                        ]}
                      >
                        {category.name}
                      </Text>

                      {selected && (
                        <Check size={15} color={accentColor} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* DATE */}

          <View style={styles.fieldContainer}>
            <View style={styles.labelRow}>
              <CalendarDays size={17} color={colors.textSecondary} />
              <Text style={styles.label}>Transaction Date</Text>
            </View>

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </View>

            <Text style={styles.helperText}>
              Date format: YYYY-MM-DD
            </Text>
          </View>

          {/* NOTE */}

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Note (Optional)</Text>

            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Add additional details..."
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
              maxLength={300}
            />
          </View>

          {/* ERROR */}

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* SAVE */}

          <Pressable
            onPress={handleSave}
            disabled={saving || loadingCategories || categories.length === 0}
            style={[
              styles.saveButton,
              { backgroundColor: accentColor },
              (saving || loadingCategories || categories.length === 0) &&
                styles.disabledButton,
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Check size={19} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>
                  Save {isIncome ? 'Income' : 'Expense'}
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={onCancel}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 35,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerText: {
    marginLeft: 14,
  },

  headerTitle: {
    color: colors.textPrimary,
    fontSize: 21,
    fontWeight: '700',
  },

  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },

  typeContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 5,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 22,
  },

  typeButton: {
    flex: 1,
    height: 47,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  incomeActive: {
    backgroundColor: '#16372D',
  },

  expenseActive: {
    backgroundColor: '#3A2028',
  },

  typeText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },

  amountCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },

  amountLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },

  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },

  currency: {
    fontSize: 23,
    fontWeight: '700',
    marginRight: 10,
  },

  amountInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 34,
    fontWeight: '700',
    paddingVertical: 4,
  },

  amountHint: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 8,
  },

  fieldContainer: {
    marginBottom: 22,
  },

  label: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },

  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },

  inputWrapper: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 15,
  },

  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    paddingVertical: 14,
  },

  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },

  categoryChip: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  categoryText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },

  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 18,
    backgroundColor: colors.surface,
    borderRadius: 14,
  },

  loadingText: {
    color: colors.textSecondary,
    fontSize: 12,
  },

  emptyText: {
    color: colors.warning,
    fontSize: 12,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },

  helperText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 7,
  },

  noteInput: {
    minHeight: 100,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    color: colors.textPrimary,
    fontSize: 13,
  },

  errorBox: {
    backgroundColor: '#3A2028',
    borderRadius: 12,
    padding: 13,
    marginBottom: 15,
  },

  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
  },

  saveButton: {
    height: 55,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 5,
  },

  disabledButton: {
    opacity: 0.5,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  cancelButton: {
    alignItems: 'center',
    paddingVertical: 17,
  },

  cancelText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
