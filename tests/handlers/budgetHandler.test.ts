import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleSetBudget, handleSummary } from "../../src/services/telegram/handlers/budgetHandler.js";

describe("Budget Handler (budgetHandler.ts)", () => {
  const mockBudgetRepository = {
    createBudget: vi.fn(),
    getActiveBudget: vi.fn(),
    getBudgetSummary: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleSetBudget", () => {
    it("should parse valid /setbudget parameters and create budget window", async () => {
      mockBudgetRepository.createBudget.mockResolvedValueOnce({
        id: "b-123",
        amount: 1500,
        startDate: "2026-03-25",
        endDate: "2026-04-24",
        createdAt: "2026-03-25T10:00:00.000Z",
        createdBy: "12345678",
      });

      mockBudgetRepository.getBudgetSummary.mockResolvedValueOnce({
        activeBudget: {
          id: "b-123",
          amount: 1500,
          startDate: "2026-03-25",
          endDate: "2026-04-24",
          createdAt: "2026-03-25T10:00:00.000Z",
          createdBy: "12345678",
        },
        totalSpent: 0,
        remainingBalance: 1500,
        transactionCount: 0,
        isOverBudget: false,
      });

      const mockCtx = {
        match: "1500 25/03/2026 24/04/2026",
        from: { id: 12345678, first_name: "Husband" },
        reply: vi.fn(),
      } as any;

      await handleSetBudget(mockCtx, mockBudgetRepository);

      expect(mockBudgetRepository.createBudget).toHaveBeenCalledWith({
        amount: 1500,
        startDate: "2026-03-25",
        endDate: "2026-04-24",
        createdBy: "12345678",
      });

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Budget Summary"),
        { parse_mode: "MarkdownV2" }
      );
    });

    it("should reject invalid command syntax", async () => {
      const mockCtx = {
        match: "invalid params",
        from: { id: 12345678 },
        reply: vi.fn(),
      } as any;

      await handleSetBudget(mockCtx, mockBudgetRepository);

      expect(mockBudgetRepository.createBudget).not.toHaveBeenCalled();
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Invalid syntax"),
        { parse_mode: "MarkdownV2" }
      );
    });

    it("should reject when end date is before start date", async () => {
      const mockCtx = {
        match: "1500 24/04/2026 25/03/2026", // End date before start date
        from: { id: 12345678 },
        reply: vi.fn(),
      } as any;

      await handleSetBudget(mockCtx, mockBudgetRepository);

      expect(mockBudgetRepository.createBudget).not.toHaveBeenCalled();
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining("End date must be after start date"),
        { parse_mode: "MarkdownV2" }
      );
    });

    it("should reject non-positive amount", async () => {
      const mockCtx = {
        match: "-500 25/03/2026 24/04/2026",
        from: { id: 12345678 },
        reply: vi.fn(),
      } as any;

      await handleSetBudget(mockCtx, mockBudgetRepository);

      expect(mockBudgetRepository.createBudget).not.toHaveBeenCalled();
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Invalid amount"),
        { parse_mode: "MarkdownV2" }
      );
    });

    it("should reject invalid date format strings", async () => {
      const mockCtx = {
        match: "1500 invalid-date 24/04/2026",
        from: { id: 12345678 },
        reply: vi.fn(),
      } as any;

      await handleSetBudget(mockCtx, mockBudgetRepository);

      expect(mockBudgetRepository.createBudget).not.toHaveBeenCalled();
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Invalid date format"),
        { parse_mode: "MarkdownV2" }
      );
    });
  });

  describe("handleSummary", () => {
    it("should reply with budget summary card", async () => {
      mockBudgetRepository.getBudgetSummary.mockResolvedValueOnce({
        activeBudget: {
          id: "b-123",
          amount: 1500,
          startDate: "2026-03-25",
          endDate: "2026-04-24",
          createdAt: "2026-03-25T10:00:00.000Z",
          createdBy: "12345678",
        },
        totalSpent: 500,
        remainingBalance: 1000,
        transactionCount: 5,
        isOverBudget: false,
      });

      const mockCtx = {
        reply: vi.fn(),
      } as any;

      await handleSummary(mockCtx, mockBudgetRepository);

      expect(mockBudgetRepository.getBudgetSummary).toHaveBeenCalled();
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Budget Summary"),
        { parse_mode: "MarkdownV2" }
      );
    });
  });
});
