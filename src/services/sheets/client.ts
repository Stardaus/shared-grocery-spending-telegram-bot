import { google, sheets_v4 } from "googleapis";
import { Env } from "../../config/env.js";
import { DEFAULT_CATEGORIES } from "../../domain/category.js";
import { getNowISO } from "../../utils/date.js";
import { logger } from "../../utils/logger.js";

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
 * Automatically inspects the target Google Sheet and creates missing tabs
 * (Categories, Budgets, Transactions) with default headers and initial categories.
 */
export async function ensureSheetTabsExist(
  client: sheets_v4.Sheets,
  spreadsheetId: string
): Promise<void> {
  try {
    const spreadsheet = await client.spreadsheets.get({ spreadsheetId });
    const existingTitles =
      spreadsheet.data.sheets?.map((s) => s.properties?.title).filter((t): t is string => !!t) || [];

    const requiredTabs = ["Categories", "Budgets", "Transactions"];
    const missingTabs = requiredTabs.filter((tab) => !existingTitles.includes(tab));

    if (missingTabs.length === 0) {
      return;
    }

    logger.info(`Creating missing Google Sheet tabs: ${missingTabs.join(", ")}`);

    const requests = missingTabs.map((tab) => ({
      addSheet: { properties: { title: tab } },
    }));

    await client.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });

    if (missingTabs.includes("Categories")) {
      const nowIso = getNowISO();
      const categoryRows = [
        ["id", "name", "createdAt"],
        ...DEFAULT_CATEGORIES.map((catName) => [crypto.randomUUID(), catName, nowIso]),
      ];
      await appendRows(client, spreadsheetId, "Categories!A1", categoryRows);
    }

    if (missingTabs.includes("Budgets")) {
      const budgetHeader = [["id", "amount", "startDate", "endDate", "createdAt", "createdBy"]];
      await appendRows(client, spreadsheetId, "Budgets!A1", budgetHeader);
    }

    if (missingTabs.includes("Transactions")) {
      const transactionHeader = [
        [
          "id",
          "date",
          "item",
          "category",
          "amount",
          "purchaserId",
          "purchaserName",
          "rawInput",
          "budgetId",
          "createdAt",
        ],
      ];
      await appendRows(client, spreadsheetId, "Transactions!A1", transactionHeader);
    }
  } catch (err) {
    logger.warn({ error: err }, "Could not auto-initialize Google Sheet tabs");
  }
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
