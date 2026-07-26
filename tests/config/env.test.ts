import { describe, it, expect } from "vitest";
import { EnvSchema, getEnv } from "../../src/config/env.js";

describe("Environment Schema (EnvSchema)", () => {
  const validEnv = {
    NODE_ENV: "test",
    TELEGRAM_BOT_TOKEN: "mock_telegram_token",
    ALLOWED_USER_IDS: "12345678, 87654321",
    GEMINI_API_KEY: "mock_gemini_key",
    GOOGLE_SPREADSHEET_ID: "mock_sheet_id",
    GOOGLE_SERVICE_ACCOUNT_EMAIL: "service@account.iam.gserviceaccount.com",
    GOOGLE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\\n-----END PRIVATE KEY-----\\n",
  };

  it("should validate and parse valid environment variables", () => {
    const parsed = EnvSchema.parse(validEnv);

    expect(parsed.TELEGRAM_BOT_TOKEN).toBe("mock_telegram_token");
    expect(parsed.ALLOWED_USER_IDS).toEqual(["12345678", "87654321"]);
    expect(parsed.LOG_LEVEL).toBe("info");
    expect(parsed.NODE_ENV).toBe("test");
  });

  it("should reject missing required environment variables", () => {
    const incompleteEnv = { ...validEnv, TELEGRAM_BOT_TOKEN: "" };
    expect(() => EnvSchema.parse(incompleteEnv)).toThrow();
  });

  it("should reject invalid email for GOOGLE_SERVICE_ACCOUNT_EMAIL", () => {
    const invalidEmailEnv = { ...validEnv, GOOGLE_SERVICE_ACCOUNT_EMAIL: "not-an-email" };
    expect(() => EnvSchema.parse(invalidEmailEnv)).toThrow();
  });

  it("should accept valid custom LOG_LEVEL", () => {
    const customLogEnv = { ...validEnv, LOG_LEVEL: "debug" };
    const parsed = EnvSchema.parse(customLogEnv);
    expect(parsed.LOG_LEVEL).toBe("debug");
  });

  it("should execute getEnv() helper", () => {
    process.env.TELEGRAM_BOT_TOKEN = "token";
    process.env.ALLOWED_USER_IDS = "123";
    process.env.GEMINI_API_KEY = "key";
    process.env.GOOGLE_SPREADSHEET_ID = "sheet";
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "a@b.com";
    process.env.GOOGLE_PRIVATE_KEY = "pk";

    const env = getEnv();
    expect(env.TELEGRAM_BOT_TOKEN).toBe("token");
  });
});
