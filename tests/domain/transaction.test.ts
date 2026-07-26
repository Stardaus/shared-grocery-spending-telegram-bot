import { describe, it, expect } from "vitest";
import {
  LineItemSchema,
  GeminiParsedReceiptSchema,
  TransactionRecordSchema,
} from "../../src/domain/transaction.js";

describe("Transaction Domain Models (transaction.ts)", () => {
  describe("LineItemSchema", () => {
    it("should validate a valid line item", () => {
      const item = { item: "Ayam Segar", amount: 25.5, category: "Meat & Seafood" };
      const parsed = LineItemSchema.parse(item);

      expect(parsed.item).toBe("Ayam Segar");
      expect(parsed.amount).toBe(25.5);
      expect(parsed.category).toBe("Meat & Seafood");
    });

    it("should reject empty item name or non-positive amount", () => {
      expect(() => LineItemSchema.parse({ item: "", amount: 25.5, category: "Meat & Seafood" })).toThrow();
      expect(() => LineItemSchema.parse({ item: "Ayam", amount: 0, category: "Meat & Seafood" })).toThrow();
      expect(() => LineItemSchema.parse({ item: "Ayam", amount: -10, category: "Meat & Seafood" })).toThrow();
    });
  });

  describe("GeminiParsedReceiptSchema", () => {
    it("should validate a valid Gemini receipt extraction output", () => {
      const receipt = {
        items: [
          { item: "Ayam Segar", amount: 22.0, category: "Meat & Seafood" },
          { item: "Susu UHT", amount: 7.5, category: "Dairy & Refrigerated" },
        ],
        detectedTotal: 29.5,
        confidence: 0.95,
        mismatchWarning: false,
      };

      const parsed = GeminiParsedReceiptSchema.parse(receipt);
      expect(parsed.items.length).toBe(2);
      expect(parsed.detectedTotal).toBe(29.5);
      expect(parsed.confidence).toBe(0.95);
      expect(parsed.mismatchWarning).toBe(false);
    });

    it("should reject empty items array or confidence out of 0..1 range", () => {
      const emptyItems = { items: [], detectedTotal: 0, confidence: 1, mismatchWarning: false };
      const invalidConfidence = {
        items: [{ item: "Ayam", amount: 10, category: "Meat" }],
        detectedTotal: 10,
        confidence: 1.5,
        mismatchWarning: false,
      };

      expect(() => GeminiParsedReceiptSchema.parse(emptyItems)).toThrow();
      expect(() => GeminiParsedReceiptSchema.parse(invalidConfidence)).toThrow();
    });
  });

  describe("TransactionRecordSchema", () => {
    it("should validate a valid Google Sheets transaction database record", () => {
      const record = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        date: "2026-03-25",
        item: "Ayam Segar",
        category: "Meat & Seafood",
        amount: 25.5,
        purchaserId: "12345678",
        purchaserName: "Husband",
        rawInput: "ayam RM25.50",
        budgetId: "budget-uuid-123",
      };

      const parsed = TransactionRecordSchema.parse(record);
      expect(parsed.id).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(parsed.date).toBe("2026-03-25");
      expect(parsed.purchaserName).toBe("Husband");
    });

    it("should reject invalid date format or non-UUID id", () => {
      const invalidRecord = {
        id: "not-a-uuid",
        date: "25/03/2026", // should be ISO YYYY-MM-DD
        item: "Ayam",
        category: "Meat",
        amount: 25,
        purchaserId: "123",
        purchaserName: "Husband",
        rawInput: "ayam 25",
        budgetId: "b1",
      };

      expect(() => TransactionRecordSchema.parse(invalidRecord)).toThrow();
    });
  });
});
