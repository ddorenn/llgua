import { en, type Dictionary } from "./en";
import { ru } from "./ru";

export const LOCALES = { en: "English", ru: "Русский" } as const;
export type Locale = keyof typeof LOCALES;

const dictionaries: Record<Locale, Dictionary> = { en, ru };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? en;
}
export type { Dictionary };
