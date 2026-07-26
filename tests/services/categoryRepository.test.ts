import { describe, it, expect, vi, beforeEach } from "vitest";
import { CategoryRepository } from "../../src/services/sheets/categoryRepository.js";
import { DEFAULT_CATEGORIES } from "../../src/domain/category.js";

describe("Category Repository (categoryRepository.ts)", () => {
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
  let repository: CategoryRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new CategoryRepository(mockSheetsClient, spreadsheetId);
  });

  describe("getCategories", () => {
    it("should return categories from Google Sheets tab", async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValueOnce({
        data: {
          values: [
            ["id", "name", "createdAt"],
            ["123e4567-e89b-12d3-a456-426614174001", "Meat & Seafood", "2026-03-25T10:00:00.000Z"],
            ["123e4567-e89b-12d3-a456-426614174002", "Snacks", "2026-03-25T10:00:00.000Z"],
          ],
        },
      });

      const categories = await repository.getCategories();
      expect(categories.length).toBe(2);
      expect(categories[0].name).toBe("Meat & Seafood");
      expect(categories[1].name).toBe("Snacks");
    });

    it("should return DEFAULT_CATEGORIES if Google Sheet tab is empty or only has headers", async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValueOnce({
        data: {
          values: [["id", "name", "createdAt"]],
        },
      });

      const categories = await repository.getCategories();
      expect(categories.length).toBe(DEFAULT_CATEGORIES.length);
      expect(categories.map((c) => c.name)).toEqual([...DEFAULT_CATEGORIES]);
    });
  });

  describe("addCategory", () => {
    it("should append a new category row to Categories tab", async () => {
      mockSheetsClient.spreadsheets.values.append.mockResolvedValueOnce({ data: {} });

      const newCategory = await repository.addCategory("Organic Produce");
      expect(newCategory.name).toBe("Organic Produce");
      expect(newCategory.id).toBeDefined();

      expect(mockSheetsClient.spreadsheets.values.append).toHaveBeenCalledWith({
        spreadsheetId,
        range: "Categories!A:C",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[newCategory.id, "Organic Produce", expect.any(String)]],
        },
      });
    });
  });

  describe("deleteCategory", () => {
    it("should rewrite Categories tab excluding the deleted category", async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValueOnce({
        data: {
          values: [
            ["id", "name", "createdAt"],
            ["uuid-1", "Meat & Seafood", "2026-03-25T10:00:00.000Z"],
            ["uuid-2", "Snacks", "2026-03-25T10:00:00.000Z"],
          ],
        },
      });
      mockSheetsClient.spreadsheets.values.clear.mockResolvedValueOnce({ data: {} });
      mockSheetsClient.spreadsheets.values.update.mockResolvedValueOnce({ data: {} });

      const success = await repository.deleteCategory("Snacks");
      expect(success).toBe(true);

      expect(mockSheetsClient.spreadsheets.values.clear).toHaveBeenCalledWith({
        spreadsheetId,
        range: "Categories!A:C",
      });
      expect(mockSheetsClient.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId,
        range: "Categories!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [
            ["id", "name", "createdAt"],
            ["uuid-1", "Meat & Seafood", "2026-03-25T10:00:00.000Z"],
          ],
        },
      });
    });

    it("should return false if category to delete is not found", async () => {
      mockSheetsClient.spreadsheets.values.get.mockResolvedValueOnce({
        data: {
          values: [
            ["id", "name", "createdAt"],
            ["uuid-1", "Meat & Seafood", "2026-03-25T10:00:00.000Z"],
          ],
        },
      });

      const success = await repository.deleteCategory("NonExistent");
      expect(success).toBe(false);
    });
  });
});
