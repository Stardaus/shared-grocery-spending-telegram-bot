import { Context } from "grammy";
import { IAIService } from "../../ai/gemini.js";
import { ICategoryRepository } from "../../sheets/categoryRepository.js";
import { IBudgetRepository } from "../../sheets/budgetRepository.js";
import { ITransactionRepository } from "../../sheets/transactionRepository.js";
import { getTodayISO } from "../../../utils/date.js";
import { formatSingleExpenseConfirmation, escapeMarkdownV2 } from "../../../utils/telegramFormat.js";

/**
 * Handles free-form text messages containing single expense logs or conversational chat.
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

  let parsedItem;

  try {
    // Try parsing text using Gemini AI Service / Local Regex Fallback
    parsedItem = await aiService.parseTextExpense(textInput, categoryNames);
  } catch (err) {
    const userName = escapeMarkdownV2(ctx.from?.first_name || "there");
    await ctx.reply(
      `👋 *Hello ${userName}\\! I am your Shared Grocery Spending Bot\\.*\n\n` +
        `I couldn't detect an expense amount in your message\\.\n\n` +
        `💡 *How to log expenses:*\n` +
        `• 💬 *Text:* Type \`Ayam 15.50\` or \`Carrot 10\`\n` +
        `• 📸 *Receipt:* Send a clear photo of a grocery receipt\n\n` +
        `📊 *Available Commands:*\n` +
        `• /setbudget \`<amount>\` — Set active budget\n` +
        `• /summary — Check spending balance\n` +
        `• /breakdown — Category breakdown report\n` +
        `• /categories — Manage categories`,
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

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
