import type { Request, Response } from "express";
import { env } from "../config/env.js";
import {
  listManualAssistantStates,
  listRecentAssistantStates,
  releaseAssistant,
  takeoverAssistant
} from "../services/assistant-handoff.service.js";
import {
  answerTelegramCallbackQuery,
  buildAssistantStatusMessage,
  editAssistantStateMessage,
  sendAssistantStateMessage,
  sendTelegramTextMessage
} from "../services/notification.service.js";

type TelegramUpdate = {
  callback_query?: {
    id?: string;
    data?: string;
  };
  message?: {
    text?: string;
  };
};

function normalizePhone(input: string): string {
  return input.replace(/\D/g, "");
}

function parseCommand(text: string): {
  command: string;
  phone?: string;
} {
  const [command = "", rawPhone = ""] = text.trim().split(/\s+/, 2);

  return {
    command: command.toLocaleLowerCase("tr-TR"),
    phone: rawPhone ? normalizePhone(rawPhone) : undefined
  };
}

function isAuthorizedTelegramRequest(req: Request): boolean {
  if (!env.TELEGRAM_WEBHOOK_SECRET) {
    return true;
  }

  return req.header("x-telegram-bot-api-secret-token") === env.TELEGRAM_WEBHOOK_SECRET;
}

async function handleCallbackQuery(update: TelegramUpdate): Promise<void> {
  const callbackQuery = update.callback_query;
  const callbackQueryId = callbackQuery?.id;
  const data = callbackQuery?.data;

  if (!callbackQueryId || !data) {
    return;
  }

  const [action, customerPhone] = data.split(":", 2);

  if (!customerPhone) {
    await answerTelegramCallbackQuery(callbackQueryId, "Eksik müşteri bilgisi.");
    return;
  }

  if (action === "takeover") {
    const state = takeoverAssistant({
      customerPhone
    });

    await editAssistantStateMessage(state);
    await answerTelegramCallbackQuery(callbackQueryId, "Asistan devralındı.");
    return;
  }

  if (action === "release") {
    const state = releaseAssistant({
      customerPhone,
      reason: "manual"
    });

    await editAssistantStateMessage(state);
    await answerTelegramCallbackQuery(callbackQueryId, "Asistan tekrar aktif.");
    return;
  }

  await answerTelegramCallbackQuery(callbackQueryId, "Bilinmeyen işlem.");
}

async function handleCommand(update: TelegramUpdate): Promise<void> {
  const text = update.message?.text;

  if (!text) {
    return;
  }

  const command = parseCommand(text);

  if (command.command === "/devral" && command.phone) {
    const state = takeoverAssistant({
      customerPhone: command.phone,
      requestType: "manual"
    });

    await sendAssistantStateMessage(state);
    return;
  }

  if (
    ["/asistan", "/aktif", "/ac", "/aç"].includes(command.command) &&
    command.phone
  ) {
    const state = releaseAssistant({
      customerPhone: command.phone,
      reason: "manual"
    });

    await sendAssistantStateMessage(state);
    return;
  }

  if (command.command === "/durum") {
    const states = listManualAssistantStates();
    const textContent =
      states.length === 0
        ? "Manuelde müşteri yok."
        : states.map(buildAssistantStatusMessage).join("\n\n━━━━━━━━━━━━━━\n\n");

    await sendTelegramTextMessage(textContent);
    return;
  }

  if (command.command === "/son") {
    const states = listRecentAssistantStates(10);
    const textContent =
      states.length === 0
        ? "Son konuşan müşteri yok."
        : states.map(buildAssistantStatusMessage).join("\n\n━━━━━━━━━━━━━━\n\n");

    await sendTelegramTextMessage(textContent);
  }
}

export async function handleTelegramWebhook(
  req: Request,
  res: Response
): Promise<void> {
  if (!isAuthorizedTelegramRequest(req)) {
    res.sendStatus(403);
    return;
  }

  if (!env.BOT_ENABLED) {
    res.status(200).json({
      ok: true,
      skipped: "bot_disabled"
    });
    return;
  }

  const update = req.body as TelegramUpdate;

  try {
    if (update.callback_query) {
      await handleCallbackQuery(update);
    } else {
      await handleCommand(update);
    }
  } catch (error) {
    console.error("Telegram webhook handling failed", {
      error
    });
  }

  res.status(200).json({
    ok: true
  });
}
