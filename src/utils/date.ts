/** All date operations use Asia/Kuala_Lumpur (MYT, UTC+8). */
export const TIMEZONE = "Asia/Kuala_Lumpur" as const;

/**
 * Validates if a string is a valid DD/MM/YYYY calendar date.
 * Rejects invalid syntax as well as non-existent dates (e.g. 31/02/2026).
 */
export function isValidDDMMYYYY(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== "string") {
    return false;
  }

  const match = dateStr.trim().match(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[012])\/(\d{4})$/);
  if (!match) {
    return false;
  }

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // 0-indexed month
  const year = parseInt(match[3], 10);

  const dateObj = new Date(year, month, day);
  return (
    dateObj.getFullYear() === year &&
    dateObj.getMonth() === month &&
    dateObj.getDate() === day
  );
}

/**
 * Converts a DD/MM/YYYY string to YYYY-MM-DD ISO date string.
 * Throws an error if the date string is invalid.
 */
export function parseDDMMYYYYToISO(dateStr: string): string {
  if (!isValidDDMMYYYY(dateStr)) {
    throw new Error(`Invalid date format or value: "${dateStr}". Expected DD/MM/YYYY.`);
  }

  const [day, month, year] = dateStr.trim().split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/**
 * Converts a YYYY-MM-DD ISO date string to DD/MM/YYYY format.
 * Throws an error if the input string is not a valid ISO date.
 */
export function formatISOToDDMMYYYY(isoStr: string): string {
  if (!isoStr || typeof isoStr !== "string") {
    throw new Error(`Invalid ISO date string: "${isoStr}".`);
  }

  const match = isoStr.trim().match(/^(\d{4})-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/);
  if (!match) {
    throw new Error(`Invalid ISO date format: "${isoStr}". Expected YYYY-MM-DD.`);
  }

  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/**
 * Checks if targetIsoDate falls inclusively between startIsoDate and endIsoDate.
 * All inputs must be YYYY-MM-DD strings.
 */
export function isDateWithinRange(
  targetIsoDate: string,
  startIsoDate: string,
  endIsoDate: string
): boolean {
  return targetIsoDate >= startIsoDate && targetIsoDate <= endIsoDate;
}

/**
 * Gets current date formatted as YYYY-MM-DD in Asia/Kuala_Lumpur (MYT, UTC+8) timezone.
 */
export function getTodayISO(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date()); // en-CA locale formats as YYYY-MM-DD
}

/**
 * Gets current ISO 8601 timestamp string (e.g. 2026-07-26T15:29:00.000Z).
 */
export function getNowISO(): string {
  return new Date().toISOString();
}

