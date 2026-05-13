import { dirname, resolve } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { env } from "../config/env.js";

export type HandoffRequestType = "appointment" | "support" | "manual";
export type AssistantStatus = "active" | "manual";
export type ReleaseReason = "manual" | "expired";

export type CustomerAssistantState = {
  customerPhone: string;
  assistantStatus: AssistantStatus;
  requestType: HandoffRequestType;
  requestCreatedAt: string;
  takeoverAt?: string;
  takeoverUntil?: string;
  releasedAt?: string;
  releaseReason?: ReleaseReason;
  telegramChatId?: string;
  telegramMessageId?: number;
  lastCustomerMessageAt?: string;
  updatedAt: string;
};

const HANDOFF_DURATION_MS = 24 * 60 * 60 * 1000;
const stateFilePath = resolve(process.cwd(), env.HANDOFF_STATE_FILE);
const states = new Map<string, CustomerAssistantState>();

function loadStates(): void {
  if (!existsSync(stateFilePath)) {
    return;
  }

  const rawContent = readFileSync(stateFilePath, "utf8");
  const parsed = JSON.parse(rawContent) as CustomerAssistantState[];

  for (const state of parsed) {
    states.set(state.customerPhone, state);
  }
}

function persistStates(): void {
  mkdirSync(dirname(stateFilePath), {
    recursive: true,
  });

  writeFileSync(
    stateFilePath,
    `${JSON.stringify([...states.values()], null, 2)}\n`
  );
}

function nowIso(): string {
  return new Date().toISOString();
}

function isManualExpired(state: CustomerAssistantState): boolean {
  return (
    state.assistantStatus === "manual" &&
    typeof state.takeoverUntil === "string" &&
    Date.now() >= new Date(state.takeoverUntil).getTime()
  );
}

function releaseExpiredState(
  state: CustomerAssistantState
): CustomerAssistantState {
  if (!isManualExpired(state)) {
    return state;
  }

  const releasedState: CustomerAssistantState = {
    ...state,
    assistantStatus: "active",
    releasedAt: nowIso(),
    releaseReason: "expired",
    updatedAt: nowIso(),
  };

  states.set(state.customerPhone, releasedState);
  persistStates();
  return releasedState;
}

loadStates();

export function recordCustomerMessage(
  customerPhone: string
): CustomerAssistantState {
  const existingState = states.get(customerPhone);
  const currentTime = nowIso();

  if (!existingState) {
    const state: CustomerAssistantState = {
      customerPhone,
      assistantStatus: "active",
      requestType: "manual",
      requestCreatedAt: currentTime,
      lastCustomerMessageAt: currentTime,
      updatedAt: currentTime,
    };

    states.set(customerPhone, state);
    persistStates();
    return state;
  }

  const activeState = releaseExpiredState(existingState);
  const updatedState: CustomerAssistantState = {
    ...activeState,
    lastCustomerMessageAt: currentTime,
    updatedAt: currentTime,
  };

  states.set(customerPhone, updatedState);
  persistStates();
  return updatedState;
}

export function getCustomerAssistantState(
  customerPhone: string
): CustomerAssistantState | undefined {
  const state = states.get(customerPhone);

  if (!state) {
    return undefined;
  }

  return releaseExpiredState(state);
}

export function isAssistantManual(customerPhone: string): boolean {
  return getCustomerAssistantState(customerPhone)?.assistantStatus === "manual";
}

export function registerRequest(params: {
  customerPhone: string;
  requestType: Exclude<HandoffRequestType, "manual">;
}): CustomerAssistantState {
  const existingState = getCustomerAssistantState(params.customerPhone);
  const currentTime = nowIso();
  const state: CustomerAssistantState = {
    customerPhone: params.customerPhone,
    assistantStatus: existingState?.assistantStatus ?? "active",
    requestType: params.requestType,
    requestCreatedAt: currentTime,
    takeoverAt:
      existingState?.assistantStatus === "manual"
        ? existingState.takeoverAt
        : undefined,
    takeoverUntil:
      existingState?.assistantStatus === "manual"
        ? existingState.takeoverUntil
        : undefined,
    releasedAt: undefined,
    releaseReason: undefined,
    telegramChatId: existingState?.telegramChatId,
    telegramMessageId: existingState?.telegramMessageId,
    lastCustomerMessageAt: existingState?.lastCustomerMessageAt,
    updatedAt: currentTime,
  };

  states.set(params.customerPhone, state);
  persistStates();
  return state;
}

