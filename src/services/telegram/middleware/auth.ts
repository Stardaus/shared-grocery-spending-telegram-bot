import { Context, NextFunction } from "grammy";

/**
 * Creates a grammY security middleware that rejects updates from Telegram users
 * whose ID is not included in the allowedUserIds whitelist.
 */
export function authorizeUser(allowedUserIds: string[]) {
  return async (ctx: Context, next: NextFunction): Promise<void> => {
    const userId = ctx.from?.id?.toString();

    if (!userId || !allowedUserIds.includes(userId)) {
      await ctx.reply("Access restricted to authorized household members.");
      return;
    }

    await next();
  };
}
