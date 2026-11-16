
import { db, initializeDatabase } from '../database';

// =====================================================
// TYPES
// =====================================================

export type TransactionType = 'income' | 'expense';

export interface Transaction {
    id: number;
    title: string;
    amount: number;
    type: TransactionType;
    category_id: number | null;
    category_name?: string | null;
    date: string;
    note: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateTransaction {
    title: string;
    amount: number;
    type: TransactionType;
    category_id?: number | null;
    date: string;
    note?: string | null;
}

export interface UpdateTransaction {
    title?: string;
    amount?: number;
    type?: TransactionType;
    category_id?: number | null;
    date?: string;
    note?: string | null;
}

export interface MonthlySummary {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    transactionCount: number;
}

type TransactionRow = Record<string, unknown>;

type QueryParams = (string | number | null)[];

// =====================================================
// HELPERS
// =====================================================

const mapTransaction = (row: TransactionRow): Transaction => ({
    id: Number(row.id),
    title: String(row.title ?? ''),
    amount: Number(row.amount ?? 0),
    type: row.type as TransactionType,
    category_id: row.category_id == null ? null : Number(row.category_id),
    date: String(row.date ?? ''),
    note: row.note == null ? null : String(row.note),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
    category_name: row.category_name == null ? null : String(row.category_name),
});

const mapRows = (rows: TransactionRow[]): Transaction[] =>
    rows.map(mapTransaction);

const isValidDate = (date: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return false;
    }

    const [year, month, day] = date.split('-').map(Number);

    const parsed = new Date(Date.UTC(year, month - 1, day));

    return (
        parsed.getUTCFullYear() === year &&
        parsed.getUTCMonth() === month - 1 &&
        parsed.getUTCDate() === day
    );
};

const validateTransaction = (
    data: CreateTransaction | UpdateTransaction,
): void => {
    if (!data.title || !data.title.trim()) {
        throw new Error('Transaction title is required.');
    }

    if (
        data.amount === undefined ||
        !Number.isFinite(data.amount) ||
        data.amount <= 0
    ) {
        throw new Error('Enter a valid amount greater than zero.');
    }

    if (!['income', 'expense'].includes(data.type ?? '')) {
        throw new Error('Invalid transaction type.');
    }

    if (
        data.category_id !== undefined &&
        data.category_id !== null &&
        (!Number.isInteger(data.category_id) || data.category_id <= 0)
    ) {
        throw new Error('Invalid category selected.');
    }

    if (!data.date || !isValidDate(data.date)) {
        throw new Error('Enter a valid date in YYYY-MM-DD format.');
    }

    if (data.note != null && typeof data.note !== 'string') {
        throw new Error('Invalid transaction note.');
    }
};

const validateDateRange = (
    startDate: string,
    endDate: string,
): void => {
    if (!isValidDate(startDate) || !isValidDate(endDate)) {
        throw new Error('Invalid date range.');
    }

    if (startDate > endDate) {
        throw new Error('Start date cannot be after end date.');
    }
};

const validateCategory = async (
    categoryId: number | null | undefined,
    type: TransactionType,
): Promise<void> => {
    if (categoryId == null) {
        return;
    }

    const result = await db.execute(
        `SELECT id
     FROM categories
     WHERE id = ? AND type = ?`,
        [categoryId, type],
    );

    if (!result.rows[0]) {
        throw new Error(
            'Selected category does not match the transaction type.',
        );
    }
};

const getTotalByType = async (
    type: TransactionType,
    startDate?: string,
    endDate?: string,
): Promise<number> => {
    await initializeDatabase();

    if ((startDate && !endDate) || (!startDate && endDate)) {
        throw new Error('Both start date and end date are required.');
    }

    let query = `
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM transactions
    WHERE type = ?
  `;

    const params: QueryParams = [type];

    if (startDate && endDate) {
        validateDateRange(startDate, endDate);

        query += ` AND date >= ? AND date <= ?`;
        params.push(startDate, endDate);
    }

    const result = await db.execute(query, params);

    return Number(result.rows[0]?.total ?? 0);
};

// =====================================================
// CREATE TRANSACTION
// =====================================================

