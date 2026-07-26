import { sheets_v4 } from "googleapis";
import { TransactionRecord, TransactionRecordSchema } from "../../domain/transaction.js";
import { roundToTwoDecimals } from "../../utils/currency.js";
import { getRows, appendRows, updateRows } from "./client.js";

export interface ITransactionRepository {
  addTransactions(transactions: Omit<TransactionRecord, "id">[]): Promise<TransactionRecord[]>;
  getTransactionsForBudget(budgetId: string): Promise<TransactionRecord[]>;
  archiveTransactions(beforeYear: number): Promise<{ archivedCount: number; archiveTabName: string }>;
}

export class TransactionRepository implements ITransactionRepository {
  constructor(
    private readonly sheetsClient: sheets_v4.Sheets,
    private readonly spreadsheetId: string
  ) {}

  /**
   * Batch-appends single or multiple transaction records to the Transactions sheet tab.
   */
  async addTransactions(
    transactionInputs: Omit<TransactionRecord, "id">[]
  ): Promise<TransactionRecord[]> {
    const validatedRecords: TransactionRecord[] = [];
    const rowsToAppend: string[][] = [];

    for (const input of transactionInputs) {
      const record: TransactionRecord = {
        id: crypto.randomUUID(),
        date: input.date,
        item: input.item.trim(),
        category: input.category.trim(),
        amount: roundToTwoDecimals(input.amount),
        purchaserId: input.purchaserId,
        purchaserName: input.purchaserName.trim(),
        rawInput: input.rawInput,
        budgetId: input.budgetId,
      };

      const validated = TransactionRecordSchema.parse(record);
      validatedRecords.push(validated);

      rowsToAppend.push([
        validated.id,
        validated.date,
        validated.item,
        validated.category,
        validated.amount.toString(),
        validated.purchaserId,
        validated.purchaserName,
        validated.rawInput,
        validated.budgetId,
      ]);
    }

    if (rowsToAppend.length > 0) {
      await appendRows(this.sheetsClient, this.spreadsheetId, "Transactions!A:I", rowsToAppend);
    }

    return validatedRecords;
  }

  /**
   * Retrieves all transaction records associated with a specific budgetId.
   */
  async getTransactionsForBudget(budgetId: string): Promise<TransactionRecord[]> {
    const rows = await getRows(this.sheetsClient, this.spreadsheetId, "Transactions!A:I");
    const dataRows = rows.length > 0 && rows[0][0] === "id" ? rows.slice(1) : rows;

    const records: TransactionRecord[] = [];

    for (const row of dataRows) {
      if (row.length >= 9 && row[8] === budgetId) {
        const record = {
          id: row[0],
          date: row[1],
          item: row[2],
          category: row[3],
          amount: parseFloat(row[4]),
          purchaserId: row[5],
          purchaserName: row[6],
          rawInput: row[7],
          budgetId: row[8],
        };

        const validated = TransactionRecordSchema.safeParse(record);
        if (validated.success) {
          records.push(validated.data);
        }
      }
    }

    return records;
  }

  /**
   * Moves transaction records older than beforeYear to an archive tab (Transactions_Archive_YYYY)
   * and removes them from the active Transactions tab.
   */
  async archiveTransactions(
    beforeYear: number
  ): Promise<{ archivedCount: number; archiveTabName: string }> {
    const rows = await getRows(this.sheetsClient, this.spreadsheetId, "Transactions!A:I");

    if (rows.length <= 1) {
      return { archivedCount: 0, archiveTabName: `Transactions_Archive_${beforeYear}` };
    }

    const header = rows[0];
    const dataRows = rows.slice(1);

    const eligibleForArchive: string[][] = [];
    const keepInActive: string[][] = [];

    for (const row of dataRows) {
      if (row.length >= 2 && row[1]) {
        const txYear = parseInt(row[1].substring(0, 4), 10);
        if (!isNaN(txYear) && txYear <= beforeYear) {
          eligibleForArchive.push(row);
        } else {
          keepInActive.push(row);
        }
      } else {
        keepInActive.push(row);
      }
    }

    if (eligibleForArchive.length === 0) {
      return { archivedCount: 0, archiveTabName: `Transactions_Archive_${beforeYear}` };
    }

    const archiveTabName = `Transactions_Archive_${beforeYear}`;

    // Append archived rows to Archive tab
    await appendRows(
      this.sheetsClient,
      this.spreadsheetId,
      `${archiveTabName}!A:I`,
      eligibleForArchive
    );

    // Clear active Transactions tab and rewrite remaining rows
    await this.sheetsClient.spreadsheets.values.clear({
      spreadsheetId: this.spreadsheetId,
      range: "Transactions!A:I",
    });

    const updatedActiveTable = [header, ...keepInActive];
    await updateRows(
      this.sheetsClient,
      this.spreadsheetId,
      "Transactions!A1",
      updatedActiveTable
    );

    return { archivedCount: eligibleForArchive.length, archiveTabName };
  }
}
