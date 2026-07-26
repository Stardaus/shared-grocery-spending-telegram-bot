import { describe, it, expect } from "vitest";
import { SetBudgetInputSchema, BudgetSchema } from "../../src/domain/budget.js";

describe("Budget Domain Models (budget.ts)", () => {
  describe("SetBudgetInputSchema", () => {
    it("should validate valid /setbudget input parameters", () => {
      const input = {
        amount: 1500,
        startDateFormatted: "25/03/2026",
        endDateFormatted: "24/04/2026",
      };

      const parsed = SetBudgetInputSchema.parse(input);
      expect(parsed.amount).toBe(1500);
      expect(parsed.startDateFormatted).toBe("25/03/2026");
      expect(parsed.endDateFormatted).toBe("24/04/2026");
    });

    it("should reject non-positive budget amounts", () => {
      const zeroInput = { amount: 0, startDateFormatted: "25/03/2026", endDateFormatted: "24/04/2026" };
      const negativeInput = { amount: -500, startDateFormatted: "25/03/2026", endDateFormatted: "24/04/2026" };

      expect(() => SetBudgetInputSchema.parse(zeroInput)).toThrow();
      expect(() => SetBudgetInputSchema.parse(negativeInput)).toThrow();
    });

    it("should reject non-DD/MM/YYYY date formats", () => {
      const invalidDateInput = {
        amount: 1500,
        startDateFormatted: "2026-03-25",
        endDateFormatted: "24-04-2026",
      };

      expect(() => SetBudgetInputSchema.parse(invalidDateInput)).toThrow();
    });
  });

  describe("BudgetSchema", () => {
    it("should validate valid budget database record", () => {
      const record = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        amount: 1500,
        startDate: "2026-03-25",
        endDate: "2026-04-24",
        createdAt: "2026-03-25T10:00:00.000Z",
        createdBy: "12345678",
      };

      const parsed = BudgetSchema.parse(record);
      expect(parsed.id).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(parsed.startDate).toBe("2026-03-25");
    });

    it("should reject non-ISO YYYY-MM-DD dates or non-UUID id", () => {
      const invalidRecord = {
        id: "invalid-id",
        amount: 1500,
        startDate: "25/03/2026",
        endDate: "2026-04-24",
        createdAt: "2026-03-25T10:00:00.000Z",
        createdBy: "12345678",
      };

      expect(() => BudgetSchema.parse(invalidRecord)).toThrow();
    });
  });
});
