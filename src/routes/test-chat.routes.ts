import { Router } from "express";
import {
  getCustomerAssistantState,
  getRemainingHandoffMs,
  isAssistantManual,
  listManualAssistantStates,
  listRecentAssistantStates,
  recordCustomerMessage,
  registerRequest,
  releaseAssistant,
  takeoverAssistant,
  type CustomerAssistantState,
} from "../services/assistant-handoff.service.js";
import { handleIncomingTextMessage } from "../services/conversation.service.js";

export const testChatRoutes = Router();

const TEST_CHAT_SENDER_ID = "test-chat-user";

type NotificationPreview = {
  type: "appointment" | "support" | "manual";
  title: string;
  customerPhone: typeof TEST_CHAT_SENDER_ID;
  requestType: string;
  requestCreatedAt: string;
  assistantStatus: string;
  takeoverAt: string;
  takeoverUntil: string;
  remainingTime: string;
  releaseReason: string;
  buttonLabel: string;
  buttonAction: "takeover" | "release";
  text: string;
};

function formatPreviewDate(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatOptionalPreviewDate(value?: string): string {
  if (!value) {
    return "-";
  }

  return formatPreviewDate(new Date(value));
}

function formatRemainingPreviewTime(state: CustomerAssistantState): string {
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

function getRequestTypeLabel(
  type: CustomerAssistantState["requestType"]
): string {
  if (type === "appointment") {
    return "Randevu";
  }

  if (type === "support") {
    return "Destek";
  }

  return "Manuel";
}

function normalizeCommandPhone(input: string): string {
  if (input === TEST_CHAT_SENDER_ID) {
    return TEST_CHAT_SENDER_ID;
  }

  return input.replace(/\D/g, "");
}

function buildStateListPreview(states: CustomerAssistantState[]): string {
  if (states.length === 0) {
    return "Kayıt yok.";
  }

  return states
    .map((state) => {
      const requestType = getRequestTypeLabel(state.requestType);
      const status = state.assistantStatus === "manual" ? "Manuel" : "Aktif";
      const lastMessageAt = formatOptionalPreviewDate(
        state.lastCustomerMessageAt
      );
      const remainingTime = formatRemainingPreviewTime(state);

      return `Müşteri: ${state.customerPhone}
Talep türü: ${requestType}
Asistan durumu: ${status}
Son mesaj: ${lastMessageAt}
Kalan süre: ${remainingTime}`;
    })
    .join("\n\n━━━━━━━━━━━━━━\n\n");
}

function buildNotificationPreview(
  state: CustomerAssistantState
): NotificationPreview {
  const requestType = getRequestTypeLabel(state.requestType);
  const title =
    state.assistantStatus === "manual"
      ? `${requestType} talebi devralındı 🌿`
      : state.releasedAt
      ? "Asistan tekrar aktif 🌿"
      : `Yeni ${requestType.toLocaleLowerCase("tr-TR")} talebi 🌿`;
  const requestCreatedAt = formatOptionalPreviewDate(state.requestCreatedAt);
  const takeoverAt = formatOptionalPreviewDate(state.takeoverAt);
  const returnLabel =
    state.assistantStatus === "manual"
      ? "Asistana otomatik dönüş"
      : "Asistana dönüş zamanı";
  const returnTime =
    state.assistantStatus === "manual"
      ? formatOptionalPreviewDate(state.takeoverUntil)
      : formatOptionalPreviewDate(state.releasedAt);
  const remainingTime = formatRemainingPreviewTime(state);
  const releaseReason =
    state.releaseReason === "manual"
      ? "Manuel"
      : state.releaseReason === "expired"
      ? "Otomatik"
      : "-";
  const assistantStatus =
    state.assistantStatus === "manual" ? "Manuel" : "Aktif";
  const text = `${title}

Müşteri: ${TEST_CHAT_SENDER_ID}
Talep türü: ${requestType}
Talep zamanı: ${requestCreatedAt}

Asistan durumu: ${assistantStatus}
Devralma zamanı: ${takeoverAt}
${returnLabel}: ${returnTime}
Kalan süre: ${remainingTime}
Dönüş sebebi: ${releaseReason}`;

  return {
    type: state.requestType,
    title,
    customerPhone: TEST_CHAT_SENDER_ID,
    requestType,
    requestCreatedAt,
    assistantStatus,
    takeoverAt,
    takeoverUntil: returnTime,
    remainingTime,
    releaseReason,
    buttonLabel: state.assistantStatus === "manual" ? "Asistana Geç" : "Devral",
    buttonAction: state.assistantStatus === "manual" ? "release" : "takeover",
    text,
  };
}

testChatRoutes.get("/", (_req, res) => {
  res.type("html").send(`
<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Luna Den Spa Mock WhatsApp Chat</title>
  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: #d9d1c7;
      color: #1f2933;
    }

    .page {
      max-width: 1100px;
      min-height: 100vh;
      margin: 0 auto;
      padding: 18px;
      display: grid;
      grid-template-columns: minmax(320px, 520px) minmax(280px, 1fr);
      gap: 18px;
    }

    .app,
    .telegram-panel {
      min-height: 0;
      height: calc(100vh - 36px);
      display: flex;
      flex-direction: column;
      border: 1px solid #d6d3ce;
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
    }

    .app {
      background:
        radial-gradient(circle at 12px 12px, rgba(0, 0, 0, 0.025) 1px, transparent 1px),
        #efeae2;
      background-size: 24px 24px;
    }

    .header {
      background: #075e54;
      color: #fff;
      padding: 10px 14px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: #128c7e;
      color: #fff;
      font-size: 18px;
      flex: 0 0 auto;
    }

    .header-copy {
      min-width: 0;
    }

    .status {
      font-size: 12px;
      font-weight: 400;
      opacity: 0.85;
      margin-top: 4px;
    }

    .telegram-panel {
      background: #f8fafc;
    }

    .telegram-header {
      background: #229ed9;
      color: #fff;
      padding: 14px 16px;
    }

    .telegram-title {
      font-weight: 700;
    }

    .telegram-description {
      font-size: 12px;
      line-height: 1.4;
      margin-top: 4px;
      opacity: 0.9;
    }

    .telegram-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .telegram-empty {
      color: #64748b;
      font-size: 14px;
      padding: 12px;
      border: 1px dashed #cbd5e1;
      background: #fff;
      border-radius: 8px;
    }

    .notification-card {
      background: #fff;
      border: 1px solid #dbe3ea;
      border-radius: 8px;
      padding: 14px;
      line-height: 1.45;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
    }

    .notification-title {
      font-weight: 700;
      margin-bottom: 10px;
    }

    .notification-body {
      white-space: pre-wrap;
    }

    .notification-button {
      width: auto;
      min-width: 120px;
      height: 38px;
      margin-top: 12px;
      padding: 0 14px;
      border-radius: 8px;
      background: #229ed9;
      font-size: 13px;
    }

    .notification-button.release {
      background: #128c7e;
    }

    .telegram-actions {
      padding: 10px;
      background: #eef4f8;
      border-top: 1px solid #dbe3ea;
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: 8px;
      align-items: center;
    }

    .messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .day-chip {
      align-self: center;
      background: rgba(255, 255, 255, 0.82);
      color: #54656f;
      font-size: 12px;
      padding: 6px 12px;
      border-radius: 8px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
    }

    .bubble {
      max-width: 82%;
      min-width: 92px;
      padding: 8px 10px 6px;
      border-radius: 8px;
      white-space: pre-wrap;
      line-height: 1.4;
      font-size: 14px;
      position: relative;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12);
    }

    .user {
      align-self: flex-end;
      background: #dcf8c6;
      border-top-right-radius: 2px;
    }

    .bot {
      align-self: flex-start;
      background: #fff;
      border-top-left-radius: 2px;
    }

    .message-text {
      display: block;
      padding-right: 48px;
    }

    .message-meta {
      float: right;
      margin: 4px 0 0 8px;
      color: #667781;
      font-size: 11px;
      line-height: 1;
      white-space: nowrap;
    }

    .user .message-meta {
      color: #5f7461;
    }

    .ticks {
      color: #53bdeb;
      font-size: 12px;
      margin-left: 3px;
    }

    .typing {
      min-width: 58px;
      padding: 10px 12px;
    }

    .typing-dots {
      display: inline-flex;
      gap: 4px;
      align-items: center;
    }

    .typing-dots span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #8a9aa4;
      animation: typing-pulse 1.2s infinite ease-in-out;
    }

    .typing-dots span:nth-child(2) {
      animation-delay: 0.16s;
    }

    .typing-dots span:nth-child(3) {
      animation-delay: 0.32s;
    }

    @keyframes typing-pulse {
      0%, 80%, 100% {
        opacity: 0.35;
        transform: translateY(0);
      }

      40% {
        opacity: 1;
        transform: translateY(-3px);
      }
    }

    .form {
      display: flex;
      gap: 8px;
      padding: 10px;
      background: #f0f0f0;
    }

    input {
      flex: 1;
      min-width: 0;
      border: none;
      border-radius: 20px;
      padding: 12px 14px;
      font-size: 14px;
      outline: none;
    }

    button {
      border: none;
      border-radius: 999px;
      background: #128c7e;
      color: #fff;
      width: 44px;
      min-width: 44px;
      height: 44px;
      padding: 0;
      cursor: pointer;
      font-weight: 700;
      display: grid;
      place-items: center;
      font-size: 18px;
    }

    .clear-button {
      min-height: 38px;
      width: auto;
      min-width: 0;
      padding: 0 14px;
      border-radius: 8px;
      background: #334155;
      font-size: 13px;
    }

    .telegram-command-input {
      min-height: 38px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 12px;
      background: #fff;
      font-size: 13px;
    }

    .telegram-command-button {
      width: auto;
      min-width: 76px;
      height: 38px;
      padding: 0 14px;
      border-radius: 8px;
      background: #229ed9;
      font-size: 13px;
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    @media (max-width: 820px) {
      .page {
        grid-template-columns: 1fr;
        padding: 0;
        gap: 0;
      }

      .app,
      .telegram-panel {
        height: auto;
        min-height: 50vh;
        border-left: none;
        border-right: none;
        box-shadow: none;
      }

      .app {
        min-height: 62vh;
      }

      .telegram-actions {
        grid-template-columns: 1fr;
      }

      .telegram-command-button,
      .clear-button {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="app" aria-label="WhatsApp Mock Chat">
      <div class="header">
        <div class="avatar" aria-hidden="true">🌿</div>
        <div class="header-copy">
          <div>Luna Den Spa</div>
          <div id="chatStatus" class="status">çevrimiçi</div>
        </div>
      </div>

      <div id="messages" class="messages">
        <div class="day-chip">Bugün</div>
      </div>

      <form id="form" class="form">
        <input id="input" autocomplete="off" placeholder="Mesaj yazın..." />
        <button id="button" type="submit" aria-label="Gönder">➤</button>
      </form>
    </section>

    <section class="telegram-panel" aria-label="Telegram Bildirim Önizlemesi">
      <div class="telegram-header">
        <div class="telegram-title">Telegram Bildirim Önizlemesi</div>
        <div class="telegram-description">Bu alan local test içindir. Gerçek Telegram bildirimi göndermez.</div>
      </div>

      <div id="telegramNotifications" class="telegram-content">
        <div id="telegramEmpty" class="telegram-empty">Henüz bildirim yok.</div>
      </div>

      <div class="telegram-actions">
        <input id="telegramCommandInput" class="telegram-command-input" autocomplete="off" placeholder="/devral test-chat-user" />
        <button id="telegramCommandButton" class="telegram-command-button" type="button">Komut</button>
        <button id="clearNotificationsButton" class="clear-button" type="button">Bildirimleri temizle</button>
      </div>
    </section>
  </main>

  <script src="/test-chat/client.js" defer></script>
</body>
</html>
  `);
});

testChatRoutes.get("/client.js", (_req, res) => {
  res.type("application/javascript").send(`
const messagesEl = document.getElementById("messages");
const formEl = document.getElementById("form");
const inputEl = document.getElementById("input");
const buttonEl = document.getElementById("button");
const chatStatusEl = document.getElementById("chatStatus");
const telegramNotificationsEl = document.getElementById("telegramNotifications");
const telegramEmptyEl = document.getElementById("telegramEmpty");
const clearNotificationsButtonEl = document.getElementById("clearNotificationsButton");
const telegramCommandInputEl = document.getElementById("telegramCommandInput");
const telegramCommandButtonEl = document.getElementById("telegramCommandButton");
let typingBubbleEl = null;

function addMessage(text, type) {
  const bubble = document.createElement("div");
  bubble.className = "bubble " + type;

  const textEl = document.createElement("span");
  textEl.className = "message-text";
  textEl.textContent = text;

  const metaEl = document.createElement("span");
  metaEl.className = "message-meta";
  metaEl.textContent = getCurrentTime();

  if (type === "user") {
    const ticksEl = document.createElement("span");
    ticksEl.className = "ticks";
    ticksEl.textContent = "✓✓";
    metaEl.appendChild(ticksEl);
  }

  bubble.appendChild(textEl);
  bubble.appendChild(metaEl);
  messagesEl.appendChild(bubble);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function getCurrentTime() {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function getReplyDelay(text) {
  const lengthDelay = Math.min(text.length * 6, 900);
  return 750 + lengthDelay;
}

function showTypingIndicator() {
  removeTypingIndicator();

  chatStatusEl.textContent = "yazıyor...";

  const bubble = document.createElement("div");
  bubble.className = "bubble bot typing";

  const dots = document.createElement("span");
  dots.className = "typing-dots";

  for (let index = 0; index < 3; index += 1) {
    dots.appendChild(document.createElement("span"));
  }

  bubble.appendChild(dots);
  messagesEl.appendChild(bubble);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  typingBubbleEl = bubble;
}

function removeTypingIndicator() {
  if (typingBubbleEl) {
    typingBubbleEl.remove();
    typingBubbleEl = null;
  }

  chatStatusEl.textContent = "çevrimiçi";
}

function addNotificationPreview(notification) {
  if (!notification) {
    return;
  }

  clearNotificationPreviews();
  telegramEmptyEl.hidden = true;

  const card = document.createElement("article");
  card.className = "notification-card";

  const title = document.createElement("div");
  title.className = "notification-title";
  title.textContent = notification.title;

  const body = document.createElement("div");
  body.className = "notification-body";
  body.textContent = notification.text;

  const actionButton = document.createElement("button");
  actionButton.className = "notification-button " + notification.buttonAction;
  actionButton.type = "button";
  actionButton.textContent = notification.buttonLabel;
  actionButton.addEventListener("click", async () => {
    actionButton.disabled = true;

    try {
      const updatedNotification = await updateAssistantState(notification.buttonAction);
      addNotificationPreview(updatedNotification.notificationPreview);
    } catch (_error) {
      actionButton.disabled = false;
    }
  });

  card.appendChild(title);
  card.appendChild(body);
  card.appendChild(actionButton);
  telegramNotificationsEl.appendChild(card);
  telegramNotificationsEl.scrollTop = telegramNotificationsEl.scrollHeight;
}

function addTelegramTextPreview(text) {
  clearNotificationPreviews();
  telegramEmptyEl.hidden = true;

  const card = document.createElement("article");
  card.className = "notification-card";

  const body = document.createElement("div");
  body.className = "notification-body";
  body.textContent = text;

  card.appendChild(body);
  telegramNotificationsEl.appendChild(card);
  telegramNotificationsEl.scrollTop = telegramNotificationsEl.scrollHeight;
}

function clearNotificationPreviews() {
  const cards = telegramNotificationsEl.querySelectorAll(".notification-card");

  for (const card of cards) {
    card.remove();
  }

  telegramEmptyEl.hidden = false;
}

async function sendMessage(text) {
  const response = await fetch("/test-chat/message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message: text })
  });

  if (!response.ok) {
    throw new Error("Request failed");
  }

  return response.json();
}

async function updateAssistantState(action) {
  const response = await fetch("/test-chat/" + action, {
    method: "POST"
  });

  if (!response.ok) {
    throw new Error("Request failed");
  }

  return response.json();
}

async function sendTelegramCommand(command) {
  const response = await fetch("/test-chat/telegram-command", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ command })
  });

  if (!response.ok) {
    throw new Error("Request failed");
  }

  return response.json();
}

formEl.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = inputEl.value.trim();

  if (!text) {
    return;
  }

  addMessage(text, "user");
  inputEl.value = "";
  buttonEl.disabled = true;
  inputEl.disabled = true;

  try {
    const data = await sendMessage(text);
    if (data.reply) {
      showTypingIndicator();
      await wait(getReplyDelay(data.reply));
      removeTypingIndicator();
      addMessage(data.reply, "bot");
    } else {
      removeTypingIndicator();
      addMessage(data.statusMessage, "bot");
    }
    await wait(250);
    addNotificationPreview(data.notificationPreview);
  } catch (_error) {
    removeTypingIndicator();
    addMessage("Bir hata oluştu. Lütfen tekrar deneyin.", "bot");
  } finally {
    buttonEl.disabled = false;
    inputEl.disabled = false;
    inputEl.focus();
  }
});

clearNotificationsButtonEl.addEventListener("click", () => {
  clearNotificationPreviews();
});

telegramCommandButtonEl.addEventListener("click", async () => {
  const command = telegramCommandInputEl.value.trim();

  if (!command) {
    return;
  }

  telegramCommandButtonEl.disabled = true;

  try {
    const data = await sendTelegramCommand(command);

    if (data.notificationPreview) {
      addNotificationPreview(data.notificationPreview);
    } else {
      addTelegramTextPreview(data.text);
    }

    telegramCommandInputEl.value = "";
  } catch (_error) {
    addTelegramTextPreview("Komut çalıştırılamadı.");
  } finally {
    telegramCommandButtonEl.disabled = false;
    telegramCommandInputEl.focus();
  }
});

telegramCommandInputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    telegramCommandButtonEl.click();
  }
});
  `);
});

testChatRoutes.post("/message", (req, res) => {
  const message = req.body?.message;

  if (typeof message !== "string") {
    res.status(400).json({
      ok: false,
      message: "message must be a string",
    });
    return;
  }

  recordCustomerMessage(TEST_CHAT_SENDER_ID);

  if (isAssistantManual(TEST_CHAT_SENDER_ID)) {
    const state = getCustomerAssistantState(TEST_CHAT_SENDER_ID);

    res.status(200).json({
      ok: true,
      reply: undefined,
      statusMessage:
        "Asistan bu müşteri için manuel devralma modunda. Production'da otomatik WhatsApp cevabı gönderilmez.",
      ...(state
        ? { notificationPreview: buildNotificationPreview(state) }
        : {}),
    });
    return;
  }

  const conversationResult = handleIncomingTextMessage({
    from: TEST_CHAT_SENDER_ID,
    text: message,
  });
  const state = conversationResult.notification
    ? registerRequest({
        customerPhone: TEST_CHAT_SENDER_ID,
        requestType: conversationResult.notification.type,
      })
    : undefined;
  const notificationPreview = state
    ? buildNotificationPreview(state)
    : undefined;

  res.status(200).json({
    ok: true,
    reply: conversationResult.replyMessage,
    ...(notificationPreview ? { notificationPreview } : {}),
  });
});

testChatRoutes.post("/takeover", (_req, res) => {
  const state = takeoverAssistant({
    customerPhone: TEST_CHAT_SENDER_ID,
  });

  res.status(200).json({
    ok: true,
    notificationPreview: buildNotificationPreview(state),
  });
});

testChatRoutes.post("/release", (_req, res) => {
  const state = releaseAssistant({
    customerPhone: TEST_CHAT_SENDER_ID,
    reason: "manual",
  });

  res.status(200).json({
    ok: true,
    notificationPreview: buildNotificationPreview(state),
  });
});

testChatRoutes.post("/telegram-command", (req, res) => {
  const command = req.body?.command;

  if (typeof command !== "string") {
    res.status(400).json({
      ok: false,
      message: "command must be a string",
    });
    return;
  }

  const [rawCommand = "", rawPhone = ""] = command.trim().split(/\s+/, 2);
  const normalizedCommand = rawCommand.toLocaleLowerCase("tr-TR");
  const customerPhone = normalizeCommandPhone(rawPhone || TEST_CHAT_SENDER_ID);

  if (normalizedCommand === "/devral") {
    const state = takeoverAssistant({
      customerPhone,
      requestType: "manual",
    });

    res.status(200).json({
      ok: true,
      notificationPreview: buildNotificationPreview(state),
    });
    return;
  }

  if (["/asistan", "/aktif", "/ac", "/aç"].includes(normalizedCommand)) {
    const state = releaseAssistant({
      customerPhone,
      reason: "manual",
    });

    res.status(200).json({
      ok: true,
      notificationPreview: buildNotificationPreview(state),
    });
    return;
  }

  if (normalizedCommand === "/durum") {
    const text = buildStateListPreview(listManualAssistantStates());

    res.status(200).json({
      ok: true,
      text,
    });
    return;
  }

  if (normalizedCommand === "/son") {
    const text = buildStateListPreview(listRecentAssistantStates(10));

    res.status(200).json({
      ok: true,
      text,
    });
    return;
  }

  res.status(200).json({
    ok: true,
    text: "Desteklenen komutlar: /devral, /asistan, /durum, /son",
  });
});