export const addTransaction = async (
    data: CreateTransaction,
): Promise<number> => {
    await initializeDatabase();

    const transaction: CreateTransaction = {
        ...data,
        category_id: data.category_id ?? null,
    };

    validateTransaction(transaction);

    await validateCategory(
        transaction.category_id,
        transaction.type,
    );

    const result = await db.execute(
        `INSERT INTO transactions (
      title,
      amount,
      type,
      category_id,
      date,
      note
    )
    VALUES (?, ?, ?, ?, ?, ?)`,
        [
            transaction.title.trim(),
            transaction.amount,
            transaction.type,
            transaction.category_id ?? null,
            transaction.date,
            transaction.note?.trim() || null,
        ],
    );

    if (result.insertId === undefined) {
        throw new Error('Failed to create transaction.');
    }

    return result.insertId;
};

// =====================================================
// GET ALL TRANSACTIONS
// =====================================================

export const getAllTransactions = async (): Promise<Transaction[]> => {
    await initializeDatabase();

    const result = await db.execute(
        `SELECT *
     FROM transactions
     ORDER BY date DESC, id DESC`,
    );

    return mapRows(result.rows as TransactionRow[]);
};

// =====================================================
// GET RECENT TRANSACTIONS
// =====================================================

export const getRecentTransactions = async (
    limit: number = 5,
): Promise<Transaction[]> => {
    await initializeDatabase();

    if (!Number.isInteger(limit) || limit < 1) {
        throw new Error('Limit must be a positive integer.');
    }

    const result = await db.execute(
        `SELECT
       t.*,
       c.name AS category_name
     FROM transactions t
     LEFT JOIN categories c
       ON t.category_id = c.id
     ORDER BY t.date DESC, t.id DESC
     LIMIT ?`,
        [limit],
    );

    return mapRows(result.rows as TransactionRow[]);
};

// =====================================================
// GET TRANSACTION BY ID
// =====================================================

export const getTransactionById = async (
    id: number,
): Promise<Transaction | null> => {
    await initializeDatabase();

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error('Invalid transaction ID.');
    }

    const result = await db.execute(
        `SELECT *
     FROM transactions
     WHERE id = ?`,
        [id],
    );

    const row = result.rows[0];

    return row
        ? mapTransaction(row as TransactionRow)
        : null;
};

// =====================================================
// GET TRANSACTIONS BY TYPE
// =====================================================

export const getTransactionsByType = async (
    type: TransactionType,
): Promise<Transaction[]> => {
    await initializeDatabase();

    if (!['income', 'expense'].includes(type)) {
        throw new Error('Invalid transaction type.');
    }

    const result = await db.execute(
        `SELECT *
     FROM transactions
     WHERE type = ?
     ORDER BY date DESC, id DESC`,
        [type],
    );

    return mapRows(result.rows as TransactionRow[]);
};

// =====================================================
// GET TRANSACTIONS BY DATE RANGE
// End date is inclusive.
// =====================================================

export const getTransactionsByDateRange = async (
    startDate: string,
    endDate: string,
): Promise<Transaction[]> => {
    await initializeDatabase();

    validateDateRange(startDate, endDate);

    const result = await db.execute(
        `SELECT *
     FROM transactions
     WHERE date >= ? AND date <= ?
     ORDER BY date DESC, id DESC`,
        [startDate, endDate],
    );

    return mapRows(result.rows as TransactionRow[]);
};

// =====================================================
// GET TRANSACTIONS BY CATEGORY
// =====================================================

export const getTransactionsByCategory = async (
    categoryId: number,
): Promise<Transaction[]> => {
    await initializeDatabase();

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
        throw new Error('Invalid category ID.');
    }

    const result = await db.execute(
        `SELECT *
     FROM transactions
     WHERE category_id = ?
     ORDER BY date DESC, id DESC`,
        [categoryId],
    );

    return mapRows(result.rows as TransactionRow[]);
};

// =====================================================
// SEARCH TRANSACTIONS
// Searches title and note.
// =====================================================

export const searchTransactions = async (
    searchText: string,
): Promise<Transaction[]> => {
    await initializeDatabase();

    const search = searchText.trim();

    if (!search) {
        return getAllTransactions();
    }

    const result = await db.execute(
        `SELECT *
     FROM transactions
     WHERE title LIKE ? COLLATE NOCASE
        OR note LIKE ? COLLATE NOCASE
     ORDER BY date DESC, id DESC`,
        [`%${search}%`, `%${search}%`],
    );

    return mapRows(result.rows as TransactionRow[]);
};

// =====================================================
// UPDATE TRANSACTION
// =====================================================

