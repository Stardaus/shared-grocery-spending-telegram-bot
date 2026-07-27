import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  handleTextExpense,
  handleConfirmTextExpenseCallback,
  handleCancelTextExpenseCallback,
  TextExpenseSessionMap,
} from "../../src/services/telegram/handlers/expenseHandler.js";

describe("Text Expense Ingestion Handler (expenseHandler.ts)", () => {
  const mockCategoryRepository = {
    getCategories: vi.fn(),
  } as any;

  const mockBudgetRepository = {
    getActiveBudget: vi.fn(),
    getBudgetSummary: vi.fn(),
  } as any;

  const mockTransactionRepository = {
    addTransactions: vi.fn(),
  } as any;

  let textSessions: TextExpenseSessionMap;

  beforeEach(() => {
    vi.clearAllMocks();
    textSessions = new Map();
  });

  it("should return early if message text is empty", async () => {
    const mockCtx = {
      message: { text: "   " },
      reply: vi.fn(),
    } as any;

    await handleTextExpense(mockCtx, mockCategoryRepository, textSessions);
    expect(mockCtx.reply).not.toHaveBeenCalled();
  });

  it("should reply with help guide in private chat if text cannot be parsed into an expense", async () => {
    mockCategoryRepository.getCategories.mockResolvedValueOnce([]);
    const mockCtx = {
      message: { text: "Hello there" },
      from: { first_name: "Firdaus" },
      chat: { type: "private" },
      reply: vi.fn(),
    } as any;

    await handleTextExpense(mockCtx, mockCategoryRepository, textSessions);
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Hello Firdaus"),
      { parse_mode: "MarkdownV2" }
    );
  });

  it("should ignore non-expense text silently in group chats", async () => {
    mockCategoryRepository.getCategories.mockResolvedValueOnce([]);
    const mockCtx = {
      message: { text: "Hello everyone in group" },
      from: { first_name: "Firdaus" },
      chat: { type: "group" },
      reply: vi.fn(),
    } as any;

    await handleTextExpense(mockCtx, mockCategoryRepository, textSessions);
    expect(mockCtx.reply).not.toHaveBeenCalled();
  });

  it("should parse incoming text expense locally and send confirmation preview card with buttons", async () => {
    mockCategoryRepository.getCategories.mockResolvedValueOnce([
      { id: "c1", name: "Meat & Seafood", createdAt: "2026-03-25T00:00:00Z" },
    ]);

    const mockCtx = {
      message: { text: "Ayam 25.50" },
      from: { id: 12345, first_name: "Husband" },
      chat: { id: 11111 },
      reply: vi.fn(),
    } as any;

    await handleTextExpense(mockCtx, mockCategoryRepository, textSessions);

    expect(textSessions.size).toBe(1);
    const session = Array.from(textSessions.values())[0];
    expect(session.item).toBe("Ayam");
    expect(session.amount).toBe(25.5);
    expect(session.category).toBe("Meat & Seafood");

    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Expense Log Preview"),
      expect.objectContaining({
        parse_mode: "MarkdownV2",
        reply_markup: expect.anything(),
      })
    );
  });

  it("should confirm text expense and persist to Google Sheets", async () => {
    const sessionId = "test-session-123";
    textSessions.set(sessionId, {
      sessionId,
      chatId: 11111,
      userId: "12345",
      userName: "Husband",
      item: "Ayam",
      amount: 25.5,
      category: "Meat & Seafood",
      rawInput: "Ayam 25.50",
      createdAt: Date.now(),
    });

    mockBudgetRepository.getActiveBudget.mockResolvedValueOnce({
      id: "b-123",
      amount: 1500,
      startDate: "2026-03-25",
      endDate: "2026-04-24",
      createdAt: "2026-03-25T00:00:00Z",
      createdBy: "u1",
    });

    mockTransactionRepository.addTransactions.mockResolvedValueOnce([
      {
        id: "tx-1",
        date: "2026-03-25",
        item: "Ayam",
        category: "Meat & Seafood",
        amount: 25.5,
        purchaserId: "12345",
        purchaserName: "Husband",
        rawInput: "Ayam 25.50",
        budgetId: "b-123",
      },
    ]);

    mockBudgetRepository.getBudgetSummary.mockResolvedValueOnce({
      activeBudget: { id: "b-123", amount: 1500, startDate: "2026-03-25", endDate: "2026-04-24", createdAt: "", createdBy: "" },
      totalSpent: 25.5,
      remainingBalance: 1474.5,
      transactionCount: 1,
      isOverBudget: false,
    });

    const mockCtx = {
      callbackQuery: { data: `confirm_text:${sessionId}` },
      answerCallbackQuery: vi.fn(),
      editMessageText: vi.fn(),
    } as any;

    await handleConfirmTextExpenseCallback(
      mockCtx,
      textSessions,
      mockBudgetRepository,
      mockTransactionRepository
    );

    expect(textSessions.has(sessionId)).toBe(false);
    expect(mockTransactionRepository.addTransactions).toHaveBeenCalled();
    expect(mockCtx.editMessageText).toHaveBeenCalledWith(
      expect.stringContaining("Expense Logged"),
      { parse_mode: "MarkdownV2" }
    );
  });

  it("should handle text expense confirmation when no active budget exists", async () => {
    const sessionId = "test-session-no-budget";
    textSessions.set(sessionId, {
      sessionId,
      chatId: 11111,
      userId: "12345",
      userName: "Husband",
      item: "Ayam",
      amount: 25.5,
      category: "Meat & Seafood",
      rawInput: "Ayam 25.50",
      createdAt: Date.now(),
    });

    mockBudgetRepository.getActiveBudget.mockResolvedValueOnce(null);
    mockTransactionRepository.addTransactions.mockResolvedValueOnce([
      {
        id: "tx-1",
        date: "2026-03-25",
        item: "Ayam",
        category: "Meat & Seafood",
        amount: 25.5,
        purchaserId: "12345",
        purchaserName: "Husband",
        rawInput: "Ayam 25.50",
        budgetId: "UNASSIGNED",
      },
    ]);

    const mockCtx = {
      callbackQuery: { data: `confirm_text:${sessionId}` },
      answerCallbackQuery: vi.fn(),
      editMessageText: vi.fn(),
    } as any;

    await handleConfirmTextExpenseCallback(
      mockCtx,
      textSessions,
      mockBudgetRepository,
      mockTransactionRepository
    );

    expect(mockCtx.editMessageText).toHaveBeenCalledWith(
      expect.stringContaining("No active budget window found"),
      { parse_mode: "MarkdownV2" }
    );
  });

  it("should alert user if confirm text session has expired", async () => {
    const mockCtx = {
      callbackQuery: { data: "confirm_text:non-existent-session" },
      answerCallbackQuery: vi.fn(),
    } as any;

    await handleConfirmTextExpenseCallback(
      mockCtx,
      textSessions,
      mockBudgetRepository,
      mockTransactionRepository
    );

    expect(mockCtx.answerCallbackQuery).toHaveBeenCalledWith({
      text: expect.stringContaining("Session expired"),
      show_alert: true,
    });
  });

  it("should cancel text expense logging when cancel button is clicked", async () => {
    const sessionId = "test-session-456";
    textSessions.set(sessionId, {
      sessionId,
      chatId: 11111,
      userId: "12345",
      userName: "Husband",
      item: "Carrot",
      amount: 10,
      category: "Produce & Veggies",
      rawInput: "Carrot 10",
      createdAt: Date.now(),
    });

    const mockCtx = {
      callbackQuery: { data: `cancel_text:${sessionId}` },
      answerCallbackQuery: vi.fn(),
      editMessageText: vi.fn(),
    } as any;

    await handleCancelTextExpenseCallback(mockCtx, textSessions);

    expect(textSessions.has(sessionId)).toBe(false);
    expect(mockCtx.editMessageText).toHaveBeenCalledWith(
      expect.stringContaining("Expense logging cancelled"),
      { parse_mode: "MarkdownV2" }
    );
  });

  it("should handle cancel callback safely when session is missing", async () => {
    const mockCtx = {
      callbackQuery: { data: "cancel_text:missing-session" },
      answerCallbackQuery: vi.fn(),
      editMessageText: vi.fn(),
    } as any;

    await handleCancelTextExpenseCallback(mockCtx, textSessions);

    expect(mockCtx.editMessageText).toHaveBeenCalledWith(
      expect.stringContaining("Expense logging cancelled"),
      { parse_mode: "MarkdownV2" }
    );
  });
});
