import { describe, it, expect } from "vitest";
import {
  escapeMarkdownV2,
  formatBudgetSummaryMessage,
  formatSingleExpenseConfirmation,
  formatReceiptVerificationMessage,
  formatCategoryBreakdownReport,
} from "../../src/utils/telegramFormat.js";

describe("Telegram Markdown V2 Formatter (telegramFormat.ts)", () => {
  describe("escapeMarkdownV2", () => {
    it("should escape all Telegram MarkdownV2 reserved characters", () => {
      const raw = "Price: RM 100.50! (Item: Ayam & Fish) [Meat_Seafood] *Special* ~Discount~ `code` >note #1 +2 -3 =0 | {a} .";
      const escaped = escapeMarkdownV2(raw);

      expect(escaped).toBe(
        "Price: RM 100\\.50\\! \\(Item: Ayam & Fish\\) \\[Meat\\_Seafood\\] \\*Special\\* \\~Discount\\~ \\`code\\` \\>note \\#1 \\+2 \\-3 \\=0 \\| \\{a\\} \\."
      );
    });

    it("should handle empty or plain strings without reserved chars", () => {
      expect(escapeMarkdownV2("Ayam")).toBe("Ayam");
      expect(escapeMarkdownV2("")).toBe("");
      // @ts-expect-error testing invalid runtime input
      expect(escapeMarkdownV2(null)).toBe("");
    });
  });

  describe("formatBudgetSummaryMessage", () => {
    it("should format active budget summary card properly", () => {
      const summary = {
        activeBudget: {
          id: "123-uuid",
          amount: 1500,
          startDate: "2026-03-25",
          endDate: "2026-04-24",
          createdAt: "2026-03-25T00:00:00Z",
          createdBy: "user1",
        },
        totalSpent: 450.5,
        remainingBalance: 1049.5,
        transactionCount: 12,
        isOverBudget: false,
      };

      const formatted = formatBudgetSummaryMessage(summary);
      expect(formatted).toContain("📊 *Budget Summary*");
      expect(formatted).toContain("25/03/2026");
      expect(formatted).toContain("24/04/2026");
      expect(formatted).toContain("1,500\\.00");
      expect(formatted).toContain("1,049\\.50");
    });

    it("should format low balance warning when remaining balance is under 15%", () => {
      const summary = {
        activeBudget: {
          id: "123-uuid",
          amount: 1000,
          startDate: "2026-03-25",
          endDate: "2026-04-24",
          createdAt: "2026-03-25T00:00:00Z",
          createdBy: "user1",
        },
        totalSpent: 900,
        remainingBalance: 100, // 10% remaining
        transactionCount: 10,
        isOverBudget: false,
      };

      const formatted = formatBudgetSummaryMessage(summary);
      expect(formatted).toContain("Low Balance Warning");
    });

    it("should format over budget warning badge when isOverBudget is true", () => {
      const summary = {
        activeBudget: {
          id: "123-uuid",
          amount: 1000,
          startDate: "2026-03-25",
          endDate: "2026-04-24",
          createdAt: "2026-03-25T00:00:00Z",
          createdBy: "user1",
        },
        totalSpent: 1100,
        remainingBalance: -100,
        transactionCount: 10,
        isOverBudget: true,
      };

      const formatted = formatBudgetSummaryMessage(summary);
      expect(formatted).toContain("OVER BUDGET");
    });

    it("should format no-active-budget message when summary has null activeBudget", () => {
      const summary = {
        activeBudget: null,
        totalSpent: 0,
        remainingBalance: 0,
        transactionCount: 0,
        isOverBudget: false,
      };

      const formatted = formatBudgetSummaryMessage(summary);
      expect(formatted).toContain("⚠️ No active budget window found");
    });
  });

  describe("formatSingleExpenseConfirmation", () => {
    it("should format single expense confirmation message", () => {
      const transaction = {
        id: "tx-1",
        date: "2026-03-25",
        item: "Ayam Goreng",
        category: "Meat & Seafood",
        amount: 25.5,
        purchaserId: "12345",
        purchaserName: "Husband",
        rawInput: "ayam RM25.50",
        budgetId: "b-1",
      };

      const formatted = formatSingleExpenseConfirmation(transaction, 974.5);
      expect(formatted).toContain("✅ *Expense Logged*");
      expect(formatted).toContain("Ayam Goreng");
      expect(formatted).toContain("Meat & Seafood");
      expect(formatted).toContain("25\\.50");
      expect(formatted).toContain("974\\.50");
    });
  });

  describe("formatReceiptVerificationMessage", () => {
    it("should format multi-item receipt verification preview card", () => {
      const items = [
        { item: "Ayam Segar", amount: 22.0, category: "Meat & Seafood" },
        { item: "Susu UHT", amount: 7.5, category: "Dairy & Refrigerated" },
      ];

      const formatted = formatReceiptVerificationMessage(items, 29.5, false);
      expect(formatted).toContain("🧾 *Receipt Verification Preview*");
      expect(formatted).toContain("Ayam Segar");
      expect(formatted).toContain("Susu UHT");
      expect(formatted).toContain("29\\.50");
      expect(formatted).not.toContain("Total Mismatch");
    });

    it("should include mismatch warning badge when mismatchWarning is true", () => {
      const items = [{ item: "Ayam Segar", amount: 22.0, category: "Meat & Seafood" }];
      const formatted = formatReceiptVerificationMessage(items, 30.0, true);

      expect(formatted).toContain("Total Mismatch");
    });
  });

  describe("formatCategoryBreakdownReport", () => {
    it("should format category breakdown report card", () => {
      const summary = {
        activeBudget: {
          id: "b-1",
          amount: 1000,
          startDate: "2026-03-25",
          endDate: "2026-04-24",
          createdAt: "2026-03-25T00:00:00Z",
          createdBy: "user1",
        },
        totalSpent: 400,
        remainingBalance: 600,
        transactionCount: 2,
        isOverBudget: false,
      };

      const transactions = [
        {
          id: "t-1",
          date: "2026-03-25",
          item: "Ikan Siakap",
          category: "Meat & Seafood",
          amount: 300,
          purchaserId: "u1",
          purchaserName: "User",
          rawInput: "ikan 300",
          budgetId: "b-1",
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
          budgetId: "b-1",
        },
      ];

      const formatted = formatCategoryBreakdownReport(summary, transactions);
      expect(formatted).toContain("📈 *Spending Breakdown by Category*");
      expect(formatted).toContain("Meat & Seafood");
      expect(formatted).toContain("Produce & Veggies");
    });

    it("should return warning message if activeBudget is null", () => {
      const summary = {
        activeBudget: null,
        totalSpent: 0,
        remainingBalance: 0,
        transactionCount: 0,
        isOverBudget: false,
      };

      const formatted = formatCategoryBreakdownReport(summary, []);
      expect(formatted).toContain("No active budget window found");
    });

    it("should display message when no transactions exist", () => {
      const summary = {
        activeBudget: {
          id: "b-1",
          amount: 1000,
          startDate: "2026-03-25",
          endDate: "2026-04-24",
          createdAt: "2026-03-25T00:00:00Z",
          createdBy: "user1",
        },
        totalSpent: 0,
        remainingBalance: 1000,
        transactionCount: 0,
        isOverBudget: false,
      };

      const formatted = formatCategoryBreakdownReport(summary, []);
      expect(formatted).toContain("No transactions recorded yet");
    });
  });
});
