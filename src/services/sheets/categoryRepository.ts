import { sheets_v4 } from "googleapis";
import { CategoryRecord, CategoryRecordSchema, DEFAULT_CATEGORIES } from "../../domain/category.js";
import { getNowISO } from "../../utils/date.js";
import { getRows, appendRows, updateRows } from "./client.js";

export interface ICategoryRepository {
  getCategories(): Promise<CategoryRecord[]>;
  addCategory(name: string): Promise<CategoryRecord>;
  deleteCategory(name: string): Promise<boolean>;
}

export class CategoryRepository implements ICategoryRepository {
  constructor(
    private readonly sheetsClient: sheets_v4.Sheets,
    private readonly spreadsheetId: string
  ) {}

  /**
   * Reads all categories from the Categories sheet tab.
   * Falls back to DEFAULT_CATEGORIES if the sheet is empty or contains no records.
   */
  async getCategories(): Promise<CategoryRecord[]> {
    const rows = await getRows(this.sheetsClient, this.spreadsheetId, "Categories!A:C");

    // Skip header row if present
    const dataRows = rows.length > 0 && rows[0][0] === "id" ? rows.slice(1) : rows;

    if (dataRows.length === 0) {
      const now = getNowISO();
      return DEFAULT_CATEGORIES.map((catName) => ({
        id: crypto.randomUUID(),
        name: catName,
        createdAt: now,
      }));
    }

    const records: CategoryRecord[] = [];
    for (const row of dataRows) {
      if (row.length >= 2 && row[1]) {
        const record = {
          id: row[0] || crypto.randomUUID(),
          name: row[1],
          createdAt: row[2] || getNowISO(),
        };

        const validated = CategoryRecordSchema.safeParse(record);
        if (validated.success) {
          records.push(validated.data);
        }
      }
    }

    return records;
  }

  /**
   * Appends a new category record to the Categories sheet tab.
   */
  async addCategory(name: string): Promise<CategoryRecord> {
    const record: CategoryRecord = {
      id: crypto.randomUUID(),
      name: name.trim(),
      createdAt: getNowISO(),
    };

    const validated = CategoryRecordSchema.parse(record);

    await appendRows(this.sheetsClient, this.spreadsheetId, "Categories!A:C", [
      [validated.id, validated.name, validated.createdAt],
    ]);

    return validated;
  }

  /**
   * Deletes a category by name from the Categories sheet tab.
   */
  async deleteCategory(name: string): Promise<boolean> {
    const rows = await getRows(this.sheetsClient, this.spreadsheetId, "Categories!A:C");
    if (rows.length <= 1) {
      return false;
    }

    const header = rows[0];
    const dataRows = rows.slice(1);

    const filteredRows = dataRows.filter(
      (r) => r[1]?.toLowerCase() !== name.trim().toLowerCase()
    );

    if (filteredRows.length === dataRows.length) {
      return false; // Category not found
    }

    // Clear existing range and update with filtered rows
    await this.sheetsClient.spreadsheets.values.clear({
      spreadsheetId: this.spreadsheetId,
      range: "Categories!A:C",
    });

    const updatedTable = [header, ...filteredRows];
    await updateRows(this.sheetsClient, this.spreadsheetId, "Categories!A1", updatedTable);

    return true;
  }
}
