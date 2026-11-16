
import React, { useCallback, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import Svg, {
  Circle,
  Rect,
  Line,
  Polyline,
  Path,
} from 'react-native-svg';

import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ReceiptText,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  CalendarDays,
  BarChart3,
  ChartLine,
  PieChart,
  RefreshCw,
} from 'lucide-react-native';

import colors from '../../theme/colors';

import {
  getReportData,
  ReportData,
  ReportGroupBy,
} from '../../database/repositories/reportRepository';

import {
  exportExcel,
  exportPDF,
} from '../../services/reportExportService';

// ==========================================
// TYPES
// ==========================================

type PeriodOption =
  | 'today'
  | 'week'
  | 'month'
  | '2months'
  | '3months'
  | '4months'
  | '7months'
  | 'year'
  | 'custom';

type ChartType = 'bar' | 'line' | 'pie' | 'donut';

type DataType = 'both' | 'income' | 'expenses';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface PeriodItem {
  label: string;
  value: PeriodOption;
}

const CHART_COLORS = [
  '#3B82F6',
  '#22C55E',
  '#F59E0B',
  '#EF4444',
  '#A855F7',
  '#06B6D4',
  '#EC4899',
  '#14B8A6',
];

// ==========================================
// DATE HELPERS
// ==========================================

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getRange = (period: PeriodOption): DateRange => {
  const today = new Date();
  const start = new Date(today);

  switch (period) {
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
    endDate: formatDate(today),
  };
};

const getGroupBy = (period: PeriodOption): ReportGroupBy => {
  if (period === 'today' || period === 'week' || period === 'month') {
    return 'day';
  }

  return 'month';
};

const isValidDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

