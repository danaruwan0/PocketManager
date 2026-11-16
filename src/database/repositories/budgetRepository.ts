
import { db, initializeDatabase } from '../database';

export interface BudgetProgress {
  id: number;
  categoryId: number | null;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  isExceeded: boolean;
  month: number;
  year: number;
}

export interface CreateBudget {
  categoryId?: number | null;
  amount: number;
  month: number;
  year: number;
}

// Validate budget details
const validateBudget = (data: CreateBudget): void => {
  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    throw new Error('Budget amount must be greater than zero.');
  }

  if (!Number.isInteger(data.month) || data.month < 1 || data.month > 12) {
    throw new Error('Invalid budget month.');
  }

  if (!Number.isInteger(data.year) || data.year < 2000) {
    throw new Error('Invalid budget year.');
  }

  if (
    data.categoryId !== undefined &&
    data.categoryId !== null &&
    (!Number.isInteger(data.categoryId) || data.categoryId <= 0)
  ) {
    throw new Error('Invalid category ID.');
  }
};

// Get month date range
const getMonthRange = (year: number, month: number) => {
  const monthString = String(month).padStart(2, '0');

  const startDate = `${year}-${monthString}-01`;

  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${monthString}-${String(lastDay).padStart(2, '0')}`;

  return { startDate, endDate };
};

// Create or update a budget
export const saveBudget = async (
  data: CreateBudget,
): Promise<void> => {
  await initializeDatabase();

  validateBudget(data);

  const categoryId = data.categoryId ?? null;

  // Check whether this budget already exists
  const existing = await db.execute(
    `SELECT id
     FROM budgets
     WHERE category_id IS ?
       AND month = ?
       AND year = ?
     LIMIT 1`,
    [categoryId, data.month, data.year],
  );

  if (existing.rows.length > 0) {
    const budgetId = Number(existing.rows[0].id);

    await db.execute(
      `UPDATE budgets
       SET amount = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [data.amount, budgetId],
    );

    return;
  }

  await db.execute(
    `INSERT INTO budgets
      (category_id, amount, month, year)
     VALUES (?, ?, ?, ?)`,
    [categoryId, data.amount, data.month, data.year],
  );
};

// Get budget progress for one category or the overall budget
export const getBudgetProgress = async (
  month: number,
  year: number,
  categoryId?: number | null,
): Promise<BudgetProgress | null> => {
  await initializeDatabase();

  const budgetResult = await db.execute(
    `SELECT *
     FROM budgets
     WHERE category_id IS ?
       AND month = ?
       AND year = ?
     LIMIT 1`,
    [categoryId ?? null, month, year],
  );

  const budget = budgetResult.rows[0];

  if (!budget) {
    return null;
  }

  const { startDate, endDate } = getMonthRange(year, month);

  let expenseQuery = `
    SELECT COALESCE(SUM(amount), 0) AS spent
    FROM transactions
    WHERE type = 'expense'
      AND date >= ?
      AND date <= ?
  `;

  const params: (string | number)[] = [startDate, endDate];

  if (categoryId !== undefined && categoryId !== null) {
    expenseQuery += ' AND category_id = ?';
    params.push(categoryId);
  }

  const expenseResult = await db.execute(expenseQuery, params);

  const amount = Number(budget.amount);
  const spent = Number(expenseResult.rows[0]?.spent ?? 0);
  const remaining = amount - spent;

  const percentage =
    amount > 0 ? (spent / amount) * 100 : 0;

  return {
    id: Number(budget.id),
    categoryId:
      budget.category_id === null
        ? null
        : Number(budget.category_id),
    amount,
    spent,
    remaining,
    percentage: Math.round(percentage * 100) / 100,
    isExceeded: spent > amount,
    month: Number(budget.month),
    year: Number(budget.year),
  };
};

// Get all budgets for a selected month
export const getMonthlyBudgets = async (
  month: number,
  year: number,
): Promise<BudgetProgress[]> => {
  await initializeDatabase();

  const result = await db.execute(
    `SELECT *
     FROM budgets
     WHERE month = ? AND year = ?
     ORDER BY category_id IS NOT NULL, category_id`,
    [month, year],
  );

  const budgets = result.rows;

  const progressList = await Promise.all(
    budgets.map(async budget => {
      return getBudgetProgress(
        month,
        year,
        budget.category_id === null
          ? null
          : Number(budget.category_id),
      );
    }),
  );

  return progressList.filter(
    (item): item is BudgetProgress => item !== null,
  );
};

// Get current month's overall budget
export const getCurrentMonthlyBudget = async (): Promise<BudgetProgress | null> => {
  const today = new Date();

  return getBudgetProgress(
    today.getMonth() + 1,
    today.getFullYear(),
    null,
  );
};

// Get current month's category budget
export const getCurrentCategoryBudget = async (
  categoryId: number,
): Promise<BudgetProgress | null> => {
  const today = new Date();

  return getBudgetProgress(
    today.getMonth() + 1,
    today.getFullYear(),
    categoryId,
  );
};

// Delete a budget
export const deleteBudget = async (
  id: number,
): Promise<void> => {
  await initializeDatabase();

  await db.execute(
    'DELETE FROM budgets WHERE id = ?',
    [id],
  );
};
