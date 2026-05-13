import { env } from "../config/env.js";
import {
  attachTelegramMessage,
  getRemainingHandoffMs,
  registerRequest,
  type CustomerAssistantState,
  type HandoffRequestType,
} from "./assistant-handoff.service.js";
import type { ConversationNotification } from "./conversation.service.js";

let missingTelegramConfigWarningShown = false;

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatOptionalDate(value?: string): string {
  if (!value) {
    return "-";
  }

  return formatDate(new Date(value));
}

function formatRemainingTime(state: CustomerAssistantState): string {
  const remainingMs = getRemainingHandoffMs(state);

  if (remainingMs === undefined) {
    return "-";
  }

  const totalMinutes = Math.ceil(remainingMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes} dakika`;
  }

  return `${hours} saat ${minutes} dakika`;
}

function getRequestTypeLabel(requestType: HandoffRequestType): string {
  if (requestType === "appointment") {
    return "Randevu";
  }

  if (requestType === "support") {
    return "Destek";
  }

  return "Manuel";
}

function getReleaseReasonLabel(state: CustomerAssistantState): string {
  if (state.releaseReason === "manual") {
    return "Manuel";
  }

  if (state.releaseReason === "expired") {
    return "Otomatik";
  }

  return "-";
}

export function buildAssistantStatusMessage(
  state: CustomerAssistantState
): string {
  const requestTypeLabel = getRequestTypeLabel(state.requestType);
  const title =
    state.assistantStatus === "manual"
      ? `${requestTypeLabel} talebi devralındı 🌿`
      : state.releasedAt
      ? "Asistan tekrar aktif 🌿"
      : `Yeni ${requestTypeLabel.toLocaleLowerCase("tr-TR")} talebi 🌿`;
  const returnLabel =
    state.assistantStatus === "manual"
      ? "Asistana otomatik dönüş"
      : "Asistana dönüş zamanı";
  const returnTime =
    state.assistantStatus === "manual"
      ? formatOptionalDate(state.takeoverUntil)
      : formatOptionalDate(state.releasedAt);

  return `${title}

Müşteri: ${state.customerPhone}
Talep türü: ${requestTypeLabel}
Talep zamanı: ${formatOptionalDate(state.requestCreatedAt)}

Asistan durumu: ${state.assistantStatus === "manual" ? "Manuel" : "Aktif"}
Devralma zamanı: ${formatOptionalDate(state.takeoverAt)}
${returnLabel}: ${returnTime}
Kalan süre: ${formatRemainingTime(state)}
Dönüş sebebi: ${getReleaseReasonLabel(state)}`;
}

function buildAssistantInlineKeyboard(state: CustomerAssistantState) {
  const action =
    state.assistantStatus === "manual"
      ? {
          text: "Asistana Geç",
          callback_data: `release:${state.customerPhone}`,
        }
      : {
          text: "Devral",
          callback_data: `takeover:${state.customerPhone}`,
        };

  return {
    inline_keyboard: [[action]],
  };
}

async function postTelegram(method: string, body: object): Promise<unknown> {
  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `Telegram API request failed. Status: ${response.status}. Body: ${errorBody}`
    );
  }

  return response.json();
}

type TelegramSendMessageResponse = {
  ok?: boolean;
  result?: {
    message_id?: number;
    chat?: {
      id?: number | string;
    };
  };
};

function hasTelegramConfig(): boolean {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    if (!missingTelegramConfigWarningShown) {
      console.warn(
        "Telegram notification config is missing. Notifications will be skipped."
      );
      missingTelegramConfigWarningShown = true;
    }

    return false;
  }

  return true;
}

export async function sendTelegramNotification(
  notification: ConversationNotification
): Promise<void> {
  if (!hasTelegramConfig()) {
    return;
  }

  const state = registerRequest({
    customerPhone: notification.customerPhone,
    requestType: notification.type,
  });
  const response = (await postTelegram("sendMessage", {
    chat_id: env.TELEGRAM_CHAT_ID,
    text: buildAssistantStatusMessage(state),
    reply_markup: buildAssistantInlineKeyboard(state),
  })) as TelegramSendMessageResponse;
  const chatId = response.result?.chat?.id;
  const messageId = response.result?.message_id;

  if (chatId !== undefined && messageId !== undefined) {
    attachTelegramMessage({
      customerPhone: notification.customerPhone,
      chatId: String(chatId),
      messageId,
    });
  }
}

export async function sendAssistantStateMessage(
  state: CustomerAssistantState
): Promise<CustomerAssistantState> {
  if (!hasTelegramConfig()) {
    return state;
  }

  const response = (await postTelegram("sendMessage", {
    chat_id: env.TELEGRAM_CHAT_ID,
    text: buildAssistantStatusMessage(state),
    reply_markup: buildAssistantInlineKeyboard(state),
  })) as TelegramSendMessageResponse;
  const chatId = response.result?.chat?.id;
  const messageId = response.result?.message_id;

  if (chatId === undefined || messageId === undefined) {
    return state;
  }

  return (
    attachTelegramMessage({
      customerPhone: state.customerPhone,
      chatId: String(chatId),
      messageId,
    }) ?? state
  );
}

export async function sendTelegramTextMessage(text: string): Promise<void> {
  if (!hasTelegramConfig()) {
    return;
  }

  await postTelegram("sendMessage", {
    chat_id: env.TELEGRAM_CHAT_ID,
    text,
  });
}

export async function editAssistantStateMessage(
  state: CustomerAssistantState
): Promise<void> {
  if (!hasTelegramConfig()) {
    return;
  }

  if (!state.telegramChatId || !state.telegramMessageId) {
    await sendAssistantStateMessage(state);
    return;
  }

  await postTelegram("editMessageText", {
    chat_id: state.telegramChatId,
    message_id: state.telegramMessageId,
    text: buildAssistantStatusMessage(state),
    reply_markup: buildAssistantInlineKeyboard(state),
  });
}

export async function answerTelegramCallbackQuery(
  callbackQueryId: string,
  text: string
): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    return;
  }

  await postTelegram("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });
}
