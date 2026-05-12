import { Router } from "express";
import { handleTelegramWebhook } from "../controllers/telegram.controller.js";

export const telegramRoutes = Router();

telegramRoutes.post("/webhook", handleTelegramWebhook);
