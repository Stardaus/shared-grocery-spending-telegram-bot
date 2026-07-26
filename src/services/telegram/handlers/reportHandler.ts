import { Context } from "grammy";
import { IBudgetRepository } from "../../sheets/budgetRepository.js";
import { ITransactionRepository } from "../../sheets/transactionRepository.js";
import { getTodayISO } from "../../../utils/date.js";
import { formatCategoryBreakdownReport } from "../../../utils/telegramFormat.js";

/**
 * Handles /breakdown command.
 */
export async function handleBreakdown(
  ctx: Context,
  budgetRepository: IBudgetRepository,
  transactionRepository: ITransactionRepository
): Promise<void> {
  const todayIso = getTodayISO();
  const summary = await budgetRepository.getBudgetSummary(todayIso);

  if (!summary.activeBudget) {
    const reportText = formatCategoryBreakdownReport(summary, []);
    await ctx.reply(reportText, { parse_mode: "MarkdownV2" });
    return;
  }

  const transactions = await transactionRepository.getTransactionsForBudget(summary.activeBudget.id);
  const reportText = formatCategoryBreakdownReport(summary, transactions);

  await ctx.reply(reportText, { parse_mode: "MarkdownV2" });
}
