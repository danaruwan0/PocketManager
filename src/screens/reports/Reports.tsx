
import React, {
  useCallback,
  useState,
} from 'react';

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';

import Svg, {
  Circle,
  Rect,
  Line,
  Polyline,
} from 'react-native-svg';

import { useFocusEffect } from '@react-navigation/native';

import colors from '../../theme/colors';

import {
  getReportData,
  ReportData,
  ReportGroupBy,
} from '../../database/repositories/reportRepository';

// ==========================================
// CONSTANTS
// ==========================================

const SCREEN_WIDTH = Dimensions.get('window').width;

const CHART_WIDTH = Math.max(
  260,
  Math.min(SCREEN_WIDTH - 80, 340),
);

const CHART_HEIGHT = 190;

type FilterType =
  | 'today'
  | 'week'
  | 'month'
  | '2months'
  | '3months'
  | '4months'
  | '7months'
  | 'year'
  | 'custom';

interface FilterOption {
  label: string;
  value: FilterType;
}

// ==========================================
// DATE HELPERS
// ==========================================

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getDateRange = (
  filter: FilterType,
): { startDate: string; endDate: string } => {
  const today = new Date();

  const endDate = formatDate(today);
  const start = new Date(today);

  switch (filter) {
    case 'today':
      break;

    case 'week':
      start.setDate(today.getDate() - 6);
      break;

    case 'month':
      start.setDate(1);
      break;

    case '2months':
      start.setMonth(today.getMonth() - 1, 1);
      break;

    case '3months':
      start.setMonth(today.getMonth() - 2, 1);
      break;

    case '4months':
      start.setMonth(today.getMonth() - 3, 1);
      break;

    case '7months':
      start.setMonth(today.getMonth() - 6, 1);
      break;

    case 'year':
      start.setMonth(0, 1);
      break;

    default:
      start.setDate(1);
  }

  return {
    startDate: formatDate(start),
    endDate,
  };
};

const getGroupBy = (
  filter: FilterType,
): ReportGroupBy => {
  if (filter === 'today') {
    return 'day';
  }

  if (filter === 'week') {
    return 'day';
  }

  if (filter === 'month') {
    return 'day';
  }

  return 'month';
};

// ==========================================
// FORMATTERS
// ==========================================

const formatMoney = (amount: number): string => {
  return `Rs. ${amount.toLocaleString('en-US', {
    maximumFractionDigits: 2,
  })}`;
};

const formatShortMoney = (amount: number): string => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }

  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }

  return amount.toFixed(0);
};

const formatPeriodLabel = (label: string): string => {
  if (label.includes('-W')) {
    return label.replace('-W', ' W');
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
    return label.substring(5);
  }

  if (/^\d{4}-\d{2}$/.test(label)) {
    const [year, month] = label.split('-');

    const date = new Date(
      Number(year),
      Number(month) - 1,
      1,
    );

    return date.toLocaleDateString('en-US', {
      month: 'short',
    });
  }

  return label;
};

// ==========================================
// FILTER OPTIONS
// ==========================================

const FILTER_OPTIONS: FilterOption[] = [
  { label: 'Today', value: 'today' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: '2 Months', value: '2months' },
  { label: '3 Months', value: '3months' },
  { label: '4 Months', value: '4months' },
  { label: '7 Months', value: '7months' },
  { label: 'Year', value: 'year' },
  { label: 'Custom', value: 'custom' },
];

// ==========================================
// SUMMARY CARD
// ==========================================

interface SummaryCardProps {
  title: string;
  amount: number;
  subtitle: string;
  color: string;
}

const SummaryCard = ({
  title,
  amount,
  subtitle,
  color,
}: SummaryCardProps) => {
  return (
    <View style={styles.summaryCard}>
      <View
        style={[
          styles.summaryIndicator,
          { backgroundColor: color },
        ]}
      />

      <Text style={styles.summaryTitle}>
        {title}
      </Text>

      <Text style={styles.summaryAmount}>
        {formatMoney(amount)}
      </Text>

      <Text style={styles.summarySubtitle}>
        {subtitle}
      </Text>
    </View>
  );
};

// ==========================================
// BAR CHART
// ==========================================

interface BarChartProps {
  data: ReportData['trends'];
}

