import pino from "pino";

export interface ILogger {
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
  debug(msg: string, data?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): pino.Logger;
}

export function createLogger(level: string = "info"): pino.Logger {
  const isDev = process.env.NODE_ENV !== "production";
  return pino({
    level,
    transport: isDev ? { target: "pino-pretty", options: { colorize: true } } : undefined,
  });
}

export const logger = createLogger(process.env.LOG_LEVEL || "info");
