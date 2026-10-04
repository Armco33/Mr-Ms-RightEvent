import type { Prefs } from "./types";

export const DEMO_PREFS: Prefs = {
  city: "Taipei",
  distanceMiles: 50,
  vibe: "cheerful",
  type: "tech",
  price: "free",
  email: "hello-allo@gmail.com",
};

export const APP_BASE_PATH =
  process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/+$/, "") ?? "";