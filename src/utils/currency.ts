/**
 * Rounds a floating point amount to 2 decimal places.
 */
export function roundToTwoDecimals(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Formats a numerical amount into Malaysian Ringgit (MYR) currency format.
 * Examples:
 * - 1234.5 -> "RM 1,234.50"
 * - -120.5 -> "-RM 120.50"
 * - 0 -> "RM 0.00"
 */
export function formatMYR(amount: number): string {
  const rounded = roundToTwoDecimals(amount);
  const isNegative = rounded < 0;
  const absAmount = Math.abs(rounded);

  const formattedNum = absAmount.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return isNegative ? `-RM ${formattedNum}` : `RM ${formattedNum}`;
}

/**
 * Parses free-form text or currency inputs into a number representing MYR value.
 * Examples:
 * - "100.50" -> 100.5
 * - "RM25" -> 25
 * - "RM 100.50" -> 100.5
 * - "100 ringgit" -> 100
 * - "ayam" -> null
 */
export function parseMYR(input: string): number | null {
  if (!input || typeof input !== "string") {
    return null;
  }

  const cleaned = input.trim().toLowerCase();
  const isNegative = cleaned.startsWith("-");

  // Match floating point or integer numbers with optional RM prefix or ringgit suffix
  const match = cleaned.match(/(?:rm\s*)?(\d+(?:\.\d+)?)(?:\s*ringgit)?/i);

  if (!match || !match[1]) {
    return null;
  }

  const parsed = parseFloat(match[1]);
  if (isNaN(parsed)) {
    return null;
  }

  const val = isNegative ? -parsed : parsed;
  return roundToTwoDecimals(val);
}
