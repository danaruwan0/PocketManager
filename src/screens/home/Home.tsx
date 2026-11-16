
import React, { useCallback, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Pressable,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Bell,
  ChevronRight,
  CalendarDays,
} from 'lucide-react-native';

import {
  useFocusEffect,
  useNavigation,
  CompositeNavigationProp,
} from '@react-navigation/native';

import {
  BottomTabNavigationProp,
} from '@react-navigation/bottom-tabs';

import {
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';

import BalanceCard from '../../compornet/dashboard/BalanceCard';
import SummaryCard from '../../compornet/dashboard/SummaryCard';
import QuickActions from '../../compornet/dashboard/QuickActions';
import RecentTransactions from '../../compornet/dashboard/RecentTransactions';
import DashboardMenu from '../../compornet/dashboard/DashboardMenu';

import colors from '../../theme/colors';

import {
  getDashboardSummary,
  DashboardSummary,
  TransactionType,
} from '../../database/repositories/transactionRepository';

import {
  RootTabParamList,
  RootStackParamList,
} from '../../navigation/AppNavigator';

type HomeNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function Home() {
  const navigation = useNavigation<HomeNavigationProp>();

  const [summary, setSummary] = useState<DashboardSummary>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
  });

  const month = new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const loadDashboard = useCallback(async () => {
    try {
      const data = await getDashboardSummary();

      setSummary(data);
    } catch (error) {
      console.log('Dashboard loading error:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard]),
  );

  const handleToolNavigation = (
    screen: 'Calculator' | 'Notes' | 'Schedule',
  ) => {
    navigation.navigate(screen);
  };

  const handleAddTransaction = (type: TransactionType) => {
    navigation.navigate('AddTransaction', {
      type,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar

      //me than err enawa
        // backgroundColor={colors.background}
        barStyle="light-content"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* Dashboard Header */}

        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>
              Welcome back
            </Text>

            <Text style={styles.heading}>
              Dashboard
            </Text>
          </View>

          <View style={styles.headerActions}>

            {/* Notification Button */}

            <Pressable
              style={styles.notification}
              onPress={() => {
                // Notification screen can be added later
              }}
            >
              <Bell
                size={21}
                color={colors.textPrimary}
              />

              <View style={styles.dot} />
            </Pressable>

            {/* Dashboard Tools Menu */}

            <DashboardMenu
              onNavigate={handleToolNavigation}
            />

          </View>
        </View>

        {/* Current Month */}

        <View style={styles.monthContainer}>
          <CalendarDays
            size={16}
            color={colors.textSecondary}
          />

          <Text style={styles.monthText}>
            {month}
          </Text>
        </View>

        {/* Balance Card */}

        <View style={styles.balanceContainer}>
          <BalanceCard />
        </View>

        {/* Income and Expense Summary */}

        <View style={styles.summaryRow}>

          <SummaryCard
            title="Income"
            amount={`Rs. ${summary.totalIncome.toLocaleString('en-US')}`}
            type="income"
            icon={
              <ChevronRight
                size={19}
                color="#22C55E"
              />
            }
          />

          <SummaryCard
            title="Expenses"
            amount={`Rs. ${summary.totalExpense.toLocaleString('en-US')}`}
            type="expense"
            icon={
              <ChevronRight
                size={19}
                color="#EF4444"
              />
            }
          />

        </View>

        {/* Quick Actions */}

        <View style={styles.section}>

          <Text style={styles.sectionTitle}>
            Quick Actions
          </Text>

          <QuickActions
            onAction={handleAddTransaction}
          />

        </View>

        {/* Recent Transactions */}

        <View style={styles.section}>

          <View style={styles.sectionHeader}>

            <Text style={styles.sectionTitle}>
              Recent Transactions
            </Text>

            <Pressable
              onPress={() => {
                navigation.navigate('Transactions');
              }}
            >
              <Text style={styles.seeAll}>
                See All
              </Text>
            </Pressable>

          </View>

          <RecentTransactions />

        </View>

       

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 30,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  welcome: {
    color: colors.textSecondary,
    fontSize: 13,
  },

  heading: {
    color: colors.textPrimary,
    fontSize: 25,
    fontWeight: 'bold',
    marginTop: 5,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  notification: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

  dot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: colors.danger,
  },

  monthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 22,
  },

  monthText: {
    color: colors.textSecondary,
    fontSize: 13,
  },

  balanceContainer: {
    marginTop: 18,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },

  section: {
    marginTop: 28,
  },

  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: 'bold',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  seeAll: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },

  footer: {
    alignItems: 'center',
    marginTop: 30,
  },

  footerText: {
    color: colors.textMuted,
    fontSize: 10,
  },

});
