import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { env } from "../config/env.js";

type RawBodyRequest = Request & {
  rawBody?: Buffer;
};

export function verifyMetaSignature(req: Request): boolean {
  if (env.WHATSAPP_MODE === "mock") {
    return true;
  }

  const rawBody = (req as RawBodyRequest).rawBody;
  const signatureHeader = req.header("x-hub-signature-256");

  if (!env.META_APP_SECRET || !rawBody || !signatureHeader) {
    return false;
  }

  const signaturePrefix = "sha256=";

  if (!signatureHeader.startsWith(signaturePrefix)) {
    return false;
  }

  const receivedHash = signatureHeader.slice(signaturePrefix.length);

  if (!/^[a-f0-9]+$/i.test(receivedHash)) {
    return false;
  }

  const expectedHash = createHmac("sha256", env.META_APP_SECRET)
    .update(rawBody)
    .digest("hex");

  const receivedBuffer = Buffer.from(receivedHash, "hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedBuffer, expectedBuffer);
}
