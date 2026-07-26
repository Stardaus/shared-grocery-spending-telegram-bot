import { formatMYR } from "./currency.js";
import { formatISOToDDMMYYYY } from "./date.js";

/**
 * Escapes reserved MarkdownV2 characters for Telegram messages.
 * Reserved chars: _ * [ ] ( ) ~ ` > # + - = | { } . !
 */
export function escapeMarkdownV2(text: string): string {
  if (!text) return "";
  return text.replace(/[_*\[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

export interface BudgetSummaryInput {
  activeBudget: {
    id: string;
    amount: number;
    startDate: string;
    endDate: string;
    createdAt: string;
    createdBy: string;
  } | null;
  totalSpent: number;
  remainingBalance: number;
  transactionCount: number;
  isOverBudget: boolean;
}

export interface TransactionInput {
  id: string;
  date: string;
  item: string;
  category: string;
  amount: number;
  purchaserId: string;
  purchaserName: string;
  rawInput: string;
  budgetId: string;
}

export interface LineItemInput {
  item: string;
  amount: number;
  category: string;
}

/**
 * Formats Telegram response card for /summary command.
 */
export function formatBudgetSummaryMessage(summary: BudgetSummaryInput): string {
  if (!summary.activeBudget) {
    return escapeMarkdownV2("⚠️ No active budget window found! Set one using /setbudget <amount> <DD/MM/YYYY_start> <DD/MM/YYYY_end>");
  }

  const startDateFormatted = formatISOToDDMMYYYY(summary.activeBudget.startDate);
  const endDateFormatted = formatISOToDDMMYYYY(summary.activeBudget.endDate);
  const totalAmount = formatMYR(summary.activeBudget.amount);
  const totalSpent = formatMYR(summary.totalSpent);
  const remaining = formatMYR(summary.remainingBalance);

  const statusBadge = summary.isOverBudget
    ? escapeMarkdownV2("🚨 OVER BUDGET!")
    : summary.remainingBalance / summary.activeBudget.amount < 0.15
      ? escapeMarkdownV2("⚠️ Low Balance Warning!")
      : escapeMarkdownV2("✅ On Track");

  const lines = [
    `📊 *Budget Summary*`,
    `📅 Period: ${escapeMarkdownV2(startDateFormatted)} \\- ${escapeMarkdownV2(endDateFormatted)}`,
    `💰 Allocation: ${escapeMarkdownV2(totalAmount)}`,
    `💸 Spent to Date: ${escapeMarkdownV2(totalSpent)} \\(${summary.transactionCount} items\\)`,
    `🏦 Remaining Pool: ${escapeMarkdownV2(remaining)}`,
    ` Status: ${statusBadge}`,
  ];

  return lines.join("\n");
}

/**
 * Formats Telegram confirmation card for quick text expense entries.
 */
export function formatSingleExpenseConfirmation(
  transaction: TransactionInput,
  remainingBalance: number
): string {
  const amountStr = formatMYR(transaction.amount);
  const remainingStr = formatMYR(remainingBalance);

  const lines = [
    `✅ *Expense Logged*`,
    `🛒 Item: ${escapeMarkdownV2(transaction.item)}`,
    `🏷️ Category: ${escapeMarkdownV2(transaction.category)}`,
    `💵 Amount: ${escapeMarkdownV2(amountStr)}`,
    `👤 Purchaser: ${escapeMarkdownV2(transaction.purchaserName)}`,
    `🏦 Remaining Pool: ${escapeMarkdownV2(remainingStr)}`,
  ];

  return lines.join("\n");
}

/**
 * Formats preview card for multi-item receipt verification inline keyboards.
 */
export function formatReceiptVerificationMessage(
  items: LineItemInput[],
  detectedTotal: number,
  mismatchWarning: boolean
): string {
  const header = `🧾 *Receipt Verification Preview*`;
  const mismatchBadge = mismatchWarning ? ` ⚠️ *Total Mismatch Detected\\!*` : "";

  const itemLines = items.map(
    (it, idx) =>
      `\\[${idx + 1}\\] ${escapeMarkdownV2(it.item)} \\| ${escapeMarkdownV2(it.category)} \\| ${escapeMarkdownV2(formatMYR(it.amount))}`
  );

  const totalStr = formatMYR(detectedTotal);

  const lines = [
    `${header}${mismatchBadge}`,
    ``,
    ...itemLines,
    ``,
    `💰 *Detected Total:* ${escapeMarkdownV2(totalStr)}`,
    ` Please confirm or edit the extracted items below:`,
  ];

  return lines.join("\n");
}

/**
 * Formats Telegram response card for /breakdown command.
 */
export function formatCategoryBreakdownReport(
  summary: BudgetSummaryInput,
  transactions: TransactionInput[]
): string {
  if (!summary.activeBudget) {
    return escapeMarkdownV2("⚠️ No active budget window found for category breakdown.");
  }

  const categoryTotals: Record<string, number> = {};
  for (const tx of transactions) {
    categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
  }

  const sortedCategories = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a);

  const breakdownLines = sortedCategories.map(([cat, amount]) => {
    const pct = summary.activeBudget ? Math.round((amount / summary.activeBudget.amount) * 100) : 0;
    return `• *${escapeMarkdownV2(cat)}*: ${escapeMarkdownV2(formatMYR(amount))} \\(${pct}%\\)`;
  });

  const lines = [
    `📈 *Spending Breakdown by Category*`,
    `Period: ${escapeMarkdownV2(formatISOToDDMMYYYY(summary.activeBudget.startDate))} \\- ${escapeMarkdownV2(formatISOToDDMMYYYY(summary.activeBudget.endDate))}`,
    ``,
    ...(breakdownLines.length > 0 ? breakdownLines : [escapeMarkdownV2("No transactions recorded yet.")]),
    ``,
    `Total Spent: ${escapeMarkdownV2(formatMYR(summary.totalSpent))}`,
  ];

  return lines.join("\n");
}
