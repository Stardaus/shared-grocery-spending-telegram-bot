import { Context, NextFunction } from "grammy";
import { escapeMarkdownV2 } from "../../../utils/telegramFormat.js";

/**
 * Creates a grammY security middleware that rejects updates from Telegram users
 * whose ID is not included in the allowedUserIds whitelist.
 */
export function authorizeUser(allowedUserIds: string[]) {
  return async (ctx: Context, next: NextFunction): Promise<void> => {
    const userId = ctx.from?.id?.toString() || "unknown";

    if (!allowedUserIds.includes(userId)) {
      const isPrivate = ctx.chat?.type === "private";
      const isCommand = ctx.message?.text?.startsWith("/");

      if (isPrivate || isCommand) {
        const safeId = escapeMarkdownV2(userId);
        await ctx.reply(
          `🙏 *Hello\\! Thank you for reaching out\\.*\n\n` +
            `This is a private *Shared Grocery Spending Bot* configured for authorized household members only\\.\n\n` +
            `If you are a member of this household, please ask your administrator to add your Telegram User ID \\(\`ID: ${safeId}\`\\) to the allowed users list\\. Have a wonderful day\\!`,
          { parse_mode: "MarkdownV2" }
        );
      }
      return;
    }

    await next();
  };
}
