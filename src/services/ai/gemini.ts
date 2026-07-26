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
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-3-flash-preview",
    "gemini-2.5-flash",
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
   * Automatically falls back to local regex parsing if Gemini AI API is unavailable.
   */
  async parseTextExpense(text: string, allowedCategories: string[]): Promise<LineItem> {
    try {
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
    } catch (err) {
      logger.warn(
        { error: err, text },
        "Gemini AI text parsing failed or rate-limited. Falling back to local regex parser."
      );
      return parseLocalTextExpense(text, allowedCategories);
    }
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

/**
 * Local deterministic regex fallback parser for text expenses when AI API is unavailable.
 */
export function parseLocalTextExpense(text: string, allowedCategories: string[]): LineItem {
  const cleaned = text.trim();

  // Match numeric amount patterns (e.g., 10, 15.50, RM 25.50, 100 ringgit)
  const amountMatch = cleaned.match(/(?:RM\s*)?(\d+(?:\.\d{1,2})?)(?:\s*ringgit)?/i);

  if (!amountMatch) {
    throw new Error(`Could not parse expense amount from input: "${text}"`);
  }

  const amount = parseFloat(amountMatch[1]);
  let item = cleaned.replace(amountMatch[0], "").replace(/[-:]/g, "").trim();

  if (!item) {
    item = "Grocery Item";
  }

  // Basic category keyword matching fallback
  const itemLower = item.toLowerCase();
  let category = "Uncategorized";

  if (/ayam|fish|ikan|daging|seafood|chicken|meat|pork|beef|shrimp|udang/i.test(itemLower)) {
    category = allowedCategories.find((c) => /meat|seafood/i.test(c)) || category;
  } else if (/carrot|sayur|fruit|apple|bawang|produce|veg|tomato|potato/i.test(itemLower)) {
    category = allowedCategories.find((c) => /produce|veg/i.test(c)) || category;
  } else if (/milk|susu|cheese|keju|butter|yogurt/i.test(itemLower)) {
    category = allowedCategories.find((c) => /dairy|refrigerated/i.test(c)) || category;
  } else if (/bread|roti|biskut|snack|maggi|noodle|rice|beras|pantry/i.test(itemLower)) {
    category = allowedCategories.find((c) => /pantry|snack/i.test(c)) || category;
  }

  if (!allowedCategories.includes(category)) {
    category = "Uncategorized";
  }

  return LineItemSchema.parse({
    item,
    amount,
    category,
  });
}
