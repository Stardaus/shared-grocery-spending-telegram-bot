import { Context, InlineKeyboard } from "grammy";
import { PendingTextExpenseSession } from "../../../domain/transaction.js";
import { parseLocalTextExpense } from "../../ai/gemini.js";
import { ICategoryRepository } from "../../sheets/categoryRepository.js";
import { IBudgetRepository } from "../../sheets/budgetRepository.js";
import { ITransactionRepository } from "../../sheets/transactionRepository.js";
import { getTodayISO, formatISOToDDMMYYYY } from "../../../utils/date.js";
import { formatMYR } from "../../../utils/currency.js";
import { formatSingleExpenseConfirmation, escapeMarkdownV2 } from "../../../utils/telegramFormat.js";

export type TextExpenseSessionMap = Map<string, PendingTextExpenseSession>;

/**
 * Handles text messages by parsing locally without AI and presenting a preview card with confirmation buttons.
 */
export async function handleTextExpense(
  ctx: Context,
  categoryRepository: ICategoryRepository,
  sessions: TextExpenseSessionMap
): Promise<void> {
  const textInput = (ctx.message?.text || "").trim();
  if (!textInput) return;

  const categories = await categoryRepository.getCategories();
  const categoryNames = categories.map((c) => c.name);

  let parsedItem;

  try {
    // Parse text input 100% locally using deterministic regex matching (Zero AI calls)
    parsedItem = parseLocalTextExpense(textInput, categoryNames);
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

  const sessionId = crypto.randomUUID();
  const userId = ctx.from?.id?.toString() || "unknown";
  const userName = ctx.from?.first_name || ctx.from?.username || "Authorized User";
  const chatId = ctx.chat?.id || 0;

  // Save pending text session in memory
  sessions.set(sessionId, {
    sessionId,
    chatId,
    userId,
    userName,
    item: parsedItem.item,
    amount: parsedItem.amount,
    category: parsedItem.category,
    rawInput: textInput,
    createdAt: Date.now(),
  });

  const todayIso = getTodayISO();
  const formattedDate = formatISOToDDMMYYYY(todayIso);

  const keyboard = new InlineKeyboard()
    .text("✅ Confirm", `confirm_text:${sessionId}`)
    .text("❌ Cancel", `cancel_text:${sessionId}`);

  const cardText =
    `🛒 *Expense Log Preview*\n\n` +
    `• *Item:* ${escapeMarkdownV2(parsedItem.item)}\n` +
    `• *Amount:* ${escapeMarkdownV2(formatMYR(parsedItem.amount))}\n` +
    `• *Category:* ${escapeMarkdownV2(parsedItem.category)}\n` +
    `• *Date:* ${escapeMarkdownV2(formattedDate)}\n\n` +
    `Is this correct?`;

  await ctx.reply(cardText, {
    parse_mode: "MarkdownV2",
    reply_markup: keyboard,
  });
}

/**
 * Handles confirmation of a text expense log.
 */
export async function handleConfirmTextExpenseCallback(
  ctx: Context,
  sessions: TextExpenseSessionMap,
  budgetRepository: IBudgetRepository,
  transactionRepository: ITransactionRepository
): Promise<void> {
  const callbackData = ctx.callbackQuery?.data || "";
  const sessionId = callbackData.replace("confirm_text:", "");
  const session = sessions.get(sessionId);

  if (!session) {
    await ctx.answerCallbackQuery({
      text: "⚠️ Session expired or already processed.",
      show_alert: true,
    });
    return;
  }

  // Remove session from memory
  sessions.delete(sessionId);
  await ctx.answerCallbackQuery({ text: "Processing..." });

  const todayIso = getTodayISO();
  const activeBudget = await budgetRepository.getActiveBudget(todayIso);
  const budgetId = activeBudget ? activeBudget.id : "UNASSIGNED";

  // Write row to Google Sheets
  const [createdTransaction] = await transactionRepository.addTransactions([
    {
      date: todayIso,
      item: session.item,
      category: session.category,
      amount: session.amount,
      purchaserId: session.userId,
      purchaserName: session.userName,
      rawInput: session.rawInput,
      budgetId,
    },
  ]);

  if (!activeBudget) {
    await ctx.editMessageText(
      `⚠️ *No active budget window found\\!*\nExpense *${escapeMarkdownV2(
        session.item
      )}* \\(${escapeMarkdownV2(formatMYR(session.amount))}\\) logged as UNASSIGNED\\. Please set active budget via /setbudget\\.`,
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  const summary = await budgetRepository.getBudgetSummary(todayIso);

  await ctx.editMessageText(
    formatSingleExpenseConfirmation(createdTransaction, summary.remainingBalance),
    { parse_mode: "MarkdownV2" }
  );
}

/**
 * Handles cancellation of a text expense log.
 */
export async function handleCancelTextExpenseCallback(
  ctx: Context,
  sessions: TextExpenseSessionMap
): Promise<void> {
  const callbackData = ctx.callbackQuery?.data || "";
  const sessionId = callbackData.replace("cancel_text:", "");

  if (sessions.has(sessionId)) {
    sessions.delete(sessionId);
  }

  await ctx.answerCallbackQuery({ text: "Logging cancelled" });
  await ctx.editMessageText("❌ *Expense logging cancelled\\.*", {
    parse_mode: "MarkdownV2",
  });
}
