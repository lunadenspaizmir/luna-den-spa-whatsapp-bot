import { env } from "../config/env.js";
import { releaseExpiredAssistantStates } from "./assistant-handoff.service.js";
import { editAssistantStateMessage } from "./notification.service.js";

const HANDOFF_EXPIRY_CHECK_INTERVAL_MS = 60 * 1000;

let schedulerStarted = false;

async function releaseExpiredStates(): Promise<void> {
  const releasedStates = releaseExpiredAssistantStates();

  for (const state of releasedStates) {
    if (!env.BOT_ENABLED) {
      continue;
    }

    try {
      await editAssistantStateMessage(state);
    } catch (error) {
      console.error("Expired handoff Telegram update failed", {
        customerPhone: state.customerPhone,
        error,
      });
    }
  }
}

export function startHandoffExpiryScheduler(): void {
  if (schedulerStarted) {
    return;
  }

  schedulerStarted = true;
  void releaseExpiredStates();

  setInterval(() => {
    void releaseExpiredStates();
  }, HANDOFF_EXPIRY_CHECK_INTERVAL_MS);
}
