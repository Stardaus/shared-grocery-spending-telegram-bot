import { Bot, BotError } from "grammy";
import { Env } from "../../config/env.js";
import { getSheetsClient, ensureSheetTabsExist } from "../sheets/client.js";
import { CategoryRepository } from "../sheets/categoryRepository.js";
import { BudgetRepository } from "../sheets/budgetRepository.js";
import { TransactionRepository } from "../sheets/transactionRepository.js";
import { GeminiAIService } from "../ai/gemini.js";
import { authorizeUser } from "./middleware/auth.js";
import { handleSetBudget, handleSummary } from "./handlers/budgetHandler.js";
import { handleCategories, handleAddCategory, handleDeleteCategory } from "./handlers/categoryHandler.js";
import { handleTextExpense } from "./handlers/expenseHandler.js";
import {
  handleReceiptPhoto,
  handleConfirmReceiptCallback,
  handleCancelReceiptCallback,
  ReceiptSessionMap,
} from "./handlers/receiptHandler.js";
import { handleBreakdown } from "./handlers/reportHandler.js";
import { escapeMarkdownV2 } from "../../utils/telegramFormat.js";
import { logger } from "../../utils/logger.js";

/**
 * Creates and configures the primary grammY Bot orchestrator.
 */
export function createBot(env: Env): Bot {
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

  // Initialize service dependencies
  const sheetsClient = getSheetsClient(env);
  const categoryRepo = new CategoryRepository(sheetsClient, env.GOOGLE_SPREADSHEET_ID);
  const budgetRepo = new BudgetRepository(sheetsClient, env.GOOGLE_SPREADSHEET_ID);
  const transactionRepo = new TransactionRepository(sheetsClient, env.GOOGLE_SPREADSHEET_ID);

  // Auto-initialize missing Google Sheet tabs asynchronously on startup
  ensureSheetTabsExist(sheetsClient, env.GOOGLE_SPREADSHEET_ID).catch((err) => {
    logger.warn({ error: err }, "Failed to auto-initialize Google Sheet tabs");
  });

  const aiService = new GeminiAIService(env.GEMINI_API_KEY);
  const receiptSessions: ReceiptSessionMap = new Map();

  // Apply Security Authorization Middleware
  bot.use(authorizeUser(env.ALLOWED_USER_IDS));

  // Welcome & Help Handlers
  bot.command(["start", "help"], async (ctx) => {
    const userName = escapeMarkdownV2(ctx.from?.first_name || "there");
    await ctx.reply(
      `👋 *Hello ${userName}\\! Welcome to your Shared Grocery Spending Bot\\.*\n\n` +
        `I help you track shared household grocery expenses within custom salary\\-to\\-salary budget windows\\.\n\n` +
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
  });

  // Command Handlers
  bot.command("setbudget", (ctx) => handleSetBudget(ctx, budgetRepo));
  bot.command("summary", (ctx) => handleSummary(ctx, budgetRepo));
  bot.command("categories", (ctx) => handleCategories(ctx, categoryRepo));
  bot.command("addcategory", (ctx) => handleAddCategory(ctx, categoryRepo));
  bot.command("deletecategory", (ctx) => handleDeleteCategory(ctx, categoryRepo));
  bot.command("breakdown", (ctx) => handleBreakdown(ctx, budgetRepo, transactionRepo));

  // Inline Button Callback Handlers
  bot.callbackQuery(/^confirm_receipt:/, (ctx) =>
    handleConfirmReceiptCallback(ctx, receiptSessions, budgetRepo, transactionRepo)
  );

  bot.callbackQuery(/^cancel_receipt:/, (ctx) =>
    handleCancelReceiptCallback(ctx, receiptSessions)
  );

  // Photo Message Listener (Receipt Uploads)
  bot.on("message:photo", (ctx) =>
    handleReceiptPhoto(env.TELEGRAM_BOT_TOKEN, ctx, aiService, categoryRepo, receiptSessions)
  );

  // Text Message Listener (Quick Expense Logging)
  bot.on("message:text", (ctx) =>
    handleTextExpense(ctx, aiService, categoryRepo, budgetRepo, transactionRepo)
  );

  // Global Error Handler
  bot.catch((err: BotError) => {
    const errObj = err.error as any;
    logger.error(
      {
        message: errObj?.message || String(err.error),
        status: errObj?.status || errObj?.code,
        responseData: errObj?.response?.data,
        configUrl: errObj?.config?.url,
        ctx: err.ctx.update,
      },
      "Unhandled error in bot handler"
    );
    err.ctx.reply("⚠️ An unexpected error occurred. Please try again later.").catch(() => {});
  });

  return bot;
}
