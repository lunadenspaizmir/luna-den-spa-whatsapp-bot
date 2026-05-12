import { env } from "../config/env.js";

type SendTextMessageParams = {
  to: string;
  text: string;
};

type SendTextMessageResult =
  | {
      mode: "mock";
      to: string;
      text: string;
    }
  | {
      mode: "dry-run";
      to: string;
      text: string;
    }
  | {
      mode: "live";
      to: string;
    };

export async function sendTextMessage(
  params: SendTextMessageParams
): Promise<SendTextMessageResult> {
  if (env.WHATSAPP_MODE === "mock") {
    return {
      mode: "mock",
      to: params.to,
      text: params.text
    };
  }

  if (!env.BOT_ENABLED) {
    console.info("Bot disabled. WhatsApp message was not sent.", {
      to: params.to,
      text: params.text
    });

    return {
      mode: "dry-run",
      to: params.to,
      text: params.text
    };
  }

  const url = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: params.to,
      type: "text",
      text: {
        preview_url: false,
        body: params.text
      }
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `WhatsApp API request failed. Status: ${response.status}. Body: ${errorBody}`
    );
  }

  return {
    mode: "live",
    to: params.to
  };
}
