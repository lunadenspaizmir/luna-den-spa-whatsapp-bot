import type { Request, Response } from "express";
import { env } from "../config/env.js";
import {
  handleIncomingNonTextMessage,
  handleIncomingTextMessage
} from "../services/conversation.service.js";
import { sendTelegramNotification } from "../services/notification.service.js";
import { sendTextMessage } from "../services/whatsapp.service.js";

type IncomingWhatsAppMessage = {
  id?: string;
  from: string;
  text?: string;
};

const processedMessageIds = new Map<string, number>();
const PROCESSED_MESSAGE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_PROCESSED_MESSAGE_IDS = 5000;

function cleanupProcessedMessageIds(): void {
  const now = Date.now();

  for (const [messageId, processedAt] of processedMessageIds) {
    if (now - processedAt > PROCESSED_MESSAGE_TTL_MS) {
      processedMessageIds.delete(messageId);
    }
  }

  while (processedMessageIds.size > MAX_PROCESSED_MESSAGE_IDS) {
    const oldestMessageId = processedMessageIds.keys().next().value;

    if (typeof oldestMessageId !== "string") {
      break;
    }

    processedMessageIds.delete(oldestMessageId);
  }
}

function wasMessageProcessed(messageId?: string): boolean {
  if (!messageId) {
    return false;
  }

  cleanupProcessedMessageIds();

  if (processedMessageIds.has(messageId)) {
    return true;
  }

  processedMessageIds.set(messageId, Date.now());
  return false;
}

function extractIncomingMessages(body: unknown): IncomingWhatsAppMessage[] {
  const result: IncomingWhatsAppMessage[] = [];

  if (!body || typeof body !== "object") {
    return result;
  }

  const payload = body as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          messages?: Array<{
            id?: string;
            from?: string;
            type?: string;
            text?: {
              body?: string;
            };
          }>;
        };
      }>;
    }>;
  };

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        if (typeof message.from === "string") {
          result.push({
            id: message.id,
            from: message.from,
            text:
              message.type === "text" &&
              typeof message.text?.body === "string"
                ? message.text.body
                : undefined
          });
        }
      }
    }
  }

  return result;
}

export function verifyWebhook(req: Request, res: Response): void {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token === env.WHATSAPP_VERIFY_TOKEN &&
    typeof challenge === "string"
  ) {
    res.status(200).send(challenge);
    return;
  }

  res.sendStatus(403);
}

export async function handleWebhook(
  req: Request,
  res: Response
): Promise<void> {
  const incomingMessages = extractIncomingMessages(req.body);

  if (incomingMessages.length === 0) {
    res.status(200).json({
      ok: true
    });
    return;
  }

  if (!env.BOT_ENABLED) {
    console.info("Bot disabled. Incoming webhook skipped.", {
      incomingMessages: incomingMessages.length,
      fromList: incomingMessages
        .slice(0, 10)
        .map((message) => message.from)
    });

    res.status(200).json({
      ok: true,
      botEnabled: false,
      skipped: true,
      incomingMessages: incomingMessages.length
    });
    return;
  }

  const mockReplies: Array<{
    to: string;
    text: string;
  }> = [];

  for (const incomingMessage of incomingMessages) {
    if (wasMessageProcessed(incomingMessage.id)) {
      continue;
    }

    const conversationResult =
      typeof incomingMessage.text === "string"
        ? handleIncomingTextMessage({
            from: incomingMessage.from,
            text: incomingMessage.text
          })
        : handleIncomingNonTextMessage({
            from: incomingMessage.from
          });

    try {
      const sendResult = await sendTextMessage({
        to: incomingMessage.from,
        text: conversationResult.replyMessage
      });

      if (sendResult.mode === "mock") {
        mockReplies.push({
          to: sendResult.to,
          text: sendResult.text
        });
      }

      if (conversationResult.notification) {
        try {
          await sendTelegramNotification(conversationResult.notification);
        } catch (error) {
          console.error("Telegram notification failed", {
            messageId: incomingMessage.id,
            to: incomingMessage.from,
            error
          });
        }
      }
    } catch (error) {
      console.error("WhatsApp send failed", {
        messageId: incomingMessage.id,
        to: incomingMessage.from,
        error
      });
    }
  }

  res.status(200).json({
    ok: true,
    mode: env.WHATSAPP_MODE,
    ...(env.WHATSAPP_MODE === "mock"
      ? {
          replies: mockReplies
        }
      : {})
  });
}
