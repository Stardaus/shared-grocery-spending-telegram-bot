import { describe, it, expect } from "vitest";
import {
  parseDDMMYYYYToISO,
  formatISOToDDMMYYYY,
  isValidDDMMYYYY,
  isDateWithinRange,
  getTodayISO,
  getNowISO,
  TIMEZONE,
} from "../../src/utils/date.js";

describe("Date Utility (date.ts)", () => {
  it("should define Malaysia timezone constant", () => {
    expect(TIMEZONE).toBe("Asia/Kuala_Lumpur");
  });

  describe("isValidDDMMYYYY", () => {
    it("should accept valid DD/MM/YYYY dates", () => {
      expect(isValidDDMMYYYY("25/03/2026")).toBe(true);
      expect(isValidDDMMYYYY("01/01/2025")).toBe(true);
      expect(isValidDDMMYYYY("29/02/2024")).toBe(true); // Leap year
    });

    it("should reject invalid calendar dates", () => {
      expect(isValidDDMMYYYY("31/02/2026")).toBe(false); // Feb 31 doesn't exist
      expect(isValidDDMMYYYY("29/02/2026")).toBe(false); // 2026 not leap year
      expect(isValidDDMMYYYY("32/01/2026")).toBe(false);
      expect(isValidDDMMYYYY("15/13/2026")).toBe(false);
    });

    it("should reject invalid syntax", () => {
      expect(isValidDDMMYYYY("2026-03-25")).toBe(false);
      expect(isValidDDMMYYYY("25-03-2026")).toBe(false);
      expect(isValidDDMMYYYY("invalid")).toBe(false);
      expect(isValidDDMMYYYY("")).toBe(false);
    });
  });

  describe("parseDDMMYYYYToISO", () => {
    it("should convert DD/MM/YYYY to YYYY-MM-DD ISO format", () => {
      expect(parseDDMMYYYYToISO("25/03/2026")).toBe("2026-03-25");
      expect(parseDDMMYYYYToISO("01/12/2025")).toBe("2025-12-01");
    });

    it("should throw error for invalid DD/MM/YYYY dates", () => {
      expect(() => parseDDMMYYYYToISO("31/02/2026")).toThrow();
    });
  });

  describe("formatISOToDDMMYYYY", () => {
    it("should convert YYYY-MM-DD to DD/MM/YYYY format", () => {
      expect(formatISOToDDMMYYYY("2026-03-25")).toBe("25/03/2026");
      expect(formatISOToDDMMYYYY("2025-12-01")).toBe("01/12/2025");
    });

    it("should throw error for invalid ISO date strings", () => {
      expect(() => formatISOToDDMMYYYY("invalid")).toThrow();
    });
  });

  describe("isDateWithinRange", () => {
    it("should return true when target date is inside range inclusive", () => {
      expect(isDateWithinRange("2026-03-25", "2026-03-25", "2026-04-24")).toBe(true);
      expect(isDateWithinRange("2026-04-01", "2026-03-25", "2026-04-24")).toBe(true);
      expect(isDateWithinRange("2026-04-24", "2026-03-25", "2026-04-24")).toBe(true);
    });

    it("should return false when target date is outside range", () => {
      expect(isDateWithinRange("2026-03-24", "2026-03-25", "2026-04-24")).toBe(false);
      expect(isDateWithinRange("2026-04-25", "2026-03-25", "2026-04-24")).toBe(false);
    });
  });

  describe("getTodayISO and getNowISO", () => {
    it("should return today's ISO date string in YYYY-MM-DD format", () => {
      const today = getTodayISO();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should return current timestamp in ISO 8601 format", () => {
      const now = getNowISO();
      expect(now).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});
