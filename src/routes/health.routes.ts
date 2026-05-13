import { Router } from "express";

export const healthRoutes = Router();

healthRoutes.get("/", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "luna-den-spa-whatsapp-bot",
  });
});
