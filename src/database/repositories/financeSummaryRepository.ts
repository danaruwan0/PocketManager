
import { db, initializeDatabase } from '../database';

export interface FinanceSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  transactionCount: number;
}

export interface ExpenseStatistics {
  averageExpense: number;
  highestExpense: number;
  lowestExpense: number;
  expenseCount: number;
}

export interface CategoryExpense {
  categoryId: number;
  totalAmount: number;
  transactionCount: number;
}

// Format date as YYYY-MM-DD using local date
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

// Get summary for a selected date range
export const getPeriodSummary = async (
  startDate: string,
  endDate: string,
): Promise<FinanceSummary> => {
  await initializeDatabase();

  if (startDate > endDate) {
    throw new Error('Start date cannot be after end date.');
  }

  const result = await db.execute(
    `SELECT
       COALESCE(
         SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0
       ) AS total_income,

       COALESCE(
         SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0
       ) AS total_expenses,

       COUNT(*) AS transaction_count

     FROM transactions
     WHERE date >= ? AND date <= ?`,
    [startDate, endDate],
  );

  const row = result.rows[0];

  const income = Number(row?.total_income ?? 0);
  const expenses = Number(row?.total_expenses ?? 0);

  return {
    totalIncome: income,
    totalExpenses: expenses,
    balance: income - expenses,
    transactionCount: Number(row?.transaction_count ?? 0),
  };
};

// Today's summary
export const getTodaySummary = async (): Promise<FinanceSummary> => {
  const today = formatDate(new Date());

  return getPeriodSummary(today, today);
};

// Current week's summary (Monday to Sunday)
export const getWeeklySummary = async (): Promise<FinanceSummary> => {
  const today = new Date();

  const day = today.getDay();
  const difference = day === 0 ? 6 : day - 1;

  const monday = new Date(today);
  monday.setDate(today.getDate() - difference);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return getPeriodSummary(
    formatDate(monday),
    formatDate(sunday),
  );
};

// Current month's summary
export const getCurrentMonthSummary =
  async (): Promise<FinanceSummary> => {
    const today = new Date();

    const year = today.getFullYear();
    const month = today.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    return getPeriodSummary(
      formatDate(firstDay),
      formatDate(lastDay),
    );
  };

// Current year's summary
export const getYearlySummary = async (): Promise<FinanceSummary> => {
  const year = new Date().getFullYear();

  return getPeriodSummary(
    `${year}-01-01`,
    `${year}-12-31`,
  );
};

// Expense statistics for a selected date range
export const getExpenseStatistics = async (
  startDate: string,
  endDate: string,
): Promise<ExpenseStatistics> => {
  await initializeDatabase();

  const result = await db.execute(
    `SELECT
       COALESCE(AVG(amount), 0) AS average_expense,
       COALESCE(MAX(amount), 0) AS highest_expense,
       COALESCE(MIN(amount), 0) AS lowest_expense,
       COUNT(*) AS expense_count

     FROM transactions
     WHERE type = 'expense'
       AND date >= ?
       AND date <= ?`,
    [startDate, endDate],
  );

  const row = result.rows[0];

  return {
    averageExpense: Number(row?.average_expense ?? 0),
    highestExpense: Number(row?.highest_expense ?? 0),
    lowestExpense: Number(row?.lowest_expense ?? 0),
    expenseCount: Number(row?.expense_count ?? 0),
  };
};

// Find the category with the highest expenses
export const getHighestExpenseCategory = async (
  startDate: string,
  endDate: string,
): Promise<CategoryExpense | null> => {
  await initializeDatabase();

  const result = await db.execute(
    `SELECT
       category_id,
       SUM(amount) AS total_amount,
       COUNT(*) AS transaction_count

     FROM transactions
     WHERE type = 'expense'
       AND date >= ?
       AND date <= ?

     GROUP BY category_id
     ORDER BY total_amount DESC
     LIMIT 1`,
    [startDate, endDate],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    categoryId: Number(row.category_id),
    totalAmount: Number(row.total_amount),
    transactionCount: Number(row.transaction_count),
  };
};

// Get complete dashboard data for the current month
export const getDashboardSummary = async () => {
  const today = new Date();

  const year = today.getFullYear();
  const month = today.getMonth();

  const startDate = formatDate(new Date(year, month, 1));
  const endDate = formatDate(new Date(year, month + 1, 0));

  const [
    monthlySummary,
    todaySummary,
    weeklySummary,
    expenseStatistics,
    highestExpenseCategory,
  ] = await Promise.all([
    getPeriodSummary(startDate, endDate),
    getTodaySummary(),
    getWeeklySummary(),
    getExpenseStatistics(startDate, endDate),
    getHighestExpenseCategory(startDate, endDate),
  ]);

  return {
    monthly: monthlySummary,
    today: todaySummary,
    weekly: weeklySummary,
    expenseStatistics,
    highestExpenseCategory,
  };
};



