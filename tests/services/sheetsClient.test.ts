import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock googleapis
vi.mock("googleapis", () => {
  const mockValues = {
    get: vi.fn(),
    append: vi.fn(),
    update: vi.fn(),
  };

  const mockSheets = {
    spreadsheets: {
      values: mockValues,
    },
  };

  return {
    google: {
      auth: {
        JWT: vi.fn().mockImplementation(() => ({
          authorize: vi.fn().mockResolvedValue(true),
        })),
      },
      sheets: vi.fn().mockReturnValue(mockSheets),
    },
    mockValues, // Exported for test assertions
  };
});

import { getSheetsClient, getRows, appendRows, updateRows } from "../../src/services/sheets/client.js";
import { google } from "googleapis";

describe("Google Sheets API Client (client.ts)", () => {
  const mockEnv = {
    NODE_ENV: "test" as const,
    TELEGRAM_BOT_TOKEN: "mock_token",
    ALLOWED_USER_IDS: ["123"],
    GEMINI_API_KEY: "mock_key",
    GOOGLE_SPREADSHEET_ID: "mock_sheet_id",
    GOOGLE_SERVICE_ACCOUNT_EMAIL: "service@account.com",
    GOOGLE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nFAKE_KEY\\n-----END PRIVATE KEY-----\\n",
    LOG_LEVEL: "info" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize Google JWT auth client with env credentials", () => {
    const client = getSheetsClient(mockEnv);

    expect(google.auth.JWT).toHaveBeenCalledWith({
      email: "service@account.com",
      key: "-----BEGIN PRIVATE KEY-----\nFAKE_KEY\n-----END PRIVATE KEY-----\n",
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    expect(google.sheets).toHaveBeenCalledWith({ version: "v4", auth: expect.anything() });
    expect(client).toBeDefined();
  });

  it("should fetch rows from specified spreadsheet range", async () => {
    const client = getSheetsClient(mockEnv);
    const mockValuesGet = (google.sheets({ version: "v4" }).spreadsheets.values.get as any);
    mockValuesGet.mockResolvedValueOnce({
      data: {
        values: [
          ["id", "amount"],
          ["1", "100"],
        ],
      },
    });

    const rows = await getRows(client, "sheet_id_123", "Budgets!A1:B10");
    expect(mockValuesGet).toHaveBeenCalledWith({
      spreadsheetId: "sheet_id_123",
      range: "Budgets!A1:B10",
    });
    expect(rows).toEqual([
      ["id", "amount"],
      ["1", "100"],
    ]);
  });

  it("should return empty array if getRows returns no values", async () => {
    const client = getSheetsClient(mockEnv);
    const mockValuesGet = (google.sheets({ version: "v4" }).spreadsheets.values.get as any);
    mockValuesGet.mockResolvedValueOnce({ data: {} });

    const rows = await getRows(client, "sheet_id_123", "Budgets!A1:B10");
    expect(rows).toEqual([]);
  });

  it("should append rows to specified spreadsheet range", async () => {
    const client = getSheetsClient(mockEnv);
    const mockValuesAppend = (google.sheets({ version: "v4" }).spreadsheets.values.append as any);
    mockValuesAppend.mockResolvedValueOnce({ data: { updates: { updatedRows: 1 } } });

    const rowsToAppend = [["uuid-1", "2026-03-25", "Ayam", "Meat", "25.5"]];
    await appendRows(client, "sheet_id_123", "Transactions!A:E", rowsToAppend);

    expect(mockValuesAppend).toHaveBeenCalledWith({
      spreadsheetId: "sheet_id_123",
      range: "Transactions!A:E",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: rowsToAppend },
    });
  });

  it("should update rows in specified spreadsheet range", async () => {
    const client = getSheetsClient(mockEnv);
    const mockValuesUpdate = (google.sheets({ version: "v4" }).spreadsheets.values.update as any);
    mockValuesUpdate.mockResolvedValueOnce({ data: { updatedCells: 5 } });

    const rowsToUpdate = [["uuid-1", "2026-03-25", "Ayam", "Meat", "25.5"]];
    await updateRows(client, "sheet_id_123", "Transactions!A2:E2", rowsToUpdate);

    expect(mockValuesUpdate).toHaveBeenCalledWith({
      spreadsheetId: "sheet_id_123",
      range: "Transactions!A2:E2",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: rowsToUpdate },
    });
  });
});
