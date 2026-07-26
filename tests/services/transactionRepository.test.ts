import { describe, it, expect, vi, beforeEach } from "vitest";
import { TransactionRepository } from "../../src/services/sheets/transactionRepository.js";

describe("Transaction Repository (transactionRepository.ts)", () => {
  const mockSheetsClient = {
    spreadsheets: {
      values: {
        get: vi.fn(),
        append: vi.fn(),
        update: vi.fn(),
        clear: vi.fn(),
      },
    },
  } as any;

  const spreadsheetId = "mock_spreadsheet_id";
  let repository: TransactionRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new TransactionRepository(mockSheetsClient, spreadsheetId);
  });

  describe("addTransactions", () => {
    it("should batch-append transactions to Transactions tab with generated UUIDs", async () => {
      mockSheetsClient.spreadsheets.values.append.mockResolvedValueOnce({ data: {} });

      const txInput = [
        {
          date: "2026-03-25",
          item: "Ayam Segar",
          category: "Meat & Seafood",
          amount: 25.5,
          purchaserId: "12345678",
          purchaserName: "Husband",
          rawInput: "ayam 25.50",
          budgetId: "123e4567-e89b-12d3-a456-426614174000",
        },
      ];

      const added = await repository.addTransactions(txInput);
      expect(added.length).toBe(1);
      expect(added[0].id).toBeDefined();
      expect(added[0].item).toBe("Ayam Segar");
      expect(added[0].amount).toBe(25.5);

      expect(mockSheetsClient.spreadsheets.values.append).toHaveBeenCalledWith({
        spreadsheetId,
        range: "Transactions!A:I",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [
            [
              added[0].id,
              "2026-03-25",
              "Ayam Segar",
              "Meat & Seafood",
              "25.5",
              "12345678",
              "Husband",
              "ayam 25.50",
              "123e4567-e89b-12d3-a456-426614174000",
            ],
          ],
        },
      });
    });
  });

  describe("getTransactionsForBudget", () => {
    it("should return transactions filtered by budgetId", async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValueOnce({
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
              "2026-03-25",
              "Ayam",
              "Meat",
              "25.5",
              "u1",
              "Husband",
              "raw",
              "budget-target",
            ],
            [
              "123e4567-e89b-12d3-a456-426614174002",
              "2026-03-26",
              "Ikan",
              "Meat",
              "15",
              "u1",
              "Husband",
              "raw",
              "budget-other",
            ],
          ],
        },
      });

      const transactions = await repository.getTransactionsForBudget("budget-target");
      expect(transactions.length).toBe(1);
      expect(transactions[0].item).toBe("Ayam");
    });
  });

  describe("archiveTransactions", () => {
    it("should move transactions older than beforeYear to Archive tab", async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValueOnce({
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
              "2024-12-15", // Old transaction from 2024
              "Ayam 2024",
              "Meat",
              "20",
              "u1",
              "Husband",
              "raw",
              "budget-old",
            ],
            [
              "123e4567-e89b-12d3-a456-426614174002",
              "2026-03-25", // Current transaction from 2026
              "Ayam 2026",
              "Meat",
              "25",
              "u1",
              "Husband",
              "raw",
              "budget-current",
            ],
          ],
        },
      });
      mockSheetsClient.spreadsheets.values.append.mockResolvedValueOnce({ data: {} });
      mockSheetsClient.spreadsheets.values.clear.mockResolvedValueOnce({ data: {} });
      mockSheetsClient.spreadsheets.values.update.mockResolvedValueOnce({ data: {} });

      const result = await repository.archiveTransactions(2025);
      expect(result.archivedCount).toBe(1);
      expect(result.archiveTabName).toBe("Transactions_Archive_2025");

      expect(mockSheetsClient.spreadsheets.values.clear).toHaveBeenCalled();
      expect(mockSheetsClient.spreadsheets.values.update).toHaveBeenCalled();
    });
  });
});
