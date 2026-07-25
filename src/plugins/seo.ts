import type { FibelContext, FibelPage, FibelPlugin } from "../types";
import { escapeHtml, joinUrl, text } from "../utils";

export function seoPlugin(): FibelPlugin {
  return {
    name: "seo",
    setup(context) {
      context.headTags.push(renderRobotsMeta, renderAlternates, renderSocialTags);
    },
    routes(context) {
      return [
        {
          path: "/favicon.ico",
          handler: () => faviconResponse(),
        },
        {
          path: "/robots.txt",
          handler: () => {
            const sitemap = context.config.siteUrl ? `Sitemap: ${context.config.siteUrl}${context.config.routing.basePath}/sitemap.xml` : "";
            return text(["User-agent: *", "Allow: /", sitemap, ""].filter(Boolean).join("\n"));
          },
        },
        {
          path: "/sitemap.xml",
          handler: () => {
            const siteUrl = context.config.siteUrl ?? "";
            const urls = context.pages.map((page) => `  <url><loc>${siteUrl}${page.href}</loc></url>`).join("\n");
            return text(
              `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
              "application/xml; charset=utf-8",
            );
          },
        },
        {
          path: "/favicon.svg",
          handler: () => faviconResponse(),
        },
      ];
    },
  };
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
