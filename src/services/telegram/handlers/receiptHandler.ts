import { Context, InlineKeyboard } from "grammy";
import { IAIService } from "../../ai/gemini.js";
import { ICategoryRepository } from "../../sheets/categoryRepository.js";
import { IBudgetRepository } from "../../sheets/budgetRepository.js";
import { ITransactionRepository } from "../../sheets/transactionRepository.js";
import { ReceiptVerificationSession, LineItem } from "../../../domain/transaction.js";
import { getTodayISO } from "../../../utils/date.js";
import { formatMYR } from "../../../utils/currency.js";
import { formatReceiptVerificationMessage, escapeMarkdownV2 } from "../../../utils/telegramFormat.js";

export type ReceiptSessionMap = Map<string, ReceiptVerificationSession>;

/**
 * Handles incoming photo messages, parses receipt image via Gemini Vision,
 * creates a verification session, and sends an interactive preview card with inline buttons.
 */
export async function handleReceiptPhoto(
  botToken: string,
  ctx: Context,
  aiService: IAIService,
  categoryRepository: ICategoryRepository,
  sessionMap: ReceiptSessionMap
): Promise<void> {
  const photos = ctx.message?.photo;
  if (!photos || photos.length === 0) return;

  // Get largest photo by file_size
  const largestPhoto = photos.reduce((prev, current) =>
    (current.file_size || 0) > (prev.file_size || 0) ? current : prev
  );

  const file = await ctx.api.getFile(largestPhoto.file_id);
  if (!file.file_path) {
    await ctx.reply(escapeMarkdownV2("⚠️ Could not download receipt image. Please try again."));
    return;
  }

  const fileUrl = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
  const response = await fetch(fileUrl);
  const arrayBuffer = await response.arrayBuffer();
  const imageBuffer = Buffer.from(arrayBuffer);

  const categories = await categoryRepository.getCategories();
  const allowedCategories = categories.map((c) => c.name);

  // Send to Gemini Vision
  const parsedReceipt = await aiService.parseReceiptImage(
    imageBuffer,
    "image/jpeg",
    allowedCategories
  );

  if (!parsedReceipt.items || parsedReceipt.items.length === 0) {
    await ctx.reply(
      escapeMarkdownV2(" Could not clearly read receipt line items. Please try again or enter manually."),
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  const sessionId = crypto.randomUUID();
  const userId = ctx.from?.id?.toString() || "unknown";
  const chatId = ctx.chat?.id || 0;

  sessionMap.set(sessionId, {
    sessionId,
    chatId,
    userId,
    parsedReceipt,
    createdAt: Date.now(),
  });

  const keyboard = new InlineKeyboard()
    .text("✅ Confirm All", `confirm_receipt:${sessionId}`)
    .text("❌ Cancel", `cancel_receipt:${sessionId}`);

  const cardText = formatReceiptVerificationMessage(
    parsedReceipt.items,
    parsedReceipt.detectedTotal,
    parsedReceipt.mismatchWarning
  );

  await ctx.reply(cardText, {
    parse_mode: "MarkdownV2",
    reply_markup: keyboard,
  });
}

/**
 * Handles callback button clicks for [✅ Confirm All] (confirm_receipt:<sessionId>).
 */
export async function handleConfirmReceiptCallback(
  ctx: Context,
  sessionMap: ReceiptSessionMap,
  budgetRepository: IBudgetRepository,
  transactionRepository: ITransactionRepository
): Promise<void> {
  const data = ctx.callbackQuery?.data || "";
  const sessionId = data.replace("confirm_receipt:", "");

  const session = sessionMap.get(sessionId);
  if (!session) {
    await ctx.answerCallbackQuery({ text: "Session expired or already processed." });
    return;
  }

  await ctx.answerCallbackQuery({ text: "Processing confirmation..." });

  const todayIso = getTodayISO();
  const activeBudget = await budgetRepository.getActiveBudget(todayIso);
  const budgetId = activeBudget ? activeBudget.id : "UNASSIGNED";

  const purchaserId = ctx.from?.id?.toString() || session.userId;
  const purchaserName = ctx.from?.first_name || ctx.from?.username || "Authorized User";

  const txInputs = session.parsedReceipt.items.map((it: LineItem) => ({
    date: todayIso,
    item: it.item,
    category: it.category,
    amount: it.amount,
    purchaserId,
    purchaserName,
    rawInput: `Receipt Upload (${it.item})`,
    budgetId,
  }));

  await transactionRepository.addTransactions(txInputs);
  sessionMap.delete(sessionId); // Clear session

  const summary = await budgetRepository.getBudgetSummary(todayIso);

  const confirmText = [
    `✅ *Receipt Confirmed \\& Logged\\!*`,
    `Total Items: ${session.parsedReceipt.items.length}`,
    `Total Amount: ${escapeMarkdownV2(formatMYR(session.parsedReceipt.detectedTotal))}`,
    `Remaining Shared Pool: ${escapeMarkdownV2(formatMYR(summary.remainingBalance))}`,
  ].join("\n");

  await ctx.editMessageText(confirmText, {
    parse_mode: "MarkdownV2",
  });
}

/**
 * Handles callback button clicks for [❌ Cancel] (cancel_receipt:<sessionId>).
 */
export async function handleCancelReceiptCallback(
  ctx: Context,
  sessionMap: ReceiptSessionMap
): Promise<void> {
  const data = ctx.callbackQuery?.data || "";
  const sessionId = data.replace("cancel_receipt:", "");

  sessionMap.delete(sessionId);
  await ctx.answerCallbackQuery({ text: "Receipt canceled." });

  await ctx.editMessageText("❌ *Receipt Upload Canceled* \\(No items were logged\\)\\.", {
    parse_mode: "MarkdownV2",
  });
}
