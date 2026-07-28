import { fuzzy } from "@k2b/stdlib";
import type { FibelContext, FibelPlugin, SearchEntry } from "../types";
import { json } from "../utils";

export function searchPlugin(): FibelPlugin {
  return {
    name: "search",
    afterContent(context) {
      context.searchIndex = context.pages
        .filter((page) => !page.meta.hidden)
        .map((page) => ({
          id: page.id,
          locale: page.locale.code,
          collection: page.collection?.id,
          collectionLabel: page.collection?.label,
          title: page.meta.title,
          description: page.meta.description,
          href: page.href,
          section: page.meta.section,
          text: searchableText(page.body),
        }));
    },
    setup(context) {
      context.services.search = search;
    },
    routes() {
      return [
        {
          path: "/search",
          handler: (request, context) => {
            const url = new URL(request.url);
            const query = url.searchParams.get("q") ?? "";
            const locale = url.searchParams.get("locale") ?? context.config.defaultLocale;
            const collection = url.searchParams.get("collection") || undefined;
            if (
              collection &&
              !context.config.collections.some(
                (candidate) => candidate.id === collection,
              )
            ) {
              return json({ error: `Unknown collection "${collection}".` }, 400);
            }
            return json({
              query,
              locale,
              collection,
              results: context.services.search(
                query,
                locale,
                context,
                collection,
              ),
            });
          },
        },
      ];
    },
  };
}

function search(
  query: string,
  locale: string,
  context: FibelContext,
  collection?: string,
): SearchEntry[] {
  const trimmed = query.trim();
  const entries = context.searchIndex.filter(
    (entry) =>
      entry.locale === locale &&
      (!collection || entry.collection === collection),
  );
  if (!trimmed) return entries.slice(0, 8);
  return fuzzy
    .filter(trimmed, entries, {
      key: (entry) => `${entry.title} ${entry.description} ${entry.section} ${entry.text}`,
      limit: 12,
    })
    .map((hit) => hit.item);
}

function searchableText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[#>*_`~\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
