import { Context } from "grammy";
import { IBudgetRepository } from "../../sheets/budgetRepository.js";
import { parseMYR } from "../../../utils/currency.js";
import { parseDDMMYYYYToISO, isValidDDMMYYYY, getTodayISO } from "../../../utils/date.js";
import { formatBudgetSummaryMessage, escapeMarkdownV2 } from "../../../utils/telegramFormat.js";

/**
 * Handles /setbudget <amount> <DD/MM/YYYY_start> <DD/MM/YYYY_end> command.
 */
export async function handleSetBudget(
  ctx: Context,
  budgetRepository: IBudgetRepository
): Promise<void> {
  const matchText = (ctx.match as string) || "";
  const parts = matchText.trim().split(/\s+/);

  if (parts.length !== 3) {
    await ctx.reply(
      escapeMarkdownV2(
        "⚠️ Invalid syntax! Use: /setbudget <amount> <DD/MM/YYYY_start> <DD/MM/YYYY_end>\nExample: /setbudget 1500 25/03/2026 24/04/2026"
      ),
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  const [rawAmount, rawStart, rawEnd] = parts;
  const amount = parseMYR(rawAmount);

  if (amount === null || amount <= 0) {
    await ctx.reply(
      escapeMarkdownV2("⚠️ Invalid amount! Please provide a positive number (e.g. 1500 or 1500.50)."),
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  if (!isValidDDMMYYYY(rawStart) || !isValidDDMMYYYY(rawEnd)) {
    await ctx.reply(
      escapeMarkdownV2("⚠️ Invalid date format! Please use DD/MM/YYYY (e.g. 25/03/2026)."),
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  const startDateIso = parseDDMMYYYYToISO(rawStart);
  const endDateIso = parseDDMMYYYYToISO(rawEnd);

  if (endDateIso <= startDateIso) {
    await ctx.reply(
      escapeMarkdownV2("⚠️ Invalid date range! End date must be after start date."),
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  const createdBy = ctx.from?.id?.toString() || "unknown";

  await budgetRepository.createBudget({
    amount,
    startDate: startDateIso,
    endDate: endDateIso,
    createdBy,
  });

  const todayIso = getTodayISO();
  const summary = await budgetRepository.getBudgetSummary(todayIso);

  await ctx.reply(formatBudgetSummaryMessage(summary), {
    parse_mode: "MarkdownV2",
  });
}

/**
 * Handles /summary command.
 */
export async function handleSummary(
  ctx: Context,
  budgetRepository: IBudgetRepository
): Promise<void> {
  const todayIso = getTodayISO();
  const summary = await budgetRepository.getBudgetSummary(todayIso);

  await ctx.reply(formatBudgetSummaryMessage(summary), {
    parse_mode: "MarkdownV2",
  });
}
