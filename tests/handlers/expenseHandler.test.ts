import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleTextExpense } from "../../src/services/telegram/handlers/expenseHandler.js";

describe("Text Expense Ingestion Handler (expenseHandler.ts)", () => {
  const mockAIService = {
    parseTextExpense: vi.fn(),
    parseReceiptImage: vi.fn(),
  };

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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should parse incoming text expense, persist to Sheets, and send confirmation", async () => {
    mockCategoryRepository.getCategories.mockResolvedValueOnce([
      { id: "c1", name: "Meat & Seafood", createdAt: "2026-03-25T00:00:00Z" },
    ]);

    mockAIService.parseTextExpense.mockResolvedValueOnce({
      item: "Ayam Segar",
      amount: 25.5,
      category: "Meat & Seafood",
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
        item: "Ayam Segar",
        category: "Meat & Seafood",
        amount: 25.5,
        purchaserId: "12345",
        purchaserName: "Husband",
        rawInput: "ayam RM25.50",
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
      message: { text: "ayam RM25.50" },
      from: { id: 12345, first_name: "Husband" },
      reply: vi.fn(),
    } as any;

    await handleTextExpense(
      mockCtx,
      mockAIService,
      mockCategoryRepository,
      mockBudgetRepository,
      mockTransactionRepository
    );

    expect(mockAIService.parseTextExpense).toHaveBeenCalledWith("ayam RM25.50", ["Meat & Seafood"]);
    expect(mockTransactionRepository.addTransactions).toHaveBeenCalledWith([
      {
        date: expect.any(String),
        item: "Ayam Segar",
        category: "Meat & Seafood",
        amount: 25.5,
        purchaserId: "12345",
        purchaserName: "Husband",
        rawInput: "ayam RM25.50",
        budgetId: "b-123",
      },
    ]);
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Expense Logged"),
      { parse_mode: "MarkdownV2" }
    );
  });

  it("should handle text expense when no active budget exists", async () => {
    mockCategoryRepository.getCategories.mockResolvedValueOnce([]);
    mockAIService.parseTextExpense.mockResolvedValueOnce({
      item: "Ayam Segar",
      amount: 25.5,
      category: "Meat & Seafood",
    });
    mockBudgetRepository.getActiveBudget.mockResolvedValueOnce(null);
    mockTransactionRepository.addTransactions.mockResolvedValueOnce([
      {
        id: "tx-1",
        date: "2026-03-25",
        item: "Ayam Segar",
        category: "Meat & Seafood",
        amount: 25.5,
        purchaserId: "12345",
        purchaserName: "Husband",
        rawInput: "ayam 25.50",
        budgetId: "UNASSIGNED",
      },
    ]);
    mockBudgetRepository.getBudgetSummary.mockResolvedValueOnce({
      activeBudget: null,
      totalSpent: 0,
      remainingBalance: 0,
      transactionCount: 0,
      isOverBudget: false,
    });

    const mockCtx = {
      message: { text: "ayam 25.50" },
      from: { id: 12345, first_name: "Husband" },
      reply: vi.fn(),
    } as any;

    await handleTextExpense(
      mockCtx,
      mockAIService,
      mockCategoryRepository,
      mockBudgetRepository,
      mockTransactionRepository
    );

    expect(mockTransactionRepository.addTransactions).toHaveBeenCalledWith([
      expect.objectContaining({ budgetId: "UNASSIGNED" }),
    ]);
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining("No active budget window found"),
      { parse_mode: "MarkdownV2" }
    );
  });
});