export function attachTelegramMessage(params: {
  customerPhone: string;
  chatId: string;
  messageId: number;
}): CustomerAssistantState | undefined {
  const state = getCustomerAssistantState(params.customerPhone);

  if (!state) {
    return undefined;
  }

  const updatedState: CustomerAssistantState = {
    ...state,
    telegramChatId: params.chatId,
    telegramMessageId: params.messageId,
    updatedAt: nowIso(),
  };

  states.set(params.customerPhone, updatedState);
  persistStates();
  return updatedState;
}

export function takeoverAssistant(params: {
  customerPhone: string;
  requestType?: HandoffRequestType;
}): CustomerAssistantState {
  const existingState = getCustomerAssistantState(params.customerPhone);
  const currentTime = nowIso();
  const takeoverUntil = new Date(
    Date.now() + HANDOFF_DURATION_MS
  ).toISOString();
  const state: CustomerAssistantState = {
    customerPhone: params.customerPhone,
    assistantStatus: "manual",
    requestType: params.requestType ?? existingState?.requestType ?? "manual",
    requestCreatedAt: existingState?.requestCreatedAt ?? currentTime,
    takeoverAt: currentTime,
    takeoverUntil,
    releasedAt: undefined,
    releaseReason: undefined,
    telegramChatId: existingState?.telegramChatId,
    telegramMessageId: existingState?.telegramMessageId,
    lastCustomerMessageAt: existingState?.lastCustomerMessageAt,
    updatedAt: currentTime,
  };

  states.set(params.customerPhone, state);
  persistStates();
  return state;
}

export function releaseAssistant(params: {
  customerPhone: string;
  reason: ReleaseReason;
}): CustomerAssistantState {
  const existingState = getCustomerAssistantState(params.customerPhone);
  const currentTime = nowIso();
  const state: CustomerAssistantState = {
    customerPhone: params.customerPhone,
    assistantStatus: "active",
    requestType: existingState?.requestType ?? "manual",
    requestCreatedAt: existingState?.requestCreatedAt ?? currentTime,
    takeoverAt: existingState?.takeoverAt,
    takeoverUntil: existingState?.takeoverUntil,
    releasedAt: currentTime,
    releaseReason: params.reason,
    telegramChatId: existingState?.telegramChatId,
    telegramMessageId: existingState?.telegramMessageId,
    lastCustomerMessageAt: existingState?.lastCustomerMessageAt,
    updatedAt: currentTime,
  };

  states.set(params.customerPhone, state);
  persistStates();
  return state;
}

export function listManualAssistantStates(): CustomerAssistantState[] {
  return [...states.values()]
    .map((state) => releaseExpiredState(state))
    .filter((state) => state.assistantStatus === "manual")
    .sort((left, right) => {
      return (
        new Date(left.takeoverUntil ?? 0).getTime() -
        new Date(right.takeoverUntil ?? 0).getTime()
      );
    });
}

export function listRecentAssistantStates(
  limit = 10
): CustomerAssistantState[] {
  return [...states.values()]
    .map((state) => releaseExpiredState(state))
    .sort((left, right) => {
      return (
        new Date(right.lastCustomerMessageAt ?? right.updatedAt).getTime() -
        new Date(left.lastCustomerMessageAt ?? left.updatedAt).getTime()
      );
    })
    .slice(0, limit);
}

export function releaseExpiredAssistantStates(): CustomerAssistantState[] {
  const releasedStates: CustomerAssistantState[] = [];

  for (const state of states.values()) {
    if (!isManualExpired(state)) {
      continue;
    }

    const releasedState = releaseExpiredState(state);
    releasedStates.push(releasedState);
  }

  return releasedStates;
}

export function getRemainingHandoffMs(
  state: CustomerAssistantState
): number | undefined {
  if (state.assistantStatus !== "manual" || !state.takeoverUntil) {
    return undefined;
  }

  return Math.max(0, new Date(state.takeoverUntil).getTime() - Date.now());
}
