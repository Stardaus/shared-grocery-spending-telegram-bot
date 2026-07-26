import { describe, it, expect } from "vitest";
import { formatMYR, parseMYR, roundToTwoDecimals } from "../../src/utils/currency.js";

describe("Currency Utility (currency.ts)", () => {
  describe("formatMYR", () => {
    it("should format whole numbers as RM with two decimals and thousands separators", () => {
      expect(formatMYR(1234)).toBe("RM 1,234.00");
    });

    it("should format single decimal floating points correctly", () => {
      expect(formatMYR(1234.5)).toBe("RM 1,234.50");
    });

    it("should format zero correctly", () => {
      expect(formatMYR(0)).toBe("RM 0.00");
    });

    it("should format negative numbers correctly", () => {
      expect(formatMYR(-120.5)).toBe("-RM 120.50");
    });
  });

  describe("parseMYR", () => {
    it("should parse simple numeric strings", () => {
      expect(parseMYR("100.50")).toBe(100.5);
      expect(parseMYR("25")).toBe(25);
    });

    it("should parse strings with RM prefix", () => {
      expect(parseMYR("RM25")).toBe(25);
      expect(parseMYR("RM 100.50")).toBe(100.5);
      expect(parseMYR("rm 45.90")).toBe(45.9);
    });

    it("should parse strings with ringgit keyword", () => {
      expect(parseMYR("100 ringgit")).toBe(100);
      expect(parseMYR("25.50 ringgit")).toBe(25.5);
    });

    it("should return null for invalid text without numbers or non-string inputs", () => {
      expect(parseMYR("ayam sahaja")).toBeNull();
      expect(parseMYR("")).toBeNull();
      // @ts-expect-error testing invalid runtime types
      expect(parseMYR(12345)).toBeNull();
    });
  });

  describe("roundToTwoDecimals", () => {
    it("should round floating point numbers to 2 decimal places", () => {
      expect(roundToTwoDecimals(10.555)).toBe(10.56);
      expect(roundToTwoDecimals(10.554)).toBe(10.55);
      expect(roundToTwoDecimals(10)).toBe(10);
    });
  });
});
