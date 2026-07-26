/**
 * System prompts for Gemini 1.5 Flash AI Service.
 */

export function buildTextExpensePrompt(userText: string, allowedCategories: string[]): string {
  const categoryListStr = allowedCategories.join(", ");

  return `You are a financial parsing assistant for a household grocery tracking bot in Malaysia.
Parse the user's free-form expense message into a single JSON object.

Allowed categories: [${categoryListStr}]

Rules:
1. "item": Clean, title-cased item description (e.g., "Ayam Segar", "Susu UHT").
2. "amount": Numerical monetary cost in MYR (Ringgit) as a positive float/number.
3. "category": Pick the single best fitting category from the allowed categories list. If none fit well, use "Uncategorized".

User Message: "${userText}"

Respond ONLY with valid JSON matching this schema:
{
  "item": "string",
  "amount": number,
  "category": "string"
}`;
}

export function buildReceiptVisionPrompt(allowedCategories: string[]): string {
  const categoryListStr = allowedCategories.join(", ");

  return `You are an expert OCR receipt parsing assistant for a grocery tracking bot in Malaysia.
Analyze the receipt photo image provided and extract all purchased grocery line items.

Allowed categories: [${categoryListStr}]

Rules:
1. Extract every individual purchased item with its price and category.
2. Filter out or tag store metadata, subtotals, tax/SST lines, or non-purchased text.
3. "detectedTotal": The grand total displayed at the bottom of the receipt. If unreadable, sum the extracted items.
4. "confidence": A float between 0.0 and 1.0 indicating your confidence in the receipt readability.
5. "mismatchWarning": Set to true if the sum of extracted item prices does not equal the detectedTotal.

Respond ONLY with valid JSON matching this schema:
{
  "items": [
    {
      "item": "string",
      "amount": number,
      "category": "string"
    }
  ],
  "detectedTotal": number,
  "confidence": number,
  "mismatchWarning": boolean
}`;
}
