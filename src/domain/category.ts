import { z } from "zod";

export const DEFAULT_CATEGORIES = [
  "Meat & Seafood",
  "Produce & Veggies",
  "Dairy & Refrigerated",
  "Pantry & Snacks",
  "Household & Toiletries",
  "Beverages",
  "Uncategorized",
] as const;

export const CategoryRecordSchema = z.object({
  id: z.string().uuid("Category ID must be a valid UUID"),
  name: z.string().min(1, "Category name cannot be empty"),
  createdAt: z.string().datetime("createdAt must be a valid ISO 8601 datetime string"),
});

export type CategoryRecord = z.infer<typeof CategoryRecordSchema>;

/**
 * Creates a dynamic Zod schema to validate inputs against a runtime list of active categories.
 * Falls back to DEFAULT_CATEGORIES if the list is empty.
 */
export function createCategorySchema(allowedCategories: string[]) {
  const activeList = allowedCategories.length > 0 ? allowedCategories : [...DEFAULT_CATEGORIES];
  return z.string().refine((val) => activeList.includes(val), {
    message: `Invalid category. Must be one of: ${activeList.join(", ")}`,
  });
}
