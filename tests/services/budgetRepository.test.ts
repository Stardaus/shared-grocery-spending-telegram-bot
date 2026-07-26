import { describe, it, expect, vi, beforeEach } from "vitest";
import { BudgetRepository } from "../../src/services/sheets/budgetRepository.js";

describe("Budget Repository (budgetRepository.ts)", () => {
  const mockSheetsClient = {
    spreadsheets: {
      values: {
        get: vi.fn(),
        append: vi.fn(),
      },
    },
  } as any;

  const spreadsheetId = "mock_spreadsheet_id";
  let repository: BudgetRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new BudgetRepository(mockSheetsClient, spreadsheetId);
  });

  describe("createBudget", () => {
    it("should append a new budget row to Budgets tab with generated UUID and timestamp", async () => {
      mockSheetsClient.spreadsheets.values.append.mockResolvedValueOnce({ data: {} });

      const newBudget = await repository.createBudget({
        amount: 1500,
        startDate: "2026-03-25",
        endDate: "2026-04-24",
        createdBy: "12345678",
      });

      expect(newBudget.id).toBeDefined();
      expect(newBudget.amount).toBe(1500);
      expect(newBudget.startDate).toBe("2026-03-25");
      expect(newBudget.endDate).toBe("2026-04-24");

      expect(mockSheetsClient.spreadsheets.values.append).toHaveBeenCalledWith({
        spreadsheetId,
        range: "Budgets!A:F",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [
            [
              newBudget.id,
              "1500",
              "2026-03-25",
              "2026-04-24",
              expect.any(String),
              "12345678",
            ],
          ],
        },
      });
    });
  });

  describe("getActiveBudget", () => {
    it("should return the budget window matching current ISO date", async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValueOnce({
        data: {
          values: [
            ["id", "amount", "startDate", "endDate", "createdAt", "createdBy"],
            [
              "123e4567-e89b-12d3-a456-426614174000",
              "1500",
              "2026-03-25",
              "2026-04-24",
              "2026-03-25T10:00:00.000Z",
              "12345",
            ],
          ],
        },
      });

      const active = await repository.getActiveBudget("2026-04-01");
      expect(active).not.toBeNull();
      expect(active?.amount).toBe(1500);
      expect(active?.id).toBe("123e4567-e89b-12d3-a456-426614174000");
    });

    it("should return null if no budget window covers current date", async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValueOnce({
        data: {
          values: [
            ["id", "amount", "startDate", "endDate", "createdAt", "createdBy"],
            [
              "123e4567-e89b-12d3-a456-426614174000",
              "1500",
              "2026-03-25",
              "2026-04-24",
              "2026-03-25T10:00:00.000Z",
              "12345",
            ],
          ],
        },
      });

      const active = await repository.getActiveBudget("2026-05-01");
      expect(active).toBeNull();
    });
  });

  describe("getBudgetSummary", () => {
    it("should compute budget summary by combining active budget and transactions", async () => {
      // 1st get call for Budgets, 2nd get call for Transactions
      mockSheetsClient.spreadsheets.values.get
        .mockResolvedValueOnce({
          data: {
            values: [
              ["id", "amount", "startDate", "endDate", "createdAt", "createdBy"],
              [
                "123e4567-e89b-12d3-a456-426614174000",
                "1000",
                "2026-03-25",
                "2026-04-24",
                "2026-03-25T10:00:00.000Z",
                "12345",
              ],
            ],
          },
        })
        .mockResolvedValueOnce({
          data: {
            values: [
              [
                "id",
                "date",
                "item",
                "category",
                "amount",
                "purchaserId",
                "purchaserName",
                "rawInput",
                "budgetId",
              ],
              [
                "123e4567-e89b-12d3-a456-426614174001",
                "2026-03-26",
                "Ayam",
                "Meat",
                "250",
                "u1",
                "Husband",
                "ayam 250",
                "123e4567-e89b-12d3-a456-426614174000",
              ],
              [
                "123e4567-e89b-12d3-a456-426614174002",
                "2026-03-27",
                "Fish",
                "Meat",
                "150",
                "u1",
                "Husband",
                "fish 150",
                "123e4567-e89b-12d3-a456-426614174000",
              ],
            ],
          },
        });

      const summary = await repository.getBudgetSummary("2026-04-01");
      expect(summary.activeBudget).not.toBeNull();
      expect(summary.totalSpent).toBe(400);
      expect(summary.remainingBalance).toBe(600);
      expect(summary.transactionCount).toBe(2);
      expect(summary.isOverBudget).toBe(false);
    });

    it("should return zero summary if no active budget exists", async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValueOnce({ data: { values: [] } });

      const summary = await repository.getBudgetSummary("2026-04-01");
      expect(summary.activeBudget).toBeNull();
      expect(summary.totalSpent).toBe(0);
      expect(summary.remainingBalance).toBe(0);
      expect(summary.transactionCount).toBe(0);
      expect(summary.isOverBudget).toBe(false);
    });
  });
});
