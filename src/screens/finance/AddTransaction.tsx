
import React, { useCallback, useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';

import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  FileText,
  Tag,
  X,
} from 'lucide-react-native';

import colors from '../../theme/colors';

import {
  addTransaction,
  getTransactionById,
  updateTransaction,
  TransactionType,
} from '../../database/repositories/transactionRepository';

import {
  getCategories,
  Category,
  Occupation,
} from '../../database/repositories/categoryRepository';

import { db, initializeDatabase } from '../../database/database';

// =====================================================
// ENABLE SMOOTH LAYOUT ANIMATION ON ANDROID
// =====================================================

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// =====================================================
// PROPS
// =====================================================

interface AddTransactionProps {
  initialType: TransactionType;
  transactionId?: number;
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

const parseDate = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number);

  return new Date(year, month - 1, day, 12, 0, 0);
};

const formatDateForDatabase = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (value: string): string => {
  const parsed = parseDate(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('en-LK', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
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

// Supports both "Other" and "Other Income".
const isOtherCategoryName = (name: string): boolean => {
  return name.trim().toLowerCase().startsWith('other');
};

// =====================================================
// COMPONENT
// =====================================================

export default function AddTransaction({
  initialType,
  transactionId,
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

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [loadingCategories, setLoadingCategories] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isIncome = type === 'income';

  const accentColor = isIncome
    ? colors.success
    : colors.danger;

  const selectedCategoryData = categories.find(
    item => item.id === selectedCategory,
  );

  const isOtherCategory = selectedCategoryData
    ? isOtherCategoryName(selectedCategoryData.name)
    : false;

  // ===================================================
  // SMOOTH UI ANIMATION
  // ===================================================

  const animateLayout = () => {
    LayoutAnimation.configureNext({
      duration: 250,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
  };

  // ===================================================
  // LOAD CATEGORIES
  // ===================================================

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

  // ===================================================
  // LOAD EXISTING TRANSACTION
  // ===================================================

  useEffect(() => {
    if (!transactionId) {
      return;
    }

    let active = true;

    const loadExisting = async () => {
      try {
        const item = await getTransactionById(transactionId);

        if (!active) return;

        if (!item) {
          setError('Transaction could not be found.');
          return;
        }

        setType(item.type);
        setTitle(item.title);
        setAmount(String(item.amount));
        setDate(item.date);
        setNote(item.note ?? '');
        setSelectedCategory(item.category_id);

      } catch (err) {
        console.error('Transaction loading error:', err);

        if (active) {
          setError('Unable to load transaction.');
        }
      }
    };

    loadExisting();

    return () => {
      active = false;
    };
  }, [transactionId]);

  // ===================================================
  // CHANGE TRANSACTION TYPE
  // ===================================================

  const handleTypeChange = (newType: TransactionType) => {
    if (newType === type || transactionId) {
      return;
    }

    animateLayout();

    setType(newType);
    setSelectedCategory(null);
    setTitle('');
    setDropdownOpen(false);
    setError('');
  };

  // ===================================================
  // DROPDOWN OPEN / CLOSE
  // ===================================================

  const toggleDropdown = () => {
    if (loadingCategories || categories.length === 0) {
      return;
    }

    animateLayout();

    setDropdownOpen(previous => !previous);
    setError('');
  };

  // ===================================================
  // CATEGORY SELECTION
  // ===================================================

  const handleCategorySelect = (category: Category) => {
    // Close dropdown smoothly.
    animateLayout();

    setSelectedCategory(category.id);
    setDropdownOpen(false);
    setError('');

    if (isOtherCategoryName(category.name)) {
      // User must enter a custom transaction title.
      setTitle('');
    } else if (!title.trim()) {
      // Helpful default for standard categories.
      setTitle(category.name);
    }
  };

  // ===================================================
  // AMOUNT INPUT
  // ===================================================

  const handleAmountChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');

    const parts = cleaned.split('.');

    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;

    setAmount(cleaned);
  };

  // ===================================================
  // DATE PICKER
  // ===================================================

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }

    setDate(formatDateForDatabase(selectedDate));
  };

  // ===================================================
  // SAVE TRANSACTION
  // ===================================================

  const handleSave = async () => {
    if (saving) return;

    setError('');

    const trimmedTitle = title.trim();
    const numericAmount = Number(amount);

    if (!selectedCategory) {
      setError('Please select a transaction category.');
      return;
    }

    if (!trimmedTitle) {
      setError(
        isOtherCategory
          ? 'Please enter your custom transaction name.'
          : 'Please enter a transaction title.',
      );
      return;
    }

    if (
      !amount ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }

    const parsedDate = parseDate(date);

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(parsedDate.getTime()) ||
      formatDateForDatabase(parsedDate) !== date
    ) {
      setError('Please select a valid transaction date.');
      return;
    }

    try {
      setSaving(true);

      const transactionData = {
        title: trimmedTitle,
        amount: numericAmount,
        type,
        category_id: selectedCategory,
        date,
        note: note.trim() || undefined,
      };

      if (transactionId) {
        await updateTransaction(transactionId, transactionData);
      } else {
        await addTransaction(transactionData);
      }

      Alert.alert(
        transactionId ? 'Transaction Updated' : 'Transaction Saved',

        `${isIncome ? 'Income' : 'Expense'} has been ${
          transactionId ? 'updated' : 'saved'
        } successfully.`,

        [
          {
            text: 'OK',
            onPress: onSaved,
          },
        ],
      );

    } catch (err) {
      console.error('Save transaction error:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while saving.',
      );

    } finally {
      setSaving(false);
    }
  };

  // ===================================================
  // UI
  // ===================================================

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
                {transactionId ? 'Edit Transaction' : 'Add Transaction'}
              </Text>

              <Text style={styles.headerSubtitle}>
                Manage your personal finances
              </Text>
            </View>
          </View>

          {/* TRANSACTION TYPE */}

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
                LKR
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
              Enter amount in Sri Lankan Rupees
            </Text>
          </View>

          {/* CATEGORY DROPDOWN */}

          <View style={styles.fieldContainer}>

            <View style={styles.labelRow}>
              <Tag size={17} color={colors.textSecondary} />
              <Text style={styles.label}>Transaction Category</Text>
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
                No categories available.
              </Text>
            ) : (
              <>
                {/* DROPDOWN TRIGGER */}

                <Pressable
                  onPress={toggleDropdown}
                  style={[
                    styles.dropdownButton,
                    dropdownOpen && {
                      borderColor: accentColor,
                    },
                  ]}
                >
                  <View style={styles.dropdownLeft}>
                    <Tag size={19} color={accentColor} />

                    <Text style={styles.dropdownText}>
                      {selectedCategoryData?.name ?? 'Select Category'}
                    </Text>
                  </View>

                  <ChevronDown
                    size={20}
                    color={colors.textSecondary}
                    style={{
                      transform: [
                        {
                          rotate: dropdownOpen ? '180deg' : '0deg',
                        },
                      ],
                    }}
                  />
                </Pressable>

                {/* SMOOTH DROPDOWN CONTENT */}

                {dropdownOpen && (
                  <View style={styles.dropdownList}>
                    <ScrollView
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator
                      style={styles.dropdownScroll}
                    >
                      {categories.map(category => {
                        const selected =
                          selectedCategory === category.id;

                        return (
                          <Pressable
                            key={category.id}
                            onPress={() => handleCategorySelect(category)}
                            style={[
                              styles.dropdownItem,
                              selected && styles.dropdownItemSelected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.dropdownItemText,
                                selected && {
                                  color: accentColor,
                                  fontWeight: '700',
                                },
                              ]}
                            >
                              {category.name}
                            </Text>

                            {selected && (
                              <Check
                                size={18}
                                color={accentColor}
                              />
                            )}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </>
            )}
          </View>

          {/* TRANSACTION TITLE */}

          <View style={styles.fieldContainer}>

            <View style={styles.labelRow}>
              <FileText size={17} color={colors.textSecondary} />

              <Text style={styles.label}>
                {isOtherCategory
                  ? 'Enter Your Transaction Name'
                  : 'Transaction Title'}
              </Text>
            </View>

            <View
              style={[
                styles.inputWrapper,
                isOtherCategory && {
                  borderColor: accentColor,
                },
              ]}
            >
              <FileText size={19} color={colors.textSecondary} />

              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder={
                  isOtherCategory
                    ? 'e.g. Pet Expenses, Birthday Gift...'
                    : 'e.g. Monthly Salary, Grocery Shopping...'
                }
                placeholderTextColor={colors.textMuted}
                maxLength={80}
                returnKeyType="next"
              />

              {title.length > 0 && (
                <Pressable onPress={() => setTitle('')}>
                  <X size={17} color={colors.textMuted} />
                </Pressable>
              )}
            </View>

            {isOtherCategory && (
              <Text style={styles.helperText}>
                Enter your own name for this Other transaction.
              </Text>
            )}
          </View>

          {/* DATE PICKER */}

          <View style={styles.fieldContainer}>

            <View style={styles.labelRow}>
              <CalendarDays size={17} color={colors.textSecondary} />
              <Text style={styles.label}>Transaction Date</Text>
            </View>

            <Pressable
              onPress={() => {
                animateLayout();
                setDropdownOpen(false);
                setShowDatePicker(true);
              }}
              style={styles.dateButton}
            >
              <View style={styles.dateLeft}>
                <CalendarDays size={20} color={accentColor} />

                <View>
                  <Text style={styles.dateValue}>
                    {formatDisplayDate(date)}
                  </Text>

                  <Text style={styles.dateSubtitle}>
                    Select transaction date
                  </Text>
                </View>
              </View>

              <ChevronDown
                size={19}
                color={colors.textSecondary}
              />
            </Pressable>

            {showDatePicker && (
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={parseDate(date)}
                  mode="date"
                  display={
                    Platform.OS === 'ios' ? 'spinner' : 'default'
                  }
                  onChange={handleDateChange}
                  themeVariant="dark"
                />

                {Platform.OS === 'ios' && (
                  <Pressable
                    style={styles.dateDoneButton}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.dateDoneText}>Done</Text>
                  </Pressable>
                )}
              </View>
            )}
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

          {/* SAVE BUTTON */}

          <Pressable
            onPress={handleSave}
            disabled={
              saving ||
              loadingCategories ||
              categories.length === 0
            }
            style={[
              styles.saveButton,
              { backgroundColor: accentColor },
              (saving ||
                loadingCategories ||
                categories.length === 0) &&
                styles.disabledButton,
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Check size={19} color="#FFFFFF" />

                <Text style={styles.saveButtonText}>
                  {transactionId ? 'Update' : 'Save'}{' '}
                  {isIncome ? 'Income' : 'Expense'}
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
  },

  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },

  // CATEGORY DROPDOWN

  dropdownButton: {
    minHeight: 55,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  dropdownText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },

  dropdownList: {
    marginTop: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: 'hidden',
  },

  dropdownScroll: {
    maxHeight: 230,
  },

  dropdownItem: {
    minHeight: 49,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  dropdownItemSelected: {
    backgroundColor: '#202E3D',
  },

  dropdownItemText: {
    color: colors.textPrimary,
    fontSize: 13,
  },

  // INPUTS

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

  helperText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 8,
  },

  // DATE

  dateButton: {
    minHeight: 66,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  dateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },

  dateValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },

  dateSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },

  datePickerContainer: {
    marginTop: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
  },

  dateDoneButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 25,
    paddingVertical: 11,
    alignSelf: 'flex-end',
    marginTop: 8,
  },

  dateDoneText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
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
