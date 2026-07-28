import type { FibelContext, FibelPage, FibelPlugin, FibelRoute } from "../types";
import { navKey } from "../collections";
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
        for (const collection of context.config.collections) {
          routes.push({
            path: joinUrl(locale.code, collection.path, "llms.txt"),
            handler: () => markdown(renderIndex(locale.code, context, collection.id)),
          });
          routes.push({
            path: joinUrl(locale.code, collection.path, "llms-full.txt"),
            handler: () => markdown(renderFull(locale.code, context, collection.id)),
          });
        }
      }
      routes.push({ path: "/llms.txt", handler: () => markdown(renderIndex(context.config.defaultLocale, context)) });
      routes.push({ path: "/llms-full.txt", handler: () => markdown(renderFull(context.config.defaultLocale, context)) });
      return routes;
    },
  };
}

function renderIndex(
  locale: string,
  context: FibelContext,
  collectionId?: string,
) {
  const config = context.config;
  const collection = config.collections.find(
    (candidate) => candidate.id === collectionId,
  );
  const lines = [
    `# ${config.title}${collection ? ` — ${collection.label}` : ""}`,
    "",
    `> ${collection?.description ?? config.description}`,
    "",
  ];

  const others = config.locales.filter((candidate) => candidate.code !== locale);
  if (others.length) {
    const links = others.map((candidate) =>
      `[${candidate.label}](${sourceUrl(
        joinUrl(
          config.routing.basePath,
          candidate.code,
          collection?.path,
          "llms.txt",
        ),
        context,
      )})`,
    );
    lines.push(`This index covers ${locale}. Other languages: ${links.join(", ")}.`, "");
  }

  if (!collection && config.collections.length > 0) {
    lines.push("## Collections", "");
    for (const candidate of config.collections) {
      lines.push(
        `- [${candidate.label}](${sourceUrl(
          joinUrl(
            config.routing.basePath,
            locale,
            candidate.path,
            "llms.txt",
          ),
          context,
        )}): ${candidate.description}`,
      );
    }
    lines.push("");
    for (const candidate of config.collections) {
      lines.push(`## ${candidate.label}`, "", `> ${candidate.description}`, "");
      appendSections(
        lines,
        context.nav.get(navKey(locale, candidate.id)) ?? [],
        context,
        3,
      );
    }
  } else {
    appendSections(
      lines,
      context.nav.get(navKey(locale, collection?.id)) ?? [],
      context,
      2,
    );
  }

  lines.push(
    "## Full text",
    "",
    `- [All pages in one file](${sourceUrl(
      joinUrl(
        config.routing.basePath,
        locale,
        collection?.path,
        "llms-full.txt",
      ),
      context,
    )})`,
    "",
  );
  return lines.join("\n");
}

function renderFull(
  locale: string,
  context: FibelContext,
  collectionId?: string,
) {
  const collection = context.config.collections.find(
    (candidate) => candidate.id === collectionId,
  );
  const pages = collection
    ? pagesFor(locale, collection.id, context)
    : context.config.collections.length > 0
      ? context.config.collections.flatMap((candidate) =>
          pagesFor(locale, candidate.id, context),
        )
      : pagesFor(locale, undefined, context);
  const parts = [
    `# ${context.config.title}${collection ? ` — ${collection.label}` : ""}`,
    "",
    `> ${collection?.description ?? context.config.description}`,
    "",
  ];
  for (const page of pages) parts.push("---", "", `Source: ${rawUrl(page, context)}`, "", page.body.trim(), "");
  return parts.join("\n");
}

function pagesFor(
  locale: string,
  collection: string | undefined,
  context: FibelContext,
) {
  return (context.nav.get(navKey(locale, collection)) ?? []).flatMap(
    (section) => section.pages,
  );
}

function appendSections(
  lines: string[],
  sections: Array<{ label: string; pages: FibelPage[] }>,
  context: FibelContext,
  depth: number,
) {
  const heading = "#".repeat(depth);
  for (const section of sections) {
    lines.push(`${heading} ${section.label}`, "");
    for (const page of section.pages) {
      lines.push(
        `- [${page.meta.navTitle}](${rawUrl(page, context)}): ${page.meta.description}`,
      );
    }
    lines.push("");
  }
}

function rawUrl(page: FibelPage, context: FibelContext) {
  return sourceUrl(`${page.href}.md`, context);
}

function sourceUrl(path: string, context: FibelContext) {
  return absoluteUrl(path, context.config.siteUrl);
}
