import { en, type Dictionary } from "./en";
import { ru } from "./ru";

export const LOCALES = { ru: "Русский", en: "English (только меню)" } as const;
export type Locale = keyof typeof LOCALES;

const dictionaries: Record<Locale, Dictionary> = { en, ru };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? en;
}
export type { Dictionary };
