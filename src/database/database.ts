import { open } from '@op-engineering/op-sqlite';

export const db = open({
  name: 'pocketmanager.sqlite',
});

let initializationPromise: Promise<void> | null = null;

// --------------------------------------------------
// DATABASE SCHEMA
// --------------------------------------------------

const schema = [
  `CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    occupation TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'LKR',
    monthly_income REAL NOT NULL DEFAULT 0,
    profile_image TEXT DEFAULT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,

  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    occupation TEXT DEFAULT 'all',
    is_custom INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, type, occupation)
  )`,

  `CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    category_id INTEGER,
    note TEXT,
    payment_method TEXT DEFAULT 'cash',
    date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(category_id) REFERENCES categories(id)
      ON DELETE SET NULL
  )`,

  `CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    amount REAL NOT NULL CHECK(amount > 0),
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(category_id) REFERENCES categories(id)
      ON DELETE SET NULL
  )`,

  `CREATE TABLE IF NOT EXISTS savings_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    target_amount REAL NOT NULL CHECK(target_amount > 0),
    current_amount REAL NOT NULL DEFAULT 0,
    target_date TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS savings_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    entry_type TEXT NOT NULL CHECK(entry_type IN ('deposit', 'withdraw')),
    entry_date TEXT NOT NULL,
    note TEXT,
    FOREIGN KEY(goal_id) REFERENCES savings_goals(id)
      ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS deposits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    institution TEXT NOT NULL,
    account_name TEXT,
    amount REAL NOT NULL CHECK(amount > 0),
    deposit_type TEXT NOT NULL DEFAULT 'bank',
    interest_rate REAL DEFAULT 0,
    start_date TEXT NOT NULL,
    maturity_date TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS debts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_name TEXT NOT NULL,
    title TEXT NOT NULL,
    debt_type TEXT NOT NULL CHECK(debt_type IN ('borrowed', 'lent')),
    principal REAL NOT NULL CHECK(principal > 0),
    remaining_amount REAL NOT NULL CHECK(remaining_amount >= 0),
    interest_rate REAL DEFAULT 0,
    due_date TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS debt_repayments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    debt_id INTEGER NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    payment_date TEXT NOT NULL,
    note TEXT,
    FOREIGN KEY(debt_id) REFERENCES debts(id)
      ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS business_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    activity_type TEXT NOT NULL DEFAULT 'general',
    description TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS business_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    record_type TEXT NOT NULL CHECK(record_type IN ('revenue', 'cost')),
    amount REAL NOT NULL CHECK(amount > 0),
    record_date TEXT NOT NULL,
    note TEXT,
    FOREIGN KEY(activity_id) REFERENCES business_activities(id)
      ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
];

// --------------------------------------------------
// DEFAULT CATEGORIES
// --------------------------------------------------

const defaultCategories = [
  ['Salary', 'income', 'employee'],
  ['Bonus', 'income', 'employee'],
  ['Allowance', 'income', 'student'],
  ['Scholarship', 'income', 'student'],
  ['Part-time Job', 'income', 'student'],
  ['Crop Sales', 'income', 'farmer'],
  ['Harvest', 'income', 'farmer'],
  ['Livestock', 'income', 'farmer'],
  ['Fish Sales', 'income', 'fisherman'],
  ['Business Sales', 'income', 'business'],
  ['Freelance', 'income', 'all'],
  ['Other Income', 'income', 'all'],

  ['Breakfast', 'expense', 'all'],
  ['Lunch', 'expense', 'all'],
  ['Dinner', 'expense', 'all'],
  ['Snacks', 'expense', 'all'],
  ['Transport', 'expense', 'all'],
  ['Education', 'expense', 'student'],
  ['Healthcare', 'expense', 'all'],
  ['Rent', 'expense', 'all'],
  ['Electricity', 'expense', 'all'],
  ['Water', 'expense', 'all'],
  ['Internet', 'expense', 'all'],
  ['Shopping', 'expense', 'all'],
  ['Entertainment', 'expense', 'all'],
  ['Seeds', 'expense', 'farmer'],
  ['Fertilizer', 'expense', 'farmer'],
  ['Labour', 'expense', 'farmer'],
  ['Fishing Equipment', 'expense', 'fisherman'],
  ['Business Costs', 'expense', 'business'],
  ['Other Expense', 'expense', 'all'],
] as const;

// --------------------------------------------------
// MIGRATION HELPERS
// --------------------------------------------------

const getColumns = async (table: string): Promise<string[]> => {
  const result = await db.execute(`PRAGMA table_info(${table})`);

  return result.rows.map(row => String(row.name));
};

// --------------------------------------------------
// MIGRATION VERSION 2
// --------------------------------------------------

const migrateToVersion2 = async (): Promise<void> => {
  await db.execute('BEGIN TRANSACTION');

  try {
    // Fix transaction columns
    const transactionColumns = await getColumns('transactions');

    if (
      transactionColumns.includes('transaction_date') &&
      !transactionColumns.includes('date')
    ) {
      await db.execute(
        'ALTER TABLE transactions RENAME COLUMN transaction_date TO date',
      );
    }

    if (
      transactionColumns.includes('description') &&
      !transactionColumns.includes('note')
    ) {
      await db.execute(
        'ALTER TABLE transactions RENAME COLUMN description TO note',
      );
    }

    const updatedTransactionColumns = await getColumns('transactions');

    if (!updatedTransactionColumns.includes('updated_at')) {
      await db.execute(
        'ALTER TABLE transactions ADD COLUMN updated_at TEXT',
      );

      await db.execute(
        `UPDATE transactions
         SET updated_at = CURRENT_TIMESTAMP
         WHERE updated_at IS NULL`,
      );
    }

    // Fix old budget structure
    const budgetColumns = await getColumns('budgets');

    if (
      budgetColumns.includes('start_date') &&
      !budgetColumns.includes('month')
    ) {
      await db.execute(`
        CREATE TABLE budgets_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category_id INTEGER,
          amount REAL NOT NULL CHECK(amount > 0),
          month INTEGER NOT NULL,
          year INTEGER NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(category_id) REFERENCES categories(id)
            ON DELETE SET NULL
        )
      `);

      await db.execute(`
        INSERT INTO budgets_new
          (id, category_id, amount, month, year, created_at)
        SELECT
          id,
          category_id,
          amount,
          CAST(strftime('%m', start_date) AS INTEGER),
          CAST(strftime('%Y', start_date) AS INTEGER),
          COALESCE(created_at, CURRENT_TIMESTAMP)
        FROM budgets
        WHERE start_date IS NOT NULL
      `);

      await db.execute('DROP TABLE budgets');

      await db.execute(
        'ALTER TABLE budgets_new RENAME TO budgets',
      );
    } else if (!budgetColumns.includes('updated_at')) {
      await db.execute(
        'ALTER TABLE budgets ADD COLUMN updated_at TEXT',
      );

      await db.execute(`
        UPDATE budgets
        SET updated_at = CURRENT_TIMESTAMP
        WHERE updated_at IS NULL
      `);
    }

    await db.execute(
      'INSERT INTO schema_migrations (version) VALUES (2)',
    );

    await db.execute('COMMIT');
  } catch (error) {
    await db.execute('ROLLBACK');
    throw error;
  }
};




// --------------------------------------------------
// MIGRATION VERSION 3 - PROFILE IMAGE
// --------------------------------------------------

const migrateToVersion3 = async (): Promise<void> => {
  await db.execute('BEGIN TRANSACTION');

  try {
    const profileColumns = await getColumns('user_profile');

    if (!profileColumns.includes('profile_image')) {
      await db.execute(
        'ALTER TABLE user_profile ADD COLUMN profile_image TEXT DEFAULT NULL',
      );
    }

    await db.execute(
      'UPDATE user_profile SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL',
    );

    await db.execute(
      'INSERT INTO schema_migrations (version) VALUES (3)',
    );

    await db.execute('COMMIT');

    console.log('Database migration v3 completed');
  } catch (error) {
    await db.execute('ROLLBACK');
    throw error;
  }
};



// --------------------------------------------------
// DATABASE INITIALIZATION
// --------------------------------------------------

export const initializeDatabase = async (): Promise<void> => {



  await db.execute(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    is_shopping_list INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

  await db.execute(`
  CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    event_date TEXT NOT NULL,
    notification_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);


  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      await db.execute('PRAGMA foreign_keys = ON');

      for (const sql of schema) {
        await db.execute(sql);
      }

      const versionResult = await db.execute(
        'SELECT MAX(version) AS version FROM schema_migrations',
      );

      const currentVersion = Number(
        versionResult.rows[0]?.version ?? 0,
      );

      // Version 1: Seed default categories
      if (currentVersion < 1) {
        for (const [name, type, occupation] of defaultCategories) {
          await db.execute(
            `INSERT OR IGNORE INTO categories
              (name, type, occupation, is_custom)
             VALUES (?, ?, ?, 0)`,
            [name, type, occupation],
          );
        }

        await db.execute(
          'INSERT INTO schema_migrations (version) VALUES (1)',
        );
      }




      // Version 2: Align repository and database columns
      const latestVersionResult = await db.execute(
        'SELECT MAX(version) AS version FROM schema_migrations',
      );

      const latestVersion = Number(
        latestVersionResult.rows[0]?.version ?? 0,
      );

      if (latestVersion < 2) {
        await migrateToVersion2();
      }



      // Version 3: Add profile image support

      const version3Result = await db.execute(
        'SELECT MAX(version) AS version FROM schema_migrations',
      );

      const version3 = Number(
        version3Result.rows[0]?.version ?? 0,
      );

      if (version3 < 3) {
        await migrateToVersion3();
      }



      // Indexes
      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)',
      );

      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)',
      );

      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id)',
      );

      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_business_records_date ON business_records(record_date)',
      );

      console.log('PocketManager database initialized successfully');
    } catch (error) {
      initializationPromise = null;
      console.error('Database initialization failed:', error);
      throw error;
    }
  })();

  return initializationPromise;
};