import { en, type Dictionary } from "./en";
import { ru } from "./ru";

export const LOCALES = { ru: "Русский", en: "English" } as const;
export type Locale = keyof typeof LOCALES;

const dictionaries: Record<Locale, Dictionary> = { en, ru };

/** The platform interface is Russian; the English dictionary is kept for a future localisation. */
export function getDictionary(_locale?: Locale): Dictionary {
  void _locale;
  return dictionaries.ru;
}
export type { Dictionary };
