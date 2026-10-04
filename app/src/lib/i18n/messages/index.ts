import type { Locale } from "../config";
import { en, type Messages } from "./en";
import { sv } from "./sv";

export type { Messages };

/** Every language's texts. TypeScript makes sure each one has every key. */
export const MESSAGES: Record<Locale, Messages> = { en, sv };

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale] ?? en;
}
