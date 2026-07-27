import { describe, it, expect, vi, beforeEach } from "vitest";
import { authorizeUser } from "../../src/services/telegram/middleware/auth.js";

describe("Telegram Security Middleware (auth.ts)", () => {
  const allowedUserIds = ["12345678", "87654321"];
  const middleware = authorizeUser(allowedUserIds);

  let nextFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    nextFn = vi.fn().mockResolvedValue(undefined);
  });

  it("should allow request to proceed if user ID is in allowed list", async () => {
    const mockCtx = {
      from: { id: 12345678, first_name: "Husband" },
      reply: vi.fn(),
    } as any;

    await middleware(mockCtx, nextFn);
    expect(nextFn).toHaveBeenCalled();
    expect(mockCtx.reply).not.toHaveBeenCalled();
  });

  it("should block request and reply with access restricted if user ID is unauthorized in private chat", async () => {
    const mockCtx = {
      from: { id: 99999999, first_name: "Stranger" },
      chat: { type: "private" },
      reply: vi.fn(),
    } as any;

    await middleware(mockCtx, nextFn);
    expect(nextFn).not.toHaveBeenCalled();
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining("99999999"),
      { parse_mode: "MarkdownV2" }
    );
  });

  it("should block request silently in group chat for unauthorized user text", async () => {
    const mockCtx = {
      from: { id: 99999999, first_name: "Stranger" },
      chat: { type: "group" },
      message: { text: "hello everyone" },
      reply: vi.fn(),
    } as any;

    await middleware(mockCtx, nextFn);
    expect(nextFn).not.toHaveBeenCalled();
    expect(mockCtx.reply).not.toHaveBeenCalled();
  });

  it("should block request if ctx.from is missing", async () => {
    const mockCtx = {
      from: undefined,
      chat: { type: "private" },
      reply: vi.fn(),
    } as any;

    await middleware(mockCtx, nextFn);
    expect(nextFn).not.toHaveBeenCalled();
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining("unknown"),
      { parse_mode: "MarkdownV2" }
    );
  });
});
