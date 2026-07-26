import { z } from "zod";

if (process.env.NODE_ENV !== "production") {
  await import("dotenv/config");
}

export const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  TELEGRAM_BOT_TOKEN: z
    .string()
    .min(1, "TELEGRAM_BOT_TOKEN is required")
    .transform((val) => val.trim().replace(/^["']|["']$/g, "")),
  ALLOWED_USER_IDS: z.string().transform((val) => val.split(",").map((id) => id.trim())),
  GEMINI_API_KEY: z
    .string()
    .min(1, "GEMINI_API_KEY is required")
    .transform((val) => val.trim().replace(/^["']|["']$/g, "")),
  GOOGLE_SPREADSHEET_ID: z
    .string()
    .min(1, "GOOGLE_SPREADSHEET_ID is required")
    .transform((val) => val.trim().replace(/^["']|["']$/g, "")),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z
    .string()
    .email("GOOGLE_SERVICE_ACCOUNT_EMAIL must be valid email")
    .transform((val) => val.trim().replace(/^["']|["']$/g, "")),
  GOOGLE_PRIVATE_KEY: z.string().min(1, "GOOGLE_PRIVATE_KEY is required"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

export type Env = z.infer<typeof EnvSchema>;

export function getEnv(): Env {
  return EnvSchema.parse(process.env);
}
