import http from "node:http";
import { getEnv } from "./config/env.js";
import { createBot } from "./services/telegram/bot.js";
import { logger } from "./utils/logger.js";

/**
 * Starts a lightweight HTTP health check server for cloud container probes.
 */
export function startHealthServer(port: number = 8080) {
  const server = http.createServer((req, res) => {
    if (req.url === "/health" || req.url === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(port, () => {
    logger.info(`Health check server listening on port ${port}`);
  });

  return server;
}

async function main() {
  logger.info("Initializing Shared Grocery Spending Telegram Bot...");

  const env = getEnv();
  const bot = createBot(env);

  // Start lightweight health check HTTP server for Koyeb / cloud container probes
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
  startHealthServer(port);

  logger.info("Starting grammY long-polling loop...");
  await bot.start({
    onStart: (botInfo) => {
      logger.info(`Bot @${botInfo.username} successfully started in long-polling mode (Asia/Kuala_Lumpur MYT).`);
    },
  });
}

if (process.env.NODE_ENV !== "test") {
  main().catch((err) => {
    logger.error({ error: err }, "Fatal startup error");
    process.exit(1);
  });
}
