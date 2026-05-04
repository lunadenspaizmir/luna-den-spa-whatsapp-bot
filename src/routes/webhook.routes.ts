import { Router } from "express";
import {
  handleWebhook,
  verifyWebhook
} from "../controllers/webhook.controller.js";
import { verifyMetaSignature } from "../utils/verify-meta-signature.js";

export const webhookRoutes = Router();

webhookRoutes.get("/", verifyWebhook);
webhookRoutes.post(
  "/",
  (req, res, next) => {
    if (!verifyMetaSignature(req)) {
      res.sendStatus(403);
      return;
    }

    next();
  },
  handleWebhook
);
