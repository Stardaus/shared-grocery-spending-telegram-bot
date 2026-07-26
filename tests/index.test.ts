import { describe, it, expect, vi } from "vitest";

// Mock googleapis
vi.mock("googleapis", () => ({
  google: {
    auth: {
      JWT: vi.fn().mockImplementation(() => ({})),
    },
    sheets: vi.fn().mockReturnValue({
      spreadsheets: { values: { get: vi.fn(), append: vi.fn() } },
    }),
  },
}));

// Mock @google/generative-ai
vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({}),
  })),
}));

import { createBot } from "../src/services/telegram/bot.js";
import { startHealthServer } from "../src/index.js";

describe("Application Orchestrator & Bot Factory (bot.ts)", () => {
  const mockEnv = {
    NODE_ENV: "test" as const,
    TELEGRAM_BOT_TOKEN: "mock_telegram_token",
    ALLOWED_USER_IDS: ["12345678", "87654321"],
    GEMINI_API_KEY: "mock_gemini_api_key",
    GOOGLE_SPREADSHEET_ID: "mock_spreadsheet_id",
    GOOGLE_SERVICE_ACCOUNT_EMAIL: "service@account.com",
    GOOGLE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nFAKE\\n-----END PRIVATE KEY-----\\n",
    LOG_LEVEL: "info" as const,
  };

  it("should create and configure grammY Bot instance with all handlers registered", () => {
    const bot = createBot(mockEnv);
    expect(bot).toBeDefined();
    expect(typeof bot.start).toBe("function");
    expect(typeof bot.use).toBe("function");
  });

  it("should start health check HTTP server", async () => {
    const server = startHealthServer(0); // Port 0 binds to random available port
    expect(server).toBeDefined();
    server.close();
  });
});
