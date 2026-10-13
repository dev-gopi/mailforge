export type Locale = "en" | "es" | "fr";

export function isLocale(value: string): value is Locale {
  return value === "en" || value === "es" || value === "fr";
}
