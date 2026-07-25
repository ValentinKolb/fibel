import { existsSync, readdirSync } from "fs";
import { resolve } from "path";
import { pathToFileURL } from "url";
import { defaultPlugins } from "./plugins";
import type { FibelConfig, LocaleConfig, ResolvedFibelConfig } from "./types";
import { normalizeBasePath, normalizeRoutePath } from "./utils";

export const defineFibel = (config: FibelConfig) => config;

export async function loadConfig(configPath = "fibel.config.ts") {
  const resolved = resolve(configPath);
  const imported = await import(`${pathToFileURL(resolved).href}?t=${Date.now()}`);
  return imported.default as FibelConfig;
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
    headerLinks: config.headerLinks ?? [],
    footerLinks: config.footerLinks ?? [],
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
