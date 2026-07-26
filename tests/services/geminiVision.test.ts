import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @google/generative-ai
vi.mock("@google/generative-ai", () => {
  const mockGenerateContent = vi.fn();
  const mockGetGenerativeModel = vi.fn().mockReturnValue({
    generateContent: mockGenerateContent,
  });

  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    })),
    mockGenerateContent,
  };
});

import { GeminiAIService } from "../../src/services/ai/gemini.js";
import { mockGenerateContent } from "@google/generative-ai";

describe("Gemini Vision Receipt Parser (geminiVision.test.ts)", () => {
  let aiService: GeminiAIService;
  const apiKey = "mock_gemini_api_key";
  const allowedCategories = ["Meat & Seafood", "Produce & Veggies", "Dairy & Refrigerated", "Uncategorized"];
  const dummyBuffer = Buffer.from("fake_image_data");

  beforeEach(() => {
    vi.clearAllMocks();
    aiService = new GeminiAIService(apiKey);
  });

  it("should parse multi-item receipt image into GeminiParsedReceipt", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            items: [
              { item: "Ayam Segar 1kg", amount: 22.0, category: "Meat & Seafood" },
              { item: "Susu UHT 1L", amount: 7.5, category: "Dairy & Refrigerated" },
            ],
            detectedTotal: 29.5,
            confidence: 0.95,
            mismatchWarning: false,
          }),
      },
    });

    const parsed = await aiService.parseReceiptImage(dummyBuffer, "image/jpeg", allowedCategories);

    expect(parsed.items.length).toBe(2);
    expect(parsed.items[0].item).toBe("Ayam Segar 1kg");
    expect(parsed.items[1].item).toBe("Susu UHT 1L");
    expect(parsed.detectedTotal).toBe(29.5);
    expect(parsed.confidence).toBe(0.95);
    expect(parsed.mismatchWarning).toBe(false);
  });

  it("should flag mismatchWarning if item sum does not equal total", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            items: [{ item: "Ayam Segar 1kg", amount: 20.0, category: "Meat & Seafood" }],
            detectedTotal: 30.0,
            confidence: 0.9,
            mismatchWarning: true,
          }),
      },
    });

    const parsed = await aiService.parseReceiptImage(dummyBuffer, "image/jpeg", allowedCategories);
    expect(parsed.mismatchWarning).toBe(true);
  });

  it("should handle low confidence responses", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            items: [{ item: "Unclear Text", amount: 5.0, category: "Uncategorized" }],
            detectedTotal: 5.0,
            confidence: 0.2, // Low confidence
            mismatchWarning: false,
          }),
      },
    });

    const parsed = await aiService.parseReceiptImage(dummyBuffer, "image/jpeg", allowedCategories);
    expect(parsed.confidence).toBe(0.2);
  });

  it("should normalize invalid category names to Uncategorized", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            items: [{ item: "Toy Car", amount: 15.0, category: "Electronics & Toys" }],
            detectedTotal: 15.0,
            confidence: 0.85,
            mismatchWarning: false,
          }),
      },
    });

    const parsed = await aiService.parseReceiptImage(dummyBuffer, "image/jpeg", allowedCategories);
    expect(parsed.items[0].category).toBe("Uncategorized");
  });
});
