import { existsSync, readdirSync } from "fs";
import { copyFile, rm } from "fs/promises";
import { dirname, join, resolve } from "path";
import { pathToFileURL } from "url";
import { defaultPlugins } from "./plugins";
import type { FibelConfig, LocaleConfig, ResolvedFibelConfig } from "./types";
import { normalizeBasePath, normalizeRoutePath } from "./utils";

export const defineFibel = (config: FibelConfig) => config;

export async function loadConfig(configPath = "fibel.config.ts", options: { fresh?: boolean } = {}) {
  const resolved = resolve(configPath);
  if (!options.fresh) {
    const imported = await import(pathToFileURL(resolved).href);
    return imported.default as FibelConfig;
  }

  // Bun caches modules by resolved path and ignores the query string, so a
  // "?t=" buster does not reload an edited config. Importing a copy under a
  // new name does. The copy sits next to the original so relative imports
  // inside the config still resolve. Each reload leaks one module, which is
  // acceptable for a development server.
  const temp = join(dirname(resolved), `.fibel.config.${Date.now()}.tmp.ts`);
  try {
    await copyFile(resolved, temp);
    const imported = await import(pathToFileURL(temp).href);
    return imported.default as FibelConfig;
  } finally {
    await rm(temp, { force: true });
  }
}

export function resolveConfig(config: FibelConfig): ResolvedFibelConfig {
  const root = resolve(config.root ?? process.cwd());
  const content = config.content ?? "docs";
  const assets = config.assets ?? "assets";
  const locales = config.locales?.length ? config.locales : inferLocales(root, content);
  const defaultLocale = config.defaultLocale ?? locales[0]?.code ?? "en";

  if (!locales.some((locale) => locale.code === defaultLocale)) {
    throw new Error(`defaultLocale "${defaultLocale}" is not listed in locales.`);
  }

  return {
    title: config.title,
    description: config.description ?? `${config.title} documentation`,
    siteUrl: config.siteUrl,
    root,
    content,
    assets,
    routing: {
      basePath: normalizeBasePath(config.routing?.basePath),
      internalPath: normalizeRoutePath(config.routing?.internalPath ?? "/_fibel"),
      assetsPath: normalizeRoutePath(config.routing?.assetsPath ?? "/assets"),
    },
    locales,
    defaultLocale,
    theme: {
      defaultMode: config.theme?.defaultMode ?? "light",
      cookieName: config.theme?.cookieName ?? "fibel_theme",
    },
    seo: {
      favicon: config.seo?.favicon,
      ogImage: config.seo?.ogImage,
      twitterSite: config.seo?.twitterSite,
      disallow: config.seo?.disallow ?? [],
    },
    header: config.header ?? {},
    headerLinks: config.headerLinks ?? [],
    footerLinks: config.footerLinks ?? [],
    pages: config.pages ?? [],
    plugins: config.plugins ?? defaultPlugins(),
  };
}

function inferLocales(root: string, content: string): LocaleConfig[] {
  const docsRoot = resolve(root, content);
  if (!existsSync(docsRoot)) return [{ code: "en", label: "English" }];
  return readdirSync(docsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ code: entry.name, label: entry.name.toUpperCase() }));
}
