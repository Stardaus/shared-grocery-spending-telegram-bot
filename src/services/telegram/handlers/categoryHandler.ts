import { Context } from "grammy";
import { ICategoryRepository } from "../../sheets/categoryRepository.js";
import { escapeMarkdownV2 } from "../../../utils/telegramFormat.js";

/**
 * Handles /categories command.
 */
export async function handleCategories(
  ctx: Context,
  categoryRepository: ICategoryRepository
): Promise<void> {
  const categories = await categoryRepository.getCategories();
  const listItems = categories.map((c) => `• ${escapeMarkdownV2(c.name)}`);

  const message = [
    `🏷️ *Active Expense Categories*`,
    ``,
    ...listItems,
    ``,
    `_Use /addcategory <name> or /deletecategory <name> to manage categories\\._`,
  ].join("\n");

  await ctx.reply(message, { parse_mode: "MarkdownV2" });
}

/**
 * Handles /addcategory <name> command.
 */
export async function handleAddCategory(
  ctx: Context,
  categoryRepository: ICategoryRepository
): Promise<void> {
  const categoryName = ((ctx.match as string) || "").trim();

  if (!categoryName) {
    await ctx.reply(
      escapeMarkdownV2("⚠️ Invalid syntax! Use: /addcategory <category_name>\nExample: /addcategory Pet Food"),
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  const newCategory = await categoryRepository.addCategory(categoryName);

  await ctx.reply(
    `✅ Category *${escapeMarkdownV2(newCategory.name)}* added successfully\\!`,
    { parse_mode: "MarkdownV2" }
  );
}

/**
 * Handles /deletecategory <name> command.
 */
export async function handleDeleteCategory(
  ctx: Context,
  categoryRepository: ICategoryRepository
): Promise<void> {
  const categoryName = ((ctx.match as string) || "").trim();

  if (!categoryName) {
    await ctx.reply(
      escapeMarkdownV2("⚠️ Invalid syntax! Use: /deletecategory <category_name>\nExample: /deletecategory Pet Food"),
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  const success = await categoryRepository.deleteCategory(categoryName);

  if (success) {
    await ctx.reply(
      `🗑️ Category *${escapeMarkdownV2(categoryName)}* deleted successfully\\!`,
      { parse_mode: "MarkdownV2" }
    );
  } else {
    await ctx.reply(
      `⚠️ Category *${escapeMarkdownV2(categoryName)}* not found in active categories\\!`,
      { parse_mode: "MarkdownV2" }
    );
  }
}
