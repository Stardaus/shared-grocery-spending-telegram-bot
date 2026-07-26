import { sheets_v4 } from "googleapis";
import { Budget, BudgetSchema, BudgetSummary } from "../../domain/budget.js";
import { getNowISO, isDateWithinRange } from "../../utils/date.js";
import { roundToTwoDecimals } from "../../utils/currency.js";
import { getRows, appendRows } from "./client.js";

export interface IBudgetRepository {
  createBudget(budget: Omit<Budget, "id" | "createdAt">): Promise<Budget>;
  getActiveBudget(currentIsoDate: string): Promise<Budget | null>;
  getBudgetSummary(currentIsoDate: string): Promise<BudgetSummary>;
}

export class BudgetRepository implements IBudgetRepository {
  constructor(
    private readonly sheetsClient: sheets_v4.Sheets,
    private readonly spreadsheetId: string
  ) {}

  /**
   * Appends a new budget allocation record to the Budgets sheet tab.
   */
  async createBudget(budgetInput: Omit<Budget, "id" | "createdAt">): Promise<Budget> {
    const budgetRecord: Budget = {
      id: crypto.randomUUID(),
      amount: roundToTwoDecimals(budgetInput.amount),
      startDate: budgetInput.startDate,
      endDate: budgetInput.endDate,
      createdAt: getNowISO(),
      createdBy: budgetInput.createdBy,
    };

    const validated = BudgetSchema.parse(budgetRecord);

    await appendRows(this.sheetsClient, this.spreadsheetId, "Budgets!A:F", [
      [
        validated.id,
        validated.amount.toString(),
        validated.startDate,
        validated.endDate,
        validated.createdAt,
        validated.createdBy,
      ],
    ]);

    return validated;
  }

  /**
   * Fetches the budget window record covering currentIsoDate.
   */
  async getActiveBudget(currentIsoDate: string): Promise<Budget | null> {
    const rows = await getRows(this.sheetsClient, this.spreadsheetId, "Budgets!A:F");
    const dataRows = rows.length > 0 && rows[0][0] === "id" ? rows.slice(1) : rows;

    for (const row of dataRows) {
      if (row.length >= 6) {
        const record = {
          id: row[0],
          amount: parseFloat(row[1]),
          startDate: row[2],
          endDate: row[3],
          createdAt: row[4],
          createdBy: row[5],
        };

        const validated = BudgetSchema.safeParse(record);
        if (validated.success) {
          if (isDateWithinRange(currentIsoDate, validated.data.startDate, validated.data.endDate)) {
            return validated.data;
          }
        }
      }
    }

    return null;
  }

  /**
   * Computes the budget summary for the active budget period on currentIsoDate.
   */
  async getBudgetSummary(currentIsoDate: string): Promise<BudgetSummary> {
    const activeBudget = await this.getActiveBudget(currentIsoDate);

    if (!activeBudget) {
      return {
        activeBudget: null,
        totalSpent: 0,
        remainingBalance: 0,
        transactionCount: 0,
        isOverBudget: false,
      };
    }

    const txRows = await getRows(this.sheetsClient, this.spreadsheetId, "Transactions!A:I");
    const dataRows = txRows.length > 0 && txRows[0][0] === "id" ? txRows.slice(1) : txRows;

    let totalSpent = 0;
    let transactionCount = 0;

    for (const row of dataRows) {
      if (row.length >= 9) {
        const budgetId = row[8];
        const amount = parseFloat(row[4]);

        if (budgetId === activeBudget.id && !isNaN(amount)) {
          totalSpent += amount;
          transactionCount++;
        }
      }
    }

    totalSpent = roundToTwoDecimals(totalSpent);
    const remainingBalance = roundToTwoDecimals(activeBudget.amount - totalSpent);
    const isOverBudget = remainingBalance < 0;

    return {
      activeBudget,
      totalSpent,
      remainingBalance,
      transactionCount,
      isOverBudget,
    };
  }
}
