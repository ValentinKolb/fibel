import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import type {
  FibelCollection,
  FibelContext,
  FibelCustomPage,
  FibelPage,
  Heading,
  PageMeta,
  ResolvedFibelConfig,
} from "./types";
import { navKey, pageRoute } from "./collections";
import { resolveInside, routeFromFile, slugify, toPosix } from "./utils";

type FrontmatterValue = string | number | boolean | string[];
type Frontmatter = Record<string, FrontmatterValue>;

export function loadPages(config: ResolvedFibelConfig): FibelPage[] {
  const pages: FibelPage[] = [];

  if (config.collections.length > 0) {
    for (const collection of config.collections) {
      loadMarkdownPages(config, collection, pages);
    }
  } else {
    loadMarkdownPages(config, undefined, pages);
  }

  for (const definition of config.pages) {
    const slug = customPagePath(definition);
    warnDeprecatedCustomPageContext(definition);
    const collection = config.collections.find(
      (candidate) =>
        candidate.id === (definition.collection ?? config.defaultCollection),
    );
    for (const locale of config.locales) {
      const body = customPageContent(definition, locale.code);
      pages.push({
        id: collection
          ? `custom:${collection.id}:${locale.code}:${slug}`
          : `custom:${locale.code}:${slug}`,
        kind: "custom",
        collection,
        locale,
        slug,
        href: pageRoute(config.routing.basePath, locale.code, slug, collection),
        sourcePath: `custom:${slug}`,
        raw: body,
        body,
        html: "",
        headings: extractHeadings(body),
        meta: {
          title: definition.title,
          description: definition.description,
          navTitle: definition.navTitle ?? definition.title,
          section: definition.section ?? "Guide",
          order: definition.order ?? 100,
          hidden: definition.hidden ?? false,
          tags: definition.tags ?? [],
          date: definition.date,
          authors: definition.authors ?? [],
          updated: definition.updated,
          image: definition.image,
        },
        layout: definition.layout ?? "article",
        render: definition.render,
      });
    }
  }

  assertUniquePageHrefs(pages);
  return pages.sort((a, b) => a.locale.code.localeCompare(b.locale.code) || a.meta.order - b.meta.order || a.href.localeCompare(b.href));
}

export function renderPages(context: FibelContext) {
  for (const page of context.pages) {
    page.html = context.services.renderMarkdown(page.body, page, context);
  }
  context.nav = buildNav(context.pages);
}

export function buildNav(pages: FibelPage[]) {
  const byLocale = new Map<string, Map<string, FibelPage[]>>();
  for (const page of pages) {
    if (page.meta.hidden) continue;
    const key = navKey(page.locale.code, page.collection?.id);
    const localeMap = byLocale.get(key) ?? new Map<string, FibelPage[]>();
    byLocale.set(key, localeMap);
    const sectionPages = localeMap.get(page.meta.section) ?? [];
    localeMap.set(page.meta.section, sectionPages);
    sectionPages.push(page);
  }

  const nav = new Map();
  for (const [locale, sections] of byLocale) {
    nav.set(
      locale,
      [...sections.entries()].map(([label, sectionPages]) => ({
        label,
        pages: sectionPages.sort((a, b) => a.meta.order - b.meta.order || a.meta.navTitle.localeCompare(b.meta.navTitle)),
      })),
    );
  }
  return nav;
}

function loadMarkdownPages(
  config: ResolvedFibelConfig,
  collection: FibelCollection | undefined,
  pages: FibelPage[],
) {
  const docsRoot = resolveInside(
    config.root,
    collection?.content ?? config.content,
  );
  for (const locale of config.locales) {
    const localeRoot = join(docsRoot, locale.code);
    if (!existsSync(localeRoot)) continue;

    for (const file of walkMarkdown(localeRoot)) {
      const raw = readFileSync(file, "utf8");
      const { data, body } = parseFrontmatter(raw);
      const slug = routeFromFile(file, localeRoot);
      const title =
        stringValue(data.title) ?? firstHeading(body) ?? titleFromSlug(slug);
      const description =
        stringValue(data.description) ??
        firstParagraph(body) ??
        collection?.description ??
        config.description;
      pages.push({
        id: collection
          ? `${collection.id}:${locale.code}:${toPosix(slug)}`
          : `${locale.code}:${toPosix(slug)}`,
        kind: "markdown",
        collection,
        locale,
        slug,
        href: pageRoute(
          config.routing.basePath,
          locale.code,
          slug,
          collection,
        ),
        sourcePath: file,
        raw,
        body,
        html: "",
        headings: extractHeadings(body),
        meta: {
          title,
          description,
          navTitle: stringValue(data.navTitle) ?? title,
          section: stringValue(data.section) ?? "Guide",
          order: numberValue(data.order) ?? 100,
          hidden: booleanValue(data.hidden) ?? false,
          tags: stringArrayValue(data.tags),
          date: stringValue(data.date),
          authors: stringArrayValue(data.authors),
          updated: stringValue(data.updated),
          image: stringValue(data.image),
        },
        layout: "article",
      });
    }
  }
}

