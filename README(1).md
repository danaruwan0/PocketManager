# PocketManager – Personal Finance Optimization Patch

Configuration selected:
- Balance display: both all-time balance and current-month totals
- Currency: LKR
- Scope: personal money management

## What is included

This patch contains the complete `src/` folder from the supplied source archive, with the following files updated:

- `src/database/repositories/transactionRepository.ts`
  - Centralized transaction validation and mapping
  - Add, list, search, date/type/category filter, get-by-ID, update and delete
  - Category/type validation
  - All-time income, expense and balance totals
  - Local-calendar monthly summary (avoids SQLite UTC/local-month boundary mismatch)
  - Payment method persistence with a safe `cash` default
- `src/database/database.ts`
  - Additive compatibility migration for `payment_method`
  - Keeps existing transaction rows intact
  - Creates notes and schedules tables inside the shared initialization promise
- `src/screens/finance/Transactions.tsx`
  - Search by title, note or category
  - All / Income / Expenses filters
  - Edit and confirmed-delete actions
- `src/screens/finance/AddTransaction.tsx`
  - Supports both adding and editing an existing transaction
- `src/screens/finance/AddTransactionScreen.tsx` and `src/navigation/AppNavigator.tsx`
  - Pass the optional transaction ID for editing
- `src/compornet/dashboard/BalanceCard.tsx`
  - Shows all-time balance and refreshes whenever the Home screen regains focus
- `src/compornet/dashboard/RecentTransactions.tsx`
  - Refreshes when its screen regains focus
- `src/screens/home/Home.tsx`
  - Displays current-month income and expenses in LKR
- Reports and Add Transaction currency labels changed to LKR
- `App.tsx`
  - Adds a database initialization retry action

## Apply the patch

1. Make a backup of your current project folder first.
2. Extract this ZIP.
3. Copy the included `src` folder into your React Native project and allow it to replace the existing `src` files.
4. Copy the included `App.tsx` into the project root and replace the existing `App.tsx`.
5. Do not replace `package.json`, Android, iOS, Gradle, or native configuration files; this patch does not require new dependencies.
6. From the project root run:

```bash
npm install
npx tsc --noEmit
npx react-native start --reset-cache
```

In another terminal:

```bash
npx react-native run-android
```

## Financial calculation rules

- Total Balance = all recorded income − all recorded expenses.
- Monthly Income = income transactions dated in the current local calendar month.
- Monthly Expenses = expense transactions dated in the current local calendar month.
- Monthly Net = current-month income − current-month expenses.
- Values are displayed in LKR; transaction amounts are stored as numeric values in SQLite.

## Important testing checklist

Use a test profile / test data first, then verify:

1. Add an income transaction (for example LKR 100,000).
2. Add an expense transaction (for example LKR 12,500).
3. Confirm Total Balance is LKR 87,500.
4. Confirm current-month income and expenses are shown separately.
5. Open Transactions, edit the expense, save, and confirm the balance changes.
6. Delete a test transaction and confirm the balance and list update.
7. Close and reopen the app; confirm the saved records remain.
8. Test a transaction dated in the previous month to confirm it affects all-time balance but not current-month totals.

## Scope / limitations

This is a source-level implementation patch for the supplied `src` archive. A full Android/iOS build and device-level SQLite test must still be run in your local React Native environment. Existing budget, savings, debt and notification screens/services were not redesigned in this patch. The app remains an offline, single-user personal finance tracker; it does not connect to bank accounts or perform bank reconciliation.
