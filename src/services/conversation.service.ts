import { messages } from "../constants/messages.js";
import type { MessageKey } from "../constants/messages.js";
import { normalizeMessage } from "../utils/normalize-message.js";
import { resolveMessage } from "./message-router.service.js";

type ConfirmationType = "appointment" | "support";

type PendingConfirmation = {
  type: ConfirmationType;
  from: string;
  createdAt: number;
};

export type ConversationNotification = {
  type: ConfirmationType;
  customerPhone: string;
};

export type ConversationResult = {
  replyMessage: string;
  messageKey: MessageKey;
  notification?: ConversationNotification;
};

export const CONFIRMATION_TTL_MS = 10 * 60 * 1000;

const MAX_PENDING_CONFIRMATIONS = 5000;
const CONFIRMATION_WORDS = new Set(["evet", "onay"]);
const pendingConfirmations = new Map<string, PendingConfirmation>();

function cleanupPendingConfirmations(): void {
  const now = Date.now();

  for (const [from, confirmation] of pendingConfirmations) {
    if (now - confirmation.createdAt > CONFIRMATION_TTL_MS) {
      pendingConfirmations.delete(from);
    }
  }

  while (pendingConfirmations.size > MAX_PENDING_CONFIRMATIONS) {
    const oldestFrom = pendingConfirmations.keys().next().value;

    if (typeof oldestFrom !== "string") {
      break;
    }

    pendingConfirmations.delete(oldestFrom);
  }
}

function isExpired(confirmation: PendingConfirmation): boolean {
  return Date.now() - confirmation.createdAt > CONFIRMATION_TTL_MS;
}

function isConfirmationWord(text: string): boolean {
  return CONFIRMATION_WORDS.has(normalizeMessage(text));
}

function resolveNormalMessage(from: string, text: string): ConversationResult {
  const routeResult = resolveMessage(text);

  if (routeResult.messageKey === "APPOINTMENT_CONFIRMATION") {
    pendingConfirmations.set(from, {
      type: "appointment",
      from,
      createdAt: Date.now()
    });
  }

  if (routeResult.messageKey === "SUPPORT_CONFIRMATION") {
    pendingConfirmations.set(from, {
      type: "support",
      from,
      createdAt: Date.now()
    });
  }

  return routeResult;
}

export function handleIncomingTextMessage(params: {
  from: string;
  text: string;
}): ConversationResult {
  cleanupPendingConfirmations();

  const pendingConfirmation = pendingConfirmations.get(params.from);

  if (!pendingConfirmation || isExpired(pendingConfirmation)) {
    if (pendingConfirmation) {
      pendingConfirmations.delete(params.from);
    }

    return resolveNormalMessage(params.from, params.text);
  }

  if (!isConfirmationWord(params.text)) {
    pendingConfirmations.delete(params.from);
    return resolveNormalMessage(params.from, params.text);
  }

  pendingConfirmations.delete(params.from);

  if (pendingConfirmation.type === "appointment") {
    return {
      messageKey: "APPOINTMENT_REQUEST",
      replyMessage: messages.APPOINTMENT_REQUEST,
      notification: {
        type: "appointment",
        customerPhone: pendingConfirmation.from
      }
    };
  }

  return {
    messageKey: "SUPPORT_REQUEST",
    replyMessage: messages.SUPPORT_REQUEST,
    notification: {
      type: "support",
      customerPhone: pendingConfirmation.from
    }
  };
}

export function handleIncomingNonTextMessage(params: {
  from: string;
}): ConversationResult {
  cleanupPendingConfirmations();
  pendingConfirmations.delete(params.from);

  return {
    messageKey: "MAIN_MENU",
    replyMessage: messages.MAIN_MENU
  };
}
