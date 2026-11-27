import { db, initializeDatabase } from '../database';

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
  payment_method?: string | null;
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
  payment_method?: string | null;
}

export interface UpdateTransaction {
  title?: string;
  amount?: number;
  type?: TransactionType;
  category_id?: number | null;
  date?: string;
  note?: string | null;
  payment_method?: string | null;
}

export interface MonthlySummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  transactionCount: number;
}

export interface DashboardSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

type Row = Record<string, unknown>;
type Params = (string | number | null)[];

const validDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
};

const validateRange = (start: string, end: string) => {
  if (!validDate(start) || !validDate(end) || start > end) {
    throw new Error('Please provide a valid date range.');
  }
};

const mapRow = (r: Row): Transaction => ({
  id: Number(r.id),
  title: String(r.title ?? ''),
  amount: Number(r.amount ?? 0),
  type: r.type as TransactionType,
  category_id: r.category_id == null ? null : Number(r.category_id),
  category_name: r.category_name == null ? null : String(r.category_name),
  date: String(r.date ?? ''),
  note: r.note == null ? null : String(r.note),
  payment_method: r.payment_method == null ? 'cash' : String(r.payment_method),
  created_at: String(r.created_at ?? ''),
  updated_at: String(r.updated_at ?? ''),
});

const validateData = (data: CreateTransaction | UpdateTransaction) => {
  if (typeof data.title !== 'string' || !data.title.trim()) throw new Error('Transaction title is required.');
  if (typeof data.amount !== 'number' || !Number.isFinite(data.amount) || data.amount <= 0) throw new Error('Amount must be greater than zero.');
  if (data.type !== 'income' && data.type !== 'expense') throw new Error('Invalid transaction type.');
  if (data.date && !validDate(data.date)) throw new Error('Date must be a valid YYYY-MM-DD date.');
  if (data.category_id != null && (!Number.isInteger(data.category_id) || data.category_id <= 0)) throw new Error('Invalid category.');
};

const validateCategory = async (categoryId: number | null | undefined, type: TransactionType) => {
  if (categoryId == null) return;
  const result = await db.execute('SELECT id FROM categories WHERE id = ? AND type = ?', [categoryId, type]);
  if (!result.rows[0]) throw new Error('Selected category does not match the transaction type.');
};

const getTotalByType = async (type: TransactionType, startDate?: string, endDate?: string) => {
  await initializeDatabase();
  if ((startDate && !endDate) || (!startDate && endDate)) throw new Error('Both start and end dates are required.');
  let sql = 'SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE type = ?';
  const params: Params = [type];
  if (startDate && endDate) {
    validateRange(startDate, endDate);
    sql += ' AND date >= ? AND date <= ?';
    params.push(startDate, endDate);
  }
  const result = await db.execute(sql, params);
  return Number(result.rows[0]?.total ?? 0);
};

