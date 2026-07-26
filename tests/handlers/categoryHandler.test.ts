import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  handleCategories,
  handleAddCategory,
  handleDeleteCategory,
} from "../../src/services/telegram/handlers/categoryHandler.js";

describe("Category Handler (categoryHandler.ts)", () => {
  const mockCategoryRepository = {
    getCategories: vi.fn(),
    addCategory: vi.fn(),
    deleteCategory: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleCategories", () => {
    it("should list active categories", async () => {
      mockCategoryRepository.getCategories.mockResolvedValueOnce([
        { id: "c1", name: "Meat & Seafood", createdAt: "2026-03-25T00:00:00Z" },
        { id: "c2", name: "Produce & Veggies", createdAt: "2026-03-25T00:00:00Z" },
      ]);

      const mockCtx = { reply: vi.fn() } as any;

      await handleCategories(mockCtx, mockCategoryRepository);

      expect(mockCategoryRepository.getCategories).toHaveBeenCalled();
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Meat & Seafood"),
        { parse_mode: "MarkdownV2" }
      );
    });
  });

  describe("handleAddCategory", () => {
    it("should add a new category", async () => {
      mockCategoryRepository.addCategory.mockResolvedValueOnce({
        id: "c3",
        name: "Pet Food",
        createdAt: "2026-03-25T00:00:00Z",
      });

      const mockCtx = {
        match: "Pet Food",
        reply: vi.fn(),
      } as any;

      await handleAddCategory(mockCtx, mockCategoryRepository);

      expect(mockCategoryRepository.addCategory).toHaveBeenCalledWith("Pet Food");
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Pet Food"),
        { parse_mode: "MarkdownV2" }
      );
    });

    it("should reject empty category name", async () => {
      const mockCtx = { match: "", reply: vi.fn() } as any;

      await handleAddCategory(mockCtx, mockCategoryRepository);

      expect(mockCategoryRepository.addCategory).not.toHaveBeenCalled();
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Invalid syntax"),
        { parse_mode: "MarkdownV2" }
      );
    });
  });

  describe("handleDeleteCategory", () => {
    it("should delete existing category", async () => {
      mockCategoryRepository.deleteCategory.mockResolvedValueOnce(true);

      const mockCtx = { match: "Pet Food", reply: vi.fn() } as any;

      await handleDeleteCategory(mockCtx, mockCategoryRepository);

      expect(mockCategoryRepository.deleteCategory).toHaveBeenCalledWith("Pet Food");
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining("deleted successfully"),
        { parse_mode: "MarkdownV2" }
      );
    });

    it("should reply with error if category to delete is not found", async () => {
      mockCategoryRepository.deleteCategory.mockResolvedValueOnce(false);

      const mockCtx = { match: "NonExistent", reply: vi.fn() } as any;

      await handleDeleteCategory(mockCtx, mockCategoryRepository);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining("not found"),
        { parse_mode: "MarkdownV2" }
      );
    });

    it("should reject empty category name on delete", async () => {
      const mockCtx = { match: "", reply: vi.fn() } as any;

      await handleDeleteCategory(mockCtx, mockCategoryRepository);

      expect(mockCategoryRepository.deleteCategory).not.toHaveBeenCalled();
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Invalid syntax"),
        { parse_mode: "MarkdownV2" }
      );
    });
  });
});
