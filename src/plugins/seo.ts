import type { FibelPlugin } from "../types";
import { text } from "../utils";

export function seoPlugin(): FibelPlugin {
  return {
    name: "seo",
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

function faviconResponse() {
  return new Response(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#b7791f"/><path d="M20 44V18h24v7H29v5h13v7H29v7z" fill="white"/></svg>',
    { headers: { "Content-Type": "image/svg+xml; charset=utf-8" } },
  );
}
