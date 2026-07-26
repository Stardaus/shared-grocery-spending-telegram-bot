import { describe, it, expect, vi } from "vitest";
import { createLogger, logger } from "../../src/utils/logger.js";

describe("Pino Logger (logger.ts)", () => {
  it("should export a default logger instance", () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("should create logger for production environment", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const prodLogger = createLogger("info");
    expect(prodLogger).toBeDefined();
    expect(prodLogger.level).toBe("info");

    process.env.NODE_ENV = originalEnv;
  });

  it("should create logger for development environment", () => {
    const devLogger = createLogger("debug");
    expect(devLogger).toBeDefined();
    expect(devLogger.level).toBe("debug");
  });
});
