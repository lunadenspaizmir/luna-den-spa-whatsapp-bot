import type { MessageKey } from "./messages.js";

export const keywordMap: Record<string, MessageKey> = {
  "1": "PRICE",
  fiyat: "PRICE",
  ücret: "PRICE",

  "2": "MASSAGE_TYPES",
  masaj: "MASSAGE_TYPES",
  tür: "MASSAGE_TYPES",

  "3": "WORKING_HOURS",
  saat: "WORKING_HOURS",
  mesai: "WORKING_HOURS",

  "4": "LOCATION",
  konum: "LOCATION",
  adres: "LOCATION",

  "5": "SUPPORT_CONFIRMATION",
  destek: "SUPPORT_CONFIRMATION",
  yetkili: "SUPPORT_CONFIRMATION",

  "6": "APPOINTMENT_CONFIRMATION",
  randevu: "APPOINTMENT_CONFIRMATION",
  dönüş: "APPOINTMENT_CONFIRMATION",
};
