
/* ========================================
   POCKET MANAGER - FINANCE TYPES
======================================== */

// Transaction types
export type TransactionType = 'income' | 'expense';

// User occupations
export type Occupation =
  | 'student'
  | 'employee'
  | 'farmer'
  | 'fisherman'
  | 'business'
  | 'unemployed'
  | 'other';

// Category types
export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  occupation: Occupation;
  is_custom: number;
  created_at: string;
}

// Transaction types
export interface Transaction {
  id: number;
  title: string;
  amount: number;
  type: TransactionType;
  category_id: number;
  date: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

// Create transaction
export interface CreateTransaction {
  title: string;
  amount: number;
  type: TransactionType;
  category_id: number;
  date: string;
  note?: string;
}

// Update transaction
export interface UpdateTransaction {
  title?: string;
  amount?: number;
  type?: TransactionType;
  category_id?: number;
  date?: string;
  note?: string | null;
}

// Finance summary
export interface FinanceSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  transactionCount: number;
}

// Expense statistics
export interface ExpenseStatistics {
  averageExpense: number;
  highestExpense: number;
  lowestExpense: number;
  expenseCount: number;
}

// Category expense summary
export interface CategoryExpense {
  categoryId: number;
  totalAmount: number;
  transactionCount: number;
}

// Dashboard summary
export interface DashboardSummary {
  monthly: FinanceSummary;
  today: FinanceSummary;
  weekly: FinanceSummary;
  expenseStatistics: ExpenseStatistics;
  highestExpenseCategory: CategoryExpense | null;
}

// Budget
export interface Budget {
  id: number;
  category_id: number | null;
  amount: number;
  month: number;
  year: number;
  created_at: string;
  updated_at: string;
}

// Create budget
export interface CreateBudget {
  category_id?: number | null;
  amount: number;
  month: number;
  year: number;
}

// Savings goal
export interface SavingsGoal {
  id: number;
  name: string;
  target_amount: number;
  saved_amount: number;
  target_date: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

// Create savings goal
export interface CreateSavingsGoal {
  name: string;
  target_amount: number;
  target_date?: string | null;
  note?: string | null;
}

// Savings entry
export interface SavingsEntry {
  id: number;
  goal_id: number;
  amount: number;
  date: string;
  note: string | null;
  created_at: string;
}

// Deposit
export interface Deposit {
  id: number;
  title: string;
  amount: number;
  deposit_type: string;
  date: string;
  note: string | null;
  created_at: string;
}

// Debt
export interface Debt {
  id: number;
  person_name: string;
  amount: number;
  paid_amount: number;
  debt_type: 'borrowed' | 'lent';
  due_date: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

// Debt repayment
export interface DebtRepayment {
  id: number;
  debt_id: number;
  amount: number;
  date: string;
  note: string | null;
  created_at: string;
}

// Business activity
export interface BusinessActivity {
  id: number;
  name: string;
  activity_type: string;
  note: string | null;
  created_at: string;
}

// Business record
export interface BusinessRecord {
  id: number;
  activity_id: number | null;
  title: string;
  amount: number;
  record_type: 'income' | 'expense';
  date: string;
  note: string | null;
  created_at: string;
}

// Common date filter
export interface DateRange {
  startDate: string;
  endDate: string;
}

// Report period
export type ReportPeriod =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'custom';

// Financial report
export interface FinancialReport {
  period: ReportPeriod;
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  transactionCount: number;
}

// API-independent local app settings
export interface FinanceSettings {
  currency: string;
  occupation: Occupation;
  monthlyBudget?: number;
}
