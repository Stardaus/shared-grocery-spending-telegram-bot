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
      // Try each model up to 2 attempts with a 1.5s backoff delay on 429 rate limits
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const model = this.genAI.getGenerativeModel({
            model: modelName,
            generationConfig,
          });
          const result = await model.generateContent(promptOrParts);
          return result.response.text();
        } catch (err: any) {
          lastError = err;
          const status = err?.status;
          const msg = String(err?.message || err);

          const is404 = status === 404 || msg.includes("404");
          const is429 = status === 429 || msg.includes("429") || msg.includes("Quota exceeded");

          if (is404) {
            logger.warn(`Gemini model ${modelName} returned 404, trying fallback model...`);
            break; // Skip to next candidate model
          }

          if (is429) {
            logger.warn(
              `Gemini model ${modelName} hit rate limit (429) on attempt ${attempt}/2, backing off 1.5s...`
            );
            await new Promise((resolve) => setTimeout(resolve, 1500));
            continue; // Retry same model or move to next
          }

          throw err;
        }
      }
    }

    logger.error(
      {
        lastErrorMsg: String(lastError?.message || lastError),
        lastErrorStatus: lastError?.status,
      },
      "All Gemini candidate models failed"
    );

    throw lastError;
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
