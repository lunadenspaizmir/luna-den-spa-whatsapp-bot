import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const emptyToUndefined = (value: unknown) => {
  if (value === "") return undefined;
  return value;
};

const falseBooleanValues = new Set(["false", "0", "off", "disabled"]);

const parseEnabledFlag = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return true;
  }

  return !falseBooleanValues.has(String(value).trim().toLowerCase());
};

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),

  WHATSAPP_MODE: z.enum(["mock", "live"]).default("mock"),

  BOT_ENABLED: z.preprocess(parseEnabledFlag, z.boolean()),

  WHATSAPP_TOKEN: z.preprocess(
    emptyToUndefined,
    z.string().optional()
  ),

  WHATSAPP_PHONE_NUMBER_ID: z.preprocess(
    emptyToUndefined,
    z.string().optional()
  ),

  META_APP_SECRET: z.preprocess(
    emptyToUndefined,
    z.string().optional()
  ),

  WHATSAPP_VERIFY_TOKEN: z.preprocess(
    (value) => {
      if (!value || value === "") return "local_verify_token";
      return value;
    },
    z.string().min(1)
  ),

  WHATSAPP_API_VERSION: z.preprocess(
    (value) => {
      if (!value || value === "") return "v22.0";
      return value;
    },
    z.string().min(1)
  ),

  TELEGRAM_BOT_TOKEN: z.preprocess(
    emptyToUndefined,
    z.string().optional()
  ),

  TELEGRAM_CHAT_ID: z.preprocess(
    emptyToUndefined,
    z.string().optional()
  )
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(
    `Invalid environment variables: ${parsedEnv.error.message}`
  );
}

export const env = parsedEnv.data;

if (env.WHATSAPP_MODE === "live") {
  if (!env.WHATSAPP_TOKEN) {
    throw new Error("WHATSAPP_TOKEN is required in live mode.");
  }

  if (!env.WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error("WHATSAPP_PHONE_NUMBER_ID is required in live mode.");
  }

  if (!env.META_APP_SECRET) {
    throw new Error("META_APP_SECRET is required in live mode.");
  }
}
