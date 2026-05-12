import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { healthRoutes } from "./routes/health.routes.js";
import { webhookRoutes } from "./routes/webhook.routes.js";
import { testChatRoutes } from "./routes/test-chat.routes.js";
import { telegramRoutes } from "./routes/telegram.routes.js";

export const app = express();

app.use(helmet());
app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buffer) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody =
        Buffer.from(buffer);
    }
  })
);

app.use("/health", healthRoutes);
app.use("/webhook", webhookRoutes);
app.use("/telegram", telegramRoutes);

if (env.WHATSAPP_MODE === "mock") {
  app.use("/test-chat", testChatRoutes);
}

app.use((_req, res) => {
  res.status(404).json({
    ok: false,
    message: "Not found"
  });
});

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    const message =
      error instanceof Error ? error.message : "Internal server error";

    res.status(500).json({
      ok: false,
      message
    });
  }
);
