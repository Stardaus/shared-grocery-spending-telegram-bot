import { GoogleGenerativeAI } from "@google/generative-ai";
import { LineItem, LineItemSchema, GeminiParsedReceipt, GeminiParsedReceiptSchema } from "../../domain/transaction.js";
import { buildTextExpensePrompt, buildReceiptVisionPrompt } from "./prompts.js";
import { logger } from "../../utils/logger.js";

export interface IAIService {
  parseTextExpense(text: string, allowedCategories: string[]): Promise<LineItem>;
  parseReceiptImage(imageBuffer: Buffer, mimeType: string, allowedCategories: string[]): Promise<GeminiParsedReceipt>;
}

export class GeminiAIService implements IAIService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly apiKey: string;
  private readonly candidateModels = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-2.0-flash",
    "gemini-1.5-pro",
  ];

  constructor(apiKey: string) {
    this.apiKey = apiKey.trim().replace(/^["']|["']$/g, "");
    this.genAI = new GoogleGenerativeAI(this.apiKey);
  }

  private async generateContentWithFallback(
    promptOrParts: any,
    generationConfig?: any
  ): Promise<string> {
    let lastError: any = null;

    for (const modelName of this.candidateModels) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: modelName,
          generationConfig,
        });
        const result = await model.generateContent(promptOrParts);
        return result.response.text();
      } catch (err: any) {
        lastError = err;
        const is404Or429 =
          err?.status === 404 ||
          err?.status === 429 ||
          err?.message?.includes("404") ||
          err?.message?.includes("429");

        if (is404Or429) {
          logger.warn(
            `Gemini model ${modelName} returned status ${err?.status || "error"}, trying fallback model...`
          );
          continue;
        }
        throw err;
      }
    }

    logger.error(
      {
        lastError,
        hint: "All Gemini model endpoints returned 404. Please verify GEMINI_API_KEY at https://aistudio.google.com and ensure Generative Language API is enabled.",
      },
      "Gemini API key or model access failure"
    );

    throw new Error(
      "Gemini API model access failed (404). Please verify your GEMINI_API_KEY at https://aistudio.google.com"
    );
  }

  /**
   * Parses free-form text input (e.g., "100 ringgit - ayam") into a structured LineItem.
   */
  async parseTextExpense(text: string, allowedCategories: string[]): Promise<LineItem> {
    const prompt = buildTextExpensePrompt(text, allowedCategories);
    const rawJson = await this.generateContentWithFallback(prompt, {
      responseMimeType: "application/json",
    });

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
    const prompt = buildReceiptVisionPrompt(allowedCategories);
    const imagePart = {
      inlineData: {
        data: imageBuffer.toString("base64"),
        mimeType,
      },
    };

    const rawJson = await this.generateContentWithFallback([prompt, imagePart], {
      responseMimeType: "application/json",
    });

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
