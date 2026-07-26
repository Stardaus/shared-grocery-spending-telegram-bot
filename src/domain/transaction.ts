import { z } from "zod";

export const LineItemSchema = z.object({
  item: z.string().min(1, "Item name cannot be empty"),
  amount: z.number().positive("Amount must be greater than zero"),
  category: z.string().min(1, "Category is required"),
});

export type LineItem = z.infer<typeof LineItemSchema>;

export const GeminiParsedReceiptSchema = z.object({
  items: z.array(LineItemSchema).min(1, "At least one item must be extracted"),
  detectedTotal: z.number().nonnegative("detectedTotal must be non-negative"),
  confidence: z.number().min(0).max(1, "confidence must be between 0 and 1"),
  mismatchWarning: z.boolean(),
});

export type GeminiParsedReceipt = z.infer<typeof GeminiParsedReceiptSchema>;

export const TransactionRecordSchema = z.object({
  id: z.string().uuid("Transaction ID must be a valid UUID"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Transaction date must be ISO Date YYYY-MM-DD"),
  item: z.string().min(1, "Item name cannot be empty"),
  category: z.string().min(1, "Category is required"),
  amount: z.number().positive("Amount must be positive"),
  purchaserId: z.string().min(1, "purchaserId cannot be empty"),
  purchaserName: z.string().min(1, "purchaserName cannot be empty"),
  rawInput: z.string(),
  budgetId: z.string().min(1, "budgetId cannot be empty"),
});

export type TransactionRecord = z.infer<typeof TransactionRecordSchema>;

export interface ReceiptVerificationSession {
  sessionId: string;
  chatId: number;
  userId: string;
  parsedReceipt: GeminiParsedReceipt;
  createdAt: number;
}
