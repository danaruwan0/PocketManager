
import React, { useCallback, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Pressable,
  ActivityIndicator,
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
  useRoute,
  CompositeNavigationProp,
  RouteProp,
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

type HomeRouteProp = RouteProp<RootTabParamList, 'Home'>;

const formatMoney = (amount: number): string => {
  return `Rs. ${amount.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export default function Home() {
  const navigation = useNavigation<HomeNavigationProp>();
  const route = useRoute<HomeRouteProp>();

  const [summary, setSummary] = useState<DashboardSummary>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const month = new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Load dashboard information from SQLite.
  const loadDashboard = useCallback(async () => {
    try {
      setRefreshing(true);

      const data = await getDashboardSummary();

      setSummary({
        totalIncome: Number(data.totalIncome) || 0,
        totalExpense: Number(data.totalExpense) || 0,
        balance: Number(data.balance) || 0,
      });
    } catch (error) {
      console.error('Dashboard loading error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload whenever Home receives focus or a refresh signal.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      const refresh = async () => {
        try {
          const data = await getDashboardSummary();

          if (active) {
            setSummary({
              totalIncome: Number(data.totalIncome) || 0,
              totalExpense: Number(data.totalExpense) || 0,
              balance: Number(data.balance) || 0,
            });
          }
        } catch (error) {
          console.error('Dashboard refresh error:', error);
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      refresh();

      return () => {
        active = false;
      };
    }, [route.params?.refreshKey]),
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
      <StatusBar barStyle="light-content" />

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
            <Pressable
              style={styles.notification}
              onPress={() => { }}
            >
              <Bell
                size={21}
                color={colors.textPrimary}
              />

              <View style={styles.dot} />
            </Pressable>

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

        {/* All-time Balance */}

        <View style={styles.balanceContainer}>
          <BalanceCard />
        </View>

        {/* Monthly Income and Expenses */}

        <View style={styles.summaryRow}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator
                color={colors.primaryLight}
              />
            </View>
          ) : (
            <>
              <SummaryCard
                title="Income"
                amount={formatMoney(summary.totalIncome)}
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
                amount={formatMoney(summary.totalExpense)}
                type="expense"
                icon={
                  <ChevronRight
                    size={19}
                    color="#EF4444"
                  />
                }
              />
            </>
          )}
        </View>

        {/* Refresh Indicator */}

        {refreshing && (
          <Text style={styles.refreshText}>
            Updating financial information...
          </Text>
        )}

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
    minHeight: 110,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    minHeight: 110,
  },

  refreshText: {
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 8,
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
});