export const updateTransaction = async (
    id: number,
    data: UpdateTransaction,
): Promise<void> => {
    await initializeDatabase();

    const existing = await getTransactionById(id);

    if (!existing) {
        throw new Error('Transaction not found.');
    }

    const updated: Transaction = {
        ...existing,
        title: data.title ?? existing.title,
        amount: data.amount ?? existing.amount,
        type: data.type ?? existing.type,
        category_id:
            data.category_id === undefined
                ? existing.category_id
                : data.category_id,
        date: data.date ?? existing.date,
        note:
            data.note === undefined
                ? existing.note
                : data.note,
    };

    validateTransaction(updated);

    await validateCategory(
        updated.category_id,
        updated.type,
    );

    await db.execute(
        `UPDATE transactions
     SET title = ?,
         amount = ?,
         type = ?,
         category_id = ?,
         date = ?,
         note = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
        [
            updated.title.trim(),
            updated.amount,
            updated.type,
            updated.category_id,
            updated.date,
            updated.note?.trim() || null,
            id,
        ],
    );
};

// =====================================================
// DELETE TRANSACTION
// =====================================================

export const deleteTransaction = async (
    id: number,
): Promise<void> => {
    await initializeDatabase();

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error('Invalid transaction ID.');
    }

    const existing = await getTransactionById(id);

    if (!existing) {
        throw new Error('Transaction not found.');
    }

    await db.execute(
        `DELETE FROM transactions
     WHERE id = ?`,
        [id],
    );
};

// =====================================================
// TOTAL INCOME
// =====================================================

export const getTotalIncome = async (
    startDate?: string,
    endDate?: string,
): Promise<number> => {
    return getTotalByType('income', startDate, endDate);
};

// =====================================================
// TOTAL EXPENSES
// =====================================================

export const getTotalExpenses = async (
    startDate?: string,
    endDate?: string,
): Promise<number> => {
    return getTotalByType('expense', startDate, endDate);
};

// =====================================================
// BALANCE
// =====================================================

export const getBalance = async (
    startDate?: string,
    endDate?: string,
): Promise<number> => {
    const [income, expenses] = await Promise.all([
        getTotalIncome(startDate, endDate),
        getTotalExpenses(startDate, endDate),
    ]);

    return income - expenses;
};

// =====================================================
// MONTHLY SUMMARY
// month must be 1-12.
// =====================================================

export const getMonthlySummary = async (
    year: number,
    month: number,
): Promise<MonthlySummary> => {
    await initializeDatabase();

    if (
        !Number.isInteger(year) ||
        year < 1900 ||
        year > 9999 ||
        !Number.isInteger(month) ||
        month < 1 ||
        month > 12
    ) {
        throw new Error('Invalid year or month.');
    }

    const monthString = String(month).padStart(2, '0');
    const startDate = `${year}-${monthString}-01`;

    const nextMonthDate = new Date(year, month, 1);

    const nextYear = nextMonthDate.getFullYear();
    const nextMonth = String(
        nextMonthDate.getMonth() + 1,
    ).padStart(2, '0');

    const endDateExclusive = `${nextYear}-${nextMonth}-01`;

    const result = await db.execute(
        `SELECT
       COALESCE(
         SUM(CASE
           WHEN type = 'income' THEN amount
           ELSE 0
         END),
         0
       ) AS total_income,

       COALESCE(
         SUM(CASE
           WHEN type = 'expense' THEN amount
           ELSE 0
         END),
         0
       ) AS total_expenses,

       COUNT(*) AS transaction_count

     FROM transactions
     WHERE date >= ?
       AND date < ?`,
        [startDate, endDateExclusive],
    );

    const summary = result.rows[0];

    const income = Number(summary?.total_income ?? 0);
    const expenses = Number(summary?.total_expenses ?? 0);

    return {
        totalIncome: income,
        totalExpenses: expenses,
        balance: income - expenses,
        transactionCount: Number(
            summary?.transaction_count ?? 0,
        ),
    };
};


export interface DashboardSummary {
    totalIncome: number;
    totalExpense: number;
    balance: number;
}

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  await initializeDatabase();

  const result = await db.execute(`
    SELECT
      COALESCE(SUM(CASE
        WHEN type = 'income' THEN amount
        ELSE 0
      END), 0) AS totalIncome,

      COALESCE(SUM(CASE
        WHEN type = 'expense' THEN amount
        ELSE 0
      END), 0) AS totalExpense

    FROM transactions
    WHERE strftime('%Y-%m', date) =
          strftime('%Y-%m', 'now', 'localtime')
  `);

  const row = result.rows?.[0] as
    | { totalIncome: number; totalExpense: number }
    | undefined;

  const totalIncome = Number(row?.totalIncome ?? 0);
  const totalExpense = Number(row?.totalExpense ?? 0);

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
  };
};