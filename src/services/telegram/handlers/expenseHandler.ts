import { Context } from "grammy";
import { IAIService } from "../../ai/gemini.js";
import { ICategoryRepository } from "../../sheets/categoryRepository.js";
import { IBudgetRepository } from "../../sheets/budgetRepository.js";
import { ITransactionRepository } from "../../sheets/transactionRepository.js";
import { getTodayISO } from "../../../utils/date.js";
import { formatSingleExpenseConfirmation, escapeMarkdownV2 } from "../../../utils/telegramFormat.js";

/**
 * Handles free-form text messages containing single expense logs.
 */
export async function handleTextExpense(
  ctx: Context,
  aiService: IAIService,
  categoryRepository: ICategoryRepository,
  budgetRepository: IBudgetRepository,
  transactionRepository: ITransactionRepository
): Promise<void> {
  const textInput = (ctx.message?.text || "").trim();
  if (!textInput) return;

  const categories = await categoryRepository.getCategories();
  const categoryNames = categories.map((c) => c.name);

  // Parse text using Gemini AI Service
  const parsedItem = await aiService.parseTextExpense(textInput, categoryNames);

  const todayIso = getTodayISO();
  const activeBudget = await budgetRepository.getActiveBudget(todayIso);
  const budgetId = activeBudget ? activeBudget.id : "UNASSIGNED";

  const purchaserId = ctx.from?.id?.toString() || "unknown";
  const purchaserName = ctx.from?.first_name || ctx.from?.username || "Authorized User";

  // Append transaction record to Google Sheets
  const [createdTransaction] = await transactionRepository.addTransactions([
    {
      date: todayIso,
      item: parsedItem.item,
      category: parsedItem.category,
      amount: parsedItem.amount,
      purchaserId,
      purchaserName,
      rawInput: textInput,
      budgetId,
    },
  ]);

  if (!activeBudget) {
    await ctx.reply(
      `⚠️ *No active budget window found\\!*\nExpense *${escapeMarkdownV2(
        parsedItem.item
      )}* \\(${escapeMarkdownV2(parsedItem.amount.toString())}\\) logged as UNASSIGNED\\. Please set active budget via /setbudget\\.`,
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  const summary = await budgetRepository.getBudgetSummary(todayIso);

  await ctx.reply(
    formatSingleExpenseConfirmation(createdTransaction, summary.remainingBalance),
    { parse_mode: "MarkdownV2" }
  );
}