const BarChart = ({ data }: BarChartProps) => {
  const chartData = data.slice(-7);

  const maxValue = Math.max(
    1,
    ...chartData.map(item =>
      Math.max(item.income, item.expenses),
    ),
  );

  const barWidth = 12;
  const groupWidth = CHART_WIDTH / Math.max(chartData.length, 1);

  return (
    <View>
      {chartData.length === 0 ? (
        <Text style={styles.emptyChartText}>
          No chart data available
        </Text>
      ) : (
        <Svg
          width="100%"
          height={CHART_HEIGHT}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        >
          {[0, 1, 2, 3].map(index => {
            const y = 15 + index * 42;

            return (
              <Line
                key={index}
                x1="0"
                y1={y}
                x2={CHART_WIDTH}
                y2={y}
                stroke={colors.border}
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            );
          })}

          {chartData.map((item, index) => {
            const centerX =
              groupWidth * index + groupWidth / 2;

            const incomeHeight =
              (item.income / maxValue) * 125;

            const expenseHeight =
              (item.expenses / maxValue) * 125;

            return (
              <React.Fragment key={`${item.label}-${index}`}>
                <Rect
                  x={centerX - barWidth - 2}
                  y={145 - incomeHeight}
                  width={barWidth}
                  height={incomeHeight}
                  rx="4"
                  fill={colors.success}
                />

                <Rect
                  x={centerX + 2}
                  y={145 - expenseHeight}
                  width={barWidth}
                  height={expenseHeight}
                  rx="4"
                  fill={colors.danger}
                />
              </React.Fragment>
            );
          })}
        </Svg>
      )}

      <View style={styles.chartLabels}>
        {chartData.map((item, index) => (
          <Text
            key={`${item.label}-${index}`}
            style={styles.chartLabel}
          >
            {formatPeriodLabel(item.label)}
          </Text>
        ))}
      </View>

      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: colors.success },
            ]}
          />
          <Text style={styles.legendText}>Income</Text>
        </View>

        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: colors.danger },
            ]}
          />
          <Text style={styles.legendText}>Expenses</Text>
        </View>
      </View>
    </View>
  );
};

// ==========================================
// LINE CHART
// ==========================================

interface LineChartProps {
  data: ReportData['trends'];
}

const LineChart = ({ data }: LineChartProps) => {
  const chartData = data.slice(-7);

  const maxValue = Math.max(
    1,
    ...chartData.map(item =>
      Math.max(item.income, item.expenses),
    ),
  );

  const padding = 18;
  const graphHeight = 130;
  const graphWidth = CHART_WIDTH - padding * 2;

  const getPoints = (
    values: number[],
  ): string => {
    return values
      .map((value, index) => {
        const x =
          padding +
          (chartData.length <= 1
            ? graphWidth / 2
            : (index / (chartData.length - 1)) * graphWidth);

        const y =
          145 - (value / maxValue) * graphHeight;

        return `${x},${y}`;
      })
      .join(' ');
  };

  return (
    <View>
      {chartData.length === 0 ? (
        <Text style={styles.emptyChartText}>
          No chart data available
        </Text>
      ) : (
        <Svg
          width="100%"
          height={CHART_HEIGHT}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        >
          {[0, 1, 2, 3].map(index => {
            const y = 15 + index * 42;

            return (
              <Line
                key={index}
                x1="0"
                y1={y}
                x2={CHART_WIDTH}
                y2={y}
                stroke={colors.border}
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            );
          })}

          <Polyline
            points={getPoints(
              chartData.map(item => item.income),
            )}
            fill="none"
            stroke={colors.success}
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          <Polyline
            points={getPoints(
              chartData.map(item => item.expenses),
            )}
            fill="none"
            stroke={colors.danger}
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {chartData.map((item, index) => {
            const x =
              padding +
              (chartData.length <= 1
                ? graphWidth / 2
                : (index / (chartData.length - 1)) * graphWidth);

            const incomeY =
              145 - (item.income / maxValue) * graphHeight;

            const expenseY =
              145 - (item.expenses / maxValue) * graphHeight;

            return (
              <React.Fragment key={`${item.label}-${index}`}>
                <Circle
                  cx={x}
                  cy={incomeY}
                  r="4"
                  fill={colors.success}
                />

                <Circle
                  cx={x}
                  cy={expenseY}
                  r="4"
                  fill={colors.danger}
                />
              </React.Fragment>
            );
          })}
        </Svg>
      )}

      <View style={styles.chartLabels}>
        {chartData.map((item, index) => (
          <Text
            key={`${item.label}-${index}`}
            style={styles.chartLabel}
          >
            {formatPeriodLabel(item.label)}
          </Text>
        ))}
      </View>

      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: colors.success },
            ]}
          />
          <Text style={styles.legendText}>Income</Text>
        </View>

        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: colors.danger },
            ]}
          />
          <Text style={styles.legendText}>Expenses</Text>
        </View>
      </View>
    </View>
  );
};

