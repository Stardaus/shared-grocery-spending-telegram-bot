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
    mockGenerateContent, // Exported for test assertions
  };
});

import { GeminiAIService } from "../../src/services/ai/gemini.js";
import { mockGenerateContent } from "@google/generative-ai";

describe("Gemini Text Expense Parser (geminiText.test.ts)", () => {
  let aiService: GeminiAIService;
  const apiKey = "mock_gemini_api_key";
  const allowedCategories = ["Meat & Seafood", "Produce & Veggies", "Dairy & Refrigerated", "Uncategorized"];

  beforeEach(() => {
    vi.clearAllMocks();
    aiService = new GeminiAIService(apiKey);
  });

  it("should parse free-form text expense into structured LineItem", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            item: "Ayam Goreng",
            amount: 25.5,
            category: "Meat & Seafood",
          }),
      },
    });

    const parsed = await aiService.parseTextExpense("ayam RM25.50", allowedCategories);
    expect(parsed).toEqual({
      item: "Ayam Goreng",
      amount: 25.5,
      category: "Meat & Seafood",
    });
  });

  it("should fallback to Uncategorized if Gemini picks an invalid category", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            item: "Fast Food",
            amount: 15.0,
            category: "Unknown Invalid Category",
          }),
      },
    });

    const parsed = await aiService.parseTextExpense("Fast Food 15", allowedCategories);
    expect(parsed.category).toBe("Uncategorized");
  });

  it("should fallback to parseLocalTextExpense if Gemini API fails completely", async () => {
    mockGenerateContent.mockRejectedValue(new Error("API Error 404/429"));

    const parsed = await aiService.parseTextExpense("Carrot 10", allowedCategories);
    expect(parsed).toEqual({
      item: "Carrot",
      amount: 10,
      category: "Produce & Veggies",
    });
  });

  it("should throw error if Gemini JSON output does not match LineItem structure", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify({ invalidField: "bad" }),
      },
    });

    await expect(aiService.parseTextExpense("bad text", allowedCategories)).rejects.toThrow();
  });
});
