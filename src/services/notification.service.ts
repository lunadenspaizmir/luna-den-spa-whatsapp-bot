import { env } from "../config/env.js";
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

function buildNotificationMessage(
  notification: ConversationNotification
): string {
  const isAppointment = notification.type === "appointment";

  return `${isAppointment ? "Yeni randevu talebi" : "Yeni destek talebi"} 🌿

Müşteri numarası: ${notification.customerPhone}
Talep türü: ${isAppointment ? "Randevu talebi" : "Destek talebi"}
Tarih: ${formatDate(new Date())}`;
}

export async function sendTelegramNotification(
  notification: ConversationNotification
): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    if (!missingTelegramConfigWarningShown) {
      console.warn(
        "Telegram notification config is missing. Notifications will be skipped."
      );
      missingTelegramConfigWarningShown = true;
    }

    return;
  }

  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: buildNotificationMessage(notification),
        parse_mode: "HTML",
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `Telegram API request failed. Status: ${response.status}. Body: ${errorBody}`
    );
  }
}
