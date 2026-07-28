import type { FibelPlugin } from "../types";

export function i18nPlugin(): FibelPlugin {
  return {
    name: "i18n",
    afterContent(context) {
      const locales = context.config.locales.map((locale) => locale.code);
      const pagesBySlug = new Map<string, Set<string>>();
      for (const page of context.pages) {
        const key = `${page.collection?.id ?? "default"}:${page.slug}`;
        const localesForSlug = pagesBySlug.get(key) ?? new Set<string>();
        pagesBySlug.set(key, localesForSlug);
        localesForSlug.add(page.locale.code);
      }

      for (const [pageKey, present] of pagesBySlug) {
        for (const locale of locales) {
          if (!present.has(locale)) {
            console.warn(
              `[fibel:i18n] missing ${locale} translation for ${pageKey}`,
            );
          }
        }
      }
    },
  };
}
