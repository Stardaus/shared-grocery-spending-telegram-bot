import { GoogleGenerativeAI } from "@google/generative-ai";
import { LineItem, LineItemSchema, GeminiParsedReceipt, GeminiParsedReceiptSchema } from "../../domain/transaction.js";
import { buildTextExpensePrompt, buildReceiptVisionPrompt } from "./prompts.js";

export interface IAIService {
  parseTextExpense(text: string, allowedCategories: string[]): Promise<LineItem>;
  parseReceiptImage(imageBuffer: Buffer, mimeType: string, allowedCategories: string[]): Promise<GeminiParsedReceipt>;
}

export class GeminiAIService implements IAIService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly modelName = "gemini-1.5-flash";

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Parses free-form text input (e.g., "100 ringgit - ayam") into a structured LineItem.
   */
  async parseTextExpense(text: string, allowedCategories: string[]): Promise<LineItem> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = buildTextExpensePrompt(text, allowedCategories);
    const result = await model.generateContent(prompt);
    const rawJson = result.response.text();

    const parsed = JSON.parse(rawJson);

    // Fallback category if Gemini returned an invalid category string
    if (parsed && typeof parsed.category === "string" && !allowedCategories.includes(parsed.category)) {
      parsed.category = "Uncategorized";
    }

    return LineItemSchema.parse(parsed);
  }

  /**
   * Parses a receipt image buffer into structured GeminiParsedReceipt.
   */
  async parseReceiptImage(
    imageBuffer: Buffer,
    mimeType: string,
    allowedCategories: string[]
  ): Promise<GeminiParsedReceipt> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = buildReceiptVisionPrompt(allowedCategories);
    const imagePart = {
      inlineData: {
        data: imageBuffer.toString("base64"),
        mimeType,
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const rawJson = result.response.text();

    const parsed = JSON.parse(rawJson);

    if (parsed && Array.isArray(parsed.items)) {
      for (const item of parsed.items) {
        if (item && typeof item.category === "string" && !allowedCategories.includes(item.category)) {
          item.category = "Uncategorized";
        }
      }
    }

    return GeminiParsedReceiptSchema.parse(parsed);
  }
}