const formatMoney = (amount: number): string => {
  return `Rs. ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const shortMoney = (amount: number): string => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }

  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }

  return amount.toFixed(0);
};

const periodLabel = (value: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value.slice(5);
  }

  if (/^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split('-');

    return new Date(
      Number(year),
      Number(month) - 1,
      1,
    ).toLocaleDateString('en-US', {
      month: 'short',
    });
  }

  if (value.includes('-W')) {
    return value.replace('-W', ' W');
  }

  return value;
};

// ==========================================
// PERIOD OPTIONS
// ==========================================

const PERIODS: PeriodItem[] = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Last 2 Months', value: '2months' },
  { label: 'Last 3 Months', value: '3months' },
  { label: 'Last 4 Months', value: '4months' },
  { label: 'Last 7 Months', value: '7months' },
  { label: 'This Year', value: 'year' },
  { label: 'Custom Range', value: 'custom' },
];

// ==========================================
// SUMMARY CARD
// ==========================================

interface SummaryCardProps {
  title: string;
  amount: number;
  color: string;
  icon: React.ReactNode;
}

const SummaryCard = ({
  title,
  amount,
  color,
  icon,
}: SummaryCardProps) => (
  <View style={styles.summaryCard}>
    <View style={styles.summaryTop}>
      <View
        style={[
          styles.summaryIcon,
          { backgroundColor: `${color}20` },
        ]}
      >
        {icon}
      </View>
    </View>

    <Text style={styles.summaryLabel}>{title}</Text>

    <Text style={styles.summaryAmount} numberOfLines={1}>
      {formatMoney(amount)}
    </Text>
  </View>
);

// ==========================================
// CHART HELPERS
// ==========================================

const getPiePath = (
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string => {
  const startX =
    cx + radius * Math.cos(startAngle);

  const startY =
    cy + radius * Math.sin(startAngle);

  const endX =
    cx + radius * Math.cos(endAngle);

  const endY =
    cy + radius * Math.sin(endAngle);

  const largeArc =
    endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    `M ${cx} ${cy}`,
    `L ${startX} ${startY}`,
    `A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`,
    'Z',
  ].join(' ');
};

// ==========================================
// BAR CHART
// ==========================================

const BarChartView = ({
  data,
  dataType,
}: {
  data: ReportData['trends'];
  dataType: DataType;
}) => {
  const chartData = data.slice(-7);
  const width = 320;
  const height = 180;
  const maxValue = Math.max(
    1,
    ...chartData.map(item =>
      Math.max(item.income, item.expenses),
    ),
  );

  const groupWidth = width / Math.max(chartData.length, 1);

  if (chartData.length === 0) {
    return (
      <Text style={styles.emptyChart}>
        No chart data available for this period.
      </Text>
    );
  }

  return (
    <View>
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
      >
        {[0, 1, 2, 3].map(index => (
          <Line
            key={index}
            x1="0"
            y1={15 + index * 42}
            x2={width}
            y2={15 + index * 42}
            stroke={colors.border}
            strokeDasharray="4 4"
          />
        ))}

        {chartData.map((item, index) => {
          const center = groupWidth * index + groupWidth / 2;

          const incomeHeight =
            (item.income / maxValue) * 125;

          const expenseHeight =
            (item.expenses / maxValue) * 125;

          const showIncome =
            dataType === 'both' || dataType === 'income';

          const showExpenses =
            dataType === 'both' || dataType === 'expenses';

          if (dataType === 'both') {
            return (
              <React.Fragment key={item.label}>
                <Rect
                  x={center - 15}
                  y={145 - incomeHeight}
                  width="12"
                  height={incomeHeight}
                  rx="4"
                  fill={colors.success}
                />

                <Rect
                  x={center + 3}
                  y={145 - expenseHeight}
                  width="12"
                  height={expenseHeight}
                  rx="4"
                  fill={colors.danger}
                />
              </React.Fragment>
            );
          }

          return (
            <React.Fragment key={item.label}>
              {showIncome && (
                <Rect
                  x={center - 7}
                  y={145 - incomeHeight}
                  width="14"
                  height={incomeHeight}
                  rx="4"
                  fill={colors.success}
                />
              )}

              {showExpenses && (
                <Rect
                  x={center - 7}
                  y={145 - expenseHeight}
                  width="14"
                  height={expenseHeight}
                  rx="4"
                  fill={colors.danger}
                />
              )}
            </React.Fragment>
          );
        })}
      </Svg>

      <View style={styles.chartLabels}>
        {chartData.map(item => (
          <Text key={item.label} style={styles.chartLabel}>
            {periodLabel(item.label)}
          </Text>
        ))}
      </View>
    </View>
  );
};

// ==========================================
// LINE CHART
// ==========================================

const LineChartView = ({
  data,
  dataType,
}: {
  data: ReportData['trends'];
  dataType: DataType;
}) => {
  const chartData = data.slice(-7);

  const width = 320;
  const height = 180;
  const padding = 15;
  const graphWidth = width - padding * 2;
  const graphHeight = 125;

  const maxValue = Math.max(
    1,
    ...chartData.map(item =>
      Math.max(item.income, item.expenses),
    ),
  );

  const makePoints = (values: number[]) =>
    values
      .map((value, index) => {
        const x =
          chartData.length === 1
            ? width / 2
            : padding +
              (index / (chartData.length - 1)) * graphWidth;

        const y =
          145 - (value / maxValue) * graphHeight;

        return `${x},${y}`;
      })
      .join(' ');

  if (chartData.length === 0) {
    return (
      <Text style={styles.emptyChart}>
        No chart data available for this period.
      </Text>
    );
  }

  return (
    <View>
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
      >
        {[0, 1, 2, 3].map(index => (
          <Line
            key={index}
            x1="0"
            y1={15 + index * 42}
            x2={width}
            y2={15 + index * 42}
            stroke={colors.border}
            strokeDasharray="4 4"
          />
        ))}

        {(dataType === 'both' || dataType === 'income') && (
          <Polyline
            points={makePoints(
              chartData.map(item => item.income),
            )}
            fill="none"
            stroke={colors.success}
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {(dataType === 'both' || dataType === 'expenses') && (
          <Polyline
            points={makePoints(
              chartData.map(item => item.expenses),
            )}
            fill="none"
            stroke={colors.danger}
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
      </Svg>

      <View style={styles.chartLabels}>
        {chartData.map(item => (
          <Text key={item.label} style={styles.chartLabel}>
            {periodLabel(item.label)}
          </Text>
        ))}
      </View>
    </View>
  );
};

// ==========================================
// PIE / DONUT CHART
// ==========================================

const CategoryChart = ({
  categories,
  type,
}: {
  categories: ReportData['categories'];
  type: 'pie' | 'donut';
}) => {
  const total = categories.reduce(
    (sum, item) => sum + item.totalAmount,
    0,
  );

  const radius = 76;
  const center = 100;

  let currentAngle = -Math.PI / 2;

  if (total <= 0) {
    return (
      <Text style={styles.emptyChart}>
        No expense categories available.
      </Text>
    );
  }

  return (
    <View>
      <View style={styles.pieWrapper}>
        <Svg
          width={210}
          height={210}
          viewBox="0 0 200 200"
        >
          {categories.map((item, index) => {
            const percentage =
              item.totalAmount / total;

            const nextAngle =
              currentAngle + percentage * Math.PI * 2;

            const path = getPiePath(
              center,
              center,
              radius,
              currentAngle,
              nextAngle,
            );

            const start = currentAngle;
            currentAngle = nextAngle;

            if (type === 'pie') {
              return (
                <Path
                  key={item.categoryName}
                  d={path}
                  fill={
                    CHART_COLORS[
                      index % CHART_COLORS.length
                    ]
                  }
                  stroke={colors.surface}
                  strokeWidth="1"
                />
              );
            }

            const circumference = 2 * Math.PI * 67;
            const segment = percentage * circumference;

            return (
              <Circle
                key={item.categoryName}
                cx="100"
                cy="100"
                r="67"
                fill="none"
                stroke={
                  CHART_COLORS[
                    index % CHART_COLORS.length
                  ]
                }
                strokeWidth="25"
                strokeDasharray={`${segment} ${circumference}`}
                strokeDashoffset={
                  -((start + Math.PI / 2) / (Math.PI * 2)) *
                  circumference
                }
                rotation="-90"
                origin="100, 100"
              />
            );
          })}
        </Svg>

        {type === 'donut' && (
          <View style={styles.pieCenter}>
            <Text style={styles.pieCenterLabel}>
              Total Expenses
            </Text>

            <Text style={styles.pieCenterAmount}>
              {shortMoney(total)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.categoryList}>
        {categories.map((item, index) => {
          const percentage =
            (item.totalAmount / total) * 100;

          return (
            <View
              key={item.categoryName}
              style={styles.categoryRow}
            >
              <View style={styles.categoryLeft}>
                <View
                  style={[
                    styles.categoryDot,
                    {
                      backgroundColor:
                        CHART_COLORS[
                          index % CHART_COLORS.length
                        ],
                    },
                  ]}
                />

                <Text style={styles.categoryName}>
                  {item.categoryName}
                </Text>
              </View>

              <View style={styles.categoryRight}>
                <Text style={styles.categoryAmount}>
                  {formatMoney(item.totalAmount)}
                </Text>

                <Text style={styles.categoryPercent}>
                  {percentage.toFixed(1)}%
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ==========================================
// MAIN REPORTS SCREEN
// ==========================================

export default function Reports() {
  const initialRange = getRange('month');

  const [reportData, setReportData] =
    useState<ReportData | null>(null);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [selectedPeriod, setSelectedPeriod] =
    useState<PeriodOption>('month');

  const [startDate, setStartDate] =
    useState(initialRange.startDate);

  const [endDate, setEndDate] =
    useState(initialRange.endDate);

  const [groupBy, setGroupBy] =
    useState<ReportGroupBy>('day');

  const [chartType, setChartType] =
    useState<ChartType>('bar');

  const [dataType, setDataType] =
    useState<DataType>('both');

  const [showPeriodModal, setShowPeriodModal] =
    useState(false);

  const [showChartModal, setShowChartModal] =
    useState(false);

  const [customStart, setCustomStart] =
    useState(initialRange.startDate);

  const [customEnd, setCustomEnd] =
    useState(initialRange.endDate);

  const [showCustomRange, setShowCustomRange] =
    useState(false);

  const [error, setError] = useState('');

  // ==========================================
  // LOAD REPORT DATA
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
      console.log('REPORT ERROR:', err);
      setError('Unable to load report data.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, groupBy]);

  useFocusEffect(
    useCallback(() => {
      loadReport();
    }, [loadReport]),
  );

  // ==========================================
  // PERIOD SELECT
  // ==========================================

  const handlePeriodSelect = (period: PeriodOption) => {
    setSelectedPeriod(period);
    setShowPeriodModal(false);

    if (period === 'custom') {
      setCustomStart(startDate);
      setCustomEnd(endDate);
      setShowCustomRange(true);
      return;
    }

    const range = getRange(period);

    setStartDate(range.startDate);
    setEndDate(range.endDate);
    setGroupBy(getGroupBy(period));
  };

  const applyCustomRange = () => {
    if (
      !isValidDate(customStart) ||
      !isValidDate(customEnd) ||
      customStart > customEnd
    ) {
      Alert.alert(
        'Invalid Date Range',
        'Please enter valid dates in YYYY-MM-DD format.',
      );
      return;
    }

    setStartDate(customStart);
    setEndDate(customEnd);
    setGroupBy('day');
    setSelectedPeriod('custom');
    setShowCustomRange(false);
  };

  // ==========================================
  // EXPORT HANDLERS
  // ==========================================

  const handleExport = async (type: 'pdf' | 'excel') => {
    if (!reportData) {
      Alert.alert('No Data', 'There is no report data to export.');
      return;
    }

    try {
      setExporting(true);

      const options = {
        data: reportData,
        startDate,
        endDate,
      };

      if (type === 'pdf') {
        await exportPDF(options);
      } else {
        await exportExcel(options);
      }
    } catch (err) {
      console.log('EXPORT ERROR:', err);

      Alert.alert(
        'Export Failed',
        'Unable to generate the report. Please try again.',
      );
    } finally {
      setExporting(false);
    }
  };

  // ==========================================
  // SELECTED PERIOD LABEL
  // ==========================================

  const selectedPeriodLabel =
    PERIODS.find(item => item.value === selectedPeriod)?.label ??
    'Select Period';

  const selectedChartLabel: Record<ChartType, string> = {
    bar: 'Bar Chart',
    line: 'Line Chart',
    pie: 'Pie Chart',
    donut: 'Donut Chart',
  };

  // ==========================================
  // LOADING SCREEN
  // ==========================================

  if (loading && !reportData) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text style={styles.loadingText}>
          Preparing your financial report...
        </Text>
      </SafeAreaView>
    );
  }

  // ==========================================
  // MAIN UI
  // ==========================================

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View>
            <Text style={styles.heading}>
              Financial Reports
            </Text>

            <Text style={styles.subtitle}>
              Understand your money better
            </Text>
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadReport}
            disabled={loading}
          >
            <RefreshCw
              size={19}
              color={colors.primaryLight}
            />
          </TouchableOpacity>
        </View>

        {/* PERIOD SELECTOR */}

        <Text style={styles.label}>
          REPORT PERIOD
        </Text>

        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setShowPeriodModal(true)}
        >
          <View style={styles.dropdownLeft}>
            <CalendarDays
              size={19}
              color={colors.primaryLight}
            />

            <View>
              <Text style={styles.dropdownLabel}>
                {selectedPeriodLabel}
              </Text>

              <Text style={styles.dropdownDate}>
                {startDate}  -  {endDate}
              </Text>
            </View>
          </View>

          <ChevronDown
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {/* PERIOD MODAL */}

        <Modal
          visible={showPeriodModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPeriodModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowPeriodModal(false)}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                Select Report Period
              </Text>

              {PERIODS.map(item => {
                const active =
                  selectedPeriod === item.value;

                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.modalOption,
                      active && styles.modalOptionActive,
                    ]}
                    onPress={() =>
                      handlePeriodSelect(item.value)
                    }
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        active && styles.modalOptionTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>

                    {active && (
                      <Text style={styles.selectedMark}>
                        ✓
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* CUSTOM DATE MODAL */}

        <Modal
          visible={showCustomRange}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCustomRange(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                Custom Date Range
              </Text>

              <Text style={styles.inputLabel}>
                Start Date (YYYY-MM-DD)
              </Text>

              <TextInput
                style={styles.dateInput}
                value={customStart}
                onChangeText={setCustomStart}
                placeholder="2026-01-01"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.inputLabel}>
                End Date (YYYY-MM-DD)
              </Text>

              <TextInput
                style={styles.dateInput}
                value={customEnd}
                onChangeText={setCustomEnd}
                placeholder="2026-11-05"
                placeholderTextColor={colors.textMuted}
              />

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={applyCustomRange}
              >
                <Text style={styles.primaryButtonText}>
                  Apply Date Range
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCustomRange(false)}
              >
                <Text style={styles.cancelButtonText}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {error !== '' && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {loading && (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={styles.inlineLoader}
          />
        )}

        {reportData && (
          <>
            {/* NET BALANCE */}

            <View style={styles.balanceCard}>
              <View style={styles.balanceTop}>
                <View>
                  <Text style={styles.balanceLabel}>
                    NET BALANCE
                  </Text>

                  <Text style={styles.balanceAmount}>
                    {formatMoney(reportData.summary.balance)}
                  </Text>
                </View>

                <View style={styles.balanceIcon}>
                  <Wallet
                    size={24}
                    color={colors.white}
                  />
                </View>
              </View>

              <View style={styles.balanceFooter}>
                <Text style={styles.balanceHint}>
                  Income minus expenses
                </Text>

                <Text style={styles.balanceHint}>
                  {reportData.summary.transactionCount} transactions
                </Text>
              </View>
            </View>

            {/* SUMMARY */}

            <Text style={styles.sectionTitle}>
              Financial Overview
            </Text>

            <View style={styles.summaryGrid}>
              <SummaryCard
                title="Total Income"
                amount={reportData.summary.totalIncome}
                color={colors.success}
                icon={
                  <TrendingUp
                    size={20}
                    color={colors.success}
                  />
                }
              />

              <SummaryCard
                title="Total Expenses"
                amount={reportData.summary.totalExpenses}
                color={colors.danger}
                icon={
                  <TrendingDown
                    size={20}
                    color={colors.danger}
                  />
                }
              />
            </View>

            <View style={styles.transactionCountCard}>
              <ReceiptText
                size={22}
                color={colors.primaryLight}
              />

              <View style={{ flex: 1 }}>
                <Text style={styles.transactionCountLabel}>
                  Total Transactions
                </Text>

                <Text style={styles.transactionCountValue}>
                  {reportData.summary.transactionCount}
                </Text>
              </View>
            </View>

            {/* CHART CARD */}

            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={styles.sectionTitle}>
                    Analytics
                  </Text>

                  <Text style={styles.chartSubtitle}>
                    Visual financial insights
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.chartDropdown}
                  onPress={() => setShowChartModal(true)}
                >
                  <Text style={styles.chartDropdownText}>
                    {selectedChartLabel[chartType]}
                  </Text>

                  <ChevronDown
                    size={15}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* CHART SELECTOR MODAL */}

              <Modal
                visible={showChartModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowChartModal(false)}
              >
                <TouchableOpacity
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowChartModal(false)}
                >
                  <View style={styles.modalCard}>
                    <Text style={styles.modalTitle}>
                      Choose Chart Type
                    </Text>

                    {([
                      ['bar', 'Bar Chart', BarChart3],
                      ['line', 'Line Chart', ChartLine],
                      ['pie', 'Pie Chart', PieChart],
                      ['donut', 'Donut Chart', PieChart],
                    ] as const).map(([value, label, Icon]) => (
                      <TouchableOpacity
                        key={value}
                        style={[
                          styles.chartOption,
                          chartType === value &&
                            styles.chartOptionActive,
                        ]}
                        onPress={() => {
                          setChartType(value);
                          setShowChartModal(false);
                        }}
                      >
                        <Icon
                          size={20}
                          color={colors.primaryLight}
                        />

                        <Text style={styles.chartOptionText}>
                          {label}
                        </Text>

                        {chartType === value && (
                          <Text style={styles.selectedMark}>
                            ✓
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </TouchableOpacity>
              </Modal>

              {/* SERIES FILTER */}

              {(chartType === 'bar' || chartType === 'line') && (
                <View style={styles.seriesSelector}>
                  {([
                    ['both', 'Both'],
                    ['income', 'Income'],
                    ['expenses', 'Expenses'],
                  ] as const).map(([value, label]) => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.seriesButton,
                        dataType === value &&
                          styles.seriesButtonActive,
                      ]}
                      onPress={() => setDataType(value)}
                    >
                      <Text
                        style={[
                          styles.seriesButtonText,
                          dataType === value &&
                            styles.seriesButtonTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* CHART RENDER */}

              <View style={styles.chartContent}>
                {chartType === 'bar' && (
                  <BarChartView
                    data={reportData.trends}
                    dataType={dataType}
                  />
                )}

                {chartType === 'line' && (
                  <LineChartView
                    data={reportData.trends}
                    dataType={dataType}
                  />
                )}

                {(chartType === 'pie' || chartType === 'donut') && (
                  <CategoryChart
                    categories={reportData.categories}
                    type={chartType}
                  />
                )}
              </View>

              {/* CHART LEGEND */}

              {(chartType === 'bar' || chartType === 'line') && (
                <View style={styles.legend}>
                  {(dataType === 'both' || dataType === 'income') && (
                    <View style={styles.legendItem}>
                      <View
                        style={[
                          styles.legendDot,
                          { backgroundColor: colors.success },
                        ]}
                      />

                      <Text style={styles.legendText}>
                        Income
                      </Text>
                    </View>
                  )}

                  {(dataType === 'both' || dataType === 'expenses') && (
                    <View style={styles.legendItem}>
                      <View
                        style={[
                          styles.legendDot,
                          { backgroundColor: colors.danger },
                        ]}
                      />

                      <Text style={styles.legendText}>
                        Expenses
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* EXPORT SECTION */}

            <View style={styles.exportCard}>
              <View style={styles.exportHeader}>
                <View>
                  <Text style={styles.sectionTitle}>
                    Download Report
                  </Text>

                  <Text style={styles.exportSubtitle}>
                    Export your selected date range
                  </Text>
                </View>

                <Download
                  size={22}
                  color={colors.primaryLight}
                />
              </View>

              <TouchableOpacity
                style={styles.pdfButton}
                disabled={exporting}
                onPress={() => handleExport('pdf')}
              >
                {exporting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <FileText
                    size={20}
                    color={colors.white}
                  />
                )}

                <View style={styles.exportButtonTextContainer}>
                  <Text style={styles.exportButtonTitle}>
                    Download PDF
                  </Text>

                  <Text style={styles.exportButtonSubtitle}>
                    Professional printable report
                  </Text>
                </View>

                <Download
                  size={18}
                  color={colors.white}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.excelButton}
                disabled={exporting}
                onPress={() => handleExport('excel')}
              >
                <FileSpreadsheet
                  size={20}
                  color={colors.success}
                />

                <View style={styles.exportButtonTextContainer}>
                  <Text style={styles.excelButtonTitle}>
                    Download Excel
                  </Text>

                  <Text style={styles.excelButtonSubtitle}>
                    Summary, transactions and categories
                  </Text>
                </View>

                <Download
                  size={18}
                  color={colors.success}
                />
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={{ height: 35 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: 20,
    paddingBottom: 35,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: colors.textSecondary,
    marginTop: 14,
    fontSize: 13,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 25,
  },

  heading: {
    color: colors.textPrimary,
    fontSize: 25,
    fontWeight: '800',
  },

  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 5,
  },

  refreshButton: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  label: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },

  dropdown: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },

  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  dropdownLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },

  dropdownDate: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 4,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: 22,
  },

  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },

  modalTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 15,
  },

  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  modalOptionActive: {
    backgroundColor: colors.surfaceLight,
  },

  modalOptionText: {
    color: colors.textSecondary,
    fontSize: 13,
  },

  modalOptionTextActive: {
    color: colors.primaryLight,
    fontWeight: '700',
  },

  selectedMark: {
    color: colors.success,
    fontSize: 17,
    fontWeight: '800',
  },

  inputLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 7,
  },

  dateInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    color: colors.textPrimary,
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginBottom: 15,
    fontSize: 13,
  },

  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 11,
    padding: 14,
    alignItems: 'center',
    marginTop: 5,
  },

  primaryButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
  },

  cancelButton: {
    padding: 13,
    alignItems: 'center',
  },

  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
  },

  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginBottom: 12,
  },

  inlineLoader: {
    marginBottom: 12,
  },

  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 21,
    marginBottom: 24,
  },

  balanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  balanceLabel: {
    color: '#DBEAFE',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },

  balanceAmount: {
    color: colors.white,
    fontSize: 25,
    fontWeight: '900',
    marginTop: 10,
  },

  balanceIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  balanceFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    marginTop: 18,
    paddingTop: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  balanceHint: {
    color: '#DBEAFE',
    fontSize: 10,
  },

  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },

  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 13,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
    minHeight: 125,
  },

  summaryTop: {
    flexDirection: 'row',
    marginBottom: 12,
  },

  summaryIcon: {
    width: 37,
    height: 37,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 11,
  },

  summaryAmount: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 7,
  },

  transactionCountCard: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginTop: 12,
    marginBottom: 25,
  },

  transactionCountLabel: {
    color: colors.textSecondary,
    fontSize: 11,
  },

  transactionCountValue: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '800',
    marginTop: 4,
  },

  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 23,
  },

  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  chartSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 5,
  },

  chartDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.surfaceLight,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },

  chartDropdownText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },

  chartOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 14,
    borderRadius: 11,
  },

  chartOptionActive: {
    backgroundColor: colors.surfaceLight,
  },

  chartOptionText: {
    color: colors.textPrimary,
    fontSize: 13,
    flex: 1,
  },

  seriesSelector: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    padding: 4,
    borderRadius: 11,
    marginTop: 19,
    marginBottom: 12,
  },

  seriesButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 8,
  },

  seriesButtonActive: {
    backgroundColor: colors.primary,
  },

  seriesButtonText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },

  seriesButtonTextActive: {
    color: colors.white,
  },

  chartContent: {
    marginTop: 16,
  },

  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 4,
  },

  chartLabel: {
    color: colors.textMuted,
    fontSize: 9,
    flex: 1,
    textAlign: 'center',
  },

  emptyChart: {
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 50,
    fontSize: 12,
  },

  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 23,
    marginTop: 20,
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

  pieWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },

  pieCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  pieCenterLabel: {
    color: colors.textMuted,
    fontSize: 10,
  },

  pieCenterAmount: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '900',
    marginTop: 5,
  },

  categoryList: {
    marginTop: 12,
  },

  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flex: 1,
  },

  categoryDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },

  categoryName: {
    color: colors.textSecondary,
    fontSize: 12,
  },

  categoryRight: {
    alignItems: 'flex-end',
  },

  categoryAmount: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },

  categoryPercent: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 3,
  },

  exportCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 17,
    marginBottom: 15,
  },

  exportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 17,
  },

  exportSubtitle: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 5,
  },

  pdfButton: {
    backgroundColor: colors.primary,
    borderRadius: 13,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },

  excelButton: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  exportButtonTextContainer: {
    flex: 1,
  },

  exportButtonTitle: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },

  exportButtonSubtitle: {
    color: '#DBEAFE',
    fontSize: 10,
    marginTop: 4,
  },

  excelButtonTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },

  excelButtonSubtitle: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 4,
  },
});