// ==========================================
// DONUT CHART
// ==========================================

const DONUT_COLORS = [
  '#3B82F6',
  '#22C55E',
  '#F59E0B',
  '#EF4444',
  '#A855F7',
  '#06B6D4',
  '#EC4899',
];

interface DonutChartProps {
  categories: ReportData['categories'];
}

const DonutChart = ({ categories }: DonutChartProps) => {
  const total = categories.reduce(
    (sum, item) => sum + item.totalAmount,
    0,
  );

  const radius = 65;
  const circumference = 2 * Math.PI * radius;

  let accumulatedOffset = 0;

  return (
    <View>
      {total <= 0 ? (
        <Text style={styles.emptyChartText}>
          No expense categories available
        </Text>
      ) : (
        <>
          <View style={styles.donutWrapper}>
            <Svg
              width={190}
              height={190}
              viewBox="0 0 190 190"
            >
              <Circle
                cx="95"
                cy="95"
                r={radius}
                stroke={colors.surfaceLight}
                strokeWidth="24"
                fill="none"
              />

              {categories.map((item, index) => {
                const percentage =
                  item.totalAmount / total;

                const segmentLength =
                  percentage * circumference;

                const currentOffset =
                  accumulatedOffset;

                accumulatedOffset += segmentLength;

                return (
                  <Circle
                    key={`${item.categoryName}-${index}`}
                    cx="95"
                    cy="95"
                    r={radius}
                    stroke={
                      DONUT_COLORS[
                        index % DONUT_COLORS.length
                      ]
                    }
                    strokeWidth="24"
                    fill="none"
                    strokeDasharray={`${segmentLength} ${circumference}`}
                    strokeDashoffset={-currentOffset}
                    strokeLinecap="butt"
                    rotation="-90"
                    origin="95, 95"
                  />
                );
              })}
            </Svg>

            <View style={styles.donutCenter}>
              <Text style={styles.donutCenterLabel}>
                Total Expense
              </Text>

              <Text style={styles.donutCenterAmount}>
                {formatShortMoney(total)}
              </Text>
            </View>
          </View>

          <View style={styles.categoryLegend}>
            {categories.map((item, index) => {
              const percentage =
                (item.totalAmount / total) * 100;

              return (
                <View
                  key={`${item.categoryName}-${index}`}
                  style={styles.categoryRow}
                >
                  <View style={styles.categoryNameContainer}>
                    <View
                      style={[
                        styles.legendDot,
                        {
                          backgroundColor:
                            DONUT_COLORS[
                              index % DONUT_COLORS.length
                            ],
                        },
                      ]}
                    />

                    <Text
                      style={styles.categoryName}
                      numberOfLines={1}
                    >
                      {item.categoryName}
                    </Text>
                  </View>

                  <View style={styles.categoryAmountContainer}>
                    <Text style={styles.categoryAmount}>
                      {formatMoney(item.totalAmount)}
                    </Text>

                    <Text style={styles.categoryPercentage}>
                      {percentage.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
};

// ==========================================
// MAIN REPORTS SCREEN
// ==========================================

const Reports = () => {
  const initialRange = getDateRange('month');

  const [selectedFilter, setSelectedFilter] =
    useState<FilterType>('month');

  const [startDate, setStartDate] =
    useState(initialRange.startDate);

  const [endDate, setEndDate] =
    useState(initialRange.endDate);

  const [groupBy, setGroupBy] =
    useState<ReportGroupBy>('day');

  const [reportData, setReportData] =
    useState<ReportData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');

  // ==========================================
  // LOAD REPORT
  // ==========================================

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const result = await getReportData(
        startDate,
        endDate,
        groupBy,
      );

      setReportData(result);
    } catch (err) {
      console.log('REPORT LOAD ERROR:', err);

      setError(
        'Unable to load reports. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, groupBy]);

  // Refresh whenever this screen becomes active.
  useFocusEffect(
    useCallback(() => {
      loadReport();
    }, [loadReport]),
  );

  // ==========================================
  // CHANGE FILTER
  // ==========================================

  const handleFilterChange = (filter: FilterType) => {
    setSelectedFilter(filter);

    if (filter === 'custom') {
      return;
    }

    const range = getDateRange(filter);

    setStartDate(range.startDate);
    setEndDate(range.endDate);
    setGroupBy(getGroupBy(filter));
  };

  // ==========================================
  // CUSTOM DATE RANGE
  // ==========================================

  const applyCustomRange = () => {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(endDate) ||
      startDate > endDate
    ) {
      setError('Please enter a valid date range (YYYY-MM-DD).');
      return;
    }

    setGroupBy('day');
    loadReport();
  };

  // ==========================================
  // LOADING SCREEN
  // ==========================================

  if (loading && !reportData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text style={styles.loadingText}>
          Loading Reports...
        </Text>
      </View>
    );
  }

  // ==========================================
  // MAIN UI
  // ==========================================

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            Financial Reports
          </Text>

          <Text style={styles.headerSubtitle}>
            Track your financial performance
          </Text>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadReport}
          disabled={loading}
        >
          <Text style={styles.refreshText}>
            {loading ? 'Loading...' : 'Refresh'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* FILTERS */}

      <Text style={styles.sectionTitle}>
        Select Period
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      >
        {FILTER_OPTIONS.map(option => {
          const active =
            selectedFilter === option.value;

          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.filterButton,
                active && styles.activeFilterButton,
              ]}
              onPress={() =>
                handleFilterChange(option.value)
              }
            >
              <Text
                style={[
                  styles.filterText,
                  active && styles.activeFilterText,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* CUSTOM RANGE */}

      {selectedFilter === 'custom' && (
        <View style={styles.customDateCard}>
          <Text style={styles.customDateTitle}>
            Custom Date Range
          </Text>

          <Text style={styles.inputLabel}>
            Start Date (YYYY-MM-DD)
          </Text>

          <TextInput
            style={styles.dateInput}
            value={startDate}
            onChangeText={setStartDate}
            placeholder="2026-01-01"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />

          <Text style={styles.inputLabel}>
            End Date (YYYY-MM-DD)
          </Text>

          <TextInput
            style={styles.dateInput}
            value={endDate}
            onChangeText={setEndDate}
            placeholder="2026-11-05"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={styles.applyButton}
            onPress={applyCustomRange}
          >
            <Text style={styles.applyButtonText}>
              Apply Date Range
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* DATE LABEL */}

      <Text style={styles.dateRangeText}>
        {startDate}  →  {endDate}
      </Text>

      {/* ERROR */}

      {error !== '' && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>
            {error}
          </Text>
        </View>
      )}

      {/* REPORT CONTENT */}

      {reportData && (
        <>
          {/* SUMMARY */}

          <Text style={styles.sectionTitle}>
            Financial Overview
          </Text>

          <View style={styles.summaryGrid}>
            <SummaryCard
              title="Total Income"
              amount={reportData.summary.totalIncome}
              subtitle="Money received"
              color={colors.success}
            />

            <SummaryCard
              title="Total Expenses"
              amount={reportData.summary.totalExpenses}
              subtitle="Money spent"
              color={colors.danger}
            />

            <SummaryCard
              title="Net Balance"
              amount={reportData.summary.balance}
              subtitle="Income - Expenses"
              color={colors.primaryLight}
            />

            <SummaryCard
              title="Transactions"
              amount={reportData.summary.transactionCount}
              subtitle="Total records"
              color={colors.warning}
            />
          </View>

          {/* BAR CHART */}

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>
              Income vs Expenses
            </Text>

            <Text style={styles.chartSubtitle}>
              Financial activity over time
            </Text>

            <BarChart data={reportData.trends} />
          </View>

          {/* LINE CHART */}

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>
              Financial Trends
            </Text>

            <Text style={styles.chartSubtitle}>
              Income and expense movement
            </Text>

            <LineChart data={reportData.trends} />
          </View>

          {/* DONUT CHART */}

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>
              Expense Categories
            </Text>

            <Text style={styles.chartSubtitle}>
              Where your money goes
            </Text>

            <DonutChart
              categories={reportData.categories}
            />
          </View>

          {/* TRANSACTION HISTORY */}

          <View style={styles.transactionHeader}>
            <Text style={styles.sectionTitle}>
              Transactions
            </Text>

            <Text style={styles.transactionCount}>
              {reportData.transactions.length} Records
            </Text>
          </View>

          <View style={styles.transactionCard}>
            {reportData.transactions.length === 0 ? (
              <Text style={styles.emptyText}>
                No transactions found for this period.
              </Text>
            ) : (
              reportData.transactions
                .slice(0, 30)
                .map(transaction => {
                  const isIncome =
                    transaction.type === 'income';

                  return (
                    <View
                      key={transaction.id}
                      style={styles.transactionRow}
                    >
                      <View style={styles.transactionInfo}>
                        <Text
                          style={styles.transactionTitle}
                          numberOfLines={1}
                        >
                          {transaction.title}
                        </Text>

                        <Text style={styles.transactionCategory}>
                          {transaction.categoryName}
                        </Text>

                        <Text style={styles.transactionDate}>
                          {transaction.date}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.transactionAmount,
                          {
                            color: isIncome
                              ? colors.success
                              : colors.danger,
                          },
                        ]}
                      >
                        {isIncome ? '+' : '-'}
                        {formatMoney(transaction.amount)}
                      </Text>
                    </View>
                  );
                })
            )}

            {reportData.transactions.length > 30 && (
              <Text style={styles.moreTransactionsText}>
                Showing 30 of {reportData.transactions.length} transactions
              </Text>
            )}
          </View>
        </>
      )}

      {/* EXPORT PLACEHOLDER */}

      <View style={styles.exportCard}>
        <Text style={styles.exportTitle}>
          Download Financial Report
        </Text>

        <Text style={styles.exportSubtitle}>
          PDF and Excel export will be connected in the next step.
        </Text>
      </View>

      <View style={{ height: 35 }} />
    </ScrollView>
  );
};

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: 18,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: colors.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 25,
  },

  headerTitle: {
    color: colors.textPrimary,
    fontSize: 23,
    fontWeight: '800',
  },

  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 5,
  },

  refreshButton: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },

  refreshText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },

  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },

  filterContainer: {
    gap: 9,
    paddingBottom: 12,
  },

  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  activeFilterButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  filterText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  activeFilterText: {
    color: colors.white,
  },

  dateRangeText: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 20,
    marginTop: 3,
  },

  customDateCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },

  customDateTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
  },

  inputLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 7,
  },

  dateInput: {
    backgroundColor: colors.background,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: colors.textPrimary,
    marginBottom: 13,
    fontSize: 13,
  },

  applyButton: {
    backgroundColor: colors.primary,
    padding: 13,
    borderRadius: 9,
    alignItems: 'center',
  },

  applyButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
  },

  errorCard: {
    backgroundColor: '#3B1D25',
    padding: 13,
    borderRadius: 10,
    marginBottom: 15,
  },

  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
  },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 22,
  },

  summaryCard: {
    width: '48%',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 125,
  },

  summaryIndicator: {
    width: 28,
    height: 4,
    borderRadius: 5,
    marginBottom: 12,
  },

  summaryTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },

  summaryAmount: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },

  summarySubtitle: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 7,
  },

  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },

  chartTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },

  chartSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 5,
    marginBottom: 18,
  },

  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 3,
  },

  chartLabel: {
    color: colors.textMuted,
    fontSize: 9,
    textAlign: 'center',
    flex: 1,
  },

  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 22,
    marginTop: 18,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },

  legendText: {
    color: colors.textSecondary,
    fontSize: 11,
  },

  emptyChartText: {
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 45,
    fontSize: 12,
  },

  donutWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },

  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  donutCenterLabel: {
    color: colors.textMuted,
    fontSize: 10,
  },

  donutCenterAmount: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '800',
    marginTop: 5,
  },

  categoryLegend: {
    marginTop: 12,
  },

  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  categoryNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flex: 1,
  },

  categoryName: {
    color: colors.textSecondary,
    fontSize: 12,
    flexShrink: 1,
  },

  categoryAmountContainer: {
    alignItems: 'flex-end',
  },

  categoryAmount: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },

  categoryPercentage: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 3,
  },

  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  transactionCount: {
    color: colors.textMuted,
    fontSize: 11,
  },

  transactionCard: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },

  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },

  transactionInfo: {
    flex: 1,
  },

  transactionTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },

  transactionCategory: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },

  transactionDate: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 4,
  },

  transactionAmount: {
    fontSize: 12,
    fontWeight: '800',
  },

  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 25,
    fontSize: 12,
  },

  moreTransactionsText: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 13,
  },

  exportCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    padding: 17,
    marginTop: 18,
  },

  exportTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },

  exportSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 7,
  },
});

export default Reports;



