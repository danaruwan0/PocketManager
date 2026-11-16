
import * as XLSX from 'xlsx';
import { Dirs, FileSystem } from 'react-native-file-access';
import Share from 'react-native-share';
import { generatePDF } from 'react-native-html-to-pdf';

import { ReportData } from '../database/repositories/reportRepository';

interface ExportOptions {
  data: ReportData;
  startDate: string;
  endDate: string;
}

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const formatAmount = (value: number): string => {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// ==========================================
// EXCEL EXPORT
// ==========================================

export const exportExcel = async ({
  data,
  startDate,
  endDate,
}: ExportOptions): Promise<void> => {
  const summaryRows = [
    ['POCKETMANAGER - FINANCIAL REPORT'],
    ['Report Period', `${startDate} to ${endDate}`],
    [],
    ['Financial Summary', 'Amount (LKR)'],
    ['Total Income', data.summary.totalIncome],
    ['Total Expenses', data.summary.totalExpenses],
    ['Net Balance', data.summary.balance],
    ['Transaction Count', data.summary.transactionCount],
  ];

  const transactionRows = [
    ['ID', 'Title', 'Type', 'Category', 'Date', 'Amount (LKR)'],
    ...data.transactions.map(item => [
      item.id,
      item.title,
      item.type,
      item.categoryName,
      item.date,
      item.amount,
    ]),
  ];

  const categoryRows = [
    ['Expense Category', 'Total Amount (LKR)', 'Transactions'],
    ...data.categories.map(item => [
      item.categoryName,
      item.totalAmount,
      item.transactionCount,
    ]),
  ];

  const trendRows = [
    ['Period', 'Income (LKR)', 'Expenses (LKR)'],
    ...data.trends.map(item => [
      item.label,
      item.income,
      item.expenses,
    ]),
  ];

  const workbook = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  const transactionSheet = XLSX.utils.aoa_to_sheet(transactionRows);
  const categorySheet = XLSX.utils.aoa_to_sheet(categoryRows);
  const trendSheet = XLSX.utils.aoa_to_sheet(trendRows);

  summarySheet['!cols'] = [
    { wch: 28 },
    { wch: 25 },
  ];

  transactionSheet['!cols'] = [
    { wch: 10 },
    { wch: 25 },
    { wch: 14 },
    { wch: 20 },
    { wch: 15 },
    { wch: 20 },
  ];

  categorySheet['!cols'] = [
    { wch: 25 },
    { wch: 22 },
    { wch: 18 },
  ];

  trendSheet['!cols'] = [
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(
    workbook,
    summarySheet,
    'Summary',
  );

  XLSX.utils.book_append_sheet(
    workbook,
    transactionSheet,
    'Transactions',
  );

  XLSX.utils.book_append_sheet(
    workbook,
    categorySheet,
    'Categories',
  );

  XLSX.utils.book_append_sheet(
    workbook,
    trendSheet,
    'Trends',
  );

  const base64 = XLSX.write(workbook, {
    type: 'base64',
    bookType: 'xlsx',
  });

  const fileName = `PocketManager_Report_${startDate}_${endDate}.xlsx`;

  const filePath = `${Dirs.CacheDir}/${fileName}`;

  await FileSystem.writeFile(filePath, base64, 'base64');

  await Share.open({
    url: `file://${filePath}`,
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: fileName,
    title: 'Share Excel Report',
    failOnCancel: false,
  });
};

// ==========================================
// PDF EXPORT
// ==========================================

export const exportPDF = async ({
  data,
  startDate,
  endDate,
}: ExportOptions): Promise<void> => {
  const transactionHtml = data.transactions
    .map(
      item => `
        <tr>
          <td>${escapeHtml(item.title)}</td>
          <td>${escapeHtml(item.categoryName)}</td>
          <td>${escapeHtml(item.date)}</td>
          <td class="${item.type}">
            ${item.type === 'income' ? '+' : '-'}
            Rs. ${formatAmount(item.amount)}
          </td>
        </tr>
      `,
    )
    .join('');

  const categoryHtml = data.categories
    .map(
      item => `
        <tr>
          <td>${escapeHtml(item.categoryName)}</td>
          <td>Rs. ${formatAmount(item.totalAmount)}</td>
          <td>${item.transactionCount}</td>
        </tr>
      `,
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #172235;
            padding: 24px;
            font-size: 12px;
          }

          h1 {
            color: #2563EB;
            font-size: 25px;
            margin-bottom: 5px;
          }

          h2 {
            margin-top: 30px;
            font-size: 17px;
            color: #172235;
          }

          .subtitle {
            color: #64748B;
            margin-bottom: 25px;
          }

          .summary {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }

          .summary td {
            padding: 12px;
            border: 1px solid #E2E8F0;
          }

          .income {
            color: #16A34A;
            font-weight: bold;
          }

          .expense {
            color: #DC2626;
            font-weight: bold;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }

          th {
            background: #172235;
            color: white;
            text-align: left;
            padding: 10px 7px;
          }

          td {
            padding: 9px 7px;
            border-bottom: 1px solid #E2E8F0;
          }

          .footer {
            margin-top: 35px;
            text-align: center;
            color: #64748B;
            font-size: 10px;
          }
        </style>
      </head>

      <body>
        <h1>PocketManager</h1>

        <div class="subtitle">
          Financial Report<br />
          Period: ${escapeHtml(startDate)} to ${escapeHtml(endDate)}
        </div>

        <h2>Financial Summary</h2>

        <table class="summary">
          <tr>
            <td>Total Income</td>
            <td class="income">
              Rs. ${formatAmount(data.summary.totalIncome)}
            </td>
          </tr>

          <tr>
            <td>Total Expenses</td>
            <td class="expense">
              Rs. ${formatAmount(data.summary.totalExpenses)}
            </td>
          </tr>

          <tr>
            <td>Net Balance</td>
            <td>
              Rs. ${formatAmount(data.summary.balance)}
            </td>
          </tr>

          <tr>
            <td>Total Transactions</td>
            <td>${data.summary.transactionCount}</td>
          </tr>
        </table>

        <h2>Expense Categories</h2>

        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Amount</th>
              <th>Transactions</th>
            </tr>
          </thead>

          <tbody>
            ${categoryHtml || '<tr><td colspan="3">No expense categories</td></tr>'}
          </tbody>
        </table>

        <h2>Transaction Details</h2>

        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Date</th>
              <th>Amount</th>
            </tr>
          </thead>

          <tbody>
            ${transactionHtml || '<tr><td colspan="4">No transactions</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          Generated by PocketManager
        </div>
      </body>
    </html>
  `;

  const fileName = `PocketManager_Report_${startDate}_${endDate}`;

  const result = await generatePDF({
    html,
    fileName,
    base64: false,
  });

  if (!result.filePath) {
    throw new Error('PDF file could not be generated.');
  }

  const filePath = result.filePath;

  await Share.open({
    url: filePath.startsWith('file://')
      ? filePath
      : `file://${filePath}`,
    type: 'application/pdf',
    filename: `${fileName}.pdf`,
    title: 'Share PDF Report',
    failOnCancel: false,
  });
};
