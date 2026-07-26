import { z } from "zod";

export const SetBudgetInputSchema = z.object({
  amount: z.number().positive("Budget amount must be a positive number"),
  startDateFormatted: z
    .string()
    .regex(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[012])\/\d{4}$/, "Date must be DD/MM/YYYY"),
  endDateFormatted: z
    .string()
    .regex(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[012])\/\d{4}$/, "Date must be DD/MM/YYYY"),
});

export type SetBudgetInput = z.infer<typeof SetBudgetInputSchema>;

export const BudgetSchema = z.object({
  id: z.string().uuid("Budget ID must be a valid UUID"),
  amount: z.number().positive("Budget amount must be positive"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be ISO Date YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be ISO Date YYYY-MM-DD"),
  createdAt: z.string().datetime("createdAt must be a valid ISO 8601 datetime string"),
  createdBy: z.string().min(1, "createdBy must not be empty"),
});

export type Budget = z.infer<typeof BudgetSchema>;

export interface BudgetSummary {
  activeBudget: Budget | null;
  totalSpent: number;
  remainingBalance: number;
  transactionCount: number;
  isOverBudget: boolean;
}
