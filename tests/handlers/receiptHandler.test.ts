import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  handleReceiptPhoto,
  handleConfirmReceiptCallback,
  handleCancelReceiptCallback,
  ReceiptSessionMap,
} from "../../src/services/telegram/handlers/receiptHandler.js";

describe("Receipt Photo Handler (receiptHandler.ts)", () => {
  const mockAIService = {
    parseTextExpense: vi.fn(),
    parseReceiptImage: vi.fn(),
  };

  const mockCategoryRepository = {
    getCategories: vi.fn(),
  } as any;

  const mockBudgetRepository = {
    getActiveBudget: vi.fn(),
    getBudgetSummary: vi.fn(),
  } as any;

  const mockTransactionRepository = {
    addTransactions: vi.fn(),
  } as any;

  let sessionMap: ReceiptSessionMap;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionMap = new Map();
  });

  describe("handleReceiptPhoto", () => {
    it("should process photo, store verification session, and send preview card with inline keyboard", async () => {
      mockCategoryRepository.getCategories.mockResolvedValueOnce([{ id: "c1", name: "Meat & Seafood" }]);
      mockAIService.parseReceiptImage.mockResolvedValueOnce({
        items: [{ item: "Ayam Segar", amount: 22.0, category: "Meat & Seafood" }],
        detectedTotal: 22.0,
        confidence: 0.95,
        mismatchWarning: false,
      });

      const mockCtx = {
        message: {
          photo: [
            { file_id: "small_file" },
            { file_id: "large_file", file_size: 100000 },
          ],
        },
        from: { id: 12345, first_name: "Husband" },
        api: {
          getFile: vi.fn().mockResolvedValueOnce({ file_path: "photos/file_1.jpg" }),
        },
        reply: vi.fn(),
      } as any;

      // Mock fetch file buffer
      global.fetch = vi.fn().mockResolvedValueOnce({
        arrayBuffer: vi.fn().mockResolvedValueOnce(new ArrayBuffer(10)),
      }) as any;

      await handleReceiptPhoto("bot_token_123", mockCtx, mockAIService, mockCategoryRepository, sessionMap);

      expect(mockAIService.parseReceiptImage).toHaveBeenCalled();
      expect(sessionMap.size).toBe(1);
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Receipt Verification Preview"),
        expect.objectContaining({ reply_markup: expect.anything() })
      );
    });

    it("should reply with error if file_path download fails", async () => {
      const mockCtx = {
        message: { photo: [{ file_id: "photo_1" }] },
        api: { getFile: vi.fn().mockResolvedValueOnce({ file_path: null }) },
        reply: vi.fn(),
      } as any;

      await handleReceiptPhoto("token", mockCtx, mockAIService, mockCategoryRepository, sessionMap);
      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining("Could not download receipt image"));
    });

    it("should reply with error if no items extracted from receipt", async () => {
      mockCategoryRepository.getCategories.mockResolvedValueOnce([]);
      mockAIService.parseReceiptImage.mockResolvedValueOnce({ items: [], detectedTotal: 0, confidence: 0, mismatchWarning: false });

      const mockCtx = {
        message: { photo: [{ file_id: "photo_1" }] },
        api: { getFile: vi.fn().mockResolvedValueOnce({ file_path: "path.jpg" }) },
        reply: vi.fn(),
      } as any;

      global.fetch = vi.fn().mockResolvedValueOnce({
        arrayBuffer: vi.fn().mockResolvedValueOnce(new ArrayBuffer(10)),
      }) as any;

      await handleReceiptPhoto("token", mockCtx, mockAIService, mockCategoryRepository, sessionMap);
      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining("Could not clearly read receipt line items"), { parse_mode: "MarkdownV2" });
    });
  });

  describe("handleConfirmReceiptCallback", () => {
    it("should write items to Sheets and update message on Confirm All button click", async () => {
      const sessionId = "session-123";
      sessionMap.set(sessionId, {
        sessionId,
        chatId: 100,
        userId: "12345",
        parsedReceipt: {
          items: [{ item: "Ayam Segar", amount: 22.0, category: "Meat & Seafood" }],
          detectedTotal: 22.0,
          confidence: 0.95,
          mismatchWarning: false,
        },
        createdAt: Date.now(),
      });

      mockBudgetRepository.getActiveBudget.mockResolvedValueOnce({
        id: "b-100",
        amount: 1000,
        startDate: "2026-03-25",
        endDate: "2026-04-24",
        createdAt: "",
        createdBy: "",
      });

      mockTransactionRepository.addTransactions.mockResolvedValueOnce([]);
      mockBudgetRepository.getBudgetSummary.mockResolvedValueOnce({
        activeBudget: null,
        totalSpent: 22,
        remainingBalance: 978,
        transactionCount: 1,
        isOverBudget: false,
      });

      const mockCtx = {
        callbackQuery: { data: `confirm_receipt:${sessionId}` },
        from: { id: 12345, first_name: "Husband" },
        answerCallbackQuery: vi.fn(),
        editMessageText: vi.fn(),
      } as any;

      await handleConfirmReceiptCallback(
        mockCtx,
        sessionMap,
        mockBudgetRepository,
        mockTransactionRepository
      );

      expect(mockTransactionRepository.addTransactions).toHaveBeenCalled();
      expect(sessionMap.has(sessionId)).toBe(false); // Session cleared
      expect(mockCtx.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining("Receipt Confirmed"),
        { parse_mode: "MarkdownV2" }
      );
    });
  });

  describe("handleCancelReceiptCallback", () => {
    it("should cancel receipt and update message on Cancel button click", async () => {
      const sessionId = "session-456";
      sessionMap.set(sessionId, {
        sessionId,
        chatId: 100,
        userId: "12345",
        parsedReceipt: { items: [], detectedTotal: 0, confidence: 0, mismatchWarning: false },
        createdAt: Date.now(),
      });

      const mockCtx = {
        callbackQuery: { data: `cancel_receipt:${sessionId}` },
        answerCallbackQuery: vi.fn(),
        editMessageText: vi.fn(),
      } as any;

      await handleCancelReceiptCallback(mockCtx, sessionMap);

      expect(sessionMap.has(sessionId)).toBe(false); // Session cleared
      expect(mockCtx.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining("Receipt Upload Canceled"),
        { parse_mode: "MarkdownV2" }
      );
    });
  });
});