export const addTransaction = async (data: CreateTransaction): Promise<number> => {
  await initializeDatabase();
  validateData({ ...data, date: data.date });
  await validateCategory(data.category_id, data.type);
  const result = await db.execute(
    `INSERT INTO transactions (title, amount, type, category_id, date, note, payment_method)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.title.trim(), data.amount, data.type, data.category_id ?? null, data.date, data.note?.trim() || null, data.payment_method?.trim() || 'cash'],
  );
  if (result.insertId == null) throw new Error('Could not save transaction.');
  return Number(result.insertId);
};

export const getAllTransactions = async (): Promise<Transaction[]> => {
  await initializeDatabase();
  const result = await db.execute(
    `SELECT t.*, c.name AS category_name FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     ORDER BY t.date DESC, t.id DESC`,
  );
  return (result.rows as Row[]).map(mapRow);
};

export const getRecentTransactions = async (limit = 5): Promise<Transaction[]> => {
  await initializeDatabase();
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Limit must be between 1 and 100.');
  const result = await db.execute(
    `SELECT t.*, c.name AS category_name FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     ORDER BY t.date DESC, t.id DESC LIMIT ?`, [limit],
  );
  return (result.rows as Row[]).map(mapRow);
};

export const getTransactionById = async (id: number): Promise<Transaction | null> => {
  await initializeDatabase();
  if (!Number.isInteger(id) || id <= 0) throw new Error('Invalid transaction ID.');
  const result = await db.execute(
    `SELECT t.*, c.name AS category_name FROM transactions t LEFT JOIN categories c ON c.id=t.category_id WHERE t.id=?`, [id],
  );
  return result.rows[0] ? mapRow(result.rows[0] as Row) : null;
};

export const getTransactionsByType = async (type: TransactionType): Promise<Transaction[]> => {
  await initializeDatabase();
  if (type !== 'income' && type !== 'expense') throw new Error('Invalid transaction type.');
  const result = await db.execute('SELECT * FROM transactions WHERE type=? ORDER BY date DESC, id DESC', [type]);
  return (result.rows as Row[]).map(mapRow);
};

export const getTransactionsByDateRange = async (startDate: string, endDate: string): Promise<Transaction[]> => {
  await initializeDatabase(); validateRange(startDate, endDate);
  const result = await db.execute('SELECT * FROM transactions WHERE date>=? AND date<=? ORDER BY date DESC, id DESC', [startDate, endDate]);
  return (result.rows as Row[]).map(mapRow);
};

export const getTransactionsByCategory = async (categoryId: number): Promise<Transaction[]> => {
  await initializeDatabase();
  if (!Number.isInteger(categoryId) || categoryId <= 0) throw new Error('Invalid category ID.');
  const result = await db.execute('SELECT * FROM transactions WHERE category_id=? ORDER BY date DESC, id DESC', [categoryId]);
  return (result.rows as Row[]).map(mapRow);
};

export const searchTransactions = async (searchText: string): Promise<Transaction[]> => {
  await initializeDatabase();
  const term = searchText.trim();
  if (!term) return getAllTransactions();
  const result = await db.execute(
    `SELECT t.*, c.name AS category_name FROM transactions t LEFT JOIN categories c ON c.id=t.category_id
     WHERE t.title LIKE ? COLLATE NOCASE OR COALESCE(t.note,'') LIKE ? COLLATE NOCASE OR COALESCE(c.name,'') LIKE ? COLLATE NOCASE
     ORDER BY t.date DESC, t.id DESC`, [`%${term}%`, `%${term}%`, `%${term}%`],
  );
  return (result.rows as Row[]).map(mapRow);
};

export const updateTransaction = async (id: number, data: UpdateTransaction): Promise<void> => {
  await initializeDatabase();
  const existing = await getTransactionById(id);
  if (!existing) throw new Error('Transaction not found.');
  const updated: CreateTransaction = {
    title: data.title ?? existing.title,
    amount: data.amount ?? existing.amount,
    type: data.type ?? existing.type,
    category_id: data.category_id === undefined ? existing.category_id : data.category_id,
    date: data.date ?? existing.date,
    note: data.note === undefined ? existing.note : data.note,
    payment_method: data.payment_method ?? existing.payment_method ?? 'cash',
  };
  validateData(updated);
  await validateCategory(updated.category_id, updated.type);
  await db.execute(
    `UPDATE transactions SET title=?, amount=?, type=?, category_id=?, date=?, note=?, payment_method=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [updated.title.trim(), updated.amount, updated.type, updated.category_id ?? null, updated.date, updated.note?.trim() || null, updated.payment_method ?? 'cash', id],
  );
};

export const deleteTransaction = async (id: number): Promise<void> => {
  await initializeDatabase();
  if (!Number.isInteger(id) || id <= 0) throw new Error('Invalid transaction ID.');
  const result = await db.execute('DELETE FROM transactions WHERE id=?', [id]);
  if (result.rowsAffected === 0) throw new Error('Transaction not found.');
};

export const getTotalIncome = (startDate?: string, endDate?: string) => getTotalByType('income', startDate, endDate);
export const getTotalExpenses = (startDate?: string, endDate?: string) => getTotalByType('expense', startDate, endDate);

export const getBalance = async (startDate?: string, endDate?: string): Promise<number> => {
  const [income, expenses] = await Promise.all([getTotalIncome(startDate, endDate), getTotalExpenses(startDate, endDate)]);
  return income - expenses;
};

export const getMonthlySummary = async (year: number, month: number): Promise<MonthlySummary> => {
  await initializeDatabase();
  if (!Number.isInteger(year) || year < 1900 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12) throw new Error('Invalid year or month.');
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const next = new Date(year, month, 1);
  const endExclusive = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;
  const result = await db.execute(
    `SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) AS income,
            COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) AS expenses,
            COUNT(*) AS count FROM transactions WHERE date>=? AND date<?`, [start, endExclusive],
  );
  const row = result.rows[0];
  const income = Number(row?.income ?? 0); const expenses = Number(row?.expenses ?? 0);
  return { totalIncome: income, totalExpenses: expenses, balance: income - expenses, transactionCount: Number(row?.count ?? 0) };
};

// Dashboard figures are for the user's local current month. The all-time balance
// is intentionally calculated separately by getBalance() for the balance card.
export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const now = new Date();
  const monthly = await getMonthlySummary(now.getFullYear(), now.getMonth() + 1);
  return { totalIncome: monthly.totalIncome, totalExpense: monthly.totalExpenses, balance: monthly.balance };
};
