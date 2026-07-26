import { describe, it, expect } from "vitest";
import {
  DEFAULT_CATEGORIES,
  CategoryRecordSchema,
  createCategorySchema,
} from "../../src/domain/category.js";

describe("Category Domain Model (category.ts)", () => {
  describe("DEFAULT_CATEGORIES", () => {
    it("should contain standard default categories", () => {
      expect(DEFAULT_CATEGORIES).toContain("Meat & Seafood");
      expect(DEFAULT_CATEGORIES).toContain("Produce & Veggies");
      expect(DEFAULT_CATEGORIES).toContain("Dairy & Refrigerated");
      expect(DEFAULT_CATEGORIES).toContain("Pantry & Snacks");
      expect(DEFAULT_CATEGORIES).toContain("Household & Toiletries");
      expect(DEFAULT_CATEGORIES).toContain("Beverages");
      expect(DEFAULT_CATEGORIES).toContain("Uncategorized");
      expect(DEFAULT_CATEGORIES.length).toBe(7);
    });
  });

  describe("CategoryRecordSchema", () => {
    it("should validate valid category database record", () => {
      const validRecord = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Meat & Seafood",
        createdAt: "2026-03-25T10:00:00.000Z",
      };

      const parsed = CategoryRecordSchema.parse(validRecord);
      expect(parsed.id).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(parsed.name).toBe("Meat & Seafood");
    });

    it("should reject non-UUID id or empty name", () => {
      const invalidRecord = {
        id: "invalid-uuid",
        name: "",
        createdAt: "invalid-date",
      };

      expect(() => CategoryRecordSchema.parse(invalidRecord)).toThrow();
    });
  });

  describe("createCategorySchema", () => {
    it("should validate against default categories when active list is empty", () => {
      const schema = createCategorySchema([]);
      expect(schema.parse("Meat & Seafood")).toBe("Meat & Seafood");
      expect(() => schema.parse("Invalid Category")).toThrow();
    });

    it("should validate against custom runtime category list", () => {
      const customList = ["Pets & Aquarium", "Organic Vegetables"];
      const schema = createCategorySchema(customList);

      expect(schema.parse("Pets & Aquarium")).toBe("Pets & Aquarium");
      expect(() => schema.parse("Meat & Seafood")).toThrow(); // not in custom list
    });
  });
});
