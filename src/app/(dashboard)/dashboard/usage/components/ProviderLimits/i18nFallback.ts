export type UsageTranslationValues = Record<string, string | number | boolean | Date>;

export type UsageTranslator = {
  (key: string, values?: UsageTranslationValues): string;
  has?: (key: string) => boolean;
};

const MISSING_I18N_PREFIX = "__MISSING__:";

export function translateUsageOrFallback(
  t: UsageTranslator,
  key: string,
  fallback: string,
  values?: UsageTranslationValues
): string {
  try {
    if (typeof t.has === "function" && !t.has(key)) {
      return fallback;
    }
    const translated = values ? t(key, values) : t(key);
    if (!translated || translated === key || translated === `usage.${key}`) {
      return fallback;
    }
    // i18n:sync-ui marks untranslated locales with __MISSING__:<en> — prefer EN fallback
    // so operators never see the raw sentinel (Epic 0007 / 0039 connectionStatus keys).
    if (translated.startsWith(MISSING_I18N_PREFIX)) {
      const stripped = translated.slice(MISSING_I18N_PREFIX.length);
      return stripped || fallback;
    }
    return translated;
  } catch {
    return fallback;
  }
}
