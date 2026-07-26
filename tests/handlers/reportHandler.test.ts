import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleBreakdown } from "../../src/services/telegram/handlers/reportHandler.js";

describe("Category Breakdown Report Handler (reportHandler.ts)", () => {
  const mockBudgetRepository = {
    getBudgetSummary: vi.fn(),
  } as any;

  const mockTransactionRepository = {
    getTransactionsForBudget: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reply with category breakdown report when active budget exists", async () => {
    mockBudgetRepository.getBudgetSummary.mockResolvedValueOnce({
      activeBudget: {
        id: "b-123",
        amount: 1000,
        startDate: "2026-03-25",
        endDate: "2026-04-24",
        createdAt: "2026-03-25T00:00:00Z",
        createdBy: "u1",
      },
      totalSpent: 400,
      remainingBalance: 600,
      transactionCount: 2,
      isOverBudget: false,
    });

    mockTransactionRepository.getTransactionsForBudget.mockResolvedValueOnce([
      {
        id: "t-1",
        date: "2026-03-25",
        item: "Ikan Siakap",
        category: "Meat & Seafood",
        amount: 300,
        purchaserId: "u1",
        purchaserName: "User",
        rawInput: "ikan 300",
        budgetId: "b-123",
      },
      {
        id: "t-2",
        date: "2026-03-26",
        item: "Sayur Bayam",
        category: "Produce & Veggies",
        amount: 100,
        purchaserId: "u1",
        purchaserName: "User",
        rawInput: "bayam 100",
        budgetId: "b-123",
      },
    ]);

    const mockCtx = { reply: vi.fn() } as any;

    await handleBreakdown(mockCtx, mockBudgetRepository, mockTransactionRepository);

    expect(mockBudgetRepository.getBudgetSummary).toHaveBeenCalled();
    expect(mockTransactionRepository.getTransactionsForBudget).toHaveBeenCalledWith("b-123");
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Spending Breakdown by Category"),
      { parse_mode: "MarkdownV2" }
    );
  });

  it("should reply with warning message if no active budget exists", async () => {
    mockBudgetRepository.getBudgetSummary.mockResolvedValueOnce({
      activeBudget: null,
      totalSpent: 0,
      remainingBalance: 0,
      transactionCount: 0,
      isOverBudget: false,
    });

    const mockCtx = { reply: vi.fn() } as any;

    await handleBreakdown(mockCtx, mockBudgetRepository, mockTransactionRepository);

    expect(mockTransactionRepository.getTransactionsForBudget).not.toHaveBeenCalled();
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining("No active budget window found"),
      { parse_mode: "MarkdownV2" }
    );
  });
});
