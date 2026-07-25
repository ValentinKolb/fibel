import type { FibelContext, FibelPage, FibelPlugin } from "../types";
import { escapeHtml, joinUrl, text } from "../utils";

export function seoPlugin(): FibelPlugin {
  return {
    name: "seo",
    setup(context) {
      context.headTags.push(renderRobotsMeta, renderAlternates, renderSocialTags);
    },
    afterContent(context) {
      if (!context.config.siteUrl) {
        console.warn("[fibel:seo] siteUrl is not set. Canonical URLs and sitemap entries stay relative, which crawlers reject.");
      }
    },
    routes(context) {
      return [
        {
          path: "/favicon.ico",
          handler: () => faviconResponse(),
        },
        {
          path: "/robots.txt",
          handler: () => text(renderRobots(context)),
        },
        {
          path: "/sitemap.xml",
          handler: () => text(renderSitemap(context), "application/xml; charset=utf-8"),
        },
        {
          path: "/favicon.svg",
          handler: () => faviconResponse(),
        },
      ];
    },
  };
}

function renderRobots(context: FibelContext) {
  const { basePath, internalPath } = context.config.routing;
  const disallow = [joinUrl(basePath, internalPath), ...context.config.seo.disallow.map((path) => (path.startsWith("/") ? joinUrl(basePath, path) : path))];
  const sitemap = context.config.siteUrl ? `Sitemap: ${absoluteUrl(joinUrl(basePath, "sitemap.xml"), context)}` : "";
  return ["User-agent: *", "Allow: /", ...disallow.map((path) => `Disallow: ${path}`), sitemap, ""].filter(Boolean).join("\n");
}

function renderSitemap(context: FibelContext) {
  const urls = context.pages
    .filter((page) => !page.meta.hidden)
    .map((page) => {
      const lines = [`    <loc>${xmlEscape(absoluteUrl(page.href, context))}</loc>`];
      const lastmod = lastModified(page);
      if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`);
      for (const alternate of sitemapAlternates(page, context)) lines.push(alternate);
      return `  <url>\n${lines.join("\n")}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}

function sitemapAlternates(page: FibelPage, context: FibelContext) {
  const alternates = translations(page, context);
  if (alternates.length < 2) return [];
  const links = alternates.map(
    (candidate) => `    <xhtml:link rel="alternate" hreflang="${xmlEscape(candidate.locale.code)}" href="${xmlEscape(absoluteUrl(candidate.href, context))}"/>`,
  );
  const fallback = alternates.find((candidate) => candidate.locale.code === context.config.defaultLocale);
  if (fallback) links.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(absoluteUrl(fallback.href, context))}"/>`);
  return links;
}

function lastModified(page: FibelPage) {
  const updated = page.meta.updated ?? "";
  return /^\d{4}-\d{2}-\d{2}/.test(updated) ? updated.slice(0, 10) : undefined;
}

function xmlEscape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export function absoluteUrl(href: string, context: FibelContext) {
  const siteUrl = context.config.siteUrl?.replace(/\/+$/g, "");
  return siteUrl ? `${siteUrl}${href}` : href;
}

function translations(page: FibelPage, context: FibelContext) {
  return context.pages.filter((candidate) => candidate.slug === page.slug && !candidate.meta.hidden);
}

function renderRobotsMeta(page: FibelPage) {
  return page.meta.hidden ? '<meta name="robots" content="noindex, nofollow">' : "";
}

function renderAlternates(page: FibelPage, context: FibelContext) {
  if (page.meta.hidden) return "";
  const alternates = translations(page, context);
  if (alternates.length < 2) return "";

  const tags = alternates.map(
    (candidate) => `<link rel="alternate" hreflang="${escapeHtml(candidate.locale.code)}" href="${escapeHtml(absoluteUrl(candidate.href, context))}">`,
  );
  const fallback = alternates.find((candidate) => candidate.locale.code === context.config.defaultLocale);
  if (fallback) tags.push(`<link rel="alternate" hreflang="x-default" href="${escapeHtml(absoluteUrl(fallback.href, context))}">`);
  return tags.join("\n    ");
}

function renderSocialTags(page: FibelPage, context: FibelContext) {
  const config = context.config;
  const tags = [`<meta property="og:locale" content="${escapeHtml(page.locale.code)}">`];

  for (const candidate of translations(page, context)) {
    if (candidate.locale.code === page.locale.code) continue;
    tags.push(`<meta property="og:locale:alternate" content="${escapeHtml(candidate.locale.code)}">`);
  }

  if (page.meta.updated) tags.push(`<meta property="article:modified_time" content="${escapeHtml(page.meta.updated)}">`);

  const image = resolveImage(page, context);
  if (image) {
    tags.push(`<meta property="og:image" content="${escapeHtml(image)}">`);
    tags.push(`<meta name="twitter:image" content="${escapeHtml(image)}">`);
  }

  tags.push(`<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">`);
  if (config.seo.twitterSite) tags.push(`<meta name="twitter:site" content="${escapeHtml(config.seo.twitterSite)}">`);
  tags.push(`<meta name="twitter:title" content="${escapeHtml(page.meta.title)}">`);
  tags.push(`<meta name="twitter:description" content="${escapeHtml(page.meta.description)}">`);

  return tags.join("\n    ");
}

function resolveImage(page: FibelPage, context: FibelContext) {
  const value = page.meta.image ?? context.config.seo.ogImage;
  if (!value) return undefined;
  if (/^https?:/.test(value)) return value;
  return absoluteUrl(joinUrl(context.config.routing.basePath, value), context);
}

function faviconResponse() {
  return new Response(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#b7791f"/><path d="M20 44V18h24v7H29v5h13v7H29v7z" fill="white"/></svg>',
    { headers: { "Content-Type": "image/svg+xml; charset=utf-8" } },
  );
}
