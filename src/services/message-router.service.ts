import { keywordMap } from "../constants/keywords.js";
import { messages } from "../constants/messages.js";
import type { MessageKey } from "../constants/messages.js";
import { normalizeMessage } from "../utils/normalize-message.js";

export type RouteResult = {
  messageKey: MessageKey;
  replyMessage: string;
};

export function resolveMessage(incomingMessage: string): RouteResult {
  const normalizedMessage = normalizeMessage(incomingMessage);

  const messageKey = keywordMap[normalizedMessage] ?? "MAIN_MENU";

  return {
    messageKey,
    replyMessage: messages[messageKey],
  };
}

export function getReplyMessage(incomingMessage: string): string {
  return resolveMessage(incomingMessage).replyMessage;
}
