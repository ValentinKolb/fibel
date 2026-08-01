import { navKey } from "../collections";
import { readingTime } from "../reading-time";
import type { FibelContext, FibelPage, FibelPlugin, NavSection } from "../types";
import { escapeHtml } from "../utils";

export type BlogOptions = {
  collection: string;
};

export function blogPlugin(options: BlogOptions): FibelPlugin {
  return {
    name: "blog",
    setup(context) {
      const collection = context.config.collections.find(
        (candidate) => candidate.id === options.collection,
      );
      if (!collection) {
        throw new Error(
          `blogPlugin collection "${options.collection}" is not configured.`,
        );
      }
      context.config.pages.push({
        collection: collection.id,
        path: "/",
        title: collection.label,
        description: collection.description,
        context: `# ${collection.label}\n\n${collection.description}`,
        layout: "full",
        render: ({ page, fibel }) =>
          renderBlogIndex(page, fibel, options.collection),
      });
    },
    transformContent(context) {
      for (const page of blogPosts(context, options.collection)) {
        const timestamp = postTimestamp(page);
        page.meta.section = page.meta.date!.slice(0, 4);
        page.meta.order = -timestamp;
      }
    },
    afterContent(context) {
      for (const locale of context.config.locales) {
        const posts = blogPosts(context, options.collection)
          .filter((page) => page.locale.code === locale.code && !page.meta.hidden)
          .sort(comparePosts);
        context.nav.set(
          navKey(locale.code, options.collection),
          groupByYear(posts),
        );
      }
    },
  };
}

function renderBlogIndex(
  page: FibelPage,
  context: FibelContext,
  collectionId: string,
) {
  const collection = context.config.collections.find(
    (candidate) => candidate.id === collectionId,
  )!;
  const posts = blogPosts(context, collectionId)
    .filter(
      (candidate) =>
        candidate.locale.code === page.locale.code && !candidate.meta.hidden,
    )
    .sort(comparePosts);

  return `<section class="mx-auto w-full max-w-6xl">
    <header class="border-b border-zinc-200 pb-10 pt-2 dark:border-white/10 sm:pb-12">
      <p class="mb-4 text-xs font-semibold uppercase tracking-[0.2em] [color:var(--fibel-accent-foreground-strong)]">Latest posts</p>
      <h1 class="max-w-4xl text-5xl font-semibold tracking-[-0.035em] text-zinc-950 dark:text-white sm:text-6xl">${escapeHtml(collection.label)}</h1>
      <p class="mt-5 max-w-3xl text-lg leading-8 text-zinc-600 dark:text-zinc-300">${escapeHtml(collection.description)}</p>
    </header>
    <div class="divide-y divide-zinc-200 dark:divide-white/10">
      ${posts.map((post) => renderPost(post, context)).join("")}
    </div>
  </section>`;
}

function renderPost(page: FibelPage, context: FibelContext) {
  const date = new Date(postTimestamp(page));
  const formattedDate = new Intl.DateTimeFormat(page.locale.code, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
  const excerpt = excerptMarkdown(page.body);
  const excerptHtml = excerpt
    ? context.services.renderMarkdown(excerpt, page, context)
    : `<p>${escapeHtml(page.meta.description)}</p>`;
  const authors = page.meta.authors.length
    ? `<span>${escapeHtml(page.meta.authors.join(", "))}</span><span aria-hidden="true">·</span>`
    : "";

  return `<article class="grid gap-5 py-9 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-9 sm:py-12">
    <time class="flex items-baseline gap-2 sm:block" datetime="${escapeHtml(page.meta.date!)}">
      <span class="block text-lg font-semibold [color:var(--fibel-accent-foreground-strong)]">${escapeHtml(formattedDate)}</span>
      <span class="mt-1 block text-sm text-zinc-500 dark:text-zinc-400">${date.getUTCFullYear()}</span>
    </time>
    <div class="min-w-0">
      <div class="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        ${authors}<span>${readingTime(page.body)} min read</span>
      </div>
      <h2 class="text-3xl font-semibold tracking-[-0.025em] text-zinc-950 dark:text-white sm:text-4xl">
        <a class="transition hover:[color:var(--fibel-accent-strong)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:[outline-color:var(--fibel-focus-ring)]" href="${escapeHtml(page.href)}">${escapeHtml(page.meta.title)}</a>
      </h2>
      <div class="fibel-prose mt-5 max-w-3xl text-base leading-8">${excerptHtml}</div>
      <div class="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          ${page.meta.tags.slice(0, 4).map((tag) => `<span>#${escapeHtml(tag)}</span>`).join("")}
        </div>
        <a class="inline-flex items-center gap-2 text-sm font-semibold [color:var(--fibel-accent-foreground-strong)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:[outline-color:var(--fibel-focus-ring)]" href="${escapeHtml(page.href)}" aria-label="Read ${escapeHtml(page.meta.title)}">Read post ${arrowIcon()}</a>
      </div>
    </div>
  </article>`;
}

function blogPosts(context: FibelContext, collection: string) {
  return context.pages.filter(
    (page) => page.kind === "markdown" && page.collection?.id === collection,
  );
}

function postTimestamp(page: FibelPage) {
  const date = page.meta.date;
  const timestamp = date
    ? Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00Z` : date)
    : Number.NaN;
  if (!date || !/^\d{4}-\d{2}-\d{2}/.test(date) || !Number.isFinite(timestamp)) {
    throw new Error(
      `Blog post "${page.sourcePath}" requires a valid date frontmatter value.`,
    );
  }
  return timestamp;
}

function comparePosts(left: FibelPage, right: FibelPage) {
  return postTimestamp(right) - postTimestamp(left) || left.href.localeCompare(right.href);
}

function groupByYear(posts: FibelPage[]): NavSection[] {
  const years = new Map<string, FibelPage[]>();
  for (const post of posts) {
    const year = post.meta.date!.slice(0, 4);
    const pages = years.get(year) ?? [];
    pages.push(post);
    years.set(year, pages);
  }
  return [...years].map(([label, pages]) => ({ label, pages }));
}

function excerptMarkdown(markdown: string) {
  const marker = /<!--\s*(?:truncate|more)\s*-->/i.exec(markdown);
  return marker ? markdown.slice(0, marker.index).trim() : "";
}

function arrowIcon() {
  return '<svg viewBox="0 0 20 20" aria-hidden="true" class="h-4 w-4"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M4 10h12m-4-4 4 4-4 4"/></svg>';
}