function walkMarkdown(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkMarkdown(path));
    if (entry.isFile() && entry.name.endsWith(".md")) files.push(path);
  }
  return files;
}

export function parseFrontmatter(raw: string): { data: Frontmatter; body: string } {
  if (!raw.startsWith("---\n")) return { data: {}, body: raw };
  const end = raw.indexOf("\n---", 4);
  if (end === -1) return { data: {}, body: raw };
  const block = raw.slice(4, end);
  const body = raw.slice(end + 4).replace(/^\n/, "");
  const data: Frontmatter = {};
  const lines = block.split("\n");
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const value = match[2].trim();
    if (value === ">" || value === "|") {
      const parsed = parseBlockScalar(lines, index + 1, value);
      data[match[1]] = parsed.value;
      index = parsed.end - 1;
      continue;
    }
    data[match[1]] = coerceValue(match[2]);
  }
  return { data, body };
}

function parseBlockScalar(
  lines: string[],
  start: number,
  style: ">" | "|",
) {
  const content: string[] = [];
  let indentation: number | undefined;
  let end = start;

  while (end < lines.length) {
    const line = lines[end];
    if (!line.trim()) {
      content.push("");
      end++;
      continue;
    }

    const leadingWhitespace = line.match(/^\s*/)?.[0].length ?? 0;
    if (leadingWhitespace === 0) break;
    indentation ??= leadingWhitespace;
    if (leadingWhitespace < indentation) break;
    content.push(line.slice(indentation));
    end++;
  }

  return {
    value: (style === "|" ? content.join("\n") : foldLines(content)).trim(),
    end,
  };
}

function foldLines(lines: string[]) {
  let value = "";
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (index === 0 || lines[index - 1] === "") {
      value += line;
    } else if (line === "") {
      value += "\n";
    } else {
      value += ` ${line}`;
    }
  }
  return value;
}

function coerceValue(value: string) {
  const trimmed = value.trim().replace(/^["']|["']$/g, "");
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

const stringValue = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);
const numberValue = (value: unknown) => (typeof value === "number" ? value : undefined);
const booleanValue = (value: unknown) => (typeof value === "boolean" ? value : undefined);
const stringArrayValue = (value: unknown) => {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim());
  if (typeof value === "string" && value.trim()) return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
};

function firstHeading(markdown: string) {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
}

function firstParagraph(markdown: string) {
  return markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .find((block) => block && !block.startsWith("#") && !block.startsWith("```"))
    ?.replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[*_`]/g, "")
    .slice(0, 180);
}

function titleFromSlug(slug: string) {
  const last = slug === "/" ? "Overview" : slug.split("/").filter(Boolean).at(-1) ?? "Page";
  return last.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function customPagePath(page: FibelCustomPage) {
  const path = page.path.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("?") || path.includes("#")) {
    throw new Error(`Custom page path "${page.path}" must be an absolute pathname.`);
  }
  if (path !== "/" && path.endsWith("/")) {
    throw new Error(`Custom page path "${page.path}" must not end with a slash.`);
  }
  if (/\/{2,}/.test(path)) {
    throw new Error(`Custom page path "${page.path}" must not contain repeated slashes.`);
  }
  if (/\.(md|markdown)$/i.test(path)) {
    throw new Error(`Custom page path "${page.path}" must not use a Markdown route suffix.`);
  }
  return path;
}

function customPageContent(page: FibelCustomPage, locale: string) {
  const content = page.content ?? page.context;
  if (!content) return "";
  if (typeof content === "string") return content;
  const localizedContent = content[locale] ?? content.default;
  if (typeof localizedContent !== "string") {
    throw new Error(`Custom page "${page.path}" content requires a default Markdown string.`);
  }
  return localizedContent;
}

function warnDeprecatedCustomPageContext(page: FibelCustomPage) {
  if (page.context === undefined) return;
  if (page.content !== undefined) {
    console.warn(
      `[fibel] Custom page "${page.path}" defines both "content" and deprecated "context"; "content" takes precedence.`,
    );
    return;
  }
  console.warn(
    `[fibel] Custom page "${page.path}" uses deprecated "context"; rename it to "content".`,
  );
}

function assertUniquePageHrefs(pages: FibelPage[]) {
  const seen = new Map<string, string>();
  for (const page of pages) {
    const existing = seen.get(page.href);
    if (existing) {
      throw new Error(`Duplicate page route "${page.href}" from ${existing} and ${page.sourcePath}.`);
    }
    seen.set(page.href, page.sourcePath);
  }
}

function extractHeadings(markdown: string): Heading[] {
  return [...markdown.matchAll(/^(#{2,4})\s+(.+)$/gm)].map((match) => ({
    depth: match[1].length,
    text: match[2].trim(),
    id: slugify(match[2]),
  }));
}
