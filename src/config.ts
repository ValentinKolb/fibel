import { existsSync, readdirSync } from "fs";
import { copyFile, rm } from "fs/promises";
import { dirname, join, resolve } from "path";
import { pathToFileURL } from "url";
import { defaultPlugins } from "./plugins";
import type {
  FibelCollection,
  FibelConfig,
  LocaleConfig,
  ResolvedFibelConfig,
} from "./types";
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
  const collections = resolveCollections(config);
  const locales = config.locales?.length
    ? config.locales
    : inferLocales(
        root,
        collections.length > 0
          ? collections.map((collection) => collection.content)
          : [content],
      );
  const defaultLocale = config.defaultLocale ?? locales[0]?.code ?? "en";
  const defaultCollection =
    collections.length > 0
      ? config.defaultCollection ?? collections[0]?.id
      : undefined;

  if (!locales.some((locale) => locale.code === defaultLocale)) {
    throw new Error(`defaultLocale "${defaultLocale}" is not listed in locales.`);
  }
  if (
    defaultCollection !== undefined &&
    !collections.some((collection) => collection.id === defaultCollection)
  ) {
    throw new Error(
      `defaultCollection "${defaultCollection}" is not listed in collections.`,
    );
  }
  if (config.defaultCollection !== undefined && collections.length === 0) {
    throw new Error("defaultCollection requires at least one collection.");
  }
  validateCollectionRoutes(collections, locales, config);
  validateCustomPageCollections(config, collections, defaultCollection);

  return {
    title: config.title,
    description: config.description ?? `${config.title} documentation`,
    siteUrl: config.siteUrl,
    root,
    content,
    assets,
    collections,
    defaultCollection,
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
    pages: [...(config.pages ?? [])],
    plugins: config.plugins ?? defaultPlugins(),
  };
}

function resolveCollections(config: FibelConfig): FibelCollection[] {
  const collections = config.collections ?? [];
  const ids = new Set<string>();
  const paths = new Set<string>();

  return collections.map((collection) => {
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(collection.id) || collection.id === "all") {
      throw new Error(
        `Collection id "${collection.id}" must be a lowercase slug using letters, numbers, "_" or "-", and cannot be "all".`,
      );
    }
    if (!collection.label.trim()) {
      throw new Error(`Collection "${collection.id}" requires a label.`);
    }
    if (!collection.content.trim()) {
      throw new Error(`Collection "${collection.id}" requires a content directory.`);
    }
    const path = normalizeCollectionPath(collection.path ?? `/${collection.id}`);
    if (ids.has(collection.id)) {
      throw new Error(`Duplicate collection id "${collection.id}".`);
    }
    if (paths.has(path)) {
      throw new Error(`Duplicate collection path "${path}".`);
    }
    const overlapping = [...paths].find(
      (candidate) =>
        candidate.startsWith(`${path}/`) || path.startsWith(`${candidate}/`),
    );
    if (overlapping) {
      throw new Error(
        `Collection path "${path}" overlaps collection path "${overlapping}".`,
      );
    }
    ids.add(collection.id);
    paths.add(path);
    return {
      id: collection.id,
      label: collection.label.trim(),
      description:
        collection.description?.trim() || `${collection.label} documentation`,
      content: collection.content,
      path,
    };
  });
}

function normalizeCollectionPath(value: string) {
  if (
    !value.startsWith("/") ||
    value === "/" ||
    value.endsWith("/") ||
    value.includes("?") ||
    value.includes("#") ||
    value.split("/").slice(1).some((segment) => !/^[a-z0-9][a-z0-9_-]*$/.test(segment))
  ) {
    throw new Error(
      `Collection path "${value}" must be an absolute pathname with slug segments and no trailing slash.`,
    );
  }
  return normalizeRoutePath(value);
}

function inferLocales(root: string, contents: string[]): LocaleConfig[] {
  const codes = new Set<string>();
  for (const content of contents) {
    const docsRoot = resolve(root, content);
    if (!existsSync(docsRoot)) continue;
    for (const entry of readdirSync(docsRoot, { withFileTypes: true })) {
      if (entry.isDirectory()) codes.add(entry.name);
    }
  }
  if (codes.size === 0) return [{ code: "en", label: "English" }];
  return [...codes].map((code) => ({ code, label: code.toUpperCase() }));
}

function validateCollectionRoutes(
  collections: FibelCollection[],
  locales: LocaleConfig[],
  config: FibelConfig,
) {
  const reserved = new Set([
    ...locales.map((locale) => locale.code),
    normalizeRoutePath(config.routing?.internalPath ?? "/_fibel").split("/")[1],
    normalizeRoutePath(config.routing?.assetsPath ?? "/assets").split("/")[1],
  ]);
  for (const collection of collections) {
    const firstSegment = collection.path.split("/")[1];
    if (firstSegment && reserved.has(firstSegment)) {
      throw new Error(
        `Collection path "${collection.path}" conflicts with reserved route segment "${firstSegment}".`,
      );
    }
  }
}

function validateCustomPageCollections(
  config: FibelConfig,
  collections: FibelCollection[],
  defaultCollection?: string,
) {
  for (const page of config.pages ?? []) {
    if (collections.length === 0 && page.collection) {
      throw new Error(
        `Custom page "${page.path}" selects collection "${page.collection}", but collections are not configured.`,
      );
    }
    const collection = page.collection ?? defaultCollection;
    if (
      collection &&
      !collections.some((candidate) => candidate.id === collection)
    ) {
      throw new Error(
        `Custom page "${page.path}" selects unknown collection "${collection}".`,
      );
    }
  }
}
