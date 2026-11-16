
import { db, initializeDatabase } from '../database';

export type ReportGroupBy = 'day' | 'week' | 'month';

export interface ReportSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  transactionCount: number;
}

export interface ReportTrend {
  label: string;
  income: number;
  expenses: number;
}

export interface ReportCategory {
  categoryName: string;
  totalAmount: number;
  transactionCount: number;
}

export interface ReportTransaction {
  id: number;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  categoryName: string;
  date: string;
}

export interface ReportData {
  summary: ReportSummary;
  trends: ReportTrend[];
  categories: ReportCategory[];
  transactions: ReportTransaction[];
}

type Row = Record<string, unknown>;

export const getReportData = async (
  startDate: string,
  endDate: string,
  groupBy: ReportGroupBy = 'day',
): Promise<ReportData> => {
  await initializeDatabase();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(endDate) ||
    startDate > endDate
  ) {
    throw new Error('Invalid report date range.');
  }

  // 1. Financial summary
  const summaryResult = await db.execute(
    `SELECT
      COALESCE(SUM(
        CASE WHEN type = 'income' THEN amount ELSE 0 END
      ), 0) AS total_income,

      COALESCE(SUM(
        CASE WHEN type = 'expense' THEN amount ELSE 0 END
      ), 0) AS total_expenses,

      COUNT(*) AS transaction_count

    FROM transactions
    WHERE date >= ? AND date <= ?`,
    [startDate, endDate],
  );

  const summaryRow = summaryResult.rows[0] as Row | undefined;

  const totalIncome = Number(summaryRow?.total_income ?? 0);
  const totalExpenses = Number(summaryRow?.total_expenses ?? 0);

  const summary: ReportSummary = {
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    transactionCount: Number(
      summaryRow?.transaction_count ?? 0,
    ),
  };

  // 2. Chart grouping
  const dateExpression = {
    day: "strftime('%Y-%m-%d', date)",
    week: "strftime('%Y-W%W', date)",
    month: "strftime('%Y-%m', date)",
  }[groupBy];

  const trendResult = await db.execute(
    `SELECT
      ${dateExpression} AS period,

      COALESCE(SUM(
        CASE WHEN type = 'income' THEN amount ELSE 0 END
      ), 0) AS income,

      COALESCE(SUM(
        CASE WHEN type = 'expense' THEN amount ELSE 0 END
      ), 0) AS expenses

    FROM transactions

    WHERE date >= ? AND date <= ?

    GROUP BY period
    ORDER BY period ASC`,
    [startDate, endDate],
  );

  const trends: ReportTrend[] = (
    trendResult.rows as Row[]
  ).map(row => ({
    label: String(row.period ?? ''),
    income: Number(row.income ?? 0),
    expenses: Number(row.expenses ?? 0),
  }));

  // 3. Category breakdown
  const categoryResult = await db.execute(
    `SELECT
      COALESCE(c.name, 'Uncategorized') AS category_name,
      SUM(t.amount) AS total_amount,
      COUNT(*) AS transaction_count

    FROM transactions t

    LEFT JOIN categories c
      ON t.category_id = c.id

    WHERE t.type = 'expense'
      AND t.date >= ?
      AND t.date <= ?

    GROUP BY t.category_id, c.name
    ORDER BY total_amount DESC`,
    [startDate, endDate],
  );

  const categories: ReportCategory[] = (
    categoryResult.rows as Row[]
  ).map(row => ({
    categoryName: String(row.category_name),
    totalAmount: Number(row.total_amount ?? 0),
    transactionCount: Number(row.transaction_count ?? 0),
  }));

  // 4. Transaction details
  const transactionResult = await db.execute(
    `SELECT
      t.id,
      t.title,
      t.amount,
      t.type,
      t.date,
      COALESCE(c.name, 'Uncategorized') AS category_name

    FROM transactions t

    LEFT JOIN categories c
      ON t.category_id = c.id

    WHERE t.date >= ? AND t.date <= ?

    ORDER BY t.date DESC, t.id DESC`,
    [startDate, endDate],
  );

  const transactions: ReportTransaction[] = (
    transactionResult.rows as Row[]
  ).map(row => ({
    id: Number(row.id),
    title: String(row.title ?? ''),
    amount: Number(row.amount ?? 0),
    type: row.type as 'income' | 'expense',
    categoryName: String(row.category_name),
    date: String(row.date ?? ''),
  }));

  return {
    summary,
    trends,
    categories,
    transactions,
  };
};
