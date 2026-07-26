import { google, sheets_v4 } from "googleapis";
import { Env } from "../../config/env.js";

/**
 * Creates an authenticated Google Sheets API v4 client instance.
 * Normalizes double-escaped newlines in private keys.
 */
export function getSheetsClient(env: Env): sheets_v4.Sheets {
  const privateKey = env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

/**
 * Fetches raw 2D array of string values from a specified spreadsheet range.
 */
export async function getRows(
  client: sheets_v4.Sheets,
  spreadsheetId: string,
  range: string
): Promise<string[][]> {
  const response = await client.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return (response.data.values as string[][]) || [];
}

/**
 * Appends rows to a specified spreadsheet range using USER_ENTERED format.
 */
export async function appendRows(
  client: sheets_v4.Sheets,
  spreadsheetId: string,
  range: string,
  rows: string[][]
): Promise<void> {
  await client.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: rows,
    },
  });
}

/**
 * Updates rows in a specified spreadsheet range using USER_ENTERED format.
 */
export async function updateRows(
  client: sheets_v4.Sheets,
  spreadsheetId: string,
  range: string,
  rows: string[][]
): Promise<void> {
  await client.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: rows,
    },
  });
}
