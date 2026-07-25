import type { FibelContext, FibelPage, FibelPlugin, FibelRoute } from "../types";
import { absoluteUrl, joinUrl, text } from "../utils";

const markdown = (value: string) => text(value, "text/markdown; charset=utf-8");

export function llmsPlugin(): FibelPlugin {
  return {
    name: "llms",
    routes(context) {
      const routes: FibelRoute[] = [];
      for (const locale of context.config.locales) {
        routes.push({ path: `/${locale.code}/llms.txt`, handler: () => markdown(renderIndex(locale.code, context)) });
        routes.push({ path: `/${locale.code}/llms-full.txt`, handler: () => markdown(renderFull(locale.code, context)) });
      }
      routes.push({ path: "/llms.txt", handler: () => markdown(renderIndex(context.config.defaultLocale, context)) });
      routes.push({ path: "/llms-full.txt", handler: () => markdown(renderFull(context.config.defaultLocale, context)) });
      return routes;
    },
  };
}

function renderIndex(locale: string, context: FibelContext) {
  const config = context.config;
  const lines = [`# ${config.title}`, "", `> ${config.description}`, ""];

  const others = config.locales.filter((candidate) => candidate.code !== locale);
  if (others.length) {
    const links = others.map((candidate) => `[${candidate.label}](${sourceUrl(joinUrl(config.routing.basePath, candidate.code, "llms.txt"), context)})`);
    lines.push(`This index covers ${locale}. Other languages: ${links.join(", ")}.`, "");
  }

  for (const section of context.nav.get(locale) ?? []) {
    lines.push(`## ${section.label}`, "");
    for (const page of section.pages) lines.push(`- [${page.meta.navTitle}](${rawUrl(page, context)}): ${page.meta.description}`);
    lines.push("");
  }

  lines.push("## Full text", "", `- [All pages in one file](${sourceUrl(joinUrl(config.routing.basePath, locale, "llms-full.txt"), context)})`, "");
  return lines.join("\n");
}

function renderFull(locale: string, context: FibelContext) {
  const pages = (context.nav.get(locale) ?? []).flatMap((section) => section.pages);
  const parts = [`# ${context.config.title}`, "", `> ${context.config.description}`, ""];
  for (const page of pages) parts.push("---", "", `Source: ${rawUrl(page, context)}`, "", page.body.trim(), "");
  return parts.join("\n");
}

function rawUrl(page: FibelPage, context: FibelContext) {
  return sourceUrl(`${page.href}.md`, context);
}

function sourceUrl(path: string, context: FibelContext) {
  return absoluteUrl(path, context.config.siteUrl);
}
