import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import type { FibelContext, FibelPage, Heading, PageMeta, ResolvedFibelConfig } from "./types";
import { joinUrl, resolveInside, routeFromFile, slugify, toPosix } from "./utils";

type FrontmatterValue = string | number | boolean | string[];
type Frontmatter = Record<string, FrontmatterValue>;

export function loadPages(config: ResolvedFibelConfig): FibelPage[] {
  const docsRoot = resolveInside(config.root, config.content);
  const pages: FibelPage[] = [];

  for (const locale of config.locales) {
    const localeRoot = join(docsRoot, locale.code);
    if (!existsSync(localeRoot)) continue;

    for (const file of walkMarkdown(localeRoot)) {
      const raw = readFileSync(file, "utf8");
      const { data, body } = parseFrontmatter(raw);
      const slug = routeFromFile(file, localeRoot);
      const href = joinUrl(config.routing.basePath, locale.code, slug);
      const title = stringValue(data.title) ?? firstHeading(body) ?? titleFromSlug(slug);
      const description = stringValue(data.description) ?? firstParagraph(body) ?? config.description;
      const page: FibelPage = {
        id: `${locale.code}:${toPosix(routeFromFile(file, localeRoot))}`,
        locale,
        slug,
        href,
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
          updated: stringValue(data.updated),
        },
      };
      pages.push(page);
    }
  }

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
    const localeMap = byLocale.get(page.locale.code) ?? new Map<string, FibelPage[]>();
    byLocale.set(page.locale.code, localeMap);
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
  const block = raw.slice(4, end).trim();
  const body = raw.slice(end + 4).replace(/^\n/, "");
  const data: Frontmatter = {};
  for (const line of block.split("\n")) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    data[match[1]] = coerceValue(match[2]);
  }
  return { data, body };
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

function extractHeadings(markdown: string): Heading[] {
  return [...markdown.matchAll(/^(#{2,4})\s+(.+)$/gm)].map((match) => ({
    depth: match[1].length,
    text: match[2].trim(),
    id: slugify(match[2]),
  }));
}
