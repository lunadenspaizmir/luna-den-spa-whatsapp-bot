import { app } from "./app.js";
import { env } from "./config/env.js";

app.listen(env.PORT, "0.0.0.0", () => {
  console.info(`Server is running on port ${env.PORT}`);
  console.info(`WhatsApp mode: ${env.WHATSAPP_MODE}`);
});